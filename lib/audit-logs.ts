import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AuditLogPage } from "@/types/audit-log";

type AuditLogQuery = {
  actor?: string;
  action?: string;
  page: number;
  pageSize: number;
};

export async function getAuditLogPage(query: AuditLogQuery): Promise<AuditLogPage> {
  const where: Prisma.AuditLogWhereInput = {
    ...(query.actor
      ? {
          actor: {
            OR: [
              { name: { contains: query.actor } },
              { phone: { contains: query.actor } },
            ],
          },
        }
      : {}),
    ...(query.action ? { action: query.action } : {}),
  };
  const [total, records] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        actor: { select: { id: true, name: true, phone: true } },
        action: true,
        targetType: true,
        targetId: true,
        detail: true,
        createdAt: true,
      },
    }),
  ]);
  return {
    list: records.map((record) => ({ ...record, createdAt: record.createdAt.toISOString() })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function listAuditActions() {
  const records = await prisma.auditLog.findMany({
    distinct: ["action"],
    select: { action: true },
    orderBy: { action: "asc" },
  });
  return records.map((record) => record.action);
}
