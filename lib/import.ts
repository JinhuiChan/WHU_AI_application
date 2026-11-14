import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import * as XLSX from "xlsx";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { ImportRecognitionError, recognizeImportDocument } from "@/lib/import-recognition";
import {
  importSystemFields,
  type ImportCommitResult,
  type ImportFileType,
  type ImportMapping,
  type ImportMappingSaveInput,
  type ImportMappingSaveResult,
  type ImportParseResult,
  type ImportSystemFieldKey,
  type ImportRecognition,
  type ImportReviewedRow,
} from "@/types/import";

const maxFileSize = 20 * 1024 * 1024;
const previewRowCount = 20;
const fileTypes: ImportFileType[] = ["xlsx", "docx", "pdf"];
const importSourceDirectory = path.join(process.cwd(), "storage", "imports");

export type ImportSourceRow = {
  rowNo: number;
  values: string[];
};

export type ImportSourceData = {
  fileName: string;
  fileType: ImportFileType;
  columns: string[];
  rows: ImportSourceRow[];
  requiresConfirm: boolean;
  recognition?: ImportRecognition;
};

export type ImportBatchMetadata = {
  version: 1 | 2 | 3;
  mapping: ImportMapping;
  sourceKey: string;
  confirmed: boolean;
  preparedKey?: string;
  preparedDigest?: string;
  commitStartedAt?: string;
  committedAt?: string;
  report?: ImportCommitResult;
};

type ParsedTable = {
  columns: string[];
  rows: ImportSourceRow[];
};

export class ImportFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportFileError";
  }
}

export class ImportMappingError extends Error {
  status: number;

  constructor(message: string, status = 422) {
    super(message);
    this.name = "ImportMappingError";
    this.status = status;
  }
}

function getFileType(fileName: string): ImportFileType | null {
  const extension = fileName.toLowerCase().split(".").pop();
  return fileTypes.find((fileType) => fileType === extension) ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getImportFile(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new ImportFileError("请选择要上传的文件");
  }
  if (!getFileType(file.name)) {
    throw new ImportFileError("仅支持 .xlsx、.docx、.pdf 格式文件");
  }
  if (file.size === 0) {
    throw new ImportFileError("上传文件不能为空");
  }
  if (file.size > maxFileSize) {
    throw new ImportFileError("文件不能超过 20MB");
  }
  return file;
}

function normalizeColumn(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "").replace(/\(/g, "（").replace(/\)/g, "）");
}

export function suggestImportMapping(columns: string[]): ImportMapping {
  const mapping: ImportMapping = {};
  const usedColumns = new Set<string>();
  for (const field of importSystemFields) {
    const acceptedNames = [field.label, ...field.aliases].map(normalizeColumn);
    const column = acceptedNames
      .map((name) => columns.find((candidate) => !usedColumns.has(candidate) && normalizeColumn(candidate) === name))
      .find((candidate): candidate is string => Boolean(candidate));
    if (column) {
      mapping[field.key] = column;
      usedColumns.add(column);
    }
  }
  return mapping;
}

function makeTable(columns: string[], rows: ImportSourceRow[]): ParsedTable {
  const trimmedColumns = [...columns];
  while (trimmedColumns.length && !trimmedColumns[trimmedColumns.length - 1].trim()) {
    trimmedColumns.pop();
  }
  if (!trimmedColumns.length) {
    throw new ImportFileError("文件中没有可读取的表头");
  }

  const seenColumns = new Set<string>();
  trimmedColumns.forEach((column, index) => {
    const value = column.trim();
    if (!value) {
      throw new ImportFileError(`第 ${index + 1} 列表头为空，请补充后再上传`);
    }
    if (seenColumns.has(value)) {
      throw new ImportFileError(`表头“${value}”重复`);
    }
    seenColumns.add(value);
  });
  trimmedColumns.forEach((_, index) => {
    trimmedColumns[index] = trimmedColumns[index].trim();
  });

  const nonEmptyRows = rows
    .map((row) => ({
      rowNo: row.rowNo,
      values: trimmedColumns.map((_, index) => row.values[index]?.trim() ?? ""),
    }))
    .filter((row) => row.values.some(Boolean));
  if (!nonEmptyRows.length) {
    throw new ImportFileError("文件中没有数据行");
  }
  return { columns: trimmedColumns, rows: nonEmptyRows };
}

function cellText(worksheet: XLSX.WorkSheet, row: number, column: number) {
  const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: column })];
  return cell ? XLSX.utils.format_cell(cell).trim() : "";
}

