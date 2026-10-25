export type MaterialCheck = {
  item: string;
  pass: boolean;
  basis: string;
  suggestion: string;
};

export type MaterialCheckResult = {
  checks: MaterialCheck[];
  summary: string;
};
