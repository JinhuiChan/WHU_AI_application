import type { AnomalyStatus } from "@prisma/client";
import { anomalyRuleNames } from "@/lib/presentation";
import { prisma } from "@/lib/prisma";
import type { AnomalyData, AnomalyGroup } from "@/types/anomaly";

export async function getAnomalyData(status?: AnomalyStatus, ruleId?: string): Promise<AnomalyData> {
  const where = {
    ...(status ? { status } : {}),
    ...(ruleId ? { ruleId } : {}),
    project: { deletedAt: null },
  };
  const [records, statusCounts] = await Promise.all([
    prisma.anomaly.findMany({
      where,
      orderBy: [{ ruleId: "asc" }, { project: { year: "desc" } }, { project: { name: "asc" } }],
      select: {
        id: true,
        ruleId: true,
        description: true,
        status: true,
        resolution: true,
        resolvedAt: true,
        resolver: { select: { name: true } },
        project: { select: { id: true, name: true, year: true, college: true } },
      },
    }),
    prisma.anomaly.groupBy({
      by: ["status"],
      where: { project: { deletedAt: null } },
      _count: { status: true },
    }),
  ]);

  const groups: AnomalyGroup[] = [];
  for (const record of records) {
    let group = groups.find((item) => item.ruleId === record.ruleId);
    if (!group) {
      group = {
        ruleId: record.ruleId,
        ruleName: anomalyRuleNames[record.ruleId] ?? "其他规则",
        items: [],
      };
      groups.push(group);
    }
    group.items.push({
      id: record.id,
      ruleId: record.ruleId,
      description: record.description,
      status: record.status,
      resolution: record.resolution,
      resolvedBy: record.resolver?.name ?? null,
      resolvedAt: record.resolvedAt?.toISOString() ?? null,
      project: record.project,
    });
  }

  const resolved = statusCounts.find((item) => item.status === "RESOLVED")?._count.status ?? 0;
  const pending = statusCounts.find((item) => item.status === "PENDING")?._count.status ?? 0;
  const total = resolved + pending;
  return {
    groups,
    summary: {
      total,
      resolved,
      pending,
      resolutionRate: total ? Math.round((resolved / total) * 100) : 0,
    },
    status: status ?? null,
    ruleId: ruleId ?? null,
  };
}
