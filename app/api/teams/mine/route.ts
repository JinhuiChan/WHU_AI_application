import { Prisma } from "@prisma/client";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiUser } from "@/lib/auth.server";
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
  removedBy: true,
  removedReason: true,
  createdAt: true,
  updatedAt: true,
  competition: { select: { id: true, name: true, year: true, level: true } },
  track: { select: { id: true, name: true } },
} satisfies Prisma.TeamPostSelect;

export async function GET() {
  const authorization = await requireApiUser();
  if (!authorization.ok) return authorization.response;
  try {
    const [posts, requests] = await prisma.$transaction([
      prisma.teamPost.findMany({
        where: { authorId: authorization.user.id },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        select: postSelect,
      }),
      prisma.teamJoinRequest.findMany({
        where: { userId: authorization.user.id },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        select: {
          id: true,
          postId: true,
          message: true,
          status: true,
          handledAt: true,
          createdAt: true,
          post: { select: postSelect },
        },
      }),
    ]);
    return apiSuccess({ posts, requests });
  } catch (error) {
    console.error("我的组队接口错误：", error instanceof Error ? error.message : error);
    return apiError(500, "获取我的组队失败");
  }
}
