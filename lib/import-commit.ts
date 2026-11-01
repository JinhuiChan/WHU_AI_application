import { randomUUID } from "node:crypto";
import * as XLSX from "xlsx";
import { writeAuditLog } from "@/lib/audit";
import {
  decodeImportBatchMetadata,
  ImportFileError,
  parseImportData,
  readImportSource,
  type ImportBatchMetadata,
  type ImportSourceRow,
} from "@/lib/import";
import { prisma } from "@/lib/prisma";
import {
  importSystemFields,
  type ImportCommitResult,
  type ImportFailure,
  type ImportMapping,
  type ImportSystemFieldKey,
} from "@/types/import";

type MappedRow = {
  rowNo: number;
  values: Partial<Record<ImportSystemFieldKey, string>>;
};

type ProjectGroup = {
  main: MappedRow;
  continuations: MappedRow[];
};

type MemberDraft = {
  rowNo: number;
  personNo: string | null;
  name: string;
  isInternal: boolean;
  educationStage: string;
  trainingUnit: string;
  major: string;
  gender: string;
  ethnicity: string;
  enrollmentYear: number | null;
  graduationYear: number | null;
  phone: string | null;
  email: string | null;
};

type TeacherDraft = {
  rowNo: number;
  staffNo: string | null;
  name: string;
  isInternal: boolean;
  gender: string | null;
  phone: string | null;
  school: string;
  unit: string;
  title: string | null;
  email: string | null;
};

type PeopleDraft = {
  members: MemberDraft[];
  teachers: TeacherDraft[];
  failures: ImportFailure[];
};

export class ImportCommitError extends Error {
  status: number;

  constructor(message: string, status = 422) {
    super(message);
    this.name = "ImportCommitError";
    this.status = status;
  }
}

class DuplicateProjectError extends Error {}

function mapRow(row: ImportSourceRow, columns: string[], mapping: ImportMapping): MappedRow {
  const values: Partial<Record<ImportSystemFieldKey, string>> = {};
  for (const field of importSystemFields) {
    const column = mapping[field.key];
    const index = column ? columns.indexOf(column) : -1;
    values[field.key] = index >= 0 ? row.values[index] ?? "" : "";
  }
  return { rowNo: row.rowNo, values };
}

function groupRows(rows: MappedRow[]) {
  const groups: ProjectGroup[] = [];
  const failures: ImportFailure[] = [];
  let continuationCount = 0;
  let current: ProjectGroup | null = null;

  for (const row of rows) {
    if (row.values.projectName) {
      current = { main: row, continuations: [] };
      groups.push(current);
      continue;
    }
    if (row.values.members || row.values.teachers) {
      continuationCount += 1;
      if (current) current.continuations.push(row);
      else failures.push({ rowNo: row.rowNo, field: "项目名称", reason: "续行之前没有可归属的项目首行" });
      continue;
    }
  }
  return { groups, failures, continuationCount };
}

function parseYear(value: string, rowNo: number, field: string, failures: ImportFailure[]) {
  if (!value) return null;
  if (!/^\d+$/.test(value)) {
    failures.push({ rowNo, field, reason: "须为数字年份" });
    return null;
  }
  const year = Number(value);
  if (!Number.isSafeInteger(year)) {
    failures.push({ rowNo, field, reason: "数字年份超出支持范围" });
    return null;
  }
  return year;
}

function validateMainRow(row: MappedRow) {
  const failures: ImportFailure[] = [];
  const required: Array<[ImportSystemFieldKey, string]> = [
    ["projectName", "项目名称"],
    ["leaderPersonNo", "负责人学号"],
    ["leaderName", "负责人姓名"],
    ["college", "学院"],
  ];
  for (const [key, label] of required) {
    if (!row.values[key]) failures.push({ rowNo: row.rowNo, field: label, reason: "必填字段不能为空" });
  }
  const leaderPersonNo = row.values.leaderPersonNo ?? "";
  if (leaderPersonNo && !/^\d{6,20}$/.test(leaderPersonNo)) {
    failures.push({ rowNo: row.rowNo, field: "负责人学号", reason: "学号须为 6–20 位数字" });
  }
  const phone = row.values.phone ?? "";
  if (phone && !/^\d{11}$/.test(phone)) {
    failures.push({ rowNo: row.rowNo, field: "手机号", reason: "手机号须为 11 位数字" });
  }
  const enrollmentYear = parseYear(row.values.enrollmentYear ?? "", row.rowNo, "入学年份", failures);
  const graduationYear = parseYear(row.values.graduationYear ?? "", row.rowNo, "毕业年份", failures);
  return { failures, enrollmentYear, graduationYear };
}

