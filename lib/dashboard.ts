import { Prisma } from "@prisma/client";
import type { AwardStatus, CompetitionLevel, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CollegeRanking, DashboardSummary, RankingDetail } from "@/types/dashboard";

type CountValue = number | bigint;

type KpiRow = {
  projectCount: CountValue;
  participantCount: CountValue;
  awardCount: CountValue;
  collegeCount: CountValue;
};

type TrendRow = {
  year: number;
  awardCount: CountValue;
};

type RankingAggregateRow = {
  college: string;
  scoreTenths: CountValue;
  awardCount: CountValue;
  nationalCount: CountValue;
  provinceCount: CountValue;
  schoolCount: CountValue;
};

type RankingDetailRow = {
  college: string;
  awardId: string;
  projectId: string;
  projectName: string;
  competitionName: string;
  competitionLevel: CompetitionLevel;
  awardLevel: RankingDetail["awardLevel"];
  scoreTenths: CountValue;
};

function numberValue(value: CountValue) {
  return Number(value);
}

function awardStatuses(role: Role): AwardStatus[] {
  return role === "ADMIN" ? ["VERIFIED", "PUBLISHED"] : ["PUBLISHED"];
}

export function parseStatisticYear(value: string | null) {
  if (!value || !/^\d{4}$/.test(value)) return null;
  const year = Number(value);
  return year >= 2000 && year <= 2100 ? year : null;
}

export async function listStatisticYears() {
  const years = await prisma.project.groupBy({
    by: ["year"],
    where: { deletedAt: null },
    orderBy: { year: "desc" },
  });
  return years.map((item) => item.year);
}

export async function getDashboardSummary(year: number, role: Role): Promise<DashboardSummary> {
  const statuses = awardStatuses(role);
  const [kpiRows, trendRows] = await Promise.all([
    prisma.$queryRaw<KpiRow[]>`
      SELECT
        (SELECT COUNT(*) FROM "Project" WHERE "year" = ${year} AND "deletedAt" IS NULL) AS "projectCount",
        (SELECT COUNT(DISTINCT tm."personNo") FROM "TeamMember" AS tm
          INNER JOIN "Project" AS p ON p."id" = tm."projectId"
          WHERE p."year" = ${year} AND p."deletedAt" IS NULL AND tm."leftAt" IS NULL) AS "participantCount",
        (SELECT COUNT(*) FROM "AwardRecord" AS ar
          INNER JOIN "Competition" AS c ON c."id" = ar."competitionId"
          INNER JOIN "Project" AS p ON p."id" = ar."projectId"
          WHERE c."year" = ${year} AND ar."status" IN (${Prisma.join(statuses)}) AND p."deletedAt" IS NULL) AS "awardCount",
        (SELECT COUNT(DISTINCT "college") FROM "Project" WHERE "year" = ${year} AND "deletedAt" IS NULL) AS "collegeCount"
    `,
    prisma.$queryRaw<TrendRow[]>`
      SELECT c."year" AS "year", COUNT(*) AS "awardCount"
      FROM "AwardRecord" AS ar
      INNER JOIN "Competition" AS c ON c."id" = ar."competitionId"
      INNER JOIN "Project" AS p ON p."id" = ar."projectId"
      WHERE c."year" BETWEEN ${year - 4} AND ${year}
        AND ar."status" IN (${Prisma.join(statuses)}) AND p."deletedAt" IS NULL
      GROUP BY c."year"
      ORDER BY c."year"
    `,
  ]);
  const trendByYear = new Map(trendRows.map((item) => [item.year, numberValue(item.awardCount)]));
  const kpi = kpiRows[0];
  return {
    year,
    kpi: {
      projectCount: numberValue(kpi?.projectCount ?? 0),
      participantCount: numberValue(kpi?.participantCount ?? 0),
      awardCount: numberValue(kpi?.awardCount ?? 0),
      collegeCount: numberValue(kpi?.collegeCount ?? 0),
    },
    trend: Array.from({ length: 5 }, (_, index) => {
      const trendYear = year - 4 + index;
      return { year: trendYear, awardCount: trendByYear.get(trendYear) ?? 0 };
    }),
  };
}

