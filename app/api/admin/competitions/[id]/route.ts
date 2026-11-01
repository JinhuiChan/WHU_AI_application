import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { apiError, apiSuccess } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireApiAdmin } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

type Context = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: Context) {
  const authorization = await requireApiAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const organizer = typeof body.organizer === "string" ? body.organizer.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!name) return apiError(422, "赛事名称不能为空");
    const competition = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.competition.update({
        where: { id: params.id },
        data: { name, organizer: organizer || null, description: description || null },
      });
      await writeAuditLog({
        actorId: authorization.user.id,
        action: "COMPETITION_UPDATED",
        targetType: "Competition",
        targetId: updated.id,
        detail: { name, organizer, description },
      }, transaction);
      return updated;
    });
    return apiSuccess({ id: competition.id, name: competition.name }, "赛事信息已保存");
  } catch (error) {
    if (error instanceof SyntaxError) return apiError(422, "请求格式不正确");
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return apiError(409, "同赛年已存在同名赛事");
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return apiError(404, "赛事不存在");
    console.error("编辑赛事失败：", error instanceof Error ? error.message : error);
    return apiError(500, "编辑赛事失败");
  }
}
