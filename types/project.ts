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
  personNo: string;
  name: string;
  role: MemberRole;
  joinedAt: string;
  leftAt: string | null;
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
  year?: number;
  college?: string;
  level?: AwardLevel;
  awarded?: boolean;
  q?: string;
  page: number;
  pageSize: number;
};
