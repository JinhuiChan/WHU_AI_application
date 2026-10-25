import type {
  AwardLevel,
  AwardStatus,
  CompetitionLevel,
  DataSourceType,
  EvidenceType,
} from "@prisma/client";

export type CompetitionListItem = {
  id: string;
  name: string;
  level: CompetitionLevel;
  seriesId: string;
  year: number;
  organizer: string | null;
  createdAt: string;
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
  awards: CompetitionAward[];
};

export type CompetitionFilters = {
  year?: number;
  level?: CompetitionLevel;
  q?: string;
  page: number;
  pageSize: number;
};
