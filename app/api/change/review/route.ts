import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth.server";
import { ChangeError, reviewChangeRequest } from "@/lib/change";

export async function POST(request: NextRequest) {
  const authorization = await requireApiAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const result = await reviewChangeRequest({
      requestId: body.requestId,
      action: body.action,
      reason: body.reason,
      actorId: authorization.user.id,
    });
    return apiSuccess(result, body.action === "approve" ? "审批已通过" : "申请已驳回");
  } catch (error) {
    if (error instanceof SyntaxError) return apiError(422, "请求格式不正确");
    if (error instanceof ChangeError) return apiError(error.status, error.message, error.data);
    console.error("变更申请审批失败：", error instanceof Error ? error.message : error);
    return apiError(500, "变更申请审批失败");
  }
}
