import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import { recalculateAnomalies } from "@/lib/anomaly-rules";
import { writeAuditLog } from "@/lib/audit";
import { awardStatusLabels } from "@/lib/presentation";
import { prisma } from "@/lib/prisma";
import type {
  ImportCommitResult,
  ImportRowResult,
  ImportValidationReport,
  ValidImportRow,
} from "@/types/import";

const importFields = [
  "项目名称",
  "赛年",
  "学院",
  "赛事名称",
  "奖项等级",
  "证据类型",
  "证据地址",
  "负责人学号",
  "负责人姓名",
] as const;

type ImportField = (typeof importFields)[number];
type ImportClient = Prisma.TransactionClient | PrismaClient;
type RawImportRow = {
  rowNumber: number;
  values: Record<ImportField, string>;
};

export class ImportFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportFileError";
  }
}

export function getImportFile(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new ImportFileError("请选择要上传的 Excel 文件");
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new ImportFileError("仅支持 .xlsx 格式文件");
  }
  if (file.size === 0) {
    throw new ImportFileError("上传文件不能为空");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new ImportFileError("文件不能超过 5MB");
  }
  return file;
}

function cellText(workbook: XLSX.WorkSheet, row: number, column: number) {
  const cell = workbook[XLSX.utils.encode_cell({ r: row, c: column })];
  return cell ? XLSX.utils.format_cell(cell).trim() : "";
}

async function parseImportRows(file: File): Promise<RawImportRow[]> {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" });
  } catch {
    throw new ImportFileError("Excel 文件无法解析，请使用下载的模板");
  }
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
  if (!worksheet?.["!ref"]) {
    throw new ImportFileError("Excel 中没有可读取的工作表");
  }

  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const headerRow = range.s.r;
  if (range.e.r - headerRow > 500) {
    throw new ImportFileError("每次最多导入 500 行数据");
  }
  const headerColumns = new Map<string, number>();
  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const header = cellText(worksheet, headerRow, column);
    if (!header) continue;
    if (headerColumns.has(header)) {
      throw new ImportFileError(`表头“${header}”重复`);
    }
    headerColumns.set(header, column);
  }
  const missingFields = importFields.filter((field) => !headerColumns.has(field));
  if (missingFields.length) {
    throw new ImportFileError(`缺少必需列：${missingFields.join("、")}`);
  }

  const rows: RawImportRow[] = [];
  for (let rowNumber = headerRow + 1; rowNumber <= range.e.r; rowNumber += 1) {
    let empty = true;
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      if (cellText(worksheet, rowNumber, column)) {
        empty = false;
        break;
      }
    }
    if (empty) continue;

    const values = {} as Record<ImportField, string>;
    for (const field of importFields) {
      const column = headerColumns.get(field);
      values[field] = column === undefined ? "" : cellText(worksheet, rowNumber, column);
    }
    rows.push({ rowNumber: rowNumber + 1, values });
  }
  if (!rows.length) {
    throw new ImportFileError("Excel 中没有数据行");
  }
  if (rows.length > 500) {
    throw new ImportFileError("每次最多导入 500 行数据");
  }
  return rows;
}

function parseYear(value: string) {
  if (!/^\d{4}$/.test(value)) return null;
  const year = Number(value);
  return year >= 2000 && year <= 2100 ? year : null;
}

function parseAwardLevel(value: string): ImportRowResult["awardLevel"] {
  if (value === "S" || value === "A" || value === "B" || value === "C" || value === "EXCELLENT") {
    return value;
  }
  return value === "优秀奖" ? "EXCELLENT" : null;
}

function parseEvidenceType(value: string): ImportRowResult["evidenceType"] {
  if (value === "URL" || value === "FILE") return value;
  if (value === "链接") return "URL";
  if (value === "文件") return "FILE";
  return null;
}

function projectKey(name: string, year: number) {
  return `${name.trim()}::${year}`;
}

function competitionKey(name: string, year: number) {
  return `${name.trim()}::${year}`;
}

