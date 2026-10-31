export type SealedFileView = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  versionNo: number;
  uploadedAt: string;
  isFinal: boolean;
  reviewResult: string;
  reviewNote: string | null;
  uploaderName: string;
};
