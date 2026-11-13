import * as XLSX from "xlsx";
import type { Prisma, ProjectStage } from "@prisma/client";
import { decryptField, maskTail } from "@/lib/crypto";
import { globalLabel, loadScopedLabels, trackLabel } from "@/lib/dict-labels";
import type { ScopedLabels } from "@/lib/dict-labels";
import { formatDateTime } from "@/lib/presentation";
import { prisma } from "@/lib/prisma";

const stageLabels: Record<ProjectStage, string> = {
  SCHOOL: "校赛",
  PROVINCE: "省赛",
  NATIONAL: "国赛",
  FINISHED: "已结束",
};

export const formExportFields = [
  "基本信息",
  "指导老师",
  "团队成员",
  "领款人",
  "学生负责人签字",
  "指导老师签字",
  "学院负责人签字",
  "学院党委公章",
];

export type FormCell = string | number;
type FormPair = [string, FormCell];
type FormSection =
  | { kind: "fields"; title: string; pairs: FormPair[] }
  | { kind: "table"; title: string; headers: FormCell[]; records: FormCell[][]; emptyLabel: string };

export type RegistrationFormData = {
  title: string;
  watermarkText: string;
  exportNumber: string;
  signatures: [string, string, string, string];
  sections: FormSection[];
};

export type RegistrationFormOptions = {
  full: boolean;
  exporterName: string;
  exportedAt: Date;
};

const registrationFormInclude = {
  owner: true,
  competition: true,
  track: true,
  payeeMember: { include: { payeeBank: true } },
  teamMembers: { include: { payeeBank: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
  teachers: { orderBy: [{ createdAt: "asc" }] },
  work: true,
} satisfies Prisma.ProjectInclude;

type RegistrationFormProject = Prisma.ProjectGetPayload<{ include: typeof registrationFormInclude }> & {
  labels: ScopedLabels;
  options: RegistrationFormOptions;
  watermarkNo: string;
};

function sensitive(value: string | null, full: boolean) {
  if (!value) return "";
  const plain = decryptField(value);
  return full ? plain : maskTail(plain);
}

export async function loadRegistrationFormProject(projectId: string, watermarkNo: string, options: RegistrationFormOptions): Promise<RegistrationFormProject | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: registrationFormInclude,
  });
  if (!project) return null;
  const labels = await loadScopedLabels();
  return { ...project, labels, options, watermarkNo };
}

export function buildFormRows(project: RegistrationFormProject): RegistrationFormData {
  const { labels, options, watermarkNo } = project;
  const leader = project.teamMembers.find((member) => member.role === "LEADER") ?? project.teamMembers[0];
  const payee = project.payeeMember ?? project.teamMembers.find((member) => member.isPayee);
  const bank = payee?.payeeBank;
  const sections: FormSection[] = [
    {
      kind: "fields",
      title: "一、基本信息",
      pairs: [
        ["赛事名称", project.competition?.name ?? ""], ["赛年", project.year], ["阶段", stageLabels[project.stage]], ["批次", project.batchName ?? ""],
        ["项目名称", project.name], ["赛道", project.track?.name ?? ""], ["项目组别", trackLabel(labels, "GROUP", project.groupName, project.trackId)], ["项目类别", trackLabel(labels, "CATEGORY", project.categoryName, project.trackId)],
        ["申报单位", project.applicationUnit], ["培养单位", project.trainingUnit], ["命题名称", project.propositionName ?? ""], ["命题企业", project.propositionCompany ?? ""],
        ["负责人学号", leader?.personNo ?? project.owner?.studentNo ?? ""], ["负责人姓名", leader?.name ?? project.owner?.name ?? ""], ["年级", project.owner?.grade ?? ""], ["专业", leader?.major ?? project.owner?.major ?? ""],
        ["性别", leader?.gender || project.owner?.gender || ""], ["民族", globalLabel(labels, "ETHNICITY", leader?.ethnicity || project.owner?.ethnicity)], ["培养阶段", globalLabel(labels, "EDUCATION_STAGE", leader?.educationStage || project.owner?.educationStage)], ["入学年份", leader?.enrollmentYear ?? project.owner?.enrollmentYear ?? ""],
        ["毕业年份", leader?.graduationYear ?? project.owner?.graduationYear ?? ""], ["手机号", leader?.phone || project.owner?.phone || ""], ["邮箱", leader?.email || project.owner?.email || ""], ["提交时间", project.submittedAt ? formatDateTime(project.submittedAt.toISOString()) : ""],
        ["作品形式", globalLabel(labels, "WORK_FORM", project.work?.form)], ["作品类别", trackLabel(labels, "CATEGORY", project.work?.category, project.trackId)], ["作品组别", trackLabel(labels, "GROUP", project.work?.groupName, project.trackId)], ["作品文件/外链", project.work?.fileName || project.work?.externalUrl || ""],
        ["备注", project.remark ?? ""],
      ],
    },
    {
      kind: "table",
      title: "二、指导老师",
      headers: ["是否校内", "姓名", "工号", "性别", "手机号", "学校", "单位", "职称", "邮箱", "", "", ""],
      records: project.teachers.map((teacher) => [teacher.isInternal ? "是" : "否", teacher.name, teacher.staffNo ?? "", teacher.gender ?? "", teacher.phone ?? "", teacher.school, teacher.unit, teacher.title ?? "", teacher.email ?? "", "", "", ""]),
      emptyLabel: "暂无指导老师",
    },
    {
      kind: "table",
      title: "三、团队成员",
      headers: ["是否校内", "姓名", "学号", "培养阶段", "培养单位", "专业", "性别", "民族", "入学年份", "毕业年份", "手机号", "邮箱"],
      records: project.teamMembers.map((member) => [
        member.isInternal ? "是" : "否",
        member.name,
        member.personNo ?? "",
        globalLabel(labels, "EDUCATION_STAGE", member.educationStage),
        member.trainingUnit,
        member.major,
        member.gender,
        globalLabel(labels, "ETHNICITY", member.ethnicity),
        member.enrollmentYear ?? "",
        member.graduationYear ?? "",
        member.phone ?? "",
        member.email ?? "",
      ]),
      emptyLabel: "暂无团队成员",
    },
    {
      kind: "fields",
      title: "四、奖金领款人",
      pairs: [
        ["领款人姓名", payee?.name ?? ""], ["领款人学号", payee?.personNo ?? ""], ["已绑定财务平台", bank?.boundFinancePlatform ? "是" : "否"], ["学习/工作单位", bank?.organization ?? ""],
        ["联系电话", bank?.phone ?? payee?.phone ?? ""],
        [options.full ? "身份证号" : "身份证号（脱敏）", bank?.boundFinancePlatform ? "" : sensitive(bank?.idCardEncrypted ?? null, options.full)],
        [options.full ? "银行卡号" : "银行卡号（脱敏）", bank?.boundFinancePlatform ? "" : sensitive(bank?.bankCardEncrypted ?? null, options.full)],
        ["开户行", bank?.bankName ?? ""],
        ["开户人", bank?.accountName ?? ""],
      ],
    },
  ];
  return {
    title: `${project.competition?.name ?? "科创赛事"}报名表`,
    watermarkText: `水印：${project.name}｜${options.exporterName}｜${options.exportedAt.toISOString()}｜${watermarkNo}`,
    exportNumber: `导出编号：${watermarkNo}`,
    signatures: ["学生负责人签字", "指导老师签字", "学院负责人签字", "学院党委公章"],
    sections,
  };
}

