import { prisma } from "@/lib/prisma";
import type { ManagedUser } from "@/types/user";

export async function listManagedUsers(): Promise<ManagedUser[]> {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: [{ createdAt: "asc" }, { phone: "asc" }],
    select: {
      id: true,
      phone: true,
      name: true,
      role: true,
      externalId: true,
      createdAt: true,
    },
  });
  const approvals = await prisma.auditLog.findMany({
    where: {
      action: "USER_APPROVED",
      targetType: "User",
      targetId: { in: users.map((user) => user.id) },
    },
    orderBy: { createdAt: "desc" },
    select: {
      targetId: true,
      createdAt: true,
      actor: { select: { name: true } },
    },
  });
  const approvalByUser = new Map<string, (typeof approvals)[number]>();
  for (const approval of approvals) {
    if (!approvalByUser.has(approval.targetId)) {
      approvalByUser.set(approval.targetId, approval);
    }
  }

  return users.map((user) => {
    const approval = approvalByUser.get(user.id);
    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      approvedAt: approval?.createdAt.toISOString() ?? null,
      approvedBy: approval?.actor.name ?? null,
    };
  });
}
