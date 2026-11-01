import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { deleteTrack, TrackAdminError, updateTrack } from "@/lib/admin-tracks";
import { requireApiAdmin } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

type Context = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: Context) {
  const authorization = await requireApiAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const updated = await updateTrack({
      id: params.id,
      name: typeof body.name === "string" ? body.name : undefined,
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    });
    await writeAuditLog({
      actorId: authorization.user.id,
      action: "COMPETITION_TRACK_UPDATED",
      targetType: "Track",
      targetId: updated.id,
      detail: { name: typeof body.name === "string" ? body.name : null, enabled: typeof body.enabled === "boolean" ? body.enabled : null },
    });
    return apiSuccess(updated, "赛道已保存");
  } catch (error) {
    if (error instanceof SyntaxError) return apiError(422, "请求格式不正确");
    if (error instanceof TrackAdminError) return apiError(error.status, error.message);
    console.error("更新赛道失败：", error instanceof Error ? error.message : error);
    return apiError(500, "更新赛道失败");
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const authorization = await requireApiAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    const removed = await deleteTrack(params.id);
    await writeAuditLog({
      actorId: authorization.user.id,
      action: "COMPETITION_TRACK_DELETED",
      targetType: "Track",
      targetId: removed.id,
      detail: {},
    });
    return apiSuccess(removed, "赛道已删除");
  } catch (error) {
    if (error instanceof TrackAdminError) return apiError(error.status, error.message);
    console.error("删除赛道失败：", error instanceof Error ? error.message : error);
    return apiError(500, "删除赛道失败");
  }
}
