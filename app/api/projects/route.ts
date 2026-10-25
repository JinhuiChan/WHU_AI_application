import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { getActiveUser } from "@/lib/auth.server";
import { optionalAwardLevel, optionalText, optionalYear, pageParams } from "@/lib/list-query";
import { getProjectPage } from "@/lib/projects";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getActiveUser();
    if (!user) return apiError(401, "未登录或账号不可用");
    const params = request.nextUrl.searchParams;
    const { page, pageSize } = pageParams(params.get("page") ?? undefined, params.get("pageSize") ?? undefined);
    return apiSuccess(
      await getProjectPage(
        {
          year: optionalYear(params.get("year") ?? undefined),
          college: optionalText(params.get("college") ?? undefined),
          level: optionalAwardLevel(params.get("level") ?? undefined),
          awarded: params.get("awarded") === "1",
          q: optionalText(params.get("q") ?? undefined),
          page,
          pageSize,
        },
        user.role,
      ),
    );
  } catch (error) {
    console.error("项目列表接口错误：", error);
    return apiError(500, "获取项目列表失败");
  }
}