function isValidRow(row: ImportRowResult): row is ValidImportRow {
  return (
    row.errors.length === 0 &&
    row.year !== null &&
    row.awardLevel !== null &&
    row.evidenceType !== null &&
    row.competitionId !== null
  );
}

export async function validateImportFile(
  file: File,
  client: ImportClient = prisma,
): Promise<ImportValidationReport> {
  const rawRows = await parseImportRows(file);
  const projectNames = [...new Set(rawRows.map((row) => row.values["项目名称"]).filter(Boolean))];
  const competitionNames = [...new Set(rawRows.map((row) => row.values["赛事名称"]).filter(Boolean))];
  const years = [
    ...new Set(
      rawRows
        .map((row) => parseYear(row.values["赛年"]))
        .filter((year): year is number => year !== null),
    ),
  ];

  const competitions = competitionNames.length && years.length
    ? await client.competition.findMany({
        where: { name: { in: competitionNames }, year: { in: years } },
        select: { id: true, name: true, year: true },
      })
    : [];
  const projects = projectNames.length && years.length
    ? await client.project.findMany({
        where: { name: { in: projectNames }, year: { in: years }, deletedAt: null },
        select: {
          id: true,
          name: true,
          year: true,
          college: true,
          teamMembers: {
            where: { leftAt: null },
            select: { personNo: true, name: true, role: true },
          },
          awardRecords: { select: { competitionId: true, status: true } },
        },
      })
    : [];

  const competitionsByKey = new Map(
    competitions.map((competition) => [competitionKey(competition.name, competition.year), competition] as const),
  );
  const projectsByKey = new Map<string, typeof projects>();
  for (const project of projects) {
    const key = projectKey(project.name, project.year);
    const existing = projectsByKey.get(key);
    if (existing) existing.push(project);
    else projectsByKey.set(key, [project]);
  }

  const rows: ImportRowResult[] = rawRows.map((rawRow) => {
    const values = rawRow.values;
    const year = parseYear(values["赛年"]);
    const awardLevel = parseAwardLevel(values["奖项等级"]);
    const evidenceType = parseEvidenceType(values["证据类型"]);
    const row: ImportRowResult = {
      rowNumber: rawRow.rowNumber,
      projectName: values["项目名称"],
      year,
      college: values["学院"],
      competitionName: values["赛事名称"],
      awardLevel,
      evidenceType,
      evidenceRef: values["证据地址"],
      leaderPersonNo: values["负责人学号"],
      leaderName: values["负责人姓名"],
      projectId: null,
      competitionId: null,
      newProject: true,
      errors: [],
    };
    const addError = (field: string, reason: string) => {
      row.errors.push({ field, reason });
    };

    for (const field of importFields) {
      if (!values[field]) addError(field, "必填字段不能为空");
    }
    if (values["赛年"] && year === null) {
      addError("赛年", "须为 2000–2100 之间的四位数字年份");
    }
    if (values["负责人学号"] && !/^\d{10}$/.test(values["负责人学号"])) {
      addError("负责人学号", "学号须为 10 位数字");
    }
    if (values["奖项等级"] && awardLevel === null) {
      addError("奖项等级", "仅支持 S、A、B、C、EXCELLENT 或优秀奖");
    }
    if (values["证据类型"] && evidenceType === null) {
      addError("证据类型", "仅支持 URL、FILE、链接或文件");
    }
    if (evidenceType === "URL" && values["证据地址"]) {
      try {
        const url = new URL(values["证据地址"]);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          addError("证据地址", "链接仅支持 HTTP 或 HTTPS");
        }
      } catch {
        addError("证据地址", "请输入完整有效的链接地址");
      }
    }
    return row;
  });

  const seenAwards = new Map<string, number>();
  const projectInputs = new Map<string, ImportRowResult>();
  for (const row of rows) {
    if (row.projectName && row.year !== null && row.competitionName) {
      const key = `${projectKey(row.projectName, row.year)}::${row.competitionName}`;
      const firstRowNumber = seenAwards.get(key);
      if (firstRowNumber !== undefined) {
        row.errors.push({ field: "项目名称", reason: `与第 ${firstRowNumber} 行重复（同项目同赛事）` });
      } else {
        seenAwards.set(key, row.rowNumber);
      }
    }
    if (row.projectName && row.year !== null) {
      const key = projectKey(row.projectName, row.year);
      const first = projectInputs.get(key);
      if (!first) {
        projectInputs.set(key, row);
      } else {
        if (first.college !== row.college) {
          row.errors.push({ field: "学院", reason: `同学年同项目的学院与第 ${first.rowNumber} 行不一致` });
        }
        if (first.leaderPersonNo !== row.leaderPersonNo) {
          row.errors.push({ field: "负责人学号", reason: `与第 ${first.rowNumber} 行的项目负责人学号不一致` });
        }
        if (first.leaderName !== row.leaderName) {
          row.errors.push({ field: "负责人姓名", reason: `与第 ${first.rowNumber} 行的项目负责人姓名不一致` });
        }
      }
    }

    if (row.competitionName && row.year !== null) {
      const competition = competitionsByKey.get(competitionKey(row.competitionName, row.year));
      if (!competition) {
        row.errors.push({ field: "赛事名称", reason: `未找到与赛年 ${row.year} 匹配的赛事` });
      } else {
        row.competitionId = competition.id;
      }
    }

    if (!row.projectName || row.year === null || !row.college) continue;
    const candidates = projectsByKey.get(projectKey(row.projectName, row.year)) ?? [];
    const exactProjects = candidates.filter((project) => project.college === row.college);
    if (!exactProjects.length) {
      if (candidates.length) {
        row.errors.push({
          field: "学院",
          reason: `同赛年同名项目已属于${candidates.map((project) => project.college).join("、")}`,
        });
      }
      continue;
    }
    if (exactProjects.length > 1) {
      row.newProject = false;
      row.errors.push({ field: "项目名称", reason: "存在多个同学年同学院的同名项目，无法确定导入目标" });
      continue;
    }

    const project = exactProjects[0];
    row.projectId = project.id;
    row.newProject = false;
    const studentCount = project.teamMembers.filter((member) => member.role !== "TEACHER").length;
    const teacherCount = project.teamMembers.filter((member) => member.role === "TEACHER").length;
    if (studentCount < 1 || studentCount > 10) {
      row.errors.push({ field: "团队人数", reason: `当前负责人及成员共 ${studentCount} 人，要求 1–10 人` });
    }
    if (teacherCount > 3) {
      row.errors.push({ field: "团队人数", reason: `当前指导教师共 ${teacherCount} 人，不能超过 3 人` });
    }
    const leaders = project.teamMembers.filter((member) => member.role === "LEADER");
    if (leaders.length !== 1) {
      row.errors.push({ field: "团队人数", reason: `当前负责人数量为 ${leaders.length}，应为 1 人` });
    }
    const leader = leaders.find((member) => member.personNo === row.leaderPersonNo);
    if (!leader) {
      row.errors.push({ field: "负责人学号", reason: "与项目现有负责人的学号不一致" });
    } else if (leader.name !== row.leaderName) {
      row.errors.push({ field: "负责人姓名", reason: "与该学号对应的现有负责人姓名不一致" });
    }

    if (row.competitionId) {
      const duplicate = project.awardRecords.find((award) => award.competitionId === row.competitionId);
      if (duplicate) {
        row.errors.push({
          field: "赛事名称",
          reason: `同项目同赛事已存在${awardStatusLabels[duplicate.status]}获奖记录`,
        });
      }
    }
  }

  const validRows = rows.filter(isValidRow).length;
  return {
    fileName: file.name,
    totalRows: rows.length,
    validRows,
    invalidRows: rows.length - validRows,
    rows,
  };
}

