import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth.server";
import { getReviewList, parseReviewQuery } from "@/lib/review";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await requireApiAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    return apiSuccess(await getReviewList(parseReviewQuery(request.nextUrl.searchParams)));
  } catch (error) {
    console.error("审核列表接口错误：", error instanceof Error ? error.message : error);
    return apiError(500, "获取审核列表失败");
  }
}
