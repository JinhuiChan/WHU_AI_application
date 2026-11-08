import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { apiError, apiSuccess } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireApiAdmin, requireApiUser } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

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
  removedBy: true,
  removedReason: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true, college: true, major: true } },
  competition: { select: { id: true, name: true, year: true, level: true, publishStatus: true } },
  track: { select: { id: true, name: true } },
} satisfies Prisma.TeamPostSelect;

function text(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

function parseExpiresAt(value: unknown) {
  if (typeof value !== "string") return { error: "请提供有效期" } as const;
  const expiresAt = new Date(value);
  const now = Date.now();
  if (Number.isNaN(expiresAt.getTime())) return { error: "有效期格式不正确" } as const;
  if (expiresAt.getTime() <= now) return { error: "有效期必须晚于当前时间" } as const;
  if (expiresAt.getTime() > now + 30 * 24 * 60 * 60 * 1000) return { error: "有效期不能超过 30 天" } as const;
  return { expiresAt } as const;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const authorization = await requireApiUser();
  if (!authorization.ok) return authorization.response;
  try {
    const post = await prisma.teamPost.findUnique({ where: { id: params.id }, select: postSelect });
    if (!post || (post.removedBy && !authorization.user.roles.includes("ADMIN"))) return apiError(404, "组队帖不存在");
    return apiSuccess(post);
  } catch (error) {
    console.error("组队帖详情接口错误：", error instanceof Error ? error.message : error);
    return apiError(500, "获取组队帖详情失败");
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const authorization = await requireApiUser();
  if (!authorization.ok) return authorization.response;
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) return apiError(422, "请求内容不正确");
    const input = body as Record<string, unknown>;
    const post = await prisma.teamPost.findUnique({ where: { id: params.id } });
    if (!post) return apiError(404, "组队帖不存在");
    if (post.authorId !== authorization.user.id && !authorization.user.roles.includes("ADMIN")) {
      return apiError(403, "只有作者本人或管理员可以操作此帖");
    }
    if (post.removedBy) return apiError(409, "组队帖已下架");

    const action = typeof input.action === "string" ? input.action.toUpperCase() : undefined;
    if (input.action !== undefined && action !== "CLOSE") return apiError(422, "操作类型不正确");
    if (input.status !== undefined && input.status !== "CLOSED") return apiError(422, "编辑接口仅支持关闭帖子");
    const closing = action === "CLOSE" || input.status === "CLOSED";
    if (closing) {
      if (post.status === "CLOSED") return apiError(409, "组队帖已关闭");
      const updated = await prisma.$transaction(async (transaction) => {
        const saved = await transaction.teamPost.update({
          where: { id: post.id },
          data: { status: "CLOSED" },
          select: { id: true, status: true },
        });
        await writeAuditLog({
          actorId: authorization.user.id,
          action: "TEAM_POST_CLOSED",
          targetType: "TeamPost",
          targetId: post.id,
          detail: { title: post.title, previousStatus: post.status },
        }, transaction);
        return saved;
      });
      return apiSuccess(updated, "组队帖已关闭");
    }

    const editableKeys = ["competitionId", "trackId", "title", "summary", "expectation", "skills", "memberLimit", "requirement", "contact", "expiresAt"];
    if (!editableKeys.some((key) => key in input)) return apiError(422, "没有可保存的修改");

    const data: Prisma.TeamPostUncheckedUpdateInput = {};
    let competitionId = post.competitionId;
    if ("competitionId" in input) {
      competitionId = text(input, "competitionId");
      if (!competitionId) return apiError(422, "赛事不能为空");
      data.competitionId = competitionId;
    }
    if (!competitionId) return apiError(422, "赛事不能为空");
    let trackId = post.trackId;
    if ("trackId" in input) {
      trackId = text(input, "trackId") || null;
      data.trackId = trackId;
    }
    if ("title" in input) {
      const title = text(input, "title");
      if (!title) return apiError(422, "标题不能为空");
      data.title = title;
    }
    if ("summary" in input) {
      const summary = text(input, "summary");
      if (!summary) return apiError(422, "招募说明不能为空");
      data.summary = summary;
    }
    if ("expectation" in input) data.expectation = text(input, "expectation") || null;
    if ("skills" in input) data.skills = text(input, "skills");
    if ("requirement" in input) data.requirement = text(input, "requirement") || "全部";
    if ("contact" in input) data.contact = text(input, "contact") || null;

    let memberLimit = post.memberLimit;
    if ("memberLimit" in input) {
      memberLimit = Number(input.memberLimit);
      if (!Number.isInteger(memberLimit) || memberLimit < 2 || memberLimit > 10) {
        return apiError(422, "队伍人数上限须为 2–10 人");
      }
      if (memberLimit < post.currentCount) return apiError(422, "人数上限不能低于当前队伍人数");
      data.memberLimit = memberLimit;
    }
    if ("expiresAt" in input) {
      const parsed = parseExpiresAt(input.expiresAt);
      if (!("expiresAt" in parsed)) return apiError(422, parsed.error);
      data.expiresAt = parsed.expiresAt;
    }

    const updated = await prisma.$transaction(async (transaction) => {
      if ("competitionId" in input) {
        const competition = await transaction.competition.findUnique({
          where: { id: competitionId },
          select: { id: true, publishStatus: true },
        });
        if (!competition) throw new Error("COMPETITION_NOT_FOUND");
        if (competition.publishStatus !== "PUBLISHED") throw new Error("COMPETITION_NOT_PUBLISHED");
      }
      if (trackId && (("trackId" in input) || ("competitionId" in input))) {
        const track = await transaction.track.findFirst({
          where: { id: trackId, competitionId, enabled: true },
          select: { id: true },
        });
        if (!track) throw new Error("TRACK_NOT_FOUND");
      }
      if (competitionId !== post.competitionId && post.status === "RECRUITING") {
        const recruitingCount = await transaction.teamPost.count({
          where: {
            id: { not: post.id },
            authorId: post.authorId,
            competitionId,
            status: "RECRUITING",
          },
        });
        if (recruitingCount >= 3) throw new Error("TEAM_POST_LIMIT");
      }
      if (post.status === "RECRUITING" || post.status === "FULL") {
        data.status = post.currentCount >= memberLimit ? "FULL" : "RECRUITING";
      }
      return transaction.teamPost.update({ where: { id: post.id }, data, select: postSelect });
    });
    return apiSuccess(updated, "组队帖已保存");
  } catch (error) {
    if (error instanceof SyntaxError) return apiError(422, "请求格式不正确");
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return apiError(404, "组队帖不存在");
    if (error instanceof Error && error.message === "COMPETITION_NOT_FOUND") return apiError(404, "赛事不存在");
    if (error instanceof Error && error.message === "COMPETITION_NOT_PUBLISHED") return apiError(422, "赛事未发布，不能发布组队帖");
    if (error instanceof Error && error.message === "TRACK_NOT_FOUND") return apiError(422, "赛道不存在或不属于该赛事");
    if (error instanceof Error && error.message === "TEAM_POST_LIMIT") return apiError(409, "同一赛事最多同时发布 3 个招募帖");
    console.error("关闭/编辑组队帖失败：", error instanceof Error ? error.message : error);
    return apiError(500, "关闭/编辑组队帖失败");
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const authorization = await requireApiAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    let reason = "";
    const rawBody = await request.text();
    if (rawBody.trim()) {
      const body: unknown = JSON.parse(rawBody);
      if (typeof body !== "object" || body === null || Array.isArray(body)) return apiError(422, "请求内容不正确");
      reason = text(body as Record<string, unknown>, "reason");
    }
    const post = await prisma.teamPost.findUnique({ where: { id: params.id } });
    if (!post) return apiError(404, "组队帖不存在");
    if (post.removedBy) return apiError(409, "组队帖已下架");
    await prisma.$transaction(async (transaction) => {
      await transaction.teamPost.update({
        where: { id: post.id },
        data: { status: "CLOSED", removedBy: authorization.user.id, removedReason: reason || null },
      });
      await writeAuditLog({
        actorId: authorization.user.id,
        action: "TEAM_POST_REMOVED",
        targetType: "TeamPost",
        targetId: post.id,
        detail: { title: post.title, previousStatus: post.status, reason: reason || null },
      }, transaction);
    });
    return apiSuccess({ id: post.id, status: "CLOSED" }, "组队帖已下架");
  } catch (error) {
    if (error instanceof SyntaxError) return apiError(422, "请求格式不正确");
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return apiError(404, "组队帖不存在");
    console.error("下架组队帖失败：", error instanceof Error ? error.message : error);
    return apiError(500, "下架组队帖失败");
  }
}
