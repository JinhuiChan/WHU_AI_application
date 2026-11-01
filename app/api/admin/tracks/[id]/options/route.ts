import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { saveTrackOptions, TrackAdminError } from "@/lib/admin-tracks";
import { requireApiAdmin } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

type Context = { params: { id: string } };

export async function PUT(request: NextRequest, { params }: Context) {
  const authorization = await requireApiAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const kind = body.kind;
    if (kind !== "GROUP" && kind !== "CATEGORY") return apiError(422, "kind 仅支持 GROUP 或 CATEGORY");
    if (!Array.isArray(body.labels)) return apiError(422, "labels 必须是字符串数组");
    const labels = body.labels.filter((item): item is string => typeof item === "string");
    const options = await saveTrackOptions({ trackId: params.id, kind, labels });
    await writeAuditLog({
      actorId: authorization.user.id,
      action: "COMPETITION_TRACK_OPTIONS_SAVED",
      targetType: "Track",
      targetId: params.id,
      detail: { kind, labels },
    });
    return apiSuccess(options, "保存成功");
  } catch (error) {
    if (error instanceof SyntaxError) return apiError(422, "请求格式不正确");
    if (error instanceof TrackAdminError) return apiError(error.status, error.message);
    console.error("保存组别/类别失败：", error instanceof Error ? error.message : error);
    return apiError(500, "保存组别/类别失败");
  }
}
