import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { getActiveUser } from "@/lib/auth.server";
import { getDashboardSummary, parseStatisticYear } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getActiveUser();
    if (!user) return apiError(401, "未登录或账号不可用");
    const year = parseStatisticYear(request.nextUrl.searchParams.get("year"));
    if (year === null) return apiError(422, "请提供有效的 year 赛年参数");
    return apiSuccess(await getDashboardSummary(year, user.role));
  } catch (error) {
    console.error("看板汇总接口错误：", error);
    return apiError(500, "获取看板汇总失败");
  }
}
