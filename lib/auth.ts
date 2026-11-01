import type { Role } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "kesai_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/** 与 prisma schema 的 Role 枚举保持一致 */
export const ROLE_VALUES = ["ADMIN", "USER", "STUDENT", "TEACHER", "FINANCE"] as const;

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLE_VALUES as readonly string[]).includes(value);
}

export type AuthUser = {
  id: string;
  phone: string;
  name: string;
  /** 主角色（兼容旧代码与「当前身份」展示） */
  role: Role;
  /** 有效角色集合：主角色 + UserRoleLink 附加身份（同一账号可同时是老师和管理员） */
  roles: Role[];
};

export type SessionPayload = {
  sub: string;
  phone: string;
  name: string;
  role: Role;
  roles: Role[];
};

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("未配置 JWT_SECRET");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(user: AuthUser) {
  return new SignJWT({ phone: user.phone, name: user.name, role: user.role, roles: user.roles })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(jwtSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  const secret = jwtSecret();
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    const { sub, phone, name, role, roles } = payload;
    if (
      typeof sub !== "string" ||
      typeof phone !== "string" ||
      typeof name !== "string" ||
      !isRole(role)
    ) {
      return null;
    }
    // 旧版 token 只有 role，没有 roles：回退成单角色，保证已登录用户不被踢下线
    const normalizedRoles = Array.isArray(roles) && roles.length > 0
      ? [...new Set(roles.filter((item): item is Role => isRole(item)))]
      : [role];
    if (!normalizedRoles.includes(role)) normalizedRoles.unshift(role);
    return { sub, phone, name, role, roles: normalizedRoles };
  } catch {
    return null;
  }
}