function personLines(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => line.split(",").map((cell) => cell.trim()));
}

function parsePeople(row: MappedRow, leaderPersonNo: string): PeopleDraft {
  const members: MemberDraft[] = [];
  const teachers: TeacherDraft[] = [];
  const failures: ImportFailure[] = [];

  personLines(row.values.members ?? "").forEach((cells, index) => {
    const name = cells[1] ?? "";
    const personNo = cells[2] ?? "";
    if (personNo && personNo === leaderPersonNo) return;
    const rowFailures: ImportFailure[] = [];
    if (!name) rowFailures.push({ rowNo: row.rowNo, field: "成员", reason: `第 ${index + 1} 个成员姓名缺失` });
    if (personNo && !/^\d{6,20}$/.test(personNo)) {
      rowFailures.push({ rowNo: row.rowNo, field: "成员", reason: `第 ${index + 1} 个成员学号须为 6–20 位数字` });
    }
    const enrollmentYear = parseYear(cells[8] ?? "", row.rowNo, "成员入学年份", rowFailures);
    const graduationYear = parseYear(cells[9] ?? "", row.rowNo, "成员毕业年份", rowFailures);
    const phone = cells[10] ?? "";
    if (phone && !/^\d{11}$/.test(phone)) {
      rowFailures.push({ rowNo: row.rowNo, field: "成员手机号", reason: `第 ${index + 1} 个成员手机号须为 11 位数字` });
    }
    if (rowFailures.length) {
      failures.push(...rowFailures);
      return;
    }
    members.push({
      rowNo: row.rowNo,
      personNo: personNo || null,
      name,
      isInternal: cells[0] === "是",
      educationStage: cells[3] ?? "",
      trainingUnit: cells[4] ?? "",
      major: cells[5] ?? "",
      gender: cells[6] ?? "",
      ethnicity: cells[7] || "汉族",
      enrollmentYear,
      graduationYear,
      phone: phone || null,
      email: cells[11] || null,
    });
  });

  personLines(row.values.teachers ?? "").forEach((cells, index) => {
    const name = cells[1] ?? "";
    const phone = cells[4] ?? "";
    const rowFailures: ImportFailure[] = [];
    if (!name) rowFailures.push({ rowNo: row.rowNo, field: "指导老师", reason: `第 ${index + 1} 位老师姓名缺失` });
    if (phone && !/^\d{11}$/.test(phone)) {
      rowFailures.push({ rowNo: row.rowNo, field: "指导老师手机号", reason: `第 ${index + 1} 位老师手机号须为 11 位数字` });
    }
    if (rowFailures.length) {
      failures.push(...rowFailures);
      return;
    }
    teachers.push({
      rowNo: row.rowNo,
      staffNo: cells[2] || null,
      name,
      isInternal: cells[0] === "是",
      gender: cells[3] || null,
      phone: phone || null,
      school: cells[5] || "武汉大学",
      unit: cells[6] ?? "",
      title: cells[7] || null,
      email: cells[8] || null,
    });
  });

  return { members, teachers, failures };
}

function splitTrack(row: MappedRow) {
  const source = row.values.track ?? "";
  if (!source) {
    return { trackName: "", groupName: row.values.group ?? "", categoryName: row.values.category ?? "" };
  }
  const parts = source.split("/").map((part) => part.trim());
  return {
    trackName: parts[0] ?? "",
    groupName: parts[1] ?? "",
    categoryName: parts.length > 2 ? parts.slice(2).join("/") : "",
  };
}

function sourceRef(fileName: string, rowNo: number) {
  return `${fileName} · 第 ${rowNo} 行`;
}

