import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { apiError, apiSuccess } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireApiAdmin } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

function text(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  const authorization = await requireApiAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = text(body, "name");
    const seriesId = text(body, "seriesId");
    const organizer = text(body, "organizer");
    const description = text(body, "description");
    const level = text(body, "level");
    const year = Number(body.year);
    if (!name || !seriesId) return apiError(422, "赛事名称和系列标识不能为空");
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return apiError(422, "赛年须为 2000–2100 年");
    if (level !== "SCHOOL" && level !== "PROVINCE" && level !== "NATIONAL") return apiError(422, "赛事等级不正确");
    const competition = await prisma.$transaction(async (transaction) => {
      const created = await transaction.competition.create({
        data: { name, seriesId, year, level, organizer: organizer || null, description: description || null },
      });
      await writeAuditLog({
        actorId: authorization.user.id,
        action: "COMPETITION_CREATED",
        targetType: "Competition",
        targetId: created.id,
        detail: { name, year, level, seriesId, organizer, description },
      }, transaction);
      return created;
    });
    return apiSuccess({ id: competition.id }, "赛事创建成功", 201);
  } catch (error) {
    if (error instanceof SyntaxError) return apiError(422, "请求格式不正确");
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return apiError(409, "同赛年已存在同名赛事");
    console.error("创建赛事失败：", error instanceof Error ? error.message : error);
    return apiError(500, "创建赛事失败");
  }
}
