import type { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api";
import { requireApiRoles } from "@/lib/auth.server";
import { confirmTeacher, teacherErrorResponse } from "@/lib/teacher";

export async function POST(request: NextRequest) {
  const authorization = await requireApiRoles(["TEACHER"]);
  if (!authorization.ok) return authorization.response;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await confirmTeacher({
      teacherId: body.teacherId,
      action: body.action,
      reason: body.reason,
      actor: authorization.user,
    });
    return apiSuccess(result, body.action === "confirm" ? "已确认指导关系" : "已拒绝指导关系");
  } catch (error) {
    return teacherErrorResponse(error);
  }
}
