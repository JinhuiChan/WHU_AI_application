import { apiError, apiSuccess } from "@/lib/api";
import { getActiveUser } from "@/lib/auth.server";
import { getProjectDetail } from "@/lib/projects";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: { id: string };
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await getActiveUser();
    if (!user) return apiError(401, "未登录或账号不可用");
    const project = await getProjectDetail(params.id, user.role);
    if (!project) return apiError(404, "项目不存在");
    return apiSuccess(project);
  } catch (error) {
    console.error("项目详情接口错误：", error);
    return apiError(500, "获取项目详情失败");
  }
}