export type ImportCommitResponse =
  | { ok: true; result: ImportCommitResult }
  | { ok: false; message: string; report: ImportValidationReport };

export async function commitImportFile(file: File, actorId: string, onlyValid: boolean): Promise<ImportCommitResponse> {
  return prisma.$transaction(
    async (transaction) => {
      const report = await validateImportFile(file, transaction);
      const validRows = report.rows.filter(isValidRow);
      if ((!onlyValid && report.invalidRows > 0) || !validRows.length) {
        return {
          ok: false,
          message: validRows.length ? "存在校验错误，请修正文件或选择仅导入有效行" : "没有可导入的有效行",
          report,
        };
      }

      const now = new Date();
      const batchId = randomUUID();
      await transaction.importBatch.create({
        data: {
          id: batchId,
          fileName: file.name,
          sourceType: "IMPORT",
          totalRows: report.totalRows,
          successRows: validRows.length,
          failureRows: report.invalidRows,
          importedBy: actorId,
          createdAt: now,
        },
      });

      const newProjects = new Map<string, { id: string; teamMemberId: string; row: ValidImportRow }>();
      const awards: Prisma.AwardRecordCreateManyInput[] = [];
      const sources: Prisma.DataSourceCreateManyInput[] = [];
      for (const row of validRows) {
        let projectId = row.projectId;
        if (projectId === null) {
          const key = projectKey(row.projectName, row.year);
          const existing = newProjects.get(key);
          if (existing) {
            projectId = existing.id;
          } else {
            projectId = randomUUID();
            const teamMemberId = randomUUID();
            newProjects.set(key, { id: projectId, teamMemberId, row });
            const sourceRef = `${file.name} · 第 ${row.rowNumber} 行`;
            sources.push(
              {
                recordType: "Project",
                recordId: projectId,
                sourceType: "IMPORT",
                sourceRef,
                batchId,
                syncedAt: now,
              },
              {
                recordType: "TeamMember",
                recordId: teamMemberId,
                sourceType: "IMPORT",
                sourceRef,
                batchId,
                syncedAt: now,
              },
            );
          }
        }

        const awardId = randomUUID();
        awards.push({
          id: awardId,
          projectId,
          competitionId: row.competitionId,
          awardLevel: row.awardLevel,
          evidenceType: row.evidenceType,
          evidenceRef: row.evidenceRef,
          verifiedBy: actorId,
          verifiedAt: now,
          status: "VERIFIED",
          createdAt: now,
        });
        sources.push({
          recordType: "AwardRecord",
          recordId: awardId,
          sourceType: "IMPORT",
          sourceRef: `${file.name} · 第 ${row.rowNumber} 行`,
          batchId,
          syncedAt: now,
        });
      }

      if (newProjects.size) {
        await transaction.project.createMany({
          data: [...newProjects.values()].map(({ id, row }) => ({
            id,
            name: row.projectName,
            college: row.college,
            year: row.year,
            status: "ACTIVE",
            createdAt: now,
          })),
        });
        await transaction.teamMember.createMany({
          data: [...newProjects.values()].map(({ id, teamMemberId, row }) => ({
            id: teamMemberId,
            projectId: id,
            personNo: row.leaderPersonNo,
            name: row.leaderName,
            role: "LEADER",
            joinedAt: now,
          })),
        });
      }
      await transaction.awardRecord.createMany({ data: awards });
      await transaction.dataSource.createMany({ data: sources });
      await writeAuditLog(
        {
          actorId,
          action: "IMPORT_COMMITTED",
          targetType: "ImportBatch",
          targetId: batchId,
          detail: {
            fileName: file.name,
            totalRows: report.totalRows,
            successRows: validRows.length,
            failureRows: report.invalidRows,
            onlyValid,
          },
        },
        transaction,
      );
      const anomalyResult = await recalculateAnomalies(transaction);

      return {
        ok: true,
        result: {
          batchId,
          totalRows: report.totalRows,
          successRows: validRows.length,
          failureRows: report.invalidRows,
          anomalyMatches: anomalyResult.matched,
        },
      };
    },
    { timeout: 20000 },
  );
}
