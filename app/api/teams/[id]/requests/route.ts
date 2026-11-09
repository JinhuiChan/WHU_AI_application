import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import type { TeamJoinStatus } from "@prisma/client";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiUser } from "@/lib/auth.server";
import { pageParams } from "@/lib/list-query";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

function parseStatus(value: string | null): TeamJoinStatus | undefined {
  return value === "PENDING" || value === "ACCEPTED" || value === "DECLINED" || value === "CANCELLED" || value === "LEFT"
    ? value
    : undefined;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const authorization = await requireApiUser();
  if (!authorization.ok) return authorization.response;
  try {
    const post = await prisma.teamPost.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true },
    });
    if (!post) return apiError(404, "组队帖不存在");
    if (post.authorId !== authorization.user.id && !authorization.user.roles.includes("ADMIN")) {
      return apiError(403, "只有作者本人或管理员可以查看申请");
    }

    const statusValue = request.nextUrl.searchParams.get("status");
    const status = parseStatus(statusValue);
    if (statusValue && !status) return apiError(422, "申请状态不正确");
    const { page, pageSize } = pageParams(
      request.nextUrl.searchParams.get("page") ?? undefined,
      request.nextUrl.searchParams.get("pageSize") ?? undefined,
    );
    const where: Prisma.TeamJoinRequestWhereInput = { postId: post.id };
    if (status) where.status = status;
    const [list, total] = await prisma.$transaction([
      prisma.teamJoinRequest.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          postId: true,
          userId: true,
          message: true,
          status: true,
          handledAt: true,
          handledBy: true,
          createdAt: true,
          user: { select: { id: true, name: true, studentNo: true, college: true, major: true, grade: true } },
        },
      }),
      prisma.teamJoinRequest.count({ where }),
    ]);
    return apiSuccess({ list, total, page, pageSize });
  } catch (error) {
    console.error("入队申请列表接口错误：", error instanceof Error ? error.message : error);
    return apiError(500, "获取入队申请列表失败");
  }
}
