import type { Prisma, ProjectStatus } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  adminAwardLevels,
  type AdminAwardLevel,
  type AdminAwardPage,
  type AdminAwardSaveResult,
} from "@/types/award";

const eligibleStatuses: ProjectStatus[] = ["SCHOOL_FINAL", "PROVINCE_ADVANCED", "NATIONAL_ADVANCED", "FINISHED"];

export class AdminAwardError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AdminAwardError";
  }
}

export function parseAdminAwardLevel(value: unknown): AdminAwardLevel | null {
  return adminAwardLevels.find((level) => level === value) ?? null;
}

export async function getAdminAwardPage(filters: {
  competitionId?: string;
  college?: string;
  level?: AdminAwardLevel;
  page: number;
  pageSize: number;
}): Promise<AdminAwardPage> {
  const where: Prisma.ProjectWhereInput = { deletedAt: null };
  if (filters.competitionId) where.competitionId = filters.competitionId;
  if (filters.college) where.college = filters.college;
  if (filters.level) where.awards = { some: { awardLevel: filters.level } };

  const [projects, total] = await prisma.$transaction([
    prisma.project.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        name: true,
        college: true,
        status: true,
        updatedAt: true,
        track: { select: { name: true } },
        awards: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { id: true, awardLevel: true, updatedAt: true },
        },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return {
    list: projects.map((project) => {
      const award = project.awards[0];
      return {
        projectId: project.id,
        projectName: project.name,
        college: project.college,
        trackName: project.track?.name ?? "未设置赛道",
        status: project.status,
        eligible: eligibleStatuses.includes(project.status),
        awardId: award?.id ?? null,
        currentAward: award?.awardLevel ?? null,
        updatedAt: (award?.updatedAt ?? project.updatedAt).toISOString(),
      };
    }),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function saveAdminAward(actorId: string, body: unknown): Promise<AdminAwardSaveResult> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new AdminAwardError(422, "请求内容必须为 JSON 对象");
  }
  const projectId = "projectId" in body && typeof body.projectId === "string" ? body.projectId.trim() : "";
  const awardLevel = "awardLevel" in body ? parseAdminAwardLevel(body.awardLevel) : null;
  if (!projectId) throw new AdminAwardError(422, "请选择项目");
  if (!awardLevel) throw new AdminAwardError(422, "奖项等级仅支持金奖、银奖、铜奖或优秀奖");

  return prisma.$transaction(async (transaction) => {
    const project = await transaction.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true, competitionId: true, stage: true, status: true },
    });
    if (!project) throw new AdminAwardError(404, "项目不存在");
    if (!eligibleStatuses.includes(project.status)) {
      throw new AdminAwardError(422, "未通过终审的项目不能录奖项");
    }
    if (!project.competitionId) throw new AdminAwardError(422, "项目未关联赛事，不能录奖项");

    const existing = await transaction.award.findFirst({
      where: { projectId: project.id, competitionId: project.competitionId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, stage: true, awardLevel: true },
    });
    if (existing?.awardLevel === awardLevel) {
      return { projectId, awardId: existing.id, oldLevel: existing.awardLevel, newLevel: awardLevel, changed: false };
    }

    const stage = existing?.stage ?? project.stage;
    const award = await transaction.award.upsert({
      where: {
        projectId_competitionId_stage: {
          projectId: project.id,
          competitionId: project.competitionId,
          stage,
        },
      },
      create: {
        projectId: project.id,
        competitionId: project.competitionId,
        stage,
        awardLevel,
        createdBy: actorId,
      },
      update: { awardLevel },
      select: { id: true },
    });
    await transaction.awardHistory.create({
      data: {
        awardId: award.id,
        field: "awardLevel",
        oldValue: existing?.awardLevel ?? null,
        newValue: awardLevel,
        changedBy: actorId,
      },
    });
    await writeAuditLog(
      {
        actorId,
        action: existing ? "AWARD_LEVEL_CHANGED" : "AWARD_CREATED",
        targetType: "Award",
        targetId: award.id,
        detail: {
          projectId: project.id,
          competitionId: project.competitionId,
          oldLevel: existing?.awardLevel ?? null,
          newLevel: awardLevel,
        },
      },
      transaction,
    );
    return { projectId, awardId: award.id, oldLevel: existing?.awardLevel ?? null, newLevel: awardLevel, changed: true };
  });
}
