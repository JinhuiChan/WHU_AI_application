import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ManagedUser } from "@/types/user";

/** 某一类身份的口径：主角色或附加角色命中即算（多身份用户会在多个分类里出现） */
function scopeWhere(scope: Role): Prisma.UserWhereInput {
  return {
    deletedAt: null,
    OR: [{ role: scope }, { extraRoles: { some: { role: scope } } }],
  };
}

export async function listManagedUsers(scope?: Role): Promise<ManagedUser[]> {
  const users = await prisma.user.findMany({
    where: scope ? scopeWhere(scope) : { deletedAt: null },
    // 待审核的排最前面，方便管理员先处理注册申请
    orderBy: [{ approvalStatus: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      phone: true,
      name: true,
      role: true,
      approvalStatus: true,
      approvedAt: true,
      approvedBy: true,
      extraRoles: { select: { role: true } },
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
      approvedAt: user.approvedAt?.toISOString() ?? approval?.createdAt.toISOString() ?? null,
      approvedBy: user.approvedBy ?? approval?.actor.name ?? null,
      approvalStatus: user.approvalStatus,
      roles: [...new Set<Role>([user.role, ...user.extraRoles.map((item) => item.role)])],
    };
  });
}

/** 三个分类各自的人数（含多身份重复计数） */
export async function countManagedUsers(): Promise<Record<"STUDENT" | "TEACHER" | "ADMIN", number>> {
  const [student, teacher, admin] = await Promise.all([
    prisma.user.count({ where: scopeWhere("STUDENT") }),
    prisma.user.count({ where: scopeWhere("TEACHER") }),
    prisma.user.count({ where: scopeWhere("ADMIN") }),
  ]);
  return { STUDENT: student, TEACHER: teacher, ADMIN: admin };
}

/** 待管理员审核的管理员注册申请（用于侧栏红点） */
export async function countPendingAdminRegistrations(): Promise<number> {
  return prisma.user.count({
    where: { deletedAt: null, approvalStatus: "PENDING", role: "ADMIN" },
  });
}
