import { NextRequest } from "next/server";
import { getAnomalyData } from "@/lib/anomalies";
import { apiError, apiSuccess } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { getActiveUser, requireApiAdmin } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

const ruleIds = new Set(["R1", "R2", "R3", "R4", "R5", "R6"]);

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getActiveUser();
    if (!user) return apiError(401, "未登录或账号不可用");
    const status = request.nextUrl.searchParams.get("status");
    const ruleId = request.nextUrl.searchParams.get("ruleId");
    if (status && status !== "PENDING" && status !== "RESOLVED") {
      return apiError(422, "异常状态仅支持 PENDING 或 RESOLVED");
    }
    if (ruleId && !ruleIds.has(ruleId)) {
      return apiError(422, "规则筛选仅支持 R1–R6");
    }
    return apiSuccess(
      await getAnomalyData(
        status === "PENDING" || status === "RESOLVED" ? status : undefined,
        ruleId ?? undefined,
      ),
    );
  } catch (error) {
    console.error("异常列表接口错误：", error);
    return apiError(500, "获取异常列表失败");
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.length > 0);
}

export async function PATCH(request: NextRequest) {
  try {
    const authorization = await requireApiAdmin();
    if (!authorization.ok) return authorization.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError(422, "请求格式不正确");
    }
    if (typeof body !== "object" || body === null) {
      return apiError(422, "请求内容不正确");
    }
    const ids = "ids" in body ? body.ids : undefined;
    const resolution = "resolution" in body ? body.resolution : undefined;
    if (!isStringArray(ids) || ids.length === 0 || ids.length > 200) {
      return apiError(422, "请选择 1–200 条异常进行处置");
    }
    if (resolution !== "CONFIRMED" && resolution !== "FIXED" && resolution !== "UNTRACEABLE") {
      return apiError(422, "处置结论仅支持 CONFIRMED、FIXED 或 UNTRACEABLE");
    }
    const status = request.nextUrl.searchParams.get("status");
    const ruleId = request.nextUrl.searchParams.get("ruleId");
    if (status && status !== "PENDING" && status !== "RESOLVED") {
      return apiError(422, "异常状态仅支持 PENDING 或 RESOLVED");
    }
    if (ruleId && !ruleIds.has(ruleId)) {
      return apiError(422, "规则筛选仅支持 R1–R6");
    }

    const uniqueIds = [...new Set(ids)];
    const targets = await prisma.anomaly.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, status: true },
    });
    if (targets.length !== uniqueIds.length) {
      return apiError(404, "部分异常记录不存在");
    }
    if (targets.some((target) => target.status === "RESOLVED")) {
      return apiError(409, "所选记录中包含已处置异常，请刷新后重试");
    }

    const resolvedAt = new Date();
    await prisma.$transaction(async (transaction) => {
      await transaction.anomaly.updateMany({
        where: { id: { in: uniqueIds }, status: "PENDING" },
        data: {
          status: "RESOLVED",
          resolution,
          resolvedBy: authorization.user.id,
          resolvedAt,
        },
      });
      for (const id of uniqueIds) {
        await writeAuditLog(
          {
            actorId: authorization.user.id,
            action: "ANOMALY_RESOLVED",
            targetType: "Anomaly",
            targetId: id,
            detail: { resolution, resolvedAt: resolvedAt.toISOString(), batchSize: uniqueIds.length },
          },
          transaction,
        );
      }
    });
    return apiSuccess(
      await getAnomalyData(
        status === "PENDING" || status === "RESOLVED" ? status : undefined,
        ruleId ?? undefined,
      ),
      `已处置 ${uniqueIds.length} 条异常`,
    );
  } catch (error) {
    console.error("异常批量处置接口错误：", error);
    return apiError(500, "批量处置异常失败");
  }
}
