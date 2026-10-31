import type { Role } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "kesai_session";
export const SESSION_MAX_AGE = 60 * 60 * 8;

/** 与 prisma schema 的 Role 枚举保持一致 */
export const ROLE_VALUES = ["ADMIN", "USER", "STUDENT", "TEACHER", "FINANCE"] as const;

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLE_VALUES as readonly string[]).includes(value);
}

export type AuthUser = {
  id: string;
  phone: string;
  name: string;
  role: Role;
};

export type SessionPayload = {
  sub: string;
  phone: string;
  name: string;
  role: Role;
};

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("未配置 JWT_SECRET");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(user: AuthUser) {
  return new SignJWT({ phone: user.phone, name: user.name, role: user.role })
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
    const { sub, phone, name, role } = payload;
    if (
      typeof sub !== "string" ||
      typeof phone !== "string" ||
      typeof name !== "string" ||
      !isRole(role)
    ) {
      return null;
    }
    return { sub, phone, name, role };
  } catch {
    return null;
  }
}
