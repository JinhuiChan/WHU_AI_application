import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import type { Prisma } from "@prisma/client";
import { apiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { getActiveUser } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";
import { awardLevelLabels, competitionLevelLabels, formatDate } from "@/lib/presentation";
import { parseAdminAwardLevel } from "@/lib/admin-awards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 导出获奖名单：管理员按当前筛选（赛事/学院/奖项等级）导出已录奖项的项目，口径与奖项录入列表一致。 */
export async function GET(request: NextRequest) {
  try {
    const user = await getActiveUser();
    if (!user) return apiError(401, "未登录或账号不可用");
    if (user.role !== "ADMIN") return apiError(403, "仅管理员可导出获奖名单");

    const params = request.nextUrl.searchParams;
    const competitionId = params.get("competitionId")?.trim() ?? "";
    const college = params.get("college")?.trim() ?? "";
    const level = parseAdminAwardLevel(params.get("level") ?? undefined);

    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      awards: { some: level ? { awardLevel: level } : {} },
    };
    if (competitionId) where.competitionId = competitionId;
    if (college) where.college = college;

    const projects = await prisma.project.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        college: true,
        status: true,
        updatedAt: true,
        competition: { select: { name: true, year: true, level: true } },
        track: { select: { name: true } },
        awards: {
          where: level ? { awardLevel: level } : undefined,
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { awardLevel: true, stage: true, updatedAt: true },
        },
        teamMembers: {
          where: { role: "LEADER", leftAt: null },
          select: { name: true, personNo: true },
          take: 1,
        },
        teachers: { select: { name: true } },
      },
    });

    const rows = projects
      .filter((project) => project.awards.length > 0)
      .map((project, index) => {
        const award = project.awards[0];
        const leader = project.teamMembers[0];
        return [
          index + 1,
          project.competition?.year ?? "",
          project.competition?.name ?? "未设置赛事",
          project.competition ? competitionLevelLabels[project.competition.level] : "",
          project.track?.name ?? "未设置赛道",
          project.name,
          project.college,
          leader?.name ?? "",
          leader?.personNo ?? "",
          project.teachers.map((teacher) => teacher.name).join("、"),
          awardLevelLabels[award.awardLevel],
          formatDate(award.updatedAt.toISOString()),
        ];
      });

    const worksheet = XLSX.utils.aoa_to_sheet([
      ["序号", "赛年", "赛事名称", "赛事等级", "赛道", "项目名称", "学院", "负责人", "负责人学号", "指导教师", "奖项等级", "获奖时间"],
      ...rows,
    ]);
    worksheet["!cols"] = [6, 8, 34, 10, 26, 40, 22, 10, 14, 22, 10, 12].map((wch) => ({ wch }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "获奖名单");
    const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

    await writeAuditLog({
      actorId: user.id,
      action: "EXPORT_CREATED",
      targetType: "Award",
      targetId: competitionId || "ALL",
      detail: { competitionId: competitionId || null, college: college || null, level: level ?? null, count: rows.length },
    });

    const date = new Date().toISOString().slice(0, 10);
    const fileName = `获奖名单-${date}.xlsx`;
    return new NextResponse(new Uint8Array(output), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="awards-list-${date}.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Content-Length": String(output.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("导出获奖名单失败：", error);
    return apiError(500, "导出获奖名单失败");
  }
}
