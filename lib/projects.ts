import type { MemberRole, Prisma, Role } from "@prisma/client";
import { awardWhereForRole } from "@/lib/award-visibility";
import { prisma } from "@/lib/prisma";
import type { Paginated } from "@/types/api";
import type {
  ProjectAward,
  ProjectDetail,
  ProjectFilters,
  ProjectListItem,
  SnapshotMember,
} from "@/types/project";

type ProjectAwardResult = Omit<ProjectAward, "verifierName" | "verifiedAt" | "createdAt"> & {
  verifiedAt: Date;
  createdAt: Date;
  verifier: { name: string };
};

type ProjectListResult = Omit<ProjectListItem, "createdAt" | "awards"> & {
  createdAt: Date;
  awards: ProjectAwardResult[];
};

function mapProjectAward(award: ProjectAwardResult): ProjectAward {
  return {
    id: award.id,
    awardLevel: award.awardLevel,
    status: award.status,
    evidenceType: award.evidenceType,
    evidenceRef: award.evidenceRef,
    verifiedBy: award.verifiedBy,
    verifierName: award.verifier.name,
    verifiedAt: award.verifiedAt.toISOString(),
    createdAt: award.createdAt.toISOString(),
    competition: award.competition,
  };
}

function mapProjectListItem(project: ProjectListResult): ProjectListItem {
  return {
    id: project.id,
    name: project.name,
    college: project.college,
    year: project.year,
    status: project.status,
    createdAt: project.createdAt.toISOString(),
    awards: project.awards.map(mapProjectAward),
  };
}

function isMemberRole(value: unknown): value is MemberRole {
  return value === "LEADER" || value === "MEMBER" || value === "TEACHER";
}

function parseSnapshotMembers(membersJson: string): SnapshotMember[] {
  try {
    const parsed: unknown = JSON.parse(membersJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (typeof item !== "object" || item === null) return [];
      const personNo = "personNo" in item ? item.personNo : undefined;
      const name = "name" in item ? item.name : undefined;
      const role = "role" in item ? item.role : undefined;
      const joinedAt = "joinedAt" in item ? item.joinedAt : undefined;
      const leftAt = "leftAt" in item ? item.leftAt : null;
      if (
        typeof personNo !== "string" ||
        typeof name !== "string" ||
        !isMemberRole(role) ||
        typeof joinedAt !== "string" ||
        (leftAt !== null && typeof leftAt !== "string")
      ) {
        return [];
      }
      return [{ personNo, name, role, joinedAt, leftAt }];
    });
  } catch {
    return [];
  }
}

const awardSelection = {
  id: true,
  awardLevel: true,
  status: true,
  evidenceType: true,
  evidenceRef: true,
  verifiedBy: true,
  verifiedAt: true,
  createdAt: true,
  verifier: { select: { name: true } },
  competition: { select: { id: true, name: true, level: true } },
} satisfies Prisma.AwardRecordSelect;

export async function listProjectFilterOptions() {
  const [years, colleges] = await Promise.all([
    prisma.project.groupBy({ by: ["year"], where: { deletedAt: null }, orderBy: { year: "desc" } }),
    prisma.project.groupBy({ by: ["college"], where: { deletedAt: null }, orderBy: { college: "asc" } }),
  ]);
  return {
    years: years.map((item) => item.year),
    colleges: colleges.map((item) => item.college),
  };
}

export async function getProjectPage(filters: ProjectFilters, role: Role): Promise<Paginated<ProjectListItem>> {
  const where: Prisma.ProjectWhereInput = { deletedAt: null };
  if (filters.year) where.year = filters.year;
  if (filters.college) where.college = filters.college;
  if (filters.level) {
    where.awardRecords = { some: { ...awardWhereForRole(role), awardLevel: filters.level } };
  }
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q } },
      { college: { contains: filters.q } },
      { aliases: { some: { aliasValue: { contains: filters.q } } } },
    ];
  }

  const [projects, total] = await prisma.$transaction([
    prisma.project.findMany({
      where,
      orderBy: [{ year: "desc" }, { college: "asc" }, { name: "asc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        name: true,
        college: true,
        year: true,
        status: true,
        createdAt: true,
        awardRecords: {
          where: awardWhereForRole(role),
          orderBy: { createdAt: "desc" },
          select: awardSelection,
        },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return {
    list: projects.map((project) => mapProjectListItem({ ...project, awards: project.awardRecords })),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function getProjectDetail(id: string, role: Role): Promise<ProjectDetail | null> {
  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      college: true,
      year: true,
      status: true,
      createdAt: true,
      aliases: { select: { id: true, aliasType: true, aliasValue: true } },
      awardRecords: {
        where: awardWhereForRole(role),
        orderBy: { createdAt: "desc" },
        select: awardSelection,
      },
      teamMembers: {
        where: { leftAt: null },
        orderBy: { joinedAt: "asc" },
        select: {
          id: true,
          personNo: true,
          name: true,
          role: true,
          joinedAt: true,
          leftAt: true,
        },
      },
      memberSnapshots: {
        orderBy: { versionNo: "desc" },
        select: {
          id: true,
          versionNo: true,
          membersJson: true,
          changedBy: true,
          changedAt: true,
          reason: true,
          changer: { select: { name: true } },
        },
      },
    },
  });
  if (!project) return null;

  return {
    ...mapProjectListItem({ ...project, awards: project.awardRecords }),
    aliases: project.aliases,
    members: project.teamMembers.map((member) => ({
      ...member,
      joinedAt: member.joinedAt.toISOString(),
      leftAt: member.leftAt?.toISOString() ?? null,
    })),
    snapshots: project.memberSnapshots.map((snapshot) => ({
      id: snapshot.id,
      versionNo: snapshot.versionNo,
      changedBy: snapshot.changedBy,
      changedByName: snapshot.changer.name,
      changedAt: snapshot.changedAt.toISOString(),
      reason: snapshot.reason,
      members: parseSnapshotMembers(snapshot.membersJson),
    })),
  };
}