function parseXlsx(buffer: Buffer): ParsedTable {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    throw new ImportFileError("Excel 文件无法解析，请上传有效的 .xlsx 文件");
  }
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
  if (!worksheet?.["!ref"]) {
    throw new ImportFileError("Excel 中没有可读取的工作表");
  }

  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const headerRow = range.s.r;
  const columns: string[] = [];
  for (let column = range.s.c; column <= range.e.c; column += 1) {
    columns.push(cellText(worksheet, headerRow, column));
  }
  const rows: ImportSourceRow[] = [];
  for (let row = headerRow + 1; row <= range.e.r; row += 1) {
    rows.push({
      rowNo: row + 1,
      values: columns.map((_, index) => cellText(worksheet, row, range.s.c + index)),
    });
  }
  return makeTable(columns, rows);
}

function parseTextTable(text: string, fileLabel: string): ParsedTable {
  const lines = text
    .split(/\r?\n/)
    .map((line, index) => ({ rowNo: index + 1, line: line.trim() }))
    .filter((item) => item.line);
  if (lines.length < 2) {
    throw new ImportFileError(`${fileLabel}中没有足够的文本行，至少需要一行表头和一行数据`);
  }
  const rows = lines.map((item) => ({ rowNo: item.rowNo, values: item.line.split("\t").map((cell) => cell.trim()) }));
  const columns = rows[0].values;
  if (rows.slice(1).some((row) => row.values.length > columns.length)) {
    throw new ImportFileError(`${fileLabel}中存在字段数多于表头的行，请整理为制表符分隔的文本`);
  }
  return makeTable(columns, rows.slice(1));
}

async function parseDocx(buffer: Buffer): Promise<ParsedTable> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return parseTextTable(result.value, "Word 文档");
  } catch (error) {
    if (error instanceof ImportFileError) throw error;
    throw new ImportFileError("Word 文档无法解析，请上传有效的 .docx 文件");
  }
}

async function parsePdf(buffer: Buffer): Promise<ParsedTable> {
  try {
    const result = await pdfParse(buffer);
    return parseTextTable(result.text, "PDF 文档");
  } catch (error) {
    if (error instanceof ImportFileError) throw error;
    throw new ImportFileError("PDF 文档无法解析，请上传包含文本的有效 .pdf 文件");
  }
}

export async function parseImportData(file: File): Promise<ImportSourceData> {
  const fileType = getFileType(file.name);
  if (!fileType) throw new ImportFileError("仅支持 .xlsx、.docx、.pdf 格式文件");
  const buffer = Buffer.from(await file.arrayBuffer());
  const table = fileType === "xlsx"
    ? parseXlsx(buffer)
    : fileType === "docx"
      ? await parseDocx(buffer)
      : await parsePdf(buffer);
  return {
    fileName: file.name,
    fileType,
    columns: table.columns,
    rows: table.rows,
    requiresConfirm: fileType !== "xlsx",
  };
}

function sourcePath(sourceKey: string, fileName: string) {
  const fileType = getFileType(fileName);
  if (!fileType || !/^[0-9a-f-]{36}\.(xlsx|docx|pdf)$/.test(sourceKey) || !sourceKey.endsWith(`.${fileType}`)) {
    throw new ImportFileError("导入源文件标识不正确，请重新上传");
  }
  const resolved = path.resolve(importSourceDirectory, sourceKey);
  if (path.dirname(resolved) !== importSourceDirectory) {
    throw new ImportFileError("导入源文件路径不正确");
  }
  return resolved;
}

async function cleanupImportSources() {
  try {
    const files = await readdir(importSourceDirectory, { withFileTypes: true });
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const file of files) {
      if (!file.isFile()) continue;
      const filePath = path.join(importSourceDirectory, file.name);
      const metadata = await stat(filePath);
      if (metadata.mtimeMs < cutoff) await unlink(filePath);
    }
  } catch (error) {
    console.error("清理导入源文件失败：", error);
  }
}

async function storeImportSource(file: File, fileType: ImportFileType) {
  await mkdir(importSourceDirectory, { recursive: true });
  await cleanupImportSources();
  const sourceKey = `${randomUUID()}.${fileType}`;
  await writeFile(sourcePath(sourceKey, file.name), Buffer.from(await file.arrayBuffer()), { flag: "wx" });
  return sourceKey;
}

