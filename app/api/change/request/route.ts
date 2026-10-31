import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiUser } from "@/lib/auth.server";
import { ChangeError, createChangeRequest } from "@/lib/change";

export async function POST(request: NextRequest) {
  const authorization = await requireApiUser();
  if (!authorization.ok) return authorization.response;
  if (authorization.user.role !== "STUDENT") return apiError(403, "仅学生可以发起变更申请");
  try {
    const body = await request.json() as Record<string, unknown>;
    const result = await createChangeRequest({
      projectId: body.projectId,
      type: body.type,
      newValues: body.newValues,
      reason: body.reason,
      evidence: body.evidence,
      actorId: authorization.user.id,
    });
    return apiSuccess(result, "变更申请已提交", 201);
  } catch (error) {
    if (error instanceof SyntaxError) return apiError(422, "请求格式不正确");
    if (error instanceof ChangeError) return apiError(error.status, error.message, error.data);
    console.error("发起变更申请失败：", error instanceof Error ? error.message : error);
    return apiError(500, "发起变更申请失败");
  }
}
