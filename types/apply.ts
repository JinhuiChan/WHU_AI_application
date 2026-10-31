export type PayeeInput =
  | {
      boundFinancePlatform: true;
    }
  | {
      boundFinancePlatform: false;
      organization: string;
      phone: string;
      idCard: string;
      bankCard: string;
      bankName: string;
      accountName: string;
    };

export type MemberInput = {
  id?: string;
  isInternal: boolean;
  personNo: string | null;
  name: string;
  school: string;
  educationStage: string;
  trainingUnit: string;
  major: string;
  gender: string;
  ethnicity: string;
  enrollmentYear: number;
  graduationYear: number;
  phone: string;
  email: string;
  remark?: string;
  sortOrder: number;
  backupOrder?: 2 | 3;
  isPayee: boolean;
  payee?: PayeeInput;
};

export type TeacherInput = {
  id?: string;
  isInternal: boolean;
  staffNo: string | null;
  name: string;
  gender: string;
  phone: string;
  school: string;
  unit: string;
  title: string;
  email: string;
};

export type ProjectFormInput = {
  competitionId: string;
  trackId: string;
  batchName?: string;
  name: string;
  leaderStudentNo: string;
  leaderName: string;
  grade: string;
  gender: string;
  educationStage: string;
  trainingUnit: string;
  applicationUnit: string;
  ethnicity: string;
  major: string;
  enrollmentYear: number;
  graduationYear: number;
  phone: string;
  email: string;
  remark?: string;
  groupName: string;
  categoryName: string;
  propositionName: string;
  propositionCompany: string;
  isPayee: boolean;
  payee?: PayeeInput;
  teachers: TeacherInput[];
  members: MemberInput[];
  work: {
    fileName?: string;
    fileUrl?: string;
    externalUrl?: string;
    form: string;
    category: string;
    groupName: string;
    pptFileName?: string;
    pptFileUrl?: string;
  };
};
