import { apiError, apiSuccess } from "@/lib/api";
import { getActiveUser } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getActiveUser();
    if (!user) {
      return apiError(401, "未登录或账号不可用");
    }
    return apiSuccess({ user });
  } catch (error) {
    console.error("当前用户接口错误：", error);
    return apiError(500, "获取当前用户失败");
  }
}
