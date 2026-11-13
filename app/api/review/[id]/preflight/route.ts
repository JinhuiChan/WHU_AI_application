import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth.server";
import { getAuditPreflight, ReviewError } from "@/lib/review";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const authorization = await requireApiAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    return apiSuccess(await getAuditPreflight(params.id));
  } catch (error) {
    if (error instanceof ReviewError) return apiError(error.status, error.message);
    console.error("审核预检接口错误：", error instanceof Error ? error.message : error);
    return apiError(500, "审核预检失败，请稍后重试");
  }
}
