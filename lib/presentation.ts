import type {
  AliasType,
  AwardLevel,
  AwardStatus,
  CompetitionLevel,
  DataSourceType,
  EvidenceType,
  MemberRole,
  ProjectStatus,
} from "@prisma/client";

export const competitionLevelLabels: Record<CompetitionLevel, string> = {
  SCHOOL: "校赛",
  PROVINCE: "省赛",
  NATIONAL: "国赛",
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
  ACTIVE: "进行中",
  WITHDRAWN: "已退出",
};

export const awardLevelLabels: Record<AwardLevel, string> = {
  S: "S",
  A: "A",
  B: "B",
  C: "C",
  EXCELLENT: "优秀奖",
};

export const awardStatusLabels: Record<AwardStatus, string> = {
  DRAFT: "草稿",
  VERIFIED: "已核验",
  PUBLISHED: "已发布",
  VOIDED: "已作废",
};

export const memberRoleLabels: Record<MemberRole, string> = {
  LEADER: "负责人",
  MEMBER: "成员",
  TEACHER: "指导教师",
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
