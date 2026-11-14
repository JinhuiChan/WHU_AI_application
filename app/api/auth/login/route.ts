import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { apiError, apiSuccess } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/auth";
import { claimHistoricalRecords, emptyClaimedRecords, hasClaimedRecords } from "@/lib/claim-records";
import { prisma } from "@/lib/prisma";
import { isBlocked, record, reset } from "@/lib/rate-limit";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const PHONE_LOGIN_LIMIT = 5;
const IP_LOGIN_LIMIT = 20;

function maskPhone(phone: string) {
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

async function recordLoginFailure(userId: string, reason: string) {
  await writeAuditLog({
    actorId: userId,
    action: "LOGIN_FAILED",
    targetType: "User",
    targetId: userId,
    detail: { reason },
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(422, "请求格式不正确");
  }

  if (typeof body !== "object" || body === null) {
    return apiError(422, "请输入手机号和密码");
  }
  const phone = "phone" in body ? body.phone : undefined;
  const password = "password" in body ? body.password : undefined;
  const identityInput = "identity" in body ? body.identity : undefined;
  const identity = identityInput === "STUDENT" || identityInput === "TEACHER" || identityInput === "ADMIN" ? identityInput : null;
  if (typeof phone !== "string" || typeof password !== "string") {
    return apiError(422, "请输入手机号和密码");
  }
  const normalizedPhone = phone.trim();
  if (!/^1\d{10}$/.test(normalizedPhone) || password.length === 0) {
    return apiError(422, "请输入正确的手机号和密码");
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "127.0.0.1";
  const ipKey = `login-ip:${ip}`;
  const phoneKey = `login:${normalizedPhone}`;

  try {
    const user = await prisma.user.findFirst({
      where: { phone: normalizedPhone, deletedAt: null },
      include: { extraRoles: { select: { role: true } } },
    });
    const ipBlocked = isBlocked(ipKey, IP_LOGIN_LIMIT, LOGIN_WINDOW_MS);
    const phoneBlocked = user ? isBlocked(phoneKey, PHONE_LOGIN_LIMIT, LOGIN_WINDOW_MS) : false;
    if (ipBlocked || phoneBlocked) {
      return apiError(429, "尝试次数过多，请 15 分钟后再试");
    }

    if (!user) {
      record(ipKey, LOGIN_WINDOW_MS);
      console.warn(`登录失败：手机号 ${maskPhone(normalizedPhone)} 不存在`);
      return apiError(401, "手机号或密码错误");
    }
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      record(phoneKey, LOGIN_WINDOW_MS);
      record(ipKey, LOGIN_WINDOW_MS);
      await recordLoginFailure(user.id, "密码错误");
      return apiError(401, "手机号或密码错误");
    }

    // 管理员注册默认 PENDING，必须先由管理员审核通过才能登录
    if (user.approvalStatus === "PENDING") {
      record(phoneKey, LOGIN_WINDOW_MS);
      record(ipKey, LOGIN_WINDOW_MS);
      await recordLoginFailure(user.id, "账号待管理员审核");
      return apiError(403, "账号待管理员审核，审核通过后才能登录");
    }
    if (user.approvalStatus === "REJECTED") {
      record(phoneKey, LOGIN_WINDOW_MS);
      record(ipKey, LOGIN_WINDOW_MS);
      await recordLoginFailure(user.id, "账号注册申请未通过审核");
      return apiError(403, "账号注册申请未通过审核，请联系管理员");
    }

    const roles = [...new Set([user.role, ...user.extraRoles.map((item) => item.role)])];
    // 登录时选择身份：必须是该账号真实拥有的身份，否则拒绝；选定身份即主角色
    if (identity && !roles.includes(identity)) {
      record(phoneKey, LOGIN_WINDOW_MS);
      record(ipKey, LOGIN_WINDOW_MS);
      return apiError(403, `该账号没有「${identity === "ADMIN" ? "管理员" : identity === "TEACHER" ? "指导老师" : "学生"}」身份，请选择正确的身份`);
    }
    // 登录即认领历史报名：账号先于数据导入创建时，这里按学号/工号补绑（失败不阻断登录）
    const claimed = await claimHistoricalRecords({
      id: user.id,
      studentNo: user.studentNo,
      staffNo: user.staffNo,
    }).catch((error: unknown) => {
      console.error("历史报名自动关联失败：", error);
      return emptyClaimedRecords;
    });
    const primaryRole = identity ?? user.role;
    const token = await signSession({ id: user.id, phone: user.phone, name: user.name, role: primaryRole, roles });
    await writeAuditLog({
      actorId: user.id,
      action: "LOGIN",
      targetType: "User",
      targetId: user.id,
      detail: {
        method: "手机号密码登录",
        ...(hasClaimedRecords(claimed) ? { claimed } : {}),
      },
    });
    const response = apiSuccess(
      { user: { id: user.id, phone: user.phone, name: user.name, role: primaryRole, roles } },
      "登录成功",
    );
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.headers.get("x-forwarded-proto")?.includes("https")
        ?? (request.nextUrl.protocol === "https:" || process.env.NODE_ENV === "production"),
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    reset(phoneKey);
    reset(ipKey);
    return response;
  } catch (error) {
    console.error("登录接口错误：", error);
    return apiError(500, "登录失败，请稍后重试");
  }
}
