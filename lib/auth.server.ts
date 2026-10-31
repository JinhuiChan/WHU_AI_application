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

export async function getActiveUser(): Promise<AuthUser | null> {
  const session = await getSessionUser();
  if (!session) {
    return null;
  }
  return prisma.user.findFirst({
    where: { id: session.sub, deletedAt: null },
    select: { id: true, phone: true, name: true, role: true },
  });
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

export async function requireApiAdmin(): Promise<ApiUserResult> {
  const authorization = await requireApiUser();
  if (!authorization.ok) return authorization;
  if (authorization.user.role !== "ADMIN") {
    return { ok: false, response: apiError(403, "无权限执行此操作") };
  }
  return authorization;
}

/** 允许的角色白名单，ADMIN 始终放行 */
export async function requireApiRoles(roles: Role[]): Promise<ApiUserResult> {
  const authorization = await requireApiUser();
  if (!authorization.ok) return authorization;
  const { role } = authorization.user;
  if (role !== "ADMIN" && !roles.includes(role)) {
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
