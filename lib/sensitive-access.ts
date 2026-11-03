import { prisma } from "@/lib/prisma";

export type SensitiveAccessEntry = {
  userId: string;
  projectId?: string | null;
  memberId?: string | null;
  resourceType: string;
  resourceId: string;
  fieldNames: string[];
  reason?: string | null;
};

function toRow(entry: SensitiveAccessEntry) {
  return {
    userId: entry.userId,
    projectId: entry.projectId ?? null,
    memberId: entry.memberId ?? null,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    fieldNames: entry.fieldNames.join(","),
    reason: entry.reason ?? null,
  };
}

export async function logSensitiveAccess(entry: SensitiveAccessEntry) {
  await prisma.sensitiveAccessLog.create({ data: toRow(entry) });
}

export async function logSensitiveAccessMany(entries: SensitiveAccessEntry[]) {
  if (!entries.length) return;
  await prisma.sensitiveAccessLog.createMany({ data: entries.map(toRow) });
}
