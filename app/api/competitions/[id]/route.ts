import { apiError, apiSuccess } from "@/lib/api";
import { getActiveUser } from "@/lib/auth.server";
import { getCompetitionDetail } from "@/lib/competitions";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: { id: string };
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await getActiveUser();
    if (!user) return apiError(401, "未登录或账号不可用");
    const competition = await getCompetitionDetail(params.id, user.role);
    if (!competition) return apiError(404, "赛事不存在");
    return apiSuccess(competition);
  } catch (error) {
    console.error("赛事详情接口错误：", error);
    return apiError(500, "获取赛事详情失败");
  }
}
