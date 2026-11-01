import * as XLSX from "xlsx";
import type { ProjectStage } from "@prisma/client";
import { decryptField, maskTail } from "@/lib/crypto";
import { getLabelMap } from "@/lib/dict";
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

type Cell = string | number;

type RegistrationFormOptions = {
  full: boolean;
  exporterName: string;
  exportedAt: Date;
};

function sensitive(value: string | null, full: boolean) {
  if (!value) return "";
  const plain = decryptField(value);
  return full ? plain : maskTail(plain);
}

export async function createRegistrationForm(projectId: string, watermarkNo: string, options: RegistrationFormOptions) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: {
      owner: true,
      competition: true,
      track: true,
      payeeMember: { include: { payeeBank: true } },
      teamMembers: { include: { payeeBank: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      teachers: { orderBy: { createdAt: "asc" } },
      work: true,
    },
  });
  if (!project) return null;
  const [educationStages, ethnicities, workForms, groups, categories] = await Promise.all([
    getLabelMap("EDUCATION_STAGE"),
    getLabelMap("ETHNICITY"),
    getLabelMap("WORK_FORM"),
    getLabelMap("GROUP"),
    getLabelMap("CATEGORY"),
  ]);
  const label = (map: Record<string, string>, value: string | null | undefined) => value ? map[value] ?? value : "";
  const leader = project.teamMembers.find((member) => member.role === "LEADER") ?? project.teamMembers[0];
  const payee = project.payeeMember ?? project.teamMembers.find((member) => member.isPayee);
  const bank = payee?.payeeBank;
  const rows: Cell[][] = [];
  const merges: XLSX.Range[] = [];
  const section = (title: string) => {
    const row = rows.length;
    rows.push([title]);
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 11 } });
  };
  const fields = (...pairs: [string, Cell][]) => {
    const row: Cell[] = [];
    for (const [name, value] of pairs) row.push(name, value);
    while (row.length < 12) row.push("");
    rows.push(row);
  };

  const titleRow = rows.length;
  rows.push([`${project.competition?.name ?? "科创赛事"}报名表`]);
  merges.push({ s: { r: titleRow, c: 0 }, e: { r: titleRow, c: 11 } });
  const watermarkText = `水印：${project.name}｜${options.exporterName}｜${options.exportedAt.toISOString()}｜${watermarkNo}`;
  if (options.full) {
    const visibleWatermarkRow = rows.length;
    rows.push([watermarkText]);
    merges.push({ s: { r: visibleWatermarkRow, c: 0 }, e: { r: visibleWatermarkRow, c: 11 } });
  }
  const signatureRow = rows.length;
  fields(
    ["学生负责人签字", ""],
    ["指导老师签字", ""],
    ["学院负责人签字", ""],
    ["学院党委公章", ""],
  );
  rows.push([]);

  section("一、基本信息");
  fields(["赛事名称", project.competition?.name ?? ""], ["赛年", project.year], ["阶段", stageLabels[project.stage]], ["批次", project.batchName ?? ""]);
  fields(["项目名称", project.name], ["赛道", project.track?.name ?? ""], ["项目组别", label(groups, project.groupName)], ["项目类别", label(categories, project.categoryName)]);
  fields(["申报单位", project.applicationUnit], ["培养单位", project.trainingUnit], ["命题名称", project.propositionName ?? ""], ["命题企业", project.propositionCompany ?? ""]);
  fields(["负责人学号", leader?.personNo ?? project.owner?.studentNo ?? ""], ["负责人姓名", leader?.name ?? project.owner?.name ?? ""], ["年级", project.owner?.grade ?? ""], ["专业", leader?.major ?? project.owner?.major ?? ""]);
  fields(["性别", leader?.gender || project.owner?.gender || ""], ["民族", label(ethnicities, leader?.ethnicity || project.owner?.ethnicity)], ["培养阶段", label(educationStages, leader?.educationStage || project.owner?.educationStage)], ["入学年份", leader?.enrollmentYear ?? project.owner?.enrollmentYear ?? ""]);
  fields(["毕业年份", leader?.graduationYear ?? project.owner?.graduationYear ?? ""], ["手机号", leader?.phone || project.owner?.phone || ""], ["邮箱", leader?.email || project.owner?.email || ""], ["提交时间", project.submittedAt?.toISOString() ?? ""]);
  fields(["作品形式", label(workForms, project.work?.form)], ["作品类别", label(categories, project.work?.category)], ["作品组别", label(groups, project.work?.groupName)], ["作品文件/外链", project.work?.fileName || project.work?.externalUrl || ""]);
  fields(["备注", project.remark ?? ""]);

  section("二、指导老师");
  rows.push(["是否校内", "姓名", "工号", "性别", "手机号", "学校", "单位", "职称", "邮箱", "", "", ""]);
  for (const teacher of project.teachers) {
    rows.push([teacher.isInternal ? "是" : "否", teacher.name, teacher.staffNo ?? "", teacher.gender ?? "", teacher.phone ?? "", teacher.school, teacher.unit, teacher.title ?? "", teacher.email ?? "", "", "", ""]);
  }
  if (!project.teachers.length) rows.push(["暂无指导老师"]);

  section("三、团队成员");
  rows.push(["是否校内", "姓名", "学号", "培养阶段", "培养单位", "专业", "性别", "民族", "入学年份", "毕业年份", "手机号", "邮箱"]);
  for (const member of project.teamMembers) {
    rows.push([
      member.isInternal ? "是" : "否",
      member.name,
      member.personNo ?? "",
      label(educationStages, member.educationStage),
      member.trainingUnit,
      member.major,
      member.gender,
      label(ethnicities, member.ethnicity),
      member.enrollmentYear ?? "",
      member.graduationYear ?? "",
      member.phone ?? "",
      member.email ?? "",
    ]);
  }
  if (!project.teamMembers.length) rows.push(["暂无团队成员"]);

  section("四、奖金领款人");
  fields(["领款人姓名", payee?.name ?? ""], ["领款人学号", payee?.personNo ?? ""], ["已绑定财务平台", bank?.boundFinancePlatform ? "是" : "否"], ["学习/工作单位", bank?.organization ?? ""]);
  fields(
    ["联系电话", bank?.phone ?? payee?.phone ?? ""],
    [options.full ? "身份证号" : "身份证号（脱敏）", bank?.boundFinancePlatform ? "" : sensitive(bank?.idCardEncrypted ?? null, options.full)],
    [options.full ? "银行卡号" : "银行卡号（脱敏）", bank?.boundFinancePlatform ? "" : sensitive(bank?.bankCardEncrypted ?? null, options.full)],
    ["开户行", bank?.bankName ?? ""],
  );
  fields(["开户人", bank?.accountName ?? ""]);

  const watermarkRow = rows.length;
  rows.push([`导出编号：${watermarkNo}`]);
  merges.push({ s: { r: watermarkRow, c: 0 }, e: { r: watermarkRow, c: 11 } });

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!merges"] = merges;
  worksheet["!cols"] = [12, 22, 18, 20, 22, 22, 12, 14, 14, 14, 20, 26].map((wch) => ({ wch }));
  worksheet["!rows"] = rows.map((_, index) => index === titleRow ? { hpt: 28 } : index === signatureRow ? { hpt: 24 } : index === signatureRow + 1 ? { hpt: 42 } : { hpt: 22 });
  const workbook = XLSX.utils.book_new();
  if (options.full) {
    workbook.Props = {
      Title: `${project.name}报名表（学院核验）`,
      Subject: watermarkText,
      Author: options.exporterName,
      CreatedDate: options.exportedAt,
    };
  }
  XLSX.utils.book_append_sheet(workbook, worksheet, "报名表");
  const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return { output, fileName: `${project.name}_报名表_${options.full ? "学院核验" : "脱敏留存"}.xlsx` };
}
