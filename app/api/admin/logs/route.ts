import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { getAuditLogPage } from "@/lib/audit-logs";
import { requireApiAdmin } from "@/lib/auth.server";
import { optionalText, pageParams } from "@/lib/list-query";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authorization = await requireApiAdmin();
    if (!authorization.ok) return authorization.response;
    const { page, pageSize } = pageParams(
      request.nextUrl.searchParams.get("page") ?? undefined,
      request.nextUrl.searchParams.get("pageSize") ?? undefined,
    );
    const result = await getAuditLogPage({
      actor: optionalText(request.nextUrl.searchParams.get("actor") ?? undefined),
      action: optionalText(request.nextUrl.searchParams.get("action") ?? undefined),
      page,
      pageSize,
    });
    return apiSuccess(result);
  } catch (error) {
    console.error("审计日志接口错误：", error);
    return apiError(500, "获取审计日志失败");
  }
}
