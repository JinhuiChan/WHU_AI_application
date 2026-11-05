import type { Prisma, Role } from "@prisma/client";
import { awardWhereForRole } from "@/lib/award-visibility";
import { prisma } from "@/lib/prisma";
import type { Paginated } from "@/types/api";
import type {
  AwardSource,
  CompetitionDetail,
  CompetitionFilters,
  CompetitionListItem,
  CompetitionRegistration,
} from "@/types/competition";

export async function listCompetitionYears() {
  const years = await prisma.competition.groupBy({ by: ["year"], orderBy: { year: "desc" } });
  return years.map((item) => item.year);
}

export async function getCompetitionPage(
  filters: CompetitionFilters,
  options?: { studentId?: string; isAdmin?: boolean },
): Promise<Paginated<CompetitionListItem>> {
  const where: Prisma.CompetitionWhereInput = {};
  if (filters.year) where.year = filters.year;
  if (filters.level) where.level = filters.level;
  // 学生端只可见「已发布」赛事；草稿与下架一律隐藏
  if (!options?.isAdmin) where.publishStatus = "PUBLISHED";
  else if (filters.publishStatus) where.publishStatus = filters.publishStatus;
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
        publishStatus: true,
        seriesId: true,
        year: true,
        organizer: true,
        createdAt: true,
        timeWindows: {
          where: { enabled: true },
          select: { stage: true, startAt: true, endAt: true },
        },
      },
    }),
    prisma.competition.count({ where }),
  ]);

  // 学生视角：附上「报名截止 / 我的报名状态」，避免列表只露系列标识
  const studentId = options?.studentId;
  const now = new Date();
  const myProjects = studentId && competitions.length
    ? await prisma.project.findMany({
        where: {
          competitionId: { in: competitions.map((item) => item.id) },
          deletedAt: null,
          OR: [
            { ownerId: studentId },
            { teamMembers: { some: { userId: studentId, leftAt: null } } },
          ],
        },
        select: { id: true, competitionId: true, reviewStatus: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      })
    : [];
  const myProjectByCompetition = new Map<string, { id: string; reviewStatus: CompetitionRegistration["projectStatus"] }>();
  for (const project of myProjects) {
    if (project.competitionId && !myProjectByCompetition.has(project.competitionId)) {
      myProjectByCompetition.set(project.competitionId, { id: project.id, reviewStatus: project.reviewStatus });
    }
  }

  return {
    list: competitions.map((competition) => {
      const schoolWindow = competition.timeWindows
        .filter((window) => window.stage === "SCHOOL")
        .sort((left, right) => right.startAt.getTime() - left.startAt.getTime())[0];
      const deadlineWindow = schoolWindow ?? competition.timeWindows
        .slice()
        .sort((left, right) => right.endAt.getTime() - left.endAt.getTime())[0];
      const mine = myProjectByCompetition.get(competition.id);
      const registration: CompetitionRegistration | undefined = studentId
        ? {
            windowStartAt: deadlineWindow?.startAt.toISOString() ?? null,
            windowEndAt: deadlineWindow?.endAt.toISOString() ?? null,
            windowOpen: Boolean(deadlineWindow && deadlineWindow.startAt <= now && now <= deadlineWindow.endAt),
            projectId: mine?.id ?? null,
            projectStatus: mine?.reviewStatus ?? null,
          }
        : undefined;
      return {
        id: competition.id,
        name: competition.name,
        level: competition.level,
        publishStatus: competition.publishStatus,
        seriesId: competition.seriesId,
        year: competition.year,
        organizer: competition.organizer,
        createdAt: competition.createdAt.toISOString(),
        registration,
      };
    }),
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
      publishStatus: true,
      seriesId: true,
      year: true,
      organizer: true,
      description: true,
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
    publishStatus: competition.publishStatus,
    seriesId: competition.seriesId,
    year: competition.year,
    organizer: competition.organizer,
    description: competition.description,
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