export async function getCollegeRankings(year: number, role: Role, limit = 10): Promise<CollegeRanking[]> {
  const statuses = awardStatuses(role);
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const [aggregates, detailRows] = await Promise.all([
    prisma.$queryRaw<RankingAggregateRow[]>`
      WITH "colleges" AS (
        SELECT DISTINCT "college" FROM "Project" WHERE "year" = ${year} AND "deletedAt" IS NULL
      ),
      "scoredAwards" AS (
        SELECT p."college" AS "college", c."level" AS "level",
          (CASE c."level" WHEN 'NATIONAL' THEN 10 WHEN 'PROVINCE' THEN 5 WHEN 'SCHOOL' THEN 2 ELSE 0 END
            * CASE ar."awardLevel" WHEN 'S' THEN 15 WHEN 'A' THEN 12 WHEN 'B' THEN 10 WHEN 'C' THEN 8 WHEN 'EXCELLENT' THEN 5 ELSE 0 END
          ) AS "scoreTenths"
        FROM "AwardRecord" AS ar
        INNER JOIN "Competition" AS c ON c."id" = ar."competitionId"
        INNER JOIN "Project" AS p ON p."id" = ar."projectId"
        WHERE c."year" = ${year} AND ar."status" IN (${Prisma.join(statuses)}) AND p."deletedAt" IS NULL
      )
      SELECT c."college" AS "college",
        COALESCE(SUM(sa."scoreTenths"), 0) AS "scoreTenths",
        COUNT(sa."college") AS "awardCount",
        COALESCE(SUM(CASE WHEN sa."level" = 'NATIONAL' THEN 1 ELSE 0 END), 0) AS "nationalCount",
        COALESCE(SUM(CASE WHEN sa."level" = 'PROVINCE' THEN 1 ELSE 0 END), 0) AS "provinceCount",
        COALESCE(SUM(CASE WHEN sa."level" = 'SCHOOL' THEN 1 ELSE 0 END), 0) AS "schoolCount"
      FROM "colleges" AS c
      LEFT JOIN "scoredAwards" AS sa ON sa."college" = c."college"
      GROUP BY c."college"
      ORDER BY "scoreTenths" DESC, c."college" ASC
      LIMIT ${safeLimit}
    `,
    prisma.$queryRaw<RankingDetailRow[]>`
      WITH "scoredAwards" AS (
        SELECT p."college" AS "college", ar."id" AS "awardId", p."id" AS "projectId",
          p."name" AS "projectName", c."name" AS "competitionName", c."level" AS "competitionLevel",
          ar."awardLevel" AS "awardLevel",
          (CASE c."level" WHEN 'NATIONAL' THEN 10 WHEN 'PROVINCE' THEN 5 WHEN 'SCHOOL' THEN 2 ELSE 0 END
            * CASE ar."awardLevel" WHEN 'S' THEN 15 WHEN 'A' THEN 12 WHEN 'B' THEN 10 WHEN 'C' THEN 8 WHEN 'EXCELLENT' THEN 5 ELSE 0 END
          ) AS "scoreTenths"
        FROM "AwardRecord" AS ar
        INNER JOIN "Competition" AS c ON c."id" = ar."competitionId"
        INNER JOIN "Project" AS p ON p."id" = ar."projectId"
        WHERE c."year" = ${year} AND ar."status" IN (${Prisma.join(statuses)}) AND p."deletedAt" IS NULL
      )
      SELECT * FROM "scoredAwards"
      ORDER BY "college", "projectName", "competitionName", "awardId"
    `,
  ]);

  const detailsByCollege = new Map<string, RankingDetail[]>();
  for (const row of detailRows) {
    const detail: RankingDetail = {
      awardId: row.awardId,
      projectId: row.projectId,
      projectName: row.projectName,
      competitionName: row.competitionName,
      competitionLevel: row.competitionLevel,
      awardLevel: row.awardLevel,
      score: numberValue(row.scoreTenths) / 10,
    };
    const existing = detailsByCollege.get(row.college);
    if (existing) existing.push(detail);
    else detailsByCollege.set(row.college, [detail]);
  }
  return aggregates.map((row) => ({
    college: row.college,
    score: numberValue(row.scoreTenths) / 10,
    awardCount: numberValue(row.awardCount),
    nationalCount: numberValue(row.nationalCount),
    provinceCount: numberValue(row.provinceCount),
    schoolCount: numberValue(row.schoolCount),
    details: detailsByCollege.get(row.college) ?? [],
  }));
}

export async function listAwardExportRows(year: number, role: Role) {
  return prisma.awardRecord.findMany({
    where: {
      competition: { year },
      status: { in: awardStatuses(role) },
      project: { deletedAt: null },
    },
    orderBy: [{ project: { college: "asc" } }, { project: { name: "asc" } }, { competition: { level: "desc" } }],
    select: {
      awardLevel: true,
      evidenceType: true,
      evidenceRef: true,
      status: true,
      verifiedAt: true,
      createdAt: true,
      project: { select: { name: true, college: true } },
      competition: { select: { name: true, level: true, year: true } },
      verifier: { select: { name: true } },
    },
  });
}
