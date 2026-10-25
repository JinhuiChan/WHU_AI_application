import type { Prisma, Role } from "@prisma/client";
import { awardWhereForRole } from "@/lib/award-visibility";
import { prisma } from "@/lib/prisma";
import type { Paginated } from "@/types/api";
import type {
  AwardSource,
  CompetitionDetail,
  CompetitionFilters,
  CompetitionListItem,
} from "@/types/competition";

export async function listCompetitionYears() {
  const years = await prisma.competition.groupBy({ by: ["year"], orderBy: { year: "desc" } });
  return years.map((item) => item.year);
}

export async function getCompetitionPage(filters: CompetitionFilters): Promise<Paginated<CompetitionListItem>> {
  const where: Prisma.CompetitionWhereInput = {};
  if (filters.year) where.year = filters.year;
  if (filters.level) where.level = filters.level;
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q } },
      { organizer: { contains: filters.q } },
      { seriesId: { contains: filters.q } },
    ];
  }

  const [competitions, total] = await prisma.$transaction([
    prisma.competition.findMany({
      where,
      orderBy: [{ year: "desc" }, { name: "asc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        name: true,
        level: true,
        seriesId: true,
        year: true,
        organizer: true,
        createdAt: true,
      },
    }),
    prisma.competition.count({ where }),
  ]);

  return {
    list: competitions.map((competition) => ({
      ...competition,
      createdAt: competition.createdAt.toISOString(),
    })),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function getCompetitionDetail(id: string, role: Role): Promise<CompetitionDetail | null> {
  const competition = await prisma.competition.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      level: true,
      seriesId: true,
      year: true,
      organizer: true,
      createdAt: true,
      awardRecords: {
        where: { ...awardWhereForRole(role), project: { deletedAt: null } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          awardLevel: true,
          status: true,
          evidenceType: true,
          evidenceRef: true,
          verifiedBy: true,
          verifiedAt: true,
          createdAt: true,
          verifier: { select: { name: true } },
          project: { select: { id: true, name: true, college: true, year: true } },
        },
      },
    },
  });
  if (!competition) return null;

  const awardIds = competition.awardRecords.map((award) => award.id);
  const sources = awardIds.length
    ? await prisma.dataSource.findMany({
        where: { recordType: "AwardRecord", recordId: { in: awardIds } },
        orderBy: { syncedAt: "desc" },
        select: { recordId: true, sourceType: true, sourceRef: true, batchId: true, syncedAt: true },
      })
    : [];
  const sourcesByAward = new Map<string, AwardSource[]>();
  for (const source of sources) {
    const item: AwardSource = {
      sourceType: source.sourceType,
      sourceRef: source.sourceRef,
      batchId: source.batchId,
      syncedAt: source.syncedAt.toISOString(),
    };
    const existing = sourcesByAward.get(source.recordId);
    if (existing) {
      existing.push(item);
    } else {
      sourcesByAward.set(source.recordId, [item]);
    }
  }

  return {
    id: competition.id,
    name: competition.name,
    level: competition.level,
    seriesId: competition.seriesId,
    year: competition.year,
    organizer: competition.organizer,
    createdAt: competition.createdAt.toISOString(),
    awards: competition.awardRecords.map((award) => ({
      id: award.id,
      awardLevel: award.awardLevel,
      status: award.status,
      evidenceType: award.evidenceType,
      evidenceRef: award.evidenceRef,
      verifiedBy: award.verifiedBy,
      verifierName: award.verifier.name,
      verifiedAt: award.verifiedAt.toISOString(),
      createdAt: award.createdAt.toISOString(),
      project: award.project,
      sources: sourcesByAward.get(award.id) ?? [],
    })),
  };
}
