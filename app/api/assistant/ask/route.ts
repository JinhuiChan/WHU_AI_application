import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { answerQuestion } from "@/lib/assistant";
import { writeAuditLog } from "@/lib/audit";
import { requireApiUser } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authorization = await requireApiUser();
  if (!authorization.ok) return authorization.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(422, "请求格式不正确");
  }
  if (typeof body !== "object" || body === null) {
    return apiError(422, "请输入咨询问题");
  }
  const value = "question" in body ? body.question : undefined;
  if (typeof value !== "string" || !value.trim()) {
    return apiError(422, "请输入咨询问题");
  }
  const question = value.trim();
  if (question.length > 500) {
    return apiError(422, "咨询问题不能超过 500 个字符");
  }

  try {
    const result = await answerQuestion(question);
    await writeAuditLog({
      actorId: authorization.user.id,
      action: "ASSISTANT_ASKED",
      targetType: "Assistant",
      targetId: result.evidence?.chunkId ?? "NO_MATCH",
      detail: { question, handoff: result.handoff, year: result.evidence?.year ?? null },
    });
    return apiSuccess(result, result.handoff ? "已提供人工咨询渠道" : "检索完成");
  } catch (error) {
    console.error("站内咨询接口错误：", error);
    return apiError(500, "咨询处理失败，请稍后重试");
  }
}
