import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { apiError, apiSuccess } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const STUDENT_NO_PATTERN = /^\d{6,20}$/;
const PHONE_PATTERN = /^1\d{10}$/;

function readString(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(422, "请求格式不正确");
  }
  if (typeof body !== "object" || body === null) {
    return apiError(422, "请求内容不正确");
  }

  const payload = body as Record<string, unknown>;
  const studentNo = readString(payload, "studentNo");
  const name = readString(payload, "name");
  const phone = readString(payload, "phone");
  const password = readString(payload, "password");
  const identityRaw = readString(payload, "identity");
  const identity = identityRaw || "STUDENT";
  const staffNo = readString(payload, "staffNo");
  if (!["STUDENT", "TEACHER", "ADMIN"].includes(identity)) return apiError(422, "身份类型不正确");

  if (identity === "STUDENT" && !STUDENT_NO_PATTERN.test(studentNo)) {
    return apiError(422, "学号应为 6–20 位数字");
  }
  if (identity === "TEACHER" && !/^[A-Za-z]\d{4,15}$/.test(staffNo)) {
    return apiError(422, "教工号应以字母开头、后接 4–15 位数字，如 T2027001");
  }
  if (name.length < 2 || name.length > 20) {
    return apiError(422, "姓名应为 2–20 个字符");
  }
  if (!PHONE_PATTERN.test(phone)) {
    return apiError(422, "请输入正确的手机号");
  }
  if (password.length < 6) {
    return apiError(422, "密码至少 6 位");
  }

  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { phone },
          ...(identity === "STUDENT" && studentNo ? [{ studentNo }] : []),
          ...(identity === "TEACHER" && staffNo ? [{ staffNo }] : []),
        ],
      },
      select: { phone: true, studentNo: true },
    });
    if (existing) {
      return apiError(409, existing.phone === phone ? "该手机号已注册" : "该学号/教工号已注册");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          studentNo,
          phone,
          name,
          passwordHash,
          role: identity as "STUDENT" | "TEACHER" | "ADMIN",
          staffNo: identity === "TEACHER" ? staffNo : null,
          approvalStatus: identity === "ADMIN" ? "PENDING" : "APPROVED",
          college: readString(payload, "college") || null,
          trainingUnit: readString(payload, "trainingUnit") || null,
          major: readString(payload, "major") || null,
          grade: readString(payload, "grade") || null,
        },
        select: { id: true, studentNo: true, name: true, phone: true, role: true },
      });
      await writeAuditLog(
        {
          actorId: created.id,
          action: identity === "ADMIN" ? "ADMIN_REGISTER_PENDING" : "STUDENT_REGISTERED",
          targetType: "User",
          targetId: created.id,
          detail: { identity, studentNo: created.studentNo ?? "", staffNo },
        },
        tx,
      );
      return created;
    });

    return apiSuccess(user, identity === "ADMIN" ? "注册申请已提交，待管理员审核通过后可登录" : "注册成功，可直接登录", 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = JSON.stringify(error.meta?.target ?? "");
      return apiError(409, target.includes("phone") ? "该手机号已注册" : "该学号已注册");
    }
    console.error("注册失败：", error);
    return apiError(500, "注册失败，请稍后重试");
  }
}
