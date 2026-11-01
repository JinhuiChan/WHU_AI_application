import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditClient = Prisma.TransactionClient | PrismaClient;

type AuditInput = {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  detail?: Record<string, unknown>;
};

export async function writeAuditLog(input: AuditInput, client: AuditClient = prisma) {
  await client.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      detail: JSON.stringify(input.detail ?? {}),
    },
  });
}
