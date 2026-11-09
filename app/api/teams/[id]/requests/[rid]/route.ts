import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { apiError, apiSuccess } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireApiUser } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: { id: string; rid: string } };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const authorization = await requireApiUser();
  if (!authorization.ok) return authorization.response;
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) return apiError(422, "请求内容不正确");
    const input = body as Record<string, unknown>;
    const action = typeof input.action === "string" ? input.action.toUpperCase() : "";
    const accepted = action === "ACCEPT" || action === "ACCEPTED";
    const declined = action === "DECLINE" || action === "DECLINED" || action === "REJECT";
    if (!accepted && !declined) return apiError(422, "操作类型仅支持接受或婉拒");
    const reason = typeof input.reason === "string" ? input.reason.trim() : "";

    const result = await prisma.$transaction(async (transaction) => {
      const joinRequest = await transaction.teamJoinRequest.findFirst({
        where: { id: params.rid, postId: params.id },
        select: { id: true, postId: true, userId: true, status: true },
      });
      if (!joinRequest) throw new Error("REQUEST_NOT_FOUND");
      const post = await transaction.teamPost.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          authorId: true,
          title: true,
          status: true,
          currentCount: true,
          memberLimit: true,
          expiresAt: true,
          removedBy: true,
        },
      });
      if (!post) throw new Error("POST_NOT_FOUND");
      if (post.authorId !== authorization.user.id && !authorization.user.roles.includes("ADMIN")) {
        throw new Error("FORBIDDEN");
      }
      if (joinRequest.status !== "PENDING") throw new Error("REQUEST_HANDLED");

      const handledAt = new Date();
      if (declined) {
        const updated = await transaction.teamJoinRequest.updateMany({
          where: { id: joinRequest.id, status: "PENDING" },
          data: { status: "DECLINED", handledAt, handledBy: authorization.user.id },
        });
        if (updated.count !== 1) throw new Error("REQUEST_HANDLED");
        await writeAuditLog({
          actorId: authorization.user.id,
          action: "TEAM_JOIN_DECLINED",
          targetType: "TeamJoinRequest",
          targetId: joinRequest.id,
          detail: { postId: post.id, applicantId: joinRequest.userId, reason: reason || null },
        }, transaction);
        return { id: joinRequest.id, postId: post.id, status: "DECLINED", currentCount: post.currentCount, postStatus: post.status };
      }

      if (post.removedBy) throw new Error("POST_UNAVAILABLE");
      if (post.currentCount >= post.memberLimit || post.status === "FULL") throw new Error("POST_FULL");
      if (post.status !== "RECRUITING") throw new Error("POST_UNAVAILABLE");
      if (post.expiresAt <= handledAt) throw new Error("POST_EXPIRED");

      const nextCount = post.currentCount + 1;
      const nextPostStatus = nextCount >= post.memberLimit ? "FULL" : "RECRUITING";
      const updatedRequest = await transaction.teamJoinRequest.updateMany({
        where: { id: joinRequest.id, status: "PENDING" },
        data: { status: "ACCEPTED", handledAt, handledBy: authorization.user.id },
      });
      if (updatedRequest.count !== 1) throw new Error("REQUEST_HANDLED");
      const updatedPost = await transaction.teamPost.updateMany({
        where: { id: post.id, currentCount: post.currentCount, status: "RECRUITING", removedBy: null },
        data: { currentCount: { increment: 1 }, status: nextPostStatus },
      });
      if (updatedPost.count !== 1) throw new Error("POST_CHANGED");
      await writeAuditLog({
        actorId: authorization.user.id,
        action: "TEAM_JOIN_ACCEPTED",
        targetType: "TeamJoinRequest",
        targetId: joinRequest.id,
        detail: { postId: post.id, applicantId: joinRequest.userId, currentCount: nextCount, postStatus: nextPostStatus },
      }, transaction);
      return { id: joinRequest.id, postId: post.id, status: "ACCEPTED", currentCount: nextCount, postStatus: nextPostStatus };
    });
    return apiSuccess(result, accepted ? "已接受入队申请" : "已婉拒入队申请");
  } catch (error) {
    if (error instanceof SyntaxError) return apiError(422, "请求格式不正确");
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return apiError(409, "该申请与现有队伍记录冲突");
    if (error instanceof Error && (error.message === "REQUEST_NOT_FOUND" || error.message === "POST_NOT_FOUND")) {
      return apiError(404, "入队申请不存在");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") return apiError(403, "只有作者本人或管理员可以审批申请");
    if (error instanceof Error && error.message === "REQUEST_HANDLED") return apiError(409, "该申请已处理，请刷新后重试");
    if (error instanceof Error && error.message === "POST_FULL") return apiError(409, "该队伍已满员");
    if (error instanceof Error && error.message === "POST_UNAVAILABLE") return apiError(409, "该组队帖已停止招募");
    if (error instanceof Error && error.message === "POST_EXPIRED") return apiError(409, "该组队帖已过期");
    if (error instanceof Error && error.message === "POST_CHANGED") return apiError(409, "队伍信息已变化，请刷新后重试");
    console.error("审批入队申请失败：", error instanceof Error ? error.message : error);
    return apiError(500, "审批入队申请失败");
  }
}
