import type { AwardLevel, CompetitionLevel } from "@prisma/client";

export const competitionScoreWeights: Record<CompetitionLevel, number> = {
  NATIONAL: 10,
  PROVINCE: 5,
  SCHOOL: 2,
};

export const awardScoreWeights: Record<AwardLevel, number> = {
  S: 1.5,
  A: 1.2,
  B: 1,
  C: 0.8,
  EXCELLENT: 0.5,
};

export function formatScore(score: number) {
  return score.toFixed(1);
}
