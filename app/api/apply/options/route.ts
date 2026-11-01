import { apiError, apiSuccess } from "@/lib/api";
import { buildApplyOptions } from "@/lib/apply-options";
import { requireApiRoles } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authorization = await requireApiRoles(["STUDENT"]);
  if (!authorization.ok) return authorization.response;
  try {
    // 与服务端首屏（app/(workspace)/apply/page.tsx）共用同一实现，避免两份字典逻辑漂移
    return apiSuccess(await buildApplyOptions(), "查询成功");
  } catch (error) {
    console.error("报名选项读取失败：", error);
    return apiError(500, "报名选项读取失败");
  }
}
