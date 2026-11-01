import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import {
  AdminAwardError,
  getAdminAwardPage,
  parseAdminAwardLevel,
  saveAdminAward,
} from "@/lib/admin-awards";
import { requireApiAdmin } from "@/lib/auth.server";
import { optionalText, pageParams } from "@/lib/list-query";
import { awardLevelLabels } from "@/lib/presentation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await requireApiAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    const params = request.nextUrl.searchParams;
    const rawLevel = params.get("level")?.trim();
    const level = parseAdminAwardLevel(rawLevel);
    if (rawLevel && !level) return apiError(422, "奖项等级筛选值不正确");
    const { page, pageSize } = pageParams(params.get("page") ?? undefined, params.get("pageSize") ?? undefined);
    const result = await getAdminAwardPage({
      competitionId: optionalText(params.get("competitionId") ?? undefined),
      college: optionalText(params.get("college") ?? undefined),
      level: level ?? undefined,
      page,
      pageSize,
    });
    return apiSuccess(result);
  } catch (error) {
    console.error("奖项列表接口错误：", error);
    return apiError(500, "获取奖项列表失败");
  }
}

export async function POST(request: NextRequest) {
  const authorization = await requireApiAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError(422, "请提交 JSON 格式的奖项信息");
    }
    const result = await saveAdminAward(authorization.user.id, body);
    const message = result.changed
      ? result.oldLevel
        ? `已由${awardLevelLabels[result.oldLevel]}改为${awardLevelLabels[result.newLevel]}`
        : `已录入${awardLevelLabels[result.newLevel]}`
      : "奖项等级未变化";
    return apiSuccess(result, message);
  } catch (error) {
    if (error instanceof AdminAwardError) return apiError(error.status, error.message);
    console.error("保存奖项接口错误：", error);
    return apiError(500, "保存奖项失败");
  }
}
