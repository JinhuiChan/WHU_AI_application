import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireApiAdmin } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

type Context = { params: { id: string } };

/** 发布 / 下架赛事：草稿与下架状态对普通学生不可见，已报名项目数据保留。 */
export async function POST(request: NextRequest, { params }: Context) {
  const authorization = await requireApiAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    const body = await request.json() as { action?: unknown };
    const action = body.action === "PUBLISH" || body.action === "WITHDRAW" ? body.action : null;
    if (!action) return apiError(422, "操作类型不正确");

    const nextStatus = action === "PUBLISH" ? "PUBLISHED" : "WITHDRAWN";
    const updated = await prisma.$transaction(async (transaction) => {
      const competition = await transaction.competition.findUnique({
        where: { id: params.id },
        select: { id: true, name: true, publishStatus: true },
      });
      if (!competition) throw new Error("COMPETITION_NOT_FOUND");

      if (action === "PUBLISH") {
        const trackCount = await transaction.track.count({ where: { competitionId: params.id, enabled: true } });
        if (trackCount === 0) throw new Error("COMPETITION_NO_TRACK");
      }

      const saved = await transaction.competition.update({
        where: { id: params.id },
        data: { publishStatus: nextStatus },
        select: { id: true, name: true, publishStatus: true },
      });
      await writeAuditLog({
        actorId: authorization.user.id,
        action: action === "PUBLISH" ? "COMPETITION_PUBLISHED" : "COMPETITION_WITHDRAWN",
        targetType: "Competition",
        targetId: saved.id,
        detail: { name: saved.name, from: competition.publishStatus, to: nextStatus },
      }, transaction);
      return saved;
    });

    return apiSuccess(updated, action === "PUBLISH" ? "赛事已发布" : "赛事已下架");
  } catch (error) {
    if (error instanceof SyntaxError) return apiError(422, "请求格式不正确");
    if (error instanceof Error && error.message === "COMPETITION_NOT_FOUND") return apiError(404, "赛事不存在");
    if (error instanceof Error && error.message === "COMPETITION_NO_TRACK") return apiError(422, "请先配置至少一个赛道再发布");
    console.error("发布/下架赛事失败：", error instanceof Error ? error.message : error);
    return apiError(500, "发布/下架赛事失败");
  }
}