export async function readImportSource(sourceKey: string, fileName: string) {
  try {
    const buffer = await readFile(sourcePath(sourceKey, fileName));
    return new File([new Uint8Array(buffer)], fileName);
  } catch (error) {
    if (error instanceof ImportFileError) throw error;
    throw new ImportFileError("导入源文件不存在或不可读取，请重新上传并保存映射");
  }
}

export async function parseImportFile(file: File, actorId: string): Promise<ImportParseResult> {
  const fileType = getFileType(file.name);
  if (!fileType) throw new ImportFileError("仅支持 .xlsx、.docx、.pdf 格式文件");
  let source: ImportSourceData;
  try {
    source = fileType === "xlsx" ? await parseImportData(file) : { fileName: file.name, fileType, requiresConfirm: true, ...await recognizeImportDocument(Buffer.from(await file.arrayBuffer()), fileType) };
  } catch (error) {
    if (error instanceof ImportRecognitionError) throw new ImportFileError(error.message);
    throw error;
  }
  const sourceKey = await storeImportSource(file, source.fileType);
  await writePrepared(sourceKey + ".parsed.json", sourceKey, actorId, source);
  return {
    fileName: source.fileName,
    fileType: source.fileType,
    columns: source.columns,
    previewRows: source.rows.slice(0, previewRowCount).map((row) => row.values),
    previewRowNumbers: source.rows.slice(0, previewRowCount).map((row) => row.rowNo),
    suggestedMapping: suggestImportMapping(source.columns),
    requiresConfirm: source.requiresConfirm,
    totalRows: source.rows.length,
    sourceKey,
    recognition: source.recognition,
    draftRows: source.recognition ? source.rows : undefined,
  };
}

function preparedPath(key: string) {
  if (!/^(?:[0-9a-f-]{36}\.(?:xlsx|docx|pdf)\.parsed|[0-9a-f-]{36}\.reviewed)\.json$/.test(key)) throw new ImportMappingError("识别快照标识无效");
  return path.join(importSourceDirectory, key);
}

async function writePrepared(key: string, sourceKey: string, actorId: string, source: ImportSourceData) {
  const raw = await readFile(sourcePath(sourceKey, source.fileName));
  const data = JSON.stringify({ version: 1, actorId, sourceSha: createHash("sha256").update(raw).digest("hex"), source });
  await writeFile(preparedPath(key), data, { flag: "wx" });
  return createHash("sha256").update(data).digest("hex");
}

async function readPrepared(sourceKey: string, fileName: string, actorId: string, key = sourceKey + ".parsed.json", digest?: string): Promise<ImportSourceData> {
  const data = await readFile(preparedPath(key), "utf8");
  if (digest && createHash("sha256").update(data).digest("hex") !== digest) throw new ImportMappingError("确认快照已发生变化，请重新上传并核对");
  let parsed: unknown;
  try { parsed = JSON.parse(data); } catch { throw new ImportMappingError("识别快照无法读取，请重新上传"); }
  if (!isRecord(parsed) || !isRecord(parsed.source) || parsed.actorId !== actorId) throw new ImportMappingError("该识别结果不属于当前上传管理员", 403);
  const source = parsed.source;
  if (source.fileName !== fileName || source.fileType !== getFileType(fileName) || !Array.isArray(source.columns) || !source.columns.length || source.columns.length > 100 || source.columns.some((column) => typeof column !== "string") || !Array.isArray(source.rows)) throw new ImportMappingError("识别快照格式无效，请重新上传");
  validateReviewedRows(source.rows, source.columns as string[], source.fileType === "xlsx" ? 10000 : 1000);
  const raw = await readFile(sourcePath(sourceKey, fileName));
  if (parsed.sourceSha !== createHash("sha256").update(raw).digest("hex")) throw new ImportMappingError("原始文件已发生变化，请重新上传并核对");
  return source as ImportSourceData;
}

function validateReviewedRows(value: unknown, columns: string[], limit: number): ImportReviewedRow[] {
  if (!Array.isArray(value) || !value.length || value.length > limit) throw new ImportMappingError(`核对结果须为1至${limit}行`);
  const seen = new Set<number>();
  let total = 0;
  const rows = value.map((row) => {
    if (!isRecord(row) || !Number.isInteger(row.rowNo) || Number(row.rowNo) < 1 || Number(row.rowNo) > 1000000 || seen.has(Number(row.rowNo)) || !Array.isArray(row.values) || row.values.length !== columns.length) throw new ImportMappingError("核对结果行号或列数无效");
    seen.add(Number(row.rowNo));
    const values = row.values.map((cell) => { if (typeof cell !== "string" || cell.length > 20000) throw new ImportMappingError("核对单元格内容过长或格式无效"); total += cell.length; return cell.trim(); });
    return { rowNo: Number(row.rowNo), values };
  });
  if (total > 1000000) throw new ImportMappingError("核对数据过多，请分批导入");
  return rows;
}

