import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth.server";
import { ReviewError, reviewProject } from "@/lib/review";

export async function POST(request: NextRequest) {
  const authorization = await requireApiAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const projectId = typeof body.projectId === "string" ? body.projectId.trim() : "";
    const level = body.level;
    if (!projectId) return apiError(422, "项目 ID 不能为空");
    if (level !== "COLLEGE" && level !== "SCHOOL") return apiError(422, "审核级别仅支持 COLLEGE 或 SCHOOL");
    const result = await reviewProject({ projectId, level, result: "APPROVED", actorId: authorization.user.id });
    return apiSuccess(result, level === "COLLEGE" ? "学院审核通过" : "校级终审通过");
  } catch (error) {
    if (error instanceof SyntaxError) return apiError(422, "请求格式不正确");
    if (error instanceof ReviewError) return apiError(error.status, error.message);
    console.error("单条审核通过失败：", error instanceof Error ? error.message : error);
    return apiError(500, "审核操作失败");
  }
}