export async function createRegistrationForm(projectId: string, watermarkNo: string, options: RegistrationFormOptions) {
  const project = await loadRegistrationFormProject(projectId, watermarkNo, options);
  if (!project) return null;
  const form = buildFormRows(project);
  const rows: FormCell[][] = [];
  const merges: XLSX.Range[] = [];
  const section = (title: string) => {
    const row = rows.length;
    rows.push([title]);
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 11 } });
  };
  const fields = (...pairs: FormPair[]) => {
    const row: FormCell[] = [];
    for (const [name, value] of pairs) row.push(name, value);
    while (row.length < 12) row.push("");
    rows.push(row);
  };

  const titleRow = rows.length;
  rows.push([form.title]);
  merges.push({ s: { r: titleRow, c: 0 }, e: { r: titleRow, c: 11 } });
  if (options.full) {
    const visibleWatermarkRow = rows.length;
    rows.push([form.watermarkText]);
    merges.push({ s: { r: visibleWatermarkRow, c: 0 }, e: { r: visibleWatermarkRow, c: 11 } });
  }
  const signatureRow = rows.length;
  fields(
    [form.signatures[0], ""],
    [form.signatures[1], ""],
    [form.signatures[2], ""],
    [form.signatures[3], ""],
  );
  rows.push([]);

  for (const formSection of form.sections) {
    section(formSection.title);
    if (formSection.kind === "fields") {
      for (let index = 0; index < formSection.pairs.length; index += 4) fields(...formSection.pairs.slice(index, index + 4));
    } else {
      rows.push([...formSection.headers]);
      if (!formSection.records.length) rows.push([formSection.emptyLabel]);
      for (const record of formSection.records) rows.push([...record]);
    }
  }

  const watermarkRow = rows.length;
  rows.push([form.exportNumber]);
  merges.push({ s: { r: watermarkRow, c: 0 }, e: { r: watermarkRow, c: 11 } });

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!merges"] = merges;
  worksheet["!cols"] = [12, 22, 18, 20, 22, 22, 12, 14, 14, 14, 20, 26].map((wch) => ({ wch }));
  worksheet["!rows"] = rows.map((_, index) => index === titleRow ? { hpt: 28 } : index === signatureRow ? { hpt: 24 } : index === signatureRow + 1 ? { hpt: 42 } : { hpt: 22 });
  const workbook = XLSX.utils.book_new();
  if (options.full) {
    workbook.Props = {
      Title: `${project.name}报名表（学院核验）`,
      Subject: form.watermarkText,
      Author: options.exporterName,
      CreatedDate: options.exportedAt,
    };
  }
  XLSX.utils.book_append_sheet(workbook, worksheet, "报名表");
  const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return { output, fileName: `${project.name}_报名表_${options.full ? "学院核验" : "脱敏留存"}.xlsx` };
}
