import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { SESSION_COOKIE } from "@/lib/auth";
import { getActiveUser } from "@/lib/auth.server";

export async function POST(request: NextRequest) {
  try {
    const user = await getActiveUser();
    if (!user) {
      return apiError(401, "未登录或账号不可用");
    }
    await writeAuditLog({
      actorId: user.id,
      action: "LOGOUT",
      targetType: "User",
      targetId: user.id,
      detail: {},
    });
    const response = apiSuccess(null, "退出成功");
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
    return response;
  } catch (error) {
    console.error("退出接口错误：", error);
    return apiError(500, "退出失败，请稍后重试");
  }
}
