import { randomUUID } from "node:crypto";
import type { ExportType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function newExportWatermarkNo() {
  return `EXP-${randomUUID()}`;
}

export async function writeExportRecord(input: {
  exporterId: string;
  type: ExportType;
  fields: string[];
  rowCount: number;
  fileName: string;
  includeSensitive?: boolean;
  filters?: Record<string, unknown>;
  watermarkNo?: string;
}) {
  return prisma.exportRecord.create({
    data: {
      exporterId: input.exporterId,
      type: input.type,
      fieldsJson: JSON.stringify(input.fields),
      rowCount: input.rowCount,
      watermarkNo: input.watermarkNo ?? newExportWatermarkNo(),
      fileName: input.fileName,
      includeSensitive: input.includeSensitive ?? false,
      filtersJson: JSON.stringify(input.filters ?? {}),
    },
  });
}
