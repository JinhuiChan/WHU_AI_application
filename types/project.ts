import type {
  AliasType,
  AwardLevel,
  AwardStatus,
  CompetitionLevel,
  EvidenceType,
  MemberRole,
  ProjectStatus,
} from "@prisma/client";

export type ProjectAward = {
  id: string;
  awardLevel: AwardLevel;
  status: AwardStatus;
  evidenceType: EvidenceType;
  evidenceRef: string;
  verifiedBy: string;
  verifierName: string;
  verifiedAt: string;
  createdAt: string;
  competition: {
    id: string;
    name: string;
    level: CompetitionLevel;
  };
};

export type ProjectListItem = {
  id: string;
  name: string;
  competition: { id: string; name: string } | null;
  college: string;
  year: number;
  status: ProjectStatus;
  createdAt: string;
  awards: ProjectAward[];
};

export type ProjectAliasItem = {
  id: string;
  aliasType: AliasType;
  aliasValue: string;
};

export type ProjectMember = {
  id: string;
  personNo: string | null;
  name: string;
  role: MemberRole;
  joinedAt: string;
  leftAt: string | null;
  /** 负责人联系方式：只在教师/管理员视角渲染，学生视角不显示 */
  phone: string | null;
  email: string | null;
};

export type SnapshotMember = {
  personNo: string;
  name: string;
  role: MemberRole;
  joinedAt: string;
  leftAt: string | null;
};

export type ProjectSnapshot = {
  id: string;
  versionNo: number;
  changedBy: string;
  changedByName: string;
  changedAt: string;
  reason: string | null;
  members: SnapshotMember[];
};

export type ProjectDetail = ProjectListItem & {
  aliases: ProjectAliasItem[];
  members: ProjectMember[];
  snapshots: ProjectSnapshot[];
};

export type ProjectFilters = {
  competitionId?: string;
  year?: number;
  college?: string;
  level?: AwardLevel;
  awarded?: boolean;
  q?: string;
  page: number;
  pageSize: number;
};
