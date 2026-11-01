import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { apiError, apiSuccess } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  try {
    const user = await prisma.user.findFirst({
      where: { phone: normalizedPhone, deletedAt: null },
      include: { extraRoles: { select: { role: true } } },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return apiError(401, "手机号或密码错误");
    }

    // 管理员注册默认 PENDING，必须先由管理员审核通过才能登录
    if (user.approvalStatus === "PENDING") {
      return apiError(403, "账号待管理员审核，审核通过后才能登录");
    }
    if (user.approvalStatus === "REJECTED") {
      return apiError(403, "账号注册申请未通过审核，请联系管理员");
    }

    const roles = [...new Set([user.role, ...user.extraRoles.map((item) => item.role)])];
    // 登录时选择身份：必须是该账号真实拥有的身份，否则拒绝；选定身份即主角色
    if (identity && !roles.includes(identity)) {
      return apiError(403, `该账号没有「${identity === "ADMIN" ? "管理员" : identity === "TEACHER" ? "指导老师" : "学生"}」身份，请选择正确的身份`);
    }
    const primaryRole = identity ?? user.role;
    const token = await signSession({ id: user.id, phone: user.phone, name: user.name, role: primaryRole, roles });
    await writeAuditLog({
      actorId: user.id,
      action: "LOGIN",
      targetType: "User",
      targetId: user.id,
      detail: { method: "手机号密码登录" },
    });
    const response = apiSuccess(
      { user: { id: user.id, phone: user.phone, name: user.name, role: primaryRole, roles } },
      "登录成功",
    );
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    console.error("登录接口错误：", error);
    return apiError(500, "登录失败，请稍后重试");
  }
}
