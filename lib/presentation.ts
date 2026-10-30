import type {
  AliasType,
  AwardLevel,
  AwardStatus,
  CompetitionLevel,
  DataSourceType,
  EvidenceType,
  MemberRole,
  ProjectStatus,
  RegistrationStatus,
  Role,
} from "@prisma/client";

export const competitionLevelLabels: Record<CompetitionLevel, string> = {
  SCHOOL: "校赛",
  PROVINCE: "省赛",
  NATIONAL: "国赛",
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
  ACTIVE: "进行中",
  WITHDRAWN: "已退出",
  DRAFT: "草稿",
  PENDING: "待审核",
  COLLEGE_REVIEW: "学院审核中",
  SCHOOL_FINAL: "校内终审",
  REJECTED: "驳回",
  PROVINCE_ADVANCED: "已晋级省赛",
  NATIONAL_ADVANCED: "已晋级国赛",
  FINISHED: "已结束",
};

export const registrationStatusLabels: Record<RegistrationStatus, string> = {
  DRAFT: "草稿",
  PENDING: "待学院审核",
  COLLEGE_REVIEW: "待校级终审",
  SCHOOL_FINAL: "校内终审通过",
  REJECTED: "已驳回",
  PROVINCE_ADVANCED: "已晋级省赛",
  NATIONAL_ADVANCED: "已晋级国赛",
  WITHDRAWN: "已撤回",
};

export const awardLevelLabels: Record<AwardLevel, string> = {
  S: "S",
  A: "A",
  B: "B",
  C: "C",
  EXCELLENT: "优秀奖",
  GOLD: "金奖",
  SILVER: "银奖",
  BRONZE: "铜奖",
};

export const awardStatusLabels: Record<AwardStatus, string> = {
  DRAFT: "草稿",
  VERIFIED: "已核验",
  PUBLISHED: "已发布",
  VOIDED: "已作废",
};

export const memberRoleLabels: Record<MemberRole, string> = {
  LEADER: "负责人",
  SECOND_LEADER: "第二负责人",
  THIRD_LEADER: "第三负责人",
  MEMBER: "成员",
  TEACHER: "指导教师",
};

export const roleLabels: Record<Role, string> = {
  ADMIN: "系统管理员",
  USER: "普通用户",
  STUDENT: "学生",
  TEACHER: "指导教师",
  FINANCE: "财务/审计",
};

export const aliasTypeLabels: Record<AliasType, string> = {
  NAME: "项目名称",
  REG_NO: "报名编号",
  TEAM_NO: "团队编号",
};

export const evidenceTypeLabels: Record<EvidenceType, string> = {
  URL: "链接",
  FILE: "文件",
};

export const dataSourceTypeLabels: Record<DataSourceType, string> = {
  API: "接口",
  IMPORT: "导入",
  MANUAL: "手工",
};

export const anomalyRuleNames: Record<string, string> = {
  R1: "一人多队",
  R2: "成员数超限",
  R3: "指导老师超编",
  R4: "同名不同号",
  R5: "获奖后换人",
  R6: "跨院冲突",
};

export const anomalyResolutionLabels = {
  CONFIRMED: "确认异常",
  FIXED: "已修正",
  UNTRACEABLE: "无法追溯",
} as const;

export const auditActionLabels: Record<string, string> = {
  LOGIN: "登录",
  LOGOUT: "退出登录",
  USER_APPROVED: "审核用户",
  USER_ROLE_UPDATED: "修改用户角色",
  IMPORT_COMMITTED: "确认导入",
  ANOMALY_RESOLVED: "处置异常",
  ASSISTANT_ASKED: "站内咨询",
  MATERIAL_CHECKED: "材料检查",
};

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(new Date(value));
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Shanghai",
  }).format(new Date(value));
}
