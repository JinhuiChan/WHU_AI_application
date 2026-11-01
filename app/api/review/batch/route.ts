import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth.server";
import { batchReviewProjects, ReviewError } from "@/lib/review";

export async function POST(request: NextRequest) {
  const authorization = await requireApiAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const level = body.level;
    const rawIds = body.projectIds;
    const rawAction = body.action ?? body.result;
    const action = typeof rawAction === "string" ? rawAction.toUpperCase() : "";
    const result = action === "APPROVE" || action === "APPROVED"
      ? "APPROVED"
      : action === "REJECT" || action === "REJECTED"
        ? "REJECTED"
        : null;
    const reason = typeof body.reason === "string" ? body.reason : undefined;
    if (level !== "COLLEGE" && level !== "SCHOOL") return apiError(422, "审核级别仅支持 COLLEGE 或 SCHOOL");
    if (!result) return apiError(422, "批量操作仅支持通过或驳回");
    if (!Array.isArray(rawIds) || rawIds.length === 0 || rawIds.length > 200 ||
      !rawIds.every((id) => typeof id === "string" && id.trim())) {
      return apiError(422, "请选择 1–200 个项目进行审核");
    }
    const projectIds = rawIds.map((id) => id.trim());
    const data = await batchReviewProjects({ projectIds, level, result, reason, actorId: authorization.user.id });
    return apiSuccess(data, `批量审核完成：成功 ${data.success.length} 条，失败 ${data.failed.length} 条`);
  } catch (error) {
    if (error instanceof SyntaxError) return apiError(422, "请求格式不正确");
    if (error instanceof ReviewError) return apiError(error.status, error.message);
    console.error("批量审核失败：", error instanceof Error ? error.message : error);
    return apiError(500, "批量审核失败");
  }
}
