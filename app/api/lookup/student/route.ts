import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiRoles } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await requireApiRoles(["STUDENT"]);
  if (!authorization.ok) return authorization.response;
  const studentNo = request.nextUrl.searchParams.get("studentNo")?.trim() ?? "";
  if (!/^\d{6,20}$/.test(studentNo)) return apiError(422, "学号应为 6–20 位数字");

  const student = await prisma.user.findFirst({
    where: { studentNo, role: "STUDENT", deletedAt: null },
    select: {
      studentNo: true,
      name: true,
      college: true,
      trainingUnit: true,
      major: true,
      grade: true,
      gender: true,
      ethnicity: true,
      educationStage: true,
      enrollmentYear: true,
      graduationYear: true,
      phone: true,
      email: true,
      boundFinancePlatform: true,
    },
  });
  if (!student) return apiError(404, "未找到对应学生");
  return apiSuccess(student, "查询成功");
}
