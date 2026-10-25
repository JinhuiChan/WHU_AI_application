import type { AwardLevel, EvidenceType } from "@prisma/client";

export type ImportRowError = {
  field: string;
  reason: string;
};

export type ImportRowResult = {
  rowNumber: number;
  projectName: string;
  year: number | null;
  college: string;
  competitionName: string;
  awardLevel: AwardLevel | null;
  evidenceType: EvidenceType | null;
  evidenceRef: string;
  leaderPersonNo: string;
  leaderName: string;
  projectId: string | null;
  competitionId: string | null;
  newProject: boolean;
  errors: ImportRowError[];
};

export type ValidImportRow = ImportRowResult & {
  year: number;
  awardLevel: AwardLevel;
  evidenceType: EvidenceType;
  competitionId: string;
};

export type ImportValidationReport = {
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: ImportRowResult[];
};

export type ImportCommitResult = {
  batchId: string;
  totalRows: number;
  successRows: number;
  failureRows: number;
  anomalyMatches: number;
};
