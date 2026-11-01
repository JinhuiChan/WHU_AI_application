import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiUser } from "@/lib/auth.server";
import { ChangeError, listChangeRequests, parseChangeListQuery } from "@/lib/change";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await requireApiUser();
  if (!authorization.ok) return authorization.response;
  try {
    const query = parseChangeListQuery(request.nextUrl.searchParams);
    return apiSuccess(await listChangeRequests(authorization.user, query));
  } catch (error) {
    if (error instanceof ChangeError) return apiError(error.status, error.message, error.data);
    console.error("获取变更申请列表失败：", error instanceof Error ? error.message : error);
    return apiError(500, "获取变更申请列表失败");
  }
}
