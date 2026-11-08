import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiStudent } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: { id: string } };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const authorization = await requireApiStudent();
  if (!authorization.ok) return authorization.response;
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) return apiError(422, "请求内容不正确");
    const input = body as Record<string, unknown>;
    const message = typeof input.message === "string" ? input.message.trim() : "";

    const post = await prisma.teamPost.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        authorId: true,
        status: true,
        memberLimit: true,
        currentCount: true,
        expiresAt: true,
        removedBy: true,
      },
    });
    if (!post || post.removedBy) return apiError(404, "组队帖不存在");
    if (post.authorId === authorization.user.id) return apiError(422, "不能申请自己发布的组队帖");
    if (post.currentCount >= post.memberLimit || post.status === "FULL") return apiError(409, "该队伍已满员");
    if (post.status !== "RECRUITING") return apiError(409, "该组队帖已停止招募");
    if (post.expiresAt <= new Date()) return apiError(409, "该组队帖已过期");

    const existing = await prisma.teamJoinRequest.findFirst({
      where: { postId: post.id, userId: authorization.user.id, status: { in: ["PENDING", "ACCEPTED"] } },
      select: { id: true, status: true },
    });
    if (existing?.status === "PENDING") return apiError(409, "你已提交过待处理申请");
    if (existing?.status === "ACCEPTED") return apiError(409, "你已加入该队伍");

    const joinRequest = await prisma.teamJoinRequest.create({
      data: { postId: post.id, userId: authorization.user.id, message },
      select: {
        id: true,
        postId: true,
        userId: true,
        message: true,
        status: true,
        createdAt: true,
      },
    });
    return apiSuccess(joinRequest, "入队申请已提交", 201);
  } catch (error) {
    if (error instanceof SyntaxError) return apiError(422, "请求格式不正确");
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError(409, "你已提交过待处理申请");
    }
    console.error("申请入队失败：", error instanceof Error ? error.message : error);
    return apiError(500, "申请入队失败");
  }
}
