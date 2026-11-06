import type {
  AwardLevel,
  AwardStatus,
  CompetitionLevel,
  DataSourceType,
  EvidenceType,
  PublishStatus,
  RegistrationStatus,
} from "@prisma/client";

export type CompetitionRegistration = {
  windowStartAt: string | null;
  windowEndAt: string | null;
  windowOpen: boolean;
  projectId: string | null;
  projectStatus: RegistrationStatus | null;
};

export type CompetitionListItem = {
  id: string;
  name: string;
  level: CompetitionLevel;
  publishStatus: PublishStatus;
  seriesId: string;
  year: number;
  organizer: string | null;
  createdAt: string;
  registration?: CompetitionRegistration;
};

export type AwardSource = {
  sourceType: DataSourceType;
  sourceRef: string;
  batchId: string;
  syncedAt: string;
};

export type CompetitionAward = {
  id: string;
  awardLevel: AwardLevel;
  status: AwardStatus;
  evidenceType: EvidenceType;
  evidenceRef: string;
  verifiedBy: string;
  verifierName: string;
  verifiedAt: string;
  createdAt: string;
  project: {
    id: string;
    name: string;
    college: string;
    year: number;
  };
  sources: AwardSource[];
};

export type CompetitionDetail = CompetitionListItem & {
  description: string | null;
  awards: CompetitionAward[];
};

export type CompetitionFilters = {
  year?: number;
  level?: CompetitionLevel;
  publishStatus?: PublishStatus;
  q?: string;
  page: number;
  pageSize: number;
};
