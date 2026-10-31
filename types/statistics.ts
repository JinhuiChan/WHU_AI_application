import type { AwardLevel, RegistrationStatus } from "@prisma/client";

export type StatisticsStage = "SCHOOL" | "PROVINCE" | "NATIONAL";
export type StatisticsAwardLevel = Extract<AwardLevel, "GOLD" | "SILVER" | "BRONZE" | "EXCELLENT">;

export type StatisticsFilters = {
  competitionId?: string;
  year?: number;
  stage?: StatisticsStage;
};

export type StatisticsSummary = {
  scope: "all" | "mine";
  filters: {
    competitionId: string | null;
    year: number | null;
    stage: StatisticsStage | null;
  };
  cards: {
    totalProjects: number;
    totalParticipants: number;
    pendingReviewCount: number;
    provinceAdvancedCount: number;
  };
  byCollege: {
    college: string;
    projectCount: number;
    participantCount: number;
    provinceAdvancedCount: number;
  }[];
  byTrack: {
    trackId: string | null;
    trackName: string;
    projectCount: number;
    percentage: number;
  }[];
  byStage: {
    stage: StatisticsStage;
    label: string;
    projectCount: number;
  }[];
  byAward: {
    awardLevel: StatisticsAwardLevel;
    label: string;
    count: number;
  }[];
  myStatus?: {
    status: RegistrationStatus;
    label: string;
    count: number;
  }[];
  options: {
    competitions: { id: string; name: string }[];
    years: number[];
  };
};
