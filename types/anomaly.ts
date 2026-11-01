import type { AnomalyResolution, AnomalyStatus } from "@prisma/client";

export type AnomalyItem = {
  id: string;
  ruleId: string;
  description: string;
  status: AnomalyStatus;
  resolution: AnomalyResolution | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  project: {
    id: string;
    name: string;
    year: number;
    college: string;
  };
};

export type AnomalyGroup = {
  ruleId: string;
  ruleName: string;
  items: AnomalyItem[];
};

export type AnomalyData = {
  groups: AnomalyGroup[];
  summary: {
    total: number;
    resolved: number;
    pending: number;
    resolutionRate: number;
  };
  status: AnomalyStatus | null;
  ruleId: string | null;
};
