export type AssistantEvidence = {
  chunkId: string;
  fileName: string;
  section: string;
  page: number | null;
  year: number;
};

export type AssistantResult = {
  answer: string;
  evidence: AssistantEvidence | null;
  handoff: boolean;
};
