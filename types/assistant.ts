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
  sources: AssistantSource[];
  mode: "generated" | "no_evidence" | "unconfigured" | "unavailable";
};

export type AssistantSource = AssistantEvidence & {
  id: number;
  documentId: string;
  title: string;
  quote: string;
  quotes?: string[];
  fileUrl: string | null;
};
