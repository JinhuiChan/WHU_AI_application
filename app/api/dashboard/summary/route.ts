import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiUser } from "@/lib/auth.server";
import { getStatisticsSummary, parseStatisticsQuery } from "@/lib/statistics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const authorization = await requireApiUser();
  if (!authorization.ok) return authorization.response;
  try {
    return apiSuccess(await getStatisticsSummary(parseStatisticsQuery(request.nextUrl.searchParams), authorization.user));
  } catch (error) {
    console.error("统计看板接口错误：", error instanceof Error ? error.message : error);
    return apiError(500, "获取统计看板失败");
  }
}
