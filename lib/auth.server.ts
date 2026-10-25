import { cookies } from "next/headers";
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

type ApiAdminResult =
  | { ok: true; user: AuthUser }
  | { ok: false; response: ReturnType<typeof apiError> };

export async function requireApiAdmin(): Promise<ApiAdminResult> {
  const user = await getActiveUser();
  if (!user) {
    return { ok: false, response: apiError(401, "未登录或账号不可用") };
  }
  if (user.role !== "ADMIN") {
    return { ok: false, response: apiError(403, "无权限执行此操作") };
  }
  return { ok: true, user };
}
