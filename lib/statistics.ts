import type { Prisma, RegistrationStatus } from "@prisma/client";
import type { AuthUser } from "@/lib/auth";
import { optionalText, optionalYear } from "@/lib/list-query";
import { registrationStatusLabels } from "@/lib/presentation";
import { prisma } from "@/lib/prisma";
import type { StatisticsFilters, StatisticsStage, StatisticsSummary } from "@/types/statistics";

const stageLabels: Record<StatisticsStage, string> = {
  SCHOOL: "校赛",
  PROVINCE: "省赛",
  NATIONAL: "国赛",
};

const awardLevels = [
  { value: "GOLD", label: "金奖" },
  { value: "SILVER", label: "银奖" },
  { value: "BRONZE", label: "铜奖" },
  { value: "EXCELLENT", label: "优秀奖" },
] as const;

const statusOrder: RegistrationStatus[] = [
  "DRAFT",
  "PENDING",
  "COLLEGE_REVIEW",
  "SCHOOL_FINAL",
  "REJECTED",
  "PROVINCE_ADVANCED",
  "NATIONAL_ADVANCED",
  "WITHDRAWN",
];

function isStatisticsStage(value: string | null): value is StatisticsStage {
  return value === "SCHOOL" || value === "PROVINCE" || value === "NATIONAL";
}

export function parseStatisticsQuery(params: URLSearchParams): StatisticsFilters {
  const stage = params.get("stage");
  return {
    competitionId: optionalText(params.get("competitionId") ?? undefined),
    year: optionalYear(params.get("year") ?? undefined),
    stage: isStatisticsStage(stage) ? stage : undefined,
  };
}

function accessWhere(user: AuthUser): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = { deletedAt: null };
  if (user.role === "STUDENT") {
    where.OR = [
      { ownerId: user.id },
      { teamMembers: { some: { userId: user.id, leftAt: null } } },
    ];
  } else if (user.role === "TEACHER") {
    where.teachers = { some: { userId: user.id } };
  }
  return where;
}

function filteredWhere(filters: StatisticsFilters, user: AuthUser): Prisma.ProjectWhereInput {
  const where = accessWhere(user);
  if (filters.competitionId) where.competitionId = filters.competitionId;
  if (filters.year) where.year = filters.year;
  if (filters.stage) where.stage = filters.stage;
  return where;
}

export async function getStatisticsSummary(filters: StatisticsFilters, user: AuthUser): Promise<StatisticsSummary> {
  const where = filteredWhere(filters, user);
  const optionWhere = accessWhere(user);
  const scoped = user.role === "STUDENT" || user.role === "TEACHER";
  const [projects, members, awards, competitions, years] = await Promise.all([
    prisma.project.findMany({
      where,
      select: {
        id: true,
        college: true,
        stage: true,
        reviewStatus: true,
        trackId: true,
        track: { select: { name: true } },
      },
    }),
    prisma.teamMember.findMany({
      where: { project: where, leftAt: null, personNo: { not: null } },
      select: { personNo: true, project: { select: { college: true } } },
    }),
    prisma.award.findMany({
      where: { project: where, awardLevel: { in: awardLevels.map((item) => item.value) } },
      select: { awardLevel: true },
    }),
    prisma.competition.findMany({
      where: { projects: { some: optionWhere } },
      select: { id: true, name: true },
      orderBy: [{ year: "desc" }, { name: "asc" }],
    }),
    prisma.project.groupBy({ by: ["year"], where: optionWhere, orderBy: { year: "desc" } }),
  ]);

  const collegeCounts = new Map<string, { projectCount: number; provinceAdvancedCount: number }>();
  const collegeParticipants = new Map<string, Set<string>>();
  const trackCounts = new Map<string, { trackId: string | null; trackName: string; projectCount: number }>();
  const stageCounts: Record<StatisticsStage, number> = { SCHOOL: 0, PROVINCE: 0, NATIONAL: 0 };
  const statusCounts = new Map<RegistrationStatus, number>();
  const allParticipants = new Set<string>();
  let pendingReviewCount = 0;
  let provinceAdvancedCount = 0;

  for (const project of projects) {
    const college = collegeCounts.get(project.college) ?? { projectCount: 0, provinceAdvancedCount: 0 };
    college.projectCount += 1;
    const advanced = project.reviewStatus === "PROVINCE_ADVANCED" || project.reviewStatus === "NATIONAL_ADVANCED";
    if (advanced) {
      college.provinceAdvancedCount += 1;
      provinceAdvancedCount += 1;
    }
    collegeCounts.set(project.college, college);
    if (project.reviewStatus === "PENDING" || project.reviewStatus === "COLLEGE_REVIEW") pendingReviewCount += 1;
    if (project.stage !== "FINISHED") stageCounts[project.stage] += 1;
    statusCounts.set(project.reviewStatus, (statusCounts.get(project.reviewStatus) ?? 0) + 1);
    const trackKey = project.trackId ?? "UNASSIGNED";
    const track = trackCounts.get(trackKey) ?? {
      trackId: project.trackId,
      trackName: project.track?.name ?? "未设置赛道",
      projectCount: 0,
    };
    track.projectCount += 1;
    trackCounts.set(trackKey, track);
  }

  for (const member of members) {
    const personNo = member.personNo?.trim();
    if (!personNo) continue;
    allParticipants.add(personNo);
    const participants = collegeParticipants.get(member.project.college) ?? new Set<string>();
    participants.add(personNo);
    collegeParticipants.set(member.project.college, participants);
  }

  const byCollege = [...collegeCounts].map(([college, counts]) => ({
    college,
    ...counts,
    participantCount: collegeParticipants.get(college)?.size ?? 0,
  })).sort((a, b) => b.projectCount - a.projectCount || (a.college < b.college ? -1 : a.college > b.college ? 1 : 0));
  const byTrack = [...trackCounts.values()].map((track) => ({
    ...track,
    percentage: projects.length ? Number((track.projectCount / projects.length * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.projectCount - a.projectCount || (a.trackName < b.trackName ? -1 : a.trackName > b.trackName ? 1 : 0));
  const awardCounts = new Map<string, number>();
  for (const award of awards) awardCounts.set(award.awardLevel, (awardCounts.get(award.awardLevel) ?? 0) + 1);

  return {
    scope: scoped ? "mine" : "all",
    filters: {
      competitionId: filters.competitionId ?? null,
      year: filters.year ?? null,
      stage: filters.stage ?? null,
    },
    cards: {
      totalProjects: projects.length,
      totalParticipants: allParticipants.size,
      pendingReviewCount,
      provinceAdvancedCount,
    },
    byCollege,
    byTrack,
    byStage: (Object.keys(stageLabels) as StatisticsStage[]).map((stage) => ({
      stage,
      label: stageLabels[stage],
      projectCount: stageCounts[stage],
    })),
    byAward: awardLevels.map((award) => ({
      awardLevel: award.value,
      label: award.label,
      count: awardCounts.get(award.value) ?? 0,
    })),
    myStatus: scoped ? statusOrder.map((status) => ({
      status,
      label: registrationStatusLabels[status],
      count: statusCounts.get(status) ?? 0,
    })) : undefined,
    options: {
      competitions,
      years: years.map((item) => item.year),
    },
  };
}
