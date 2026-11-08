import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import type { TeamPostStatus } from "@prisma/client";
import { apiError, apiSuccess } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireApiStudent, requireApiUser } from "@/lib/auth.server";
import { optionalText, pageParams } from "@/lib/list-query";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const postSelect = {
  id: true,
  authorId: true,
  competitionId: true,
  trackId: true,
  title: true,
  summary: true,
  expectation: true,
  skills: true,
  memberLimit: true,
  currentCount: true,
  requirement: true,
  contact: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true, college: true, major: true } },
  competition: { select: { id: true, name: true, year: true, level: true } },
  track: { select: { id: true, name: true } },
} satisfies Prisma.TeamPostSelect;

function text(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

function parseStatus(value: string | null): TeamPostStatus | undefined {
  return value === "RECRUITING" || value === "FULL" || value === "CLOSED" || value === "EXPIRED" ? value : undefined;
}

export async function GET(request: NextRequest) {
  const authorization = await requireApiUser();
  if (!authorization.ok) return authorization.response;
  try {
    const params = request.nextUrl.searchParams;
    const { page, pageSize } = pageParams(params.get("page") ?? undefined, params.get("pageSize") ?? undefined);
    const statusValue = params.get("status");
    const status = parseStatus(statusValue);
    if (statusValue && !status) return apiError(422, "帖子状态不正确");

    const where: Prisma.TeamPostWhereInput = {
      removedBy: null,
      status: status ?? "RECRUITING",
    };
    if (!status || status === "RECRUITING") where.expiresAt = { gt: new Date() };
    const competitionId = optionalText(params.get("competitionId") ?? undefined);
    const trackId = optionalText(params.get("trackId") ?? undefined);
    const q = optionalText(params.get("q") ?? undefined);
    if (competitionId) where.competitionId = competitionId;
    if (trackId) where.trackId = trackId;
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { summary: { contains: q } },
        { expectation: { contains: q } },
        { skills: { contains: q } },
      ];
    }

    const sort = params.get("sort") === "expiresAt" ? "expiresAt" : "createdAt";
    const order = params.get("order") === "asc" ? "asc" : "desc";
    const orderBy: Prisma.TeamPostOrderByWithRelationInput[] = [{ [sort]: order }, { id: "asc" }];
    const [list, total] = await prisma.$transaction([
      prisma.teamPost.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: postSelect,
      }),
      prisma.teamPost.count({ where }),
    ]);
    return apiSuccess({ list, total, page, pageSize });
  } catch (error) {
    console.error("组队帖列表接口错误：", error instanceof Error ? error.message : error);
    return apiError(500, "获取组队帖列表失败");
  }
}

export async function POST(request: NextRequest) {
  const authorization = await requireApiStudent();
  if (!authorization.ok) return authorization.response;
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) return apiError(422, "请求内容不正确");
    const input = body as Record<string, unknown>;
    const competitionId = text(input, "competitionId");
    const trackId = text(input, "trackId") || null;
    const title = text(input, "title");
    const summary = text(input, "summary");
    const expectation = text(input, "expectation") || null;
    const skills = text(input, "skills");
    const requirement = text(input, "requirement") || "全部";
    const contact = text(input, "contact") || null;
    const memberLimit = Number(input.memberLimit);
    if (!competitionId || !title || !summary) return apiError(422, "赛事、标题和招募说明不能为空");
    if (!Number.isInteger(memberLimit) || memberLimit < 2 || memberLimit > 10) {
      return apiError(422, "队伍人数上限须为 2–10 人");
    }
    if (typeof input.expiresAt !== "string") return apiError(422, "请提供有效期");
    const expiresAt = new Date(input.expiresAt);
    const now = new Date();
    const latestExpiresAt = now.getTime() + 30 * 24 * 60 * 60 * 1000;
    if (Number.isNaN(expiresAt.getTime())) return apiError(422, "有效期格式不正确");
    if (expiresAt <= now) return apiError(422, "有效期必须晚于当前时间");
    if (expiresAt.getTime() > latestExpiresAt) return apiError(422, "有效期不能超过 30 天");

    const post = await prisma.$transaction(async (transaction) => {
      const competition = await transaction.competition.findUnique({
        where: { id: competitionId },
        select: { id: true, publishStatus: true },
      });
      if (!competition) throw new Error("COMPETITION_NOT_FOUND");
      if (competition.publishStatus !== "PUBLISHED") throw new Error("COMPETITION_NOT_PUBLISHED");
      if (trackId) {
        const track = await transaction.track.findFirst({
          where: { id: trackId, competitionId, enabled: true },
          select: { id: true },
        });
        if (!track) throw new Error("TRACK_NOT_FOUND");
      }
      const recruitingCount = await transaction.teamPost.count({
        where: { authorId: authorization.user.id, competitionId, status: "RECRUITING" },
      });
      if (recruitingCount >= 3) throw new Error("TEAM_POST_LIMIT");
      const created = await transaction.teamPost.create({
        data: {
          authorId: authorization.user.id,
          competitionId,
          trackId,
          title,
          summary,
          expectation,
          skills,
          memberLimit,
          requirement,
          contact,
          expiresAt,
        },
        select: postSelect,
      });
      await writeAuditLog({
        actorId: authorization.user.id,
        action: "TEAM_POST_CREATED",
        targetType: "TeamPost",
        targetId: created.id,
        detail: { competitionId, trackId, title, memberLimit, expiresAt: expiresAt.toISOString() },
      }, transaction);
      return created;
    });
    return apiSuccess(post, "组队帖发布成功", 201);
  } catch (error) {
    if (error instanceof SyntaxError) return apiError(422, "请求格式不正确");
    if (error instanceof Error && error.message === "COMPETITION_NOT_FOUND") return apiError(404, "赛事不存在");
    if (error instanceof Error && error.message === "COMPETITION_NOT_PUBLISHED") return apiError(422, "赛事未发布，不能发布组队帖");
    if (error instanceof Error && error.message === "TRACK_NOT_FOUND") return apiError(422, "赛道不存在或不属于该赛事");
    if (error instanceof Error && error.message === "TEAM_POST_LIMIT") return apiError(409, "同一赛事最多同时发布 3 个招募帖");
    console.error("发布组队帖失败：", error instanceof Error ? error.message : error);
    return apiError(500, "发布组队帖失败");
  }
}
