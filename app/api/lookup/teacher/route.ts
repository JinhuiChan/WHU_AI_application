import type { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api";
import { requireApiRoles } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await requireApiRoles(["STUDENT", "TEACHER"]);
  if (!authorization.ok) return authorization.response;
  const keyword = request.nextUrl.searchParams.get("keyword")?.trim() ?? "";
  if (!keyword) return apiSuccess([], "查询成功");

  const teachers = await prisma.user.findMany({
    where: {
      role: "TEACHER",
      deletedAt: null,
      OR: [{ staffNo: { contains: keyword } }, { name: { contains: keyword } }],
    },
    select: {
      staffNo: true,
      name: true,
      gender: true,
      phone: true,
      college: true,
      trainingUnit: true,
      email: true,
      teacherProfiles: { take: 1, select: { unit: true, title: true } },
    },
    orderBy: { name: "asc" },
    take: 10,
  });
  return apiSuccess(teachers.map((teacher) => ({
    staffNo: teacher.staffNo,
    name: teacher.name,
    gender: teacher.gender,
    phone: teacher.phone,
    school: "武汉大学",
    unit: teacher.teacherProfiles[0]?.unit ?? teacher.trainingUnit ?? teacher.college ?? "",
    title: teacher.teacherProfiles[0]?.title ?? "",
    email: teacher.email,
  })), "查询成功");
}
