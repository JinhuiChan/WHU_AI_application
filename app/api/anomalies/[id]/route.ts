import { NextRequest } from "next/server";
import type { AnomalyResolution } from "@prisma/client";
import { getAnomalyData } from "@/lib/anomalies";
import { apiError, apiSuccess } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireApiAdmin } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: { id: string };
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
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
    const resolution = "resolution" in body ? body.resolution : undefined;
    if (resolution !== "CONFIRMED" && resolution !== "FIXED" && resolution !== "UNTRACEABLE") {
      return apiError(422, "处置结论仅支持 CONFIRMED、FIXED 或 UNTRACEABLE");
    }
    const status = request.nextUrl.searchParams.get("status");
    if (status && status !== "PENDING" && status !== "RESOLVED") {
      return apiError(422, "异常状态仅支持 PENDING 或 RESOLVED");
    }

    const target = await prisma.anomaly.findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    });
    if (!target) return apiError(404, "异常记录不存在");
    if (target.status === "RESOLVED") return apiError(409, "该异常已完成处置");

    const resolvedAt = new Date();
    await prisma.$transaction(async (transaction) => {
      await transaction.anomaly.update({
        where: { id: target.id },
        data: {
          status: "RESOLVED",
          resolution: resolution as AnomalyResolution,
          resolvedBy: authorization.user.id,
          resolvedAt,
        },
      });
      await writeAuditLog(
        {
          actorId: authorization.user.id,
          action: "ANOMALY_RESOLVED",
          targetType: "Anomaly",
          targetId: target.id,
          detail: { resolution, resolvedAt: resolvedAt.toISOString() },
        },
        transaction,
      );
    });
    return apiSuccess(
      await getAnomalyData(status === "PENDING" || status === "RESOLVED" ? status : undefined),
      "异常处置完成",
    );
  } catch (error) {
    console.error("异常处置接口错误：", error);
    return apiError(500, "处置异常失败");
  }
}
