import type { ChangeRequestStatus, MemberRole } from "@prisma/client";

export const CHANGE_TYPES = ["MEMBER", "TEACHER", "CONTACT", "PROJECT_NAME", "TRACK", "LEADER", "PAYEE"] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  MEMBER: "成员信息",
  TEACHER: "指导教师",
  CONTACT: "联系方式",
  PROJECT_NAME: "项目名称",
  TRACK: "赛道与组别",
  LEADER: "项目负责人",
  PAYEE: "领款人",
};

export const CHANGE_FIELD_LABELS: Record<string, string> = {
  memberId: "成员",
  teacherId: "指导教师",
  name: "名称",
  personNo: "学号",
  staffNo: "工号",
  phone: "手机号",
  email: "邮箱",
  major: "专业",
  trainingUnit: "培养单位",
  unit: "单位",
  title: "职称",
  trackId: "赛道",
  groupName: "项目组别",
  categoryName: "项目类别",
};

export const CHANGE_STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  PENDING_COLLEGE: "待学院审核",
  PENDING_SCHOOL: "待校级审核",
  APPROVED: "已通过",
  REJECTED: "已驳回",
  CANCELLED: "已取消",
};

export type ChangeRequestView = {
  id: string;
  projectId: string;
  projectName: string;
  applicantName: string;
  type: string;
  reason: string;
  evidenceFileName: string | null;
  evidenceFileUrl: string | null;
  status: ChangeRequestStatus;
  collegeReason: string | null;
  schoolReason: string | null;
  cooldownUntil: string | null;
  oldValues: Record<string, string>;
  newValues: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type ChangeListResult = {
  list: ChangeRequestView[];
  total: number;
  page: number;
  pageSize: number;
};

export type ChangeMemberOption = {
  id: string;
  name: string;
  role: MemberRole;
  personNo: string;
  phone: string;
  email: string;
  major: string;
  trainingUnit: string;
  hasUser: boolean;
};

export type ChangeTeacherOption = {
  id: string;
  staffNo: string;
  name: string;
  unit: string;
  title: string;
  phone: string;
  email: string;
};

export type ChangePanelData = {
  canRequest: boolean;
  members: ChangeMemberOption[];
  teachers: ChangeTeacherOption[];
  tracks: { id: string; name: string }[];
  current: {
    name: string;
    trackId: string;
    groupName: string;
    categoryName: string;
    leaderMemberId: string;
    payeeMemberId: string;
  };
  requests: ChangeRequestView[];
};
