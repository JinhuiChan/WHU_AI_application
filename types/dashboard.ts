import type { AwardLevel, CompetitionLevel } from "@prisma/client";

export type DashboardSummary = {
  year: number;
  kpi: {
    projectCount: number;
    participantCount: number;
    awardCount: number;
    collegeCount: number;
  };
  trend: { year: number; awardCount: number }[];
};

export type RankingDetail = {
  awardId: string;
  projectId: string;
  projectName: string;
  competitionName: string;
  competitionLevel: CompetitionLevel;
  awardLevel: AwardLevel;
  score: number;
};

export type CollegeRanking = {
  college: string;
  score: number;
  awardCount: number;
  nationalCount: number;
  provinceCount: number;
  schoolCount: number;
  details: RankingDetail[];
};
