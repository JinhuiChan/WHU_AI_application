import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireApiAdmin } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

type Context = { params: { id: string } };

export async function PUT(request: NextRequest, { params }: Context) {
  const authorization = await requireApiAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    const body = await request.json() as { startAt?: unknown; endAt?: unknown; enabled?: unknown };
    if (typeof body.startAt !== "string" || typeof body.endAt !== "string" || typeof body.enabled !== "boolean") {
      return apiError(422, "请提供开始时间、截止时间和开放开关");
    }
    const startAt = new Date(body.startAt);
    const endAt = new Date(body.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) return apiError(422, "时间格式不正确");
    if (endAt <= startAt) return apiError(422, "截止时间必须晚于开始时间");
    const enabled = body.enabled;
    const window = await prisma.$transaction(async (transaction) => {
      const competition = await transaction.competition.findUnique({ where: { id: params.id }, select: { id: true } });
      if (!competition) throw new Error("COMPETITION_NOT_FOUND");
      const saved = await transaction.timeWindow.upsert({
        where: { competitionId_stage: { competitionId: params.id, stage: "SCHOOL" } },
        create: { competitionId: params.id, stage: "SCHOOL", startAt, endAt, enabled, configuredBy: authorization.user.id },
        update: { startAt, endAt, enabled, configuredBy: authorization.user.id },
      });
      await writeAuditLog({
        actorId: authorization.user.id,
        action: "COMPETITION_WINDOW_UPDATED",
        targetType: "TimeWindow",
        targetId: saved.id,
        detail: { competitionId: params.id, stage: "SCHOOL", startAt: startAt.toISOString(), endAt: endAt.toISOString(), enabled },
      }, transaction);
      return saved;
    });
    return apiSuccess(window, "报名设置已保存");
  } catch (error) {
    if (error instanceof SyntaxError) return apiError(422, "请求格式不正确");
    if (error instanceof Error && error.message === "COMPETITION_NOT_FOUND") return apiError(404, "赛事不存在");
    console.error("设置报名窗口失败：", error instanceof Error ? error.message : error);
    return apiError(500, "设置报名窗口失败");
  }
}
