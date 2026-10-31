import type { AwardLevel, ProjectStatus } from "@prisma/client";

export const adminAwardLevels = ["GOLD", "SILVER", "BRONZE", "EXCELLENT"] as const;
export type AdminAwardLevel = (typeof adminAwardLevels)[number];

export type AdminAwardItem = {
  projectId: string;
  projectName: string;
  college: string;
  trackName: string;
  status: ProjectStatus;
  eligible: boolean;
  awardId: string | null;
  currentAward: AwardLevel | null;
  updatedAt: string;
};

export type AdminAwardPage = {
  list: AdminAwardItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminAwardSaveResult = {
  projectId: string;
  awardId: string;
  oldLevel: AwardLevel | null;
  newLevel: AdminAwardLevel;
  changed: boolean;
};