export async function readImportBatchSource(fileName: string, metadata: ImportBatchMetadata, ownerId: string) {
  if (metadata.version === 3 && metadata.preparedKey && metadata.preparedDigest) {
    try { return await readPrepared(metadata.sourceKey, fileName, ownerId, metadata.preparedKey, metadata.preparedDigest); }
    catch (error) { if (error instanceof ImportMappingError) throw new ImportFileError(error.message); throw new ImportFileError("确认快照或原始文件已失效，请重新上传并核对"); }
  }
  return parseImportData(await readImportSource(metadata.sourceKey, fileName));
}

function storedMapping(value: Record<string, unknown>): ImportMapping {
  const mapping: ImportMapping = {};
  for (const field of importSystemFields) {
    const column = value[field.key];
    if (typeof column === "string" && column) mapping[field.key] = column;
  }
  return mapping;
}

function storedReport(value: unknown): ImportCommitResult | undefined {
  if (!isRecord(value) || !Array.isArray(value.failures)) return undefined;
  const numbers = [value.projectCount, value.continuationCount, value.success, value.failed];
  if (numbers.some((item) => typeof item !== "number" || !Number.isInteger(item) || item < 0)) return undefined;
  const failures = value.failures.flatMap((failure) => {
    if (!isRecord(failure) || typeof failure.rowNo !== "number" || !Number.isInteger(failure.rowNo) ||
      typeof failure.field !== "string" || typeof failure.reason !== "string") return [];
    return [{ rowNo: failure.rowNo, field: failure.field, reason: failure.reason }];
  });
  if (failures.length !== value.failures.length) return undefined;
  return {
    projectCount: value.projectCount as number,
    continuationCount: value.continuationCount as number,
    success: value.success as number,
    failed: value.failed as number,
    failures,
  };
}

export function decodeImportBatchMetadata(value: string): ImportBatchMetadata | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) return null;
    if (!isRecord(parsed.mapping)) {
      return { version: 1, mapping: storedMapping(parsed), sourceKey: "", confirmed: false };
    }
    if (typeof parsed.sourceKey !== "string") return null;
    if (parsed.version === 3 && (typeof parsed.preparedKey !== "string" || typeof parsed.preparedDigest !== "string" || !/^[0-9a-f]{64}$/.test(parsed.preparedDigest))) return null;
    return {
      version: parsed.version === 3 ? 3 : 2,
      mapping: storedMapping(parsed.mapping),
      sourceKey: parsed.sourceKey,
      confirmed: parsed.confirmed === true,
      preparedKey: typeof parsed.preparedKey === "string" ? parsed.preparedKey : undefined,
      preparedDigest: typeof parsed.preparedDigest === "string" ? parsed.preparedDigest : undefined,
      commitStartedAt: typeof parsed.commitStartedAt === "string" ? parsed.commitStartedAt : undefined,
      committedAt: typeof parsed.committedAt === "string" ? parsed.committedAt : undefined,
      report: storedReport(parsed.report),
    };
  } catch {
    return null;
  }
}

