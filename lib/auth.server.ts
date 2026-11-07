import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { apiError } from "@/lib/api";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getSessionUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return verifySession(token);
}

function mergeRoles(primary: Role, extra: Role[]): Role[] {
  return [...new Set<Role>([primary, ...extra])];
}

export async function getActiveUser(): Promise<AuthUser | null> {
  const session = await getSessionUser();
  if (!session) {
    return null;
  }
  const user = await prisma.user.findFirst({
    where: { id: session.sub, deletedAt: null },
    select: {
      id: true,
      phone: true,
      name: true,
      role: true,
      approvalStatus: true,
      extraRoles: { select: { role: true } },
    },
  });
  if (!user) return null;
  // 未通过审核的账号（管理员注册默认 PENDING）不建立可用会话
  if (user.approvalStatus !== "APPROVED") return null;
  const roles = mergeRoles(user.role, user.extraRoles.map((item) => item.role));
  // 当前身份来自登录选择；角色是否仍有效以数据库为准。
  if (!roles.includes(session.role)) return null;
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: session.role,
    roles,
  };
}

type ApiUserResult =
  | { ok: true; user: AuthUser }
  | { ok: false; response: ReturnType<typeof apiError> };

export async function requireApiUser(): Promise<ApiUserResult> {
  const user = await getActiveUser();
  if (!user) {
    return { ok: false, response: apiError(401, "未登录或账号不可用") };
  }
  return { ok: true, user };
}

export async function requireApiAdmin({ activeIdentity = false }: { activeIdentity?: boolean } = {}): Promise<ApiUserResult> {
  const authorization = await requireApiUser();
  if (!authorization.ok) return authorization;
  if (!authorization.user.roles.includes("ADMIN") || (activeIdentity && authorization.user.role !== "ADMIN")) {
    return { ok: false, response: apiError(403, "无权限执行此操作") };
  }
  return authorization;
}

/** 允许的角色白名单（角色集合判断），ADMIN 始终放行 */
export async function requireApiRoles(roles: Role[]): Promise<ApiUserResult> {
  const authorization = await requireApiUser();
  if (!authorization.ok) return authorization;
  const set = authorization.user.roles;
  if (!set.includes("ADMIN") && !roles.some((role) => set.includes(role))) {
    return { ok: false, response: apiError(403, "无权限执行此操作") };
  }
  return authorization;
}

export function requireApiStudent() {
  return requireApiRoles(["STUDENT"]);
}

export function requireApiTeacher() {
  return requireApiRoles(["TEACHER"]);
}
