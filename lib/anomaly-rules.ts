import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type RuleClient = Prisma.TransactionClient | PrismaClient;

type RuleHit = {
  ruleId: string;
  projectId: string;
  description: string;
};

type R1Group = {
  personNo: string;
  year: number;
  projectCount: number | bigint;
};

type CountHit = {
  projectId: string;
  count: number | bigint;
};

type R4Hit = {
  projectId: string;
  name: string;
  personNoCount: number | bigint;
};

type R5Hit = {
  projectId: string;
  memberCount: number | bigint;
  awardCount: number | bigint;
  memberNames: string | null;
};

type R6Hit = {
  projectId: string;
  otherProjectId: string;
  projectName: string;
  year: number;
  college: string;
  otherCollege: string;
  personNo: string;
};

function count(value: number | bigint) {
  return Number(value);
}

function hitKey(ruleId: string, projectId: string) {
  return `${ruleId}:${projectId}`;
}

export async function recalculateAnomalies(client: RuleClient = prisma) {
  const hits = new Map<string, RuleHit>();
  const addHit = (hit: RuleHit) => {
    const key = hitKey(hit.ruleId, hit.projectId);
    const existing = hits.get(key);
    if (existing) {
      if (!existing.description.includes(hit.description)) {
        existing.description = `${existing.description}；${hit.description}`;
      }
      return;
    }
    hits.set(key, { ...hit });
  };

  const r1Hits = await client.$queryRaw<(R1Group & { projectId: string })[]>`
    WITH "multiTeam" AS (
      SELECT tm."personNo" AS "personNo", p."year" AS "year",
        COUNT(DISTINCT tm."projectId") AS "projectCount"
      FROM "TeamMember" AS tm
      INNER JOIN "Project" AS p ON p."id" = tm."projectId"
      WHERE tm."leftAt" IS NULL AND p."deletedAt" IS NULL AND p."status" = 'ACTIVE'
      GROUP BY tm."personNo", p."year"
      HAVING COUNT(DISTINCT tm."projectId") >= 3
    )
    SELECT tm."personNo" AS "personNo", p."year" AS "year",
      tm."projectId" AS "projectId", mt."projectCount" AS "projectCount"
    FROM "TeamMember" AS tm
    INNER JOIN "Project" AS p ON p."id" = tm."projectId"
    INNER JOIN "multiTeam" AS mt ON mt."personNo" = tm."personNo" AND mt."year" = p."year"
    WHERE tm."leftAt" IS NULL AND p."deletedAt" IS NULL AND p."status" = 'ACTIVE'
  `;
  for (const hit of r1Hits) {
    addHit({
      ruleId: "R1",
      projectId: hit.projectId,
      description: `学号 ${hit.personNo} 在 ${hit.year} 年出现在 ${count(hit.projectCount)} 个 ACTIVE 项目中`,
    });
  }

  const r2Hits = await client.$queryRaw<CountHit[]>`
    SELECT tm."projectId" AS "projectId", COUNT(*) AS "count"
    FROM "TeamMember" AS tm
    INNER JOIN "Project" AS p ON p."id" = tm."projectId"
    WHERE tm."leftAt" IS NULL AND p."deletedAt" IS NULL AND tm."role" IN ('LEADER', 'MEMBER')
    GROUP BY tm."projectId"
    HAVING COUNT(*) > 10
  `;
  for (const hit of r2Hits) {
    addHit({
      ruleId: "R2",
      projectId: hit.projectId,
      description: `当前 LEADER 与 MEMBER 合计 ${count(hit.count)} 人，超过 10 人上限`,
    });
  }

  const r3Hits = await client.$queryRaw<CountHit[]>`
    SELECT tm."projectId" AS "projectId", COUNT(*) AS "count"
    FROM "TeamMember" AS tm
    INNER JOIN "Project" AS p ON p."id" = tm."projectId"
    WHERE tm."leftAt" IS NULL AND p."deletedAt" IS NULL AND tm."role" = 'TEACHER'
    GROUP BY tm."projectId"
    HAVING COUNT(*) > 3
  `;
  for (const hit of r3Hits) {
    addHit({
      ruleId: "R3",
      projectId: hit.projectId,
      description: `当前指导教师 ${count(hit.count)} 人，超过 3 人上限`,
    });
  }

  const r4Hits = await client.$queryRaw<R4Hit[]>`
    SELECT tm."projectId" AS "projectId", tm."name" AS "name",
      COUNT(DISTINCT tm."personNo") AS "personNoCount"
    FROM "TeamMember" AS tm
    INNER JOIN "Project" AS p ON p."id" = tm."projectId"
    WHERE tm."leftAt" IS NULL AND p."deletedAt" IS NULL
    GROUP BY tm."projectId", tm."name"
    HAVING COUNT(DISTINCT tm."personNo") > 1
  `;
  for (const hit of r4Hits) {
    addHit({
      ruleId: "R4",
      projectId: hit.projectId,
      description: `项目内姓名“${hit.name}”对应 ${count(hit.personNoCount)} 个不同学号`,
    });
  }

  const r5Hits = await client.$queryRaw<R5Hit[]>`
    SELECT tm."projectId" AS "projectId",
      COUNT(DISTINCT tm."id") AS "memberCount",
      COUNT(DISTINCT ar."id") AS "awardCount",
      GROUP_CONCAT(DISTINCT tm."name") AS "memberNames"
    FROM "TeamMember" AS tm
    INNER JOIN "AwardRecord" AS ar
      ON ar."projectId" = tm."projectId" AND tm."joinedAt" > ar."createdAt"
    INNER JOIN "Project" AS p ON p."id" = tm."projectId"
    WHERE tm."leftAt" IS NULL AND p."deletedAt" IS NULL
    GROUP BY tm."projectId"
  `;
  for (const hit of r5Hits) {
    addHit({
      ruleId: "R5",
      projectId: hit.projectId,
      description: `${count(hit.memberCount)} 名成员（${hit.memberNames ?? "未知成员"}）的加入时间晚于对应获奖记录时间，涉及 ${count(hit.awardCount)} 条获奖记录`,
    });
  }

  const r6Rows = await client.$queryRaw<R6Hit[]>`
    SELECT DISTINCT
      p1."id" AS "projectId", p2."id" AS "otherProjectId",
      p1."name" AS "projectName", p1."year" AS "year",
      p1."college" AS "college", p2."college" AS "otherCollege",
      tm1."personNo" AS "personNo"
    FROM "Project" AS p1
    INNER JOIN "Project" AS p2
      ON p2."name" = p1."name" AND p2."year" = p1."year"
      AND p2."college" <> p1."college" AND p1."id" < p2."id"
    INNER JOIN "TeamMember" AS tm1
      ON tm1."projectId" = p1."id" AND tm1."leftAt" IS NULL
    INNER JOIN "TeamMember" AS tm2
      ON tm2."projectId" = p2."id" AND tm2."leftAt" IS NULL
      AND tm2."personNo" = tm1."personNo"
    WHERE p1."deletedAt" IS NULL AND p2."deletedAt" IS NULL
    ORDER BY p1."id", p2."id", tm1."personNo"
  `;
  const r6Pairs = new Map<string, { hit: R6Hit; sharedPersonNos: string[] }>();
  for (const hit of r6Rows) {
    const key = `${hit.projectId}:${hit.otherProjectId}`;
    const pair = r6Pairs.get(key);
    if (pair) pair.sharedPersonNos.push(hit.personNo);
    else r6Pairs.set(key, { hit, sharedPersonNos: [hit.personNo] });
  }
  for (const { hit, sharedPersonNos } of r6Pairs.values()) {
    const evidence = `${sharedPersonNos.length} 个相同学号（${sharedPersonNos.join("、")}）`;
    addHit({
      ruleId: "R6",
      projectId: hit.projectId,
      description: `项目“${hit.projectName}”（${hit.year}）由${hit.college}与${hit.otherCollege}分别上报，存在${evidence}`,
    });
  }

  for (const hit of hits.values()) {
    await client.anomaly.upsert({
      where: {
        ruleId_projectId: { ruleId: hit.ruleId, projectId: hit.projectId },
      },
      create: {
        ruleId: hit.ruleId,
        projectId: hit.projectId,
        description: hit.description,
      },
      update: { description: hit.description },
    });
  }

  return {
    matched: hits.size,
    byRule: Object.fromEntries(
      ["R1", "R2", "R3", "R4", "R5", "R6"].map((ruleId) => [
        ruleId,
        [...hits.values()].filter((hit) => hit.ruleId === ruleId).length,
      ]),
    ),
  };
}
