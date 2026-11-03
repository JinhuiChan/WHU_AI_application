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
      teacherProfiles: { take: 6, orderBy: { updatedAt: "desc" }, select: { unit: true, title: true } },
    },
    orderBy: { name: "asc" },
    take: 10,
  });
  return apiSuccess(teachers.map((teacher) => {
    // 职称/单位取历史指导记录里「最近的非空值」；从未提交过项目的老师没有历史，需手填
    const unit = teacher.teacherProfiles.find((item) => item.unit.trim())?.unit.trim()
      || teacher.trainingUnit
      || teacher.college
      || "";
    const title = teacher.teacherProfiles.find((item) => item.title?.trim())?.title?.trim() ?? "";
    return {
      staffNo: teacher.staffNo,
      name: teacher.name,
      gender: teacher.gender,
      phone: teacher.phone,
      school: "武汉大学",
      unit,
      title,
      email: teacher.email,
    };
  }), "查询成功");
}