function blockedContinuations(group: ProjectGroup, reason: string): ImportFailure[] {
  return group.continuations.map((row) => ({ rowNo: row.rowNo, field: "项目名称", reason }));
}

export async function commitImportBatch(batchId: string, actorId: string): Promise<ImportCommitResult> {
  if (!batchId.trim()) throw new ImportCommitError("请提供入库批次 batchId");
  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId.trim() },
    include: {
      competition: {
        select: {
          id: true,
          year: true,
          tracks: { where: { enabled: true }, select: { id: true, name: true } },
        },
      },
    },
  });
  if (!batch) throw new ImportCommitError("导入批次不存在", 404);
  const metadata = decodeImportBatchMetadata(batch.mappingJson);
  if (!metadata) throw new ImportCommitError("批次映射内容无法读取");
  if (metadata.commitStartedAt || metadata.committedAt || batch.successRows > 0 || batch.failureRows > 0) {
    throw new ImportCommitError("该批次已入库或正在入库，不能重复执行", 409);
  }
  if (!batch.competitionId || !batch.competition) throw new ImportCommitError("批次未关联有效赛事");
  if (!metadata.sourceKey) throw new ImportCommitError("该批次没有源文件，请重新上传并保存映射");
  if (batch.fileType !== "xlsx" && !metadata.confirmed) {
    throw new ImportCommitError("Word/PDF 解析结果尚未人工确认，不能入库");
  }

  const source = await parseImportData(await readImportSource(metadata.sourceKey, batch.fileName));
  if (source.rows.length !== batch.totalRows) {
    throw new ImportCommitError("源文件行数与批次不一致，请重新上传并保存映射");
  }
  for (const field of importSystemFields) {
    const column = metadata.mapping[field.key];
    if (field.required && !column) throw new ImportCommitError(`必填字段未映射：${field.label}`);
    if (column && !source.columns.includes(column)) throw new ImportCommitError(`文件列不存在：${column}`);
  }

  const claimedMetadata: ImportBatchMetadata = { ...metadata, commitStartedAt: new Date().toISOString() };
  const claim = await prisma.importBatch.updateMany({
    where: { id: batch.id, mappingJson: batch.mappingJson },
    data: { mappingJson: JSON.stringify(claimedMetadata) },
  });
  if (claim.count !== 1) throw new ImportCommitError("该批次已入库或正在入库，不能重复执行", 409);

  const mappedRows = source.rows.map((row) => mapRow(row, source.columns, metadata.mapping));
  const { groups, failures: initialFailures, continuationCount } = groupRows(mappedRows);
  const failures = [...initialFailures];
  const existingProjects = await prisma.project.findMany({
    where: { competitionId: batch.competitionId, deletedAt: null },
    select: { name: true },
  });
  const projectNames = new Set(existingProjects.map((project) => project.name));
  const tracksByName = new Map(batch.competition.tracks.map((track) => [track.name, track.id]));
  const competitionYear = batch.competition.year;
  let success = 0;

  for (const group of groups) {
    const main = group.main;
    const projectName = main.values.projectName as string;
    const mainValidation = validateMainRow(main);
    if (projectNames.has(projectName)) {
      mainValidation.failures.push({ rowNo: main.rowNo, field: "项目名称", reason: "同一赛事下项目名重复，已跳过" });
    }
    if (mainValidation.failures.length) {
      failures.push(...mainValidation.failures);
      failures.push(...blockedContinuations(group, "所属项目首行未通过校验或重复，续行未合并"));
      continue;
    }
    projectNames.add(projectName);

    const peopleRows = [main, ...group.continuations];
    const people = peopleRows.map((row) => parsePeople(row, main.values.leaderPersonNo as string));
    people.forEach((item) => failures.push(...item.failures));
    const members = people.flatMap((item) => item.members);
    const teachers = people.flatMap((item) => item.teachers);
    const teacherStaffNumbers = new Set<string>();
    const uniqueTeachers = teachers.filter((teacher) => {
      if (!teacher.staffNo) return true;
      if (teacherStaffNumbers.has(teacher.staffNo)) {
        failures.push({ rowNo: teacher.rowNo, field: "指导老师", reason: `工号 ${teacher.staffNo} 在本项目中重复，已跳过` });
        return false;
      }
      teacherStaffNumbers.add(teacher.staffNo);
      return true;
    });
    const track = splitTrack(main);
    const now = new Date();

    try {
      await prisma.$transaction(async (transaction) => {
        const duplicate = await transaction.project.findFirst({
          where: { competitionId: batch.competitionId, name: projectName, deletedAt: null },
          select: { id: true },
        });
        if (duplicate) throw new DuplicateProjectError();

        const project = await transaction.project.create({
          data: {
            name: projectName,
            college: main.values.college as string,
            year: competitionYear,
            competitionId: batch.competitionId,
            trackId: track.trackName ? tracksByName.get(track.trackName) ?? null : null,
            applicationUnit: main.values.applicationUnit || main.values.college || "",
            trainingUnit: main.values.trainingUnit || main.values.college || "",
            groupName: track.groupName || null,
            categoryName: track.categoryName || null,
            stage: batch.stage,
            status: "PENDING",
            reviewStatus: "PENDING",
            submittedAt: now,
          },
          select: { id: true },
        });
        const leaderId = randomUUID();
        const isPayee = main.values.payee === "是";
        await transaction.teamMember.create({
          data: {
            id: leaderId,
            projectId: project.id,
            personNo: main.values.leaderPersonNo,
            name: main.values.leaderName as string,
            role: "LEADER",
            educationStage: main.values.educationStage ?? "",
            trainingUnit: main.values.trainingUnit || main.values.college || "",
            gender: main.values.gender ?? "",
            ethnicity: main.values.ethnicity || "汉族",
            enrollmentYear: mainValidation.enrollmentYear,
            graduationYear: mainValidation.graduationYear,
            phone: main.values.phone || null,
            email: main.values.email || null,
            sortOrder: 0,
            isPayee,
          },
        });
        if (isPayee) {
          await transaction.project.update({ where: { id: project.id }, data: { payeeMemberId: leaderId } });
        }

        const sources = [
          {
            recordType: "Project",
            recordId: project.id,
            sourceType: "IMPORT" as const,
            sourceRef: sourceRef(batch.fileName, main.rowNo),
            batchId: batch.id,
            syncedAt: now,
          },
          {
            recordType: "TeamMember",
            recordId: leaderId,
            sourceType: "IMPORT" as const,
            sourceRef: sourceRef(batch.fileName, main.rowNo),
            batchId: batch.id,
            syncedAt: now,
          },
        ];
        for (const [index, member] of members.entries()) {
          const id = randomUUID();
          await transaction.teamMember.create({
            data: {
              id,
              projectId: project.id,
              personNo: member.personNo,
              name: member.name,
              role: "MEMBER",
              isInternal: member.isInternal,
              educationStage: member.educationStage,
              trainingUnit: member.trainingUnit,
              major: member.major,
              gender: member.gender,
              ethnicity: member.ethnicity,
              enrollmentYear: member.enrollmentYear,
              graduationYear: member.graduationYear,
              phone: member.phone,
              email: member.email,
              sortOrder: index + 1,
            },
          });
          sources.push({
            recordType: "TeamMember",
            recordId: id,
            sourceType: "IMPORT",
            sourceRef: sourceRef(batch.fileName, member.rowNo),
            batchId: batch.id,
            syncedAt: now,
          });
        }
        for (const teacher of uniqueTeachers) {
          const id = randomUUID();
          await transaction.teacher.create({
            data: {
              id,
              projectId: project.id,
              staffNo: teacher.staffNo,
              name: teacher.name,
              isInternal: teacher.isInternal,
              gender: teacher.gender,
              phone: teacher.phone,
              school: teacher.school,
              unit: teacher.unit,
              title: teacher.title,
              email: teacher.email,
              confirmStatus: "PENDING",
            },
          });
          sources.push({
            recordType: "Teacher",
            recordId: id,
            sourceType: "IMPORT",
            sourceRef: sourceRef(batch.fileName, teacher.rowNo),
            batchId: batch.id,
            syncedAt: now,
          });
        }
        if (main.values.workForm || main.values.workCategory || main.values.workGroup) {
          const workId = randomUUID();
          await transaction.work.create({
            data: {
              id: workId,
              projectId: project.id,
              form: main.values.workForm ?? "",
              category: main.values.workCategory || null,
              groupName: main.values.workGroup || null,
            },
          });
          sources.push({
            recordType: "Work",
            recordId: workId,
            sourceType: "IMPORT",
            sourceRef: sourceRef(batch.fileName, main.rowNo),
            batchId: batch.id,
            syncedAt: now,
          });
        }
        await transaction.dataSource.createMany({ data: sources });
      });
      success += 1;
    } catch (error) {
      if (error instanceof DuplicateProjectError) {
        failures.push({ rowNo: main.rowNo, field: "项目名称", reason: "同一赛事下项目名重复，已跳过" });
        failures.push(...blockedContinuations(group, "所属项目名称重复，续行未合并"));
      } else {
        failures.push({ rowNo: main.rowNo, field: "数据库", reason: "项目写入失败，本项目已回滚" });
        failures.push(...blockedContinuations(group, "所属项目写入失败，续行未合并"));
      }
    }
  }

  failures.sort((left, right) => left.rowNo - right.rowNo);
  const report: ImportCommitResult = {
    projectCount: groups.length,
    continuationCount,
    success,
    failed: new Set(failures.map((failure) => failure.rowNo)).size,
    failures,
  };
  const completedMetadata: ImportBatchMetadata = {
    ...claimedMetadata,
    committedAt: new Date().toISOString(),
    report,
  };
  await prisma.$transaction(async (transaction) => {
    await transaction.importBatch.update({
      where: { id: batch.id },
      data: {
        successRows: success,
        failureRows: report.failed,
        mappingJson: JSON.stringify(completedMetadata),
      },
    });
    await writeAuditLog(
      {
        actorId,
        action: "IMPORT_COMMITTED",
        targetType: "ImportBatch",
        targetId: batch.id,
        detail: {
          projectCount: report.projectCount,
          continuationCount: report.continuationCount,
          success: report.success,
          failed: report.failed,
        },
      },
      transaction,
    );
  });
  return report;
}

