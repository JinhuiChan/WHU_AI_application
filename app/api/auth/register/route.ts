import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
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

  if (!STUDENT_NO_PATTERN.test(studentNo)) {
    return apiError(422, "学号应为 6–20 位数字");
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
      where: { OR: [{ phone }, { studentNo }] },
      select: { phone: true, studentNo: true },
    });
    if (existing) {
      return apiError(409, existing.phone === phone ? "该手机号已注册" : "该学号已注册");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        studentNo,
        phone,
        name,
        passwordHash,
        role: "STUDENT",
        college: readString(payload, "college") || null,
        trainingUnit: readString(payload, "trainingUnit") || null,
        major: readString(payload, "major") || null,
        grade: readString(payload, "grade") || null,
      },
      select: { id: true, studentNo: true, name: true, phone: true, role: true },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "STUDENT_REGISTERED",
      targetType: "User",
      targetId: user.id,
      detail: { studentNo: user.studentNo ?? "" },
    });

    return apiSuccess(user, "注册成功", 201);
  } catch (error) {
    console.error("学生注册失败：", error);
    return apiError(500, "注册失败，请稍后重试");
  }
}
