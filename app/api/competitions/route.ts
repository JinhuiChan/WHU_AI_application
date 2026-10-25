import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { getActiveUser } from "@/lib/auth.server";
import { getCompetitionPage } from "@/lib/competitions";
import { optionalCompetitionLevel, optionalText, optionalYear, pageParams } from "@/lib/list-query";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getActiveUser();
    if (!user) return apiError(401, "未登录或账号不可用");
    const params = request.nextUrl.searchParams;
    const { page, pageSize } = pageParams(params.get("page") ?? undefined, params.get("pageSize") ?? undefined);
    return apiSuccess(
      await getCompetitionPage({
        year: optionalYear(params.get("year") ?? undefined),
        level: optionalCompetitionLevel(params.get("level") ?? undefined),
        q: optionalText(params.get("q") ?? undefined),
        page,
        pageSize,
      }),
    );
  } catch (error) {
    console.error("赛事列表接口错误：", error);
    return apiError(500, "获取赛事列表失败");
  }
}
