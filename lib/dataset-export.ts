import * as XLSX from "xlsx";
import type { Prisma } from "@prisma/client";
import type { AuthUser } from "@/lib/auth";
import { decryptField, maskTail } from "@/lib/crypto";
import { datasetFieldMap } from "@/lib/export-fields";
import type { DatasetFieldKey } from "@/lib/export-fields";
import { registrationStatusLabels } from "@/lib/presentation";
import { prisma } from "@/lib/prisma";
import { listReviewItemsForExport } from "@/lib/review";
import type { ReviewFilters, ReviewListItem } from "@/types/review";

const maxDatasetRows = 5000;

export class DatasetError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "DatasetError";
  }
}

export type DatasetExportQuery = Partial<ReviewFilters> & {
  scope: "mine" | "all";
  fields: DatasetFieldKey[];
  confirmSensitive: boolean;
};

function sensitiveValue(value: string | null | undefined, full: boolean) {
  if (!value) return "";
  const plain = decryptField(value);
  return full ? plain : maskTail(plain);
}

function standardValue(item: ReviewListItem, field: Exclude<DatasetFieldKey, "idCard" | "bankCard">) {
  if (field === "status") return registrationStatusLabels[item.status];
  return item[field] ?? "";
}

export async function createDatasetExport(query: DatasetExportQuery, user: AuthUser, watermarkNo: string, exportedAt: Date) {
  if (query.scope === "all" && user.role !== "ADMIN") throw new DatasetError(403, "仅管理员可导出全校数据表");
  if (query.scope === "mine" && user.role !== "STUDENT" && user.role !== "ADMIN") {
    throw new DatasetError(403, "仅学生可导出本人参与项目的数据表");
  }
  const sensitiveRequested = query.fields.some((field) => datasetFieldMap[field].sensitive);
  const canIncludeSensitive = query.scope === "all" && user.role === "ADMIN";
  if (sensitiveRequested && query.confirmSensitive && !canIncludeSensitive) {
    throw new DatasetError(403, "完整敏感字段仅管理员可导出");
  }
  const includeSensitive = sensitiveRequested && query.confirmSensitive && canIncludeSensitive;
  const accessWhere: Prisma.ProjectWhereInput | undefined = query.scope === "mine" ? {
    OR: [
      { ownerId: user.id },
      { teamMembers: { some: { userId: user.id, leftAt: null } } },
    ],
  } : undefined;
  const items = await listReviewItemsForExport(query, maxDatasetRows + 1, accessWhere);
  if (items.length > maxDatasetRows) throw new DatasetError(422, "筛选结果超过 5000 行，请缩小筛选范围");

  const sensitiveByProject = new Map<string, { idCardEncrypted: string | null; bankCardEncrypted: string | null }>();
  if (sensitiveRequested && items.length) {
    const projects = await prisma.project.findMany({
      where: { id: { in: items.map((item) => item.id) } },
      select: {
        id: true,
        payeeMember: { select: { payeeBank: true } },
        teamMembers: { where: { isPayee: true }, take: 1, select: { payeeBank: true } },
      },
    });
    for (const project of projects) {
      const bank = project.payeeMember?.payeeBank ?? project.teamMembers[0]?.payeeBank;
      if (bank) sensitiveByProject.set(project.id, bank);
    }
  }

  const rows = items.map((item) => query.fields.map((field) => {
    if (field === "idCard" || field === "bankCard") {
      const bank = sensitiveByProject.get(item.id);
      return sensitiveValue(field === "idCard" ? bank?.idCardEncrypted : bank?.bankCardEncrypted, includeSensitive);
    }
    return standardValue(item, field);
  }));
  const worksheet = XLSX.utils.aoa_to_sheet([
    query.fields.map((field) => datasetFieldMap[field].label),
    ...rows,
  ]);
  worksheet["!cols"] = query.fields.map((field) => ({
    wch: field === "teachers" || field === "members" ? 60 : field === "projectName" || field === "trackDisplay" ? 36 : 22,
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "数据表");
  const watermarkText = `数据表导出｜${user.name}｜${exportedAt.toISOString()}｜${watermarkNo}`;
  const infoRows: (string | number)[][] = [
    ["导出编号", watermarkNo],
    ["导出人", user.name],
    ["导出时间", exportedAt.toISOString()],
    ["数据范围", query.scope === "all" ? "全校" : "本人参与项目"],
    ["数据行数", rows.length],
    ["敏感字段", includeSensitive ? "完整（已二次确认）" : "脱敏"],
  ];
  if (includeSensitive) {
    infoRows.unshift(["水印", watermarkText]);
    workbook.Props = { Title: "自定义数据表（含敏感信息）", Subject: watermarkText, Author: user.name, CreatedDate: exportedAt };
  }
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(infoRows), "导出信息");
  const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return {
    output,
    fileName: `${query.scope === "all" ? "全校" : "我的"}数据表_${watermarkNo.slice(0, 12)}.xlsx`,
    rowCount: rows.length,
    includeSensitive,
  };
}
