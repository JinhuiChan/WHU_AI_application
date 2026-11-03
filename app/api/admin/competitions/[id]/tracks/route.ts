import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { createTrack, listTracks, TrackAdminError } from "@/lib/admin-tracks";
import { requireApiAdmin } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

type Context = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: Context) {
  const authorization = await requireApiAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    return apiSuccess(await listTracks(params.id), "查询成功");
  } catch (error) {
    console.error("读取赛道失败：", error instanceof Error ? error.message : error);
    return apiError(500, "读取赛道失败");
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  const authorization = await requireApiAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const created = await createTrack({
      competitionId: params.id,
      parentId: typeof body.parentId === "string" && body.parentId.trim() ? body.parentId.trim() : null,
      name: typeof body.name === "string" ? body.name : "",
      kind: typeof body.kind === "string" ? body.kind : "",
    });
    await writeAuditLog({
      actorId: authorization.user.id,
      action: "COMPETITION_TRACK_CREATED",
      targetType: "Track",
      targetId: created.id,
      detail: { competitionId: params.id, parentId: created.parentId, name: created.name },
    });
    return apiSuccess(created, "赛道已添加", 201);
  } catch (error) {
    if (error instanceof SyntaxError) return apiError(422, "请求格式不正确");
    if (error instanceof TrackAdminError) return apiError(error.status, error.message);
    console.error("新增赛道失败：", error instanceof Error ? error.message : error);
    return apiError(500, "新增赛道失败");
  }
}
