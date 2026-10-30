import type { NextRequest } from "next/server";
import type { ProjectFormInput } from "@/types/apply";
import { apiError, apiSuccess } from "@/lib/api";
import { ApplyError, submitProject } from "@/lib/apply";
import { requireApiStudent } from "@/lib/auth.server";

export async function POST(request: NextRequest) {
  const authorization = await requireApiStudent();
  if (!authorization.ok) return authorization.response;
  try {
    const body = await request.json() as { input?: ProjectFormInput; projectId?: string };
    if (!body.input || typeof body.input !== "object") return apiError(422, "报名数据格式不正确");
    const result = await submitProject(authorization.user.id, body.input, body.projectId);
    return apiSuccess(result, "提交成功");
  } catch (error) {
    if (error instanceof SyntaxError) return apiError(422, "请求格式不正确");
    if (error instanceof ApplyError) return apiError(error.status, error.message);
    console.error("提交报名失败：", error instanceof Error ? error.message : error);
    return apiError(500, "提交报名失败");
  }
}
