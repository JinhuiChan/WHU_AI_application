import type {
  ChangeSource,
  MemberRole,
  ProjectStage,
  RegistrationStatus,
  ReviewLevel,
  ReviewResult,
  TeacherConfirmStatus,
} from "@prisma/client";
import type { Paginated } from "@/types/api";

export type ReviewListItem = {
  id: string;
  competitionId: string | null;
  competitionName: string;
  stage: ProjectStage;
  trackId: string | null;
  trackName: string;
  trackDisplay: string;
  submittedAt: string | null;
  batchName: string;
  applicationUnit: string;
  groupName: string;
  categoryName: string;
  leaderStudentNo: string;
  leaderName: string;
  grade: string;
  enrollmentYear: number | null;
  graduationYear: number | null;
  educationStage: string;
  trainingUnit: string;
  gender: string;
  ethnicity: string;
  payeeName: string;
  projectName: string;
  workName: string;
  workForm: string;
  workCategory: string;
  workGroup: string;
  applicantName: string;
  phone: string;
  email: string;
  score: number | null;
  status: RegistrationStatus;
  teachers: string;
  members: string;
  submissionCount: number;
  hasUnconfirmedTeachers: boolean;
};

export type ReviewListPage = Paginated<ReviewListItem>;

export type ReviewFilters = {
  competitionId?: string;
  stage?: ProjectStage;
  college?: string;
  status?: RegistrationStatus;
  trackId?: string;
  q?: string;
  page: number;
  pageSize: number;
};

export type ReviewFilterOptions = {
  competitions: { id: string; name: string }[];
  colleges: string[];
  tracks: { id: string; name: string; competitionId: string }[];
};

export type ReviewTeacher = {
  id: string;
  isInternal: boolean;
  staffNo: string | null;
  name: string;
  gender: string | null;
  phone: string | null;
  school: string;
  unit: string;
  title: string | null;
  email: string | null;
  confirmStatus: TeacherConfirmStatus;
};

export type ReviewMember = {
  id: string;
  personNo: string | null;
  name: string;
  role: MemberRole;
  school: string;
  educationStage: string;
  trainingUnit: string;
  major: string;
  gender: string;
  ethnicity: string;
  enrollmentYear: number | null;
  graduationYear: number | null;
  phone: string | null;
  email: string | null;
  isPayee: boolean;
};

export type ReviewWork = {
  fileName: string | null;
  fileUrl: string | null;
  externalUrl: string | null;
  form: string;
  category: string;
  groupName: string;
  pptFileName: string | null;
  pptFileUrl: string | null;
};

export type ReviewSealedFile = {
  id: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  versionNo: number;
  uploadedAt: string;
  isFinal: boolean;
  reviewResult: string;
  reviewNote: string | null;
  uploaderName: string;
};

export type ReviewChangeLog = {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  changerName: string;
  source: ChangeSource;
};

export type ReviewRecord = {
  id: string;
  level: ReviewLevel;
  result: ReviewResult;
  reason: string | null;
  createdAt: string;
  reviewerName: string;
};

export type ReviewDetail = ReviewListItem & {
  year: number;
  createdAt: string;
  updatedAt: string;
  propositionName: string | null;
  propositionCompany: string | null;
  remark: string | null;
  teacherDetails: ReviewTeacher[];
  memberDetails: ReviewMember[];
  workDetail: ReviewWork | null;
  sealedFiles: ReviewSealedFile[];
  changeLogs: ReviewChangeLog[];
  reviews: ReviewRecord[];
};

export type ReviewOperationResult = {
  projectId: string;
  status: RegistrationStatus;
};

export type ReviewBatchResult = {
  success: string[];
  failed: { projectId: string; message: string }[];
};