export async function createImportFailedExport(batchId: string, watermarkNo: string) {
  const batch = await prisma.importBatch.findUnique({ where: { id: batchId }, select: { fileName: true, mappingJson: true } });
  if (!batch) throw new ImportCommitError("导入批次不存在", 404);
  const metadata = decodeImportBatchMetadata(batch.mappingJson);
  if (!metadata?.committedAt || !metadata.report) throw new ImportCommitError("该批次尚未完成入库", 409);
  if (!metadata.report.failures.length) throw new ImportCommitError("该批次没有失败行");
  if (!metadata.sourceKey) throw new ImportCommitError("该批次没有源文件，无法导出失败行");

  let source;
  try {
    source = await parseImportData(await readImportSource(metadata.sourceKey, batch.fileName));
  } catch (error) {
    if (error instanceof ImportFileError) throw new ImportCommitError(error.message);
    throw error;
  }
  const rowsByNumber = new Map(source.rows.map((row) => [row.rowNo, row.values]));
  const failuresByRow = new Map<number, ImportFailure[]>();
  for (const failure of metadata.report.failures) {
    const existing = failuresByRow.get(failure.rowNo) ?? [];
    existing.push(failure);
    failuresByRow.set(failure.rowNo, existing);
  }
  const rows = [...failuresByRow.entries()]
    .sort(([left], [right]) => left - right)
    .map(([rowNo, failures]) => [
      ...(rowsByNumber.get(rowNo) ?? source.columns.map(() => "")),
      [...new Set(failures.map((failure) => failure.field))].join("、"),
      failures.map((failure) => failure.reason).join("；"),
    ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([[...source.columns, "错误列", "错误原因"], ...rows]), "失败行");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["导出水印号", watermarkNo]]), "导出信息");
  const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const baseName = batch.fileName.replace(/\.(xlsx|docx|pdf)$/i, "").replace(/[<>:"/\\|?*\x00-\x1f]/g, "_") || "导入批次";
  return { output, rowCount: rows.length, fileName: `${baseName}_失败行.xlsx` };
}