function parseMappingInput(body: unknown): ImportMappingSaveInput {
  if (!isRecord(body)) throw new ImportMappingError("请求内容必须为 JSON 对象");
  const competitionId = typeof body.competitionId === "string" ? body.competitionId.trim() : "";
  if (!competitionId) throw new ImportMappingError("请选择赛事");
  if (body.stage !== "SCHOOL" && body.stage !== "PROVINCE") {
    throw new ImportMappingError("阶段仅支持校赛或省赛");
  }
  const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
  const fileType = fileName ? getFileType(fileName) : null;
  if (!fileName || fileName.length > 255 || !fileType) {
    throw new ImportMappingError("请提供有效的 xlsx、docx 或 pdf 文件名");
  }
  if (typeof body.totalRows !== "number" || !Number.isInteger(body.totalRows) || body.totalRows < 1) {
    throw new ImportMappingError("数据行数必须为正整数");
  }
  if (!isRecord(body.mapping)) throw new ImportMappingError("映射方案必须为 JSON 对象");
  const sourceKey = typeof body.sourceKey === "string" ? body.sourceKey : "";
  try {
    sourcePath(sourceKey, fileName);
  } catch (error) {
    throw new ImportMappingError(error instanceof Error ? error.message : "源文件标识不正确");
  }
  const confirmed = body.confirmed === true;
  if (fileType !== "xlsx" && !confirmed) {
    throw new ImportMappingError("Word/PDF 解析结果须经人工确认后才能保存并入库");
  }

  const allowedKeys = new Set<string>(importSystemFields.map((field) => field.key));
  const unknownKey = Object.keys(body.mapping).find((key) => !allowedKeys.has(key));
  if (unknownKey) throw new ImportMappingError(`不支持的系统字段：${unknownKey}`);

  const mapping: ImportMapping = {};
  const usedColumns = new Set<string>();
  for (const field of importSystemFields) {
    const value = body.mapping[field.key];
    if (value === undefined || value === "") continue;
    if (typeof value !== "string" || !value.trim() || value.trim().length > 255) {
      throw new ImportMappingError(`${field.label}的文件列名无效`);
    }
    const column = value.trim();
    if (usedColumns.has(column)) {
      throw new ImportMappingError(`文件列“${column}”不能重复映射`);
    }
    mapping[field.key] = column;
    usedColumns.add(column);
  }
  const missingRequired = importSystemFields.filter((field) => field.required && !mapping[field.key]);
  if (missingRequired.length) {
    throw new ImportMappingError(`必填字段未映射：${missingRequired.map((field) => field.label).join("、")}`);
  }

  return { competitionId, stage: body.stage, fileName, totalRows: body.totalRows, mapping, sourceKey, confirmed, reviewedRows: body.reviewedRows as ImportReviewedRow[] | undefined };
}

export async function saveImportMapping(actorId: string, body: unknown): Promise<ImportMappingSaveResult> {
  const input = parseMappingInput(body);
  try {
    const sourceStat = await stat(sourcePath(input.sourceKey, input.fileName));
    if (!sourceStat.isFile()) throw new Error("not a file");
  } catch {
    throw new ImportMappingError("导入源文件不存在，请重新上传", 404);
  }

  let prepared: ImportSourceData;
  try { prepared = await readPrepared(input.sourceKey, input.fileName, actorId); }
  catch (error) { if (error instanceof Error && "code" in error && error.code === "ENOENT") throw new ImportMappingError("识别快照或源文件已过期，请重新上传并核对"); throw error; }
  if (prepared.rows.length !== input.totalRows) throw new ImportMappingError("源数据行数不一致，请重新上传");
  if (Object.values(input.mapping).some((column) => column && !prepared.columns.includes(column))) throw new ImportMappingError("映射列不在识别结果中");
  if (input.reviewedRows !== undefined) prepared.rows = validateReviewedRows(input.reviewedRows, prepared.columns, prepared.fileType === "xlsx" ? 10000 : 1000);
  const preparedKey = `${randomUUID()}.reviewed.json`;
  const preparedDigest = await writePrepared(preparedKey, input.sourceKey, actorId, prepared);
  try { return await prisma.$transaction(async (transaction) => {
    const competition = await transaction.competition.findUnique({
      where: { id: input.competitionId },
      select: { id: true },
    });
    if (!competition) throw new ImportMappingError("所选赛事不存在", 404);
    const fileType = getFileType(input.fileName);
    if (!fileType) throw new ImportMappingError("文件类型不正确");
    const metadata: ImportBatchMetadata = {
      version: 3,
      mapping: input.mapping,
      sourceKey: input.sourceKey,
      confirmed: input.confirmed,
      preparedKey,
      preparedDigest,
    };

    const batch = await transaction.importBatch.create({
      data: {
        competitionId: input.competitionId,
        stage: input.stage,
        fileName: input.fileName,
        fileType,
        sourceType: "IMPORT",
        totalRows: prepared.rows.length,
        successRows: 0,
        failureRows: 0,
        mappingJson: JSON.stringify(metadata),
        importedBy: actorId,
      },
      select: { id: true },
    });
    await writeAuditLog(
      {
        actorId,
        action: "IMPORT_MAPPING_SAVED",
        targetType: "ImportBatch",
        targetId: batch.id,
        detail: {
          competitionId: input.competitionId,
          stage: input.stage,
          fileName: input.fileName,
          totalRows: input.totalRows,
          mappedFields: Object.keys(input.mapping) as ImportSystemFieldKey[],
          confirmed: input.confirmed,
          reviewedRows: prepared.rows.length,
        },
      },
      transaction,
    );
    return { batchId: batch.id };
  }); } catch (error) { if (preparedKey) await unlink(preparedPath(preparedKey)).catch(() => {}); throw error; }
}
