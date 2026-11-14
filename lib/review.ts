import { Prisma } from "@prisma/client";
import type {
  ProjectStage,
  RegistrationStatus,
  ReviewLevel,
  ReviewResult,
} from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { globalLabel, loadScopedLabels, trackLabel } from "@/lib/dict-labels";
import type { ScopedLabels } from "@/lib/dict-labels";
import { optionalText, pageParams } from "@/lib/list-query";
import { auditPreflightMessages, registrationStatusLabels } from "@/lib/presentation";
import { prisma } from "@/lib/prisma";
import { listSealedFiles } from "@/lib/sealed";
import type {
  ReviewBatchResult,
  ReviewDetail,
  ReviewFilterOptions,
  ReviewFilters,
  ReviewListItem,
  ReviewListPage,
  ReviewOperationResult,
  ReviewTab,
} from "@/types/review";

const reviewListInclude = {
  owner: {
    select: {
      studentNo: true,
      name: true,
      phone: true,
      email: true,
      gender: true,
      ethnicity: true,
      educationStage: true,
      trainingUnit: true,
      grade: true,
      enrollmentYear: true,
      graduationYear: true,
    },
  },
  competition: { select: { id: true, name: true } },
  track: { select: { id: true, name: true } },
  payeeMember: { select: { id: true, name: true } },
  teamMembers: {
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
  },
  teachers: { orderBy: { createdAt: "asc" as const } },
  work: true,
  _count: { select: { changeLogs: { where: { field: "SUBMIT" } } } },
} satisfies Prisma.ProjectInclude;

const reviewDetailInclude = {
  ...reviewListInclude,
  sealedFiles: {
    orderBy: { versionNo: "desc" as const },
    include: { uploader: { select: { name: true } } },
  },
  reviews: {
    orderBy: { createdAt: "desc" as const },
    include: { reviewer: { select: { name: true } } },
  },
  changeLogs: {
    orderBy: { changedAt: "desc" as const },
    include: { changer: { select: { name: true } } },
  },
} satisfies Prisma.ProjectInclude;

type ReviewListProject = Prisma.ProjectGetPayload<{ include: typeof reviewListInclude }>;

type LabelMaps = ScopedLabels;

async function loadLabelMaps(): Promise<LabelMaps> {
  return loadScopedLabels();
}

function mapReviewListItem(project: ReviewListProject, labels: LabelMaps): ReviewListItem {
  const leader = project.teamMembers.find((member) => member.role === "LEADER") ?? project.teamMembers[0];
  const payee = project.payeeMember ?? project.teamMembers.find((member) => member.isPayee);
  const groupName = trackLabel(labels, "GROUP", project.groupName, project.trackId);
  const categoryName = trackLabel(labels, "CATEGORY", project.categoryName, project.trackId);
  const trackName = project.track?.name ?? "未设置赛道";
  const trackDisplay = [project.track?.name, groupName, categoryName].filter(Boolean).join(" / ") || trackName;
  const educationStage = globalLabel(
    labels,
    "EDUCATION_STAGE",
    leader?.educationStage || project.owner?.educationStage,
  );
  const ethnicity = globalLabel(labels, "ETHNICITY", leader?.ethnicity || project.owner?.ethnicity);
  const applicantName = leader?.name ?? project.owner?.name ?? "";

  return {
    id: project.id,
    competitionId: project.competitionId,
    competitionName: project.competition?.name ?? "未设置赛事",
    stage: project.stage,
    trackId: project.trackId,
    trackName,
    trackDisplay,
    submittedAt: project.submittedAt?.toISOString() ?? null,
    batchName: project.batchName ?? "",
    applicationUnit: project.applicationUnit,
    groupName,
    categoryName,
    leaderStudentNo: leader?.personNo ?? project.owner?.studentNo ?? "",
    leaderName: applicantName,
    grade: project.owner?.grade ?? "",
    enrollmentYear: leader?.enrollmentYear ?? project.owner?.enrollmentYear ?? null,
    graduationYear: leader?.graduationYear ?? project.owner?.graduationYear ?? null,
    educationStage,
    trainingUnit: project.trainingUnit || leader?.trainingUnit || project.owner?.trainingUnit || "",
    gender: leader?.gender || project.owner?.gender || "",
    ethnicity,
    payeeName: payee?.name ?? "",
    projectName: project.name,
    workName: project.work?.fileName || project.work?.externalUrl || "",
    workForm: globalLabel(labels, "WORK_FORM", project.work?.form),
    workCategory: trackLabel(labels, "CATEGORY", project.work?.category, project.trackId),
    workGroup: trackLabel(labels, "GROUP", project.work?.groupName, project.trackId),
    applicantName,
    phone: leader?.phone || project.owner?.phone || "",
    email: leader?.email || project.owner?.email || "",
    score: project.score,
    status: project.reviewStatus,
    teachers: project.teachers.map((teacher) => [
      teacher.isInternal ? "是" : "否",
      teacher.name,
      teacher.staffNo ?? "",
      teacher.gender ?? "",
      teacher.phone ?? "",
      teacher.school,
      teacher.unit,
      teacher.title ?? "",
    ].join(",")).join("\n"),
    members: project.teamMembers.filter((member) => member.role !== "LEADER").map((member) => [
      member.isInternal ? "是" : "否",
      member.name,
      member.personNo ?? "",
      globalLabel(labels, "EDUCATION_STAGE", member.educationStage),
      member.trainingUnit,
      member.major,
      member.gender,
      globalLabel(labels, "ETHNICITY", member.ethnicity),
      member.phone ?? "",
      member.email ?? "",
    ].join(",")).join("\n"),
    submissionCount: project._count.changeLogs,
    hasUnconfirmedTeachers: project.teachers.some((teacher) => teacher.confirmStatus !== "CONFIRMED"),
  };
}

function isProjectStage(value: string | null): value is ProjectStage {
  return value === "SCHOOL" || value === "PROVINCE" || value === "NATIONAL" || value === "FINISHED";
}

function isRegistrationStatus(value: string | null): value is RegistrationStatus {
  return value === "DRAFT" || value === "PENDING" || value === "COLLEGE_REVIEW" ||
    value === "SCHOOL_FINAL" || value === "REJECTED" || value === "PROVINCE_ADVANCED" ||
    value === "NATIONAL_ADVANCED" || value === "WITHDRAWN";
}

export function parseReviewQuery(params: URLSearchParams): ReviewFilters {
  const { page, pageSize } = pageParams(params.get("page") ?? undefined, params.get("pageSize") ?? undefined);
  const stage = params.get("stage");
  const status = params.get("status");
  const tab = params.get("tab");
  const parsedTab: ReviewTab | undefined = tab === "pending" || tab === "reviewed" || tab === "all" ? tab : undefined;
  return {
    competitionId: optionalText(params.get("competitionId") ?? undefined),
    stage: isProjectStage(stage) ? stage : undefined,
    college: optionalText(params.get("college") ?? undefined),
    status: isRegistrationStatus(status) ? status : undefined,
    trackId: optionalText(params.get("trackId") ?? undefined),
    q: optionalText(params.get("q") ?? undefined),
    tab: parsedTab,
    page,
    pageSize,
  };
}

const pendingStatuses: RegistrationStatus[] = ["PENDING", "COLLEGE_REVIEW"];
const reviewedStatuses: RegistrationStatus[] = [
  "SCHOOL_FINAL",
  "REJECTED",
  "PROVINCE_ADVANCED",
  "NATIONAL_ADVANCED",
  "WITHDRAWN",
];

export async function getReviewTabCounts() {
  const groups = await prisma.project.groupBy({
    by: ["reviewStatus"],
    where: { deletedAt: null },
    _count: { _all: true },
  });
  let pending = 0;
  let reviewed = 0;
  let total = 0;
  for (const group of groups) {
    const count = group._count._all;
    total += count;
    if (pendingStatuses.includes(group.reviewStatus)) pending += count;
    else if (reviewedStatuses.includes(group.reviewStatus)) reviewed += count;
  }
  return { pending, reviewed, total };
}

export function buildReviewWhere(filters: Partial<ReviewFilters>): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = { deletedAt: null };
  if (filters.competitionId) where.competitionId = filters.competitionId;
  if (filters.stage) where.stage = filters.stage;
  if (filters.college) where.college = filters.college;
  if (filters.status) where.reviewStatus = filters.status;
  else if (filters.tab === "pending") where.reviewStatus = { in: pendingStatuses };
  else if (filters.tab === "reviewed") where.reviewStatus = { in: reviewedStatuses };
  if (filters.trackId) where.trackId = filters.trackId;
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q } },
      { college: { contains: filters.q } },
      { competition: { is: { name: { contains: filters.q } } } },
      { owner: { is: { name: { contains: filters.q } } } },
      { owner: { is: { studentNo: { contains: filters.q } } } },
      { teamMembers: { some: { name: { contains: filters.q } } } },
      { teamMembers: { some: { personNo: { contains: filters.q } } } },
    ];
  }
  return where;
}

export async function getReviewList(filters: ReviewFilters): Promise<ReviewListPage> {
  const where = buildReviewWhere(filters);
  const [labels, [projects, total]] = await Promise.all([
    loadLabelMaps(),
    prisma.$transaction([
      prisma.project.findMany({
        where,
        include: reviewListInclude,
        orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      prisma.project.count({ where }),
    ]),
  ]);

  return {
    list: projects.map((project) => mapReviewListItem(project, labels)),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function listReviewItemsForExport(
  filters: Partial<ReviewFilters>,
  take: number,
  additionalWhere?: Prisma.ProjectWhereInput,
): Promise<ReviewListItem[]> {
  const where: Prisma.ProjectWhereInput = additionalWhere
    ? { AND: [buildReviewWhere(filters), additionalWhere] }
    : buildReviewWhere(filters);
  const [labels, projects] = await Promise.all([
    loadLabelMaps(),
    prisma.project.findMany({
      where,
      include: reviewListInclude,
      orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
      take,
    }),
  ]);
  return projects.map((project) => mapReviewListItem(project, labels));
}

export async function listReviewFilterOptions(): Promise<ReviewFilterOptions> {
  const [competitions, colleges, tracks] = await Promise.all([
    prisma.competition.findMany({
      select: { id: true, name: true },
      orderBy: [{ year: "desc" }, { name: "asc" }],
    }),
    prisma.project.groupBy({
      by: ["college"],
      where: { deletedAt: null },
      orderBy: { college: "asc" },
    }),
    prisma.track.findMany({
      select: { id: true, name: true, competitionId: true },
      orderBy: [{ competitionId: "asc" }, { sortOrder: "asc" }],
    }),
  ]);
  return { competitions, colleges: colleges.map((item) => item.college), tracks };
}

export async function getReviewDetail(projectId: string): Promise<ReviewDetail | null> {
  const [project, labels] = await Promise.all([
    prisma.project.findFirst({ where: { id: projectId, deletedAt: null }, include: reviewDetailInclude }),
    loadLabelMaps(),
  ]);
  if (!project) return null;
  const base = mapReviewListItem(project, labels);

  return {
    ...base,
    year: project.year,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    propositionName: project.propositionName,
    propositionCompany: project.propositionCompany,
    remark: project.remark,
    teacherDetails: project.teachers.map((teacher) => ({
      id: teacher.id,
      isInternal: teacher.isInternal,
      staffNo: teacher.staffNo,
      name: teacher.name,
      gender: teacher.gender,
      phone: teacher.phone,
      school: teacher.school,
      unit: teacher.unit,
      title: teacher.title,
      email: teacher.email,
      confirmStatus: teacher.confirmStatus,
    })),
    memberDetails: project.teamMembers.map((member) => ({
      id: member.id,
      personNo: member.personNo,
      name: member.name,
      role: member.role,
      school: member.school,
      educationStage: globalLabel(labels, "EDUCATION_STAGE", member.educationStage),
      trainingUnit: member.trainingUnit,
      major: member.major,
      gender: member.gender,
      ethnicity: globalLabel(labels, "ETHNICITY", member.ethnicity),
      enrollmentYear: member.enrollmentYear,
      graduationYear: member.graduationYear,
      phone: member.phone,
      email: member.email,
      isPayee: member.isPayee,
    })),
    workDetail: project.work ? {
      fileName: project.work.fileName,
      fileUrl: project.work.fileUrl,
      externalUrl: project.work.externalUrl,
      form: globalLabel(labels, "WORK_FORM", project.work.form),
      category: trackLabel(labels, "CATEGORY", project.work.category, project.trackId),
      groupName: trackLabel(labels, "GROUP", project.work.groupName, project.trackId),
      pptFileName: project.work.pptFileName,
      pptFileUrl: project.work.pptFileUrl,
    } : null,
    sealedFiles: project.sealedFiles.map((file) => ({
      id: file.id,
      fileName: file.fileName,
      filePath: file.filePath,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      versionNo: file.versionNo,
      uploadedAt: file.uploadedAt.toISOString(),
      isFinal: file.isFinal,
      reviewResult: file.reviewResult,
      reviewNote: file.reviewNote,
      uploaderName: file.uploader.name,
    })),
    changeLogs: project.changeLogs.map((log) => ({
      id: log.id,
      field: log.field,
      oldValue: log.oldValue,
      newValue: log.newValue,
      changedAt: log.changedAt.toISOString(),
      changerName: log.changer.name,
      source: log.source,
    })),
    reviews: project.reviews.map((review) => ({
      id: review.id,
      level: review.level,
      result: review.result,
      reason: review.reason,
      createdAt: review.createdAt.toISOString(),
      reviewerName: review.reviewer.name,
    })),
  };
}

export class ReviewError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ReviewError";
  }
}

function validateReviewInput(level: ReviewLevel, result: ReviewResult, reason?: string) {
  if (level !== "COLLEGE" && level !== "SCHOOL") throw new ReviewError(422, "审核级别仅支持 COLLEGE 或 SCHOOL");
  if (result !== "APPROVED" && result !== "REJECTED") throw new ReviewError(422, "审核结果不正确");
  if (result === "APPROVED") return null;
  const normalized = reason?.trim() ?? "";
  if (!normalized) throw new ReviewError(422, "请填写驳回理由");
  if (normalized.length > 200) throw new ReviewError(422, "驳回理由不能超过 200 字");
  return normalized;
}

function expectedStatus(level: ReviewLevel): RegistrationStatus {
  return level === "COLLEGE" ? "PENDING" : "COLLEGE_REVIEW";
}

function invalidStateMessage(level: ReviewLevel, status: RegistrationStatus) {
  const expected = expectedStatus(level);
  const action = level === "COLLEGE" ? "学院级审核" : "校级终审";
  return `${action}仅处理 ${expected}（${registrationStatusLabels[expected]}）项目，当前为 ${status}（${registrationStatusLabels[status]}）`;
}

function nextStatus(level: ReviewLevel, result: ReviewResult): RegistrationStatus {
  if (result === "REJECTED") return "REJECTED";
  return level === "COLLEGE" ? "COLLEGE_REVIEW" : "SCHOOL_FINAL";
}

/** 审核通过的前置硬门槛：必须有指导老师，且全部已确认（CONFIRMED）。 */
async function assertTeachersConfirmed(transaction: Prisma.TransactionClient, projectId: string) {
  const teachers = await transaction.teacher.findMany({
    where: { projectId },
    select: { name: true, confirmStatus: true },
  });
  if (teachers.length === 0) {
    throw new ReviewError(422, "该项目还没有指导老师，不能审核通过；请先添加指导老师并完成确认");
  }
  const pending = teachers.filter((teacher) => teacher.confirmStatus !== "CONFIRMED").map((teacher) => teacher.name);
  if (pending.length > 0) {
    throw new ReviewError(422, `指导老师尚未确认指导关系：${pending.join("、")}；请等待确认后再审核通过`);
  }
}

export async function reviewProject(input: {
  projectId: string;
  level: ReviewLevel;
  result: ReviewResult;
  reason?: string;
  actorId: string;
}): Promise<ReviewOperationResult> {
  if (!input.projectId) throw new ReviewError(422, "项目 ID 不能为空");
  const reason = validateReviewInput(input.level, input.result, input.reason);
  const expected = expectedStatus(input.level);
  const status = nextStatus(input.level, input.result);

  return prisma.$transaction(async (transaction) => {
    const project = await transaction.project.findFirst({
      where: { id: input.projectId, deletedAt: null },
      select: { id: true, status: true, reviewStatus: true },
    });
    if (!project) throw new ReviewError(404, "项目不存在");
    if (project.reviewStatus !== expected || project.status !== expected) {
      throw new ReviewError(422, invalidStateMessage(input.level, project.reviewStatus));
    }

    if (input.result === "APPROVED") await assertTeachersConfirmed(transaction, project.id);

    const updated = await transaction.project.updateMany({
      where: { id: project.id, status: expected, reviewStatus: expected, deletedAt: null },
      data: { status, reviewStatus: status },
    });
    if (updated.count !== 1) throw new ReviewError(422, "项目状态已变化，请刷新后重试");

    await transaction.review.create({
      data: {
        projectId: project.id,
        level: input.level,
        result: input.result,
        reason,
        reviewerId: input.actorId,
      },
    });
    await writeAuditLog({
      actorId: input.actorId,
      action: input.result === "APPROVED" ? "REVIEW_APPROVED" : "REVIEW_REJECTED",
      targetType: "Project",
      targetId: project.id,
      detail: { level: input.level, result: input.result, previousStatus: expected, status, reason },
    }, transaction);
    return { projectId: project.id, status };
  });
}

export async function batchReviewProjects(input: {
  projectIds: string[];
  level: ReviewLevel;
  result: ReviewResult;
  reason?: string;
  actorId: string;
}): Promise<ReviewBatchResult> {
  const reason = validateReviewInput(input.level, input.result, input.reason);
  const projectIds = [...new Set(input.projectIds)];
  const expected = expectedStatus(input.level);
  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds }, deletedAt: null },
    select: { id: true, status: true, reviewStatus: true },
  });
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const eligible: string[] = [];
  const failed: ReviewBatchResult["failed"] = [];

  for (const projectId of projectIds) {
    const project = projectMap.get(projectId);
    if (!project) {
      failed.push({ projectId, message: "项目不存在" });
    } else if (project.reviewStatus !== expected || project.status !== expected) {
      failed.push({ projectId, message: invalidStateMessage(input.level, project.reviewStatus) });
    } else {
      eligible.push(projectId);
    }
  }

  const success: string[] = [];
  for (const projectId of eligible) {
    try {
      await reviewProject({ projectId, level: input.level, result: input.result, reason: reason ?? undefined, actorId: input.actorId });
      success.push(projectId);
    } catch (error) {
      if (error instanceof ReviewError) {
        failed.push({ projectId, message: error.message });
      } else {
        console.error("批量审核单项失败：", error instanceof Error ? error.message : error);
        failed.push({ projectId, message: "审核操作失败，请稍后重试" });
      }
    }
  }
  return { success, failed };
}

export type AuditPreflightIssue = {
  level: "error" | "warn";
  code: string;
  message: string;
};

export async function getAuditPreflight(projectId: string): Promise<AuditPreflightIssue[]> {
  if (!projectId) throw new ReviewError(422, "项目 ID 不能为空");
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: {
      id: true,
      college: true,
      owner: { select: { college: true, phone: true } },
      teamMembers: { where: { leftAt: null }, select: { role: true, personNo: true, phone: true } },
    },
  });
  if (!project) throw new ReviewError(404, "项目不存在");

  const issues: AuditPreflightIssue[] = [];
  try {
    await assertTeachersConfirmed(prisma, projectId);
  } catch (error) {
    if (!(error instanceof ReviewError) || error.status !== 422) throw error;
    issues.push({ level: "error", code: "TEACHERS_UNCONFIRMED", message: error.message });
  }

  const sealedFiles = await listSealedFiles(projectId);
  if (sealedFiles.length === 0) {
    issues.push({ level: "error", code: "SEALED_FILE_MISSING", message: auditPreflightMessages.sealedFileMissing });
  }
  if (sealedFiles.some((file) => file.isFinal && file.reviewResult === "REJECTED")) {
    issues.push({ level: "error", code: "SEALED_FINAL_REJECTED", message: auditPreflightMessages.sealedFinalRejected });
  }

  const seenStudentNos = new Set<string>();
  const hasDuplicateStudentNo = project.teamMembers.some((member) => {
    const studentNo = member.personNo?.trim();
    if (!studentNo) return false;
    if (seenStudentNos.has(studentNo)) return true;
    seenStudentNos.add(studentNo);
    return false;
  });
  if (hasDuplicateStudentNo) {
    issues.push({ level: "warn", code: "DUPLICATE_STUDENT_NO", message: auditPreflightMessages.duplicateStudentNo });
  }

  const leader = project.teamMembers.find((member) => member.role === "LEADER") ?? project.teamMembers[0];
  if (!(leader?.phone || project.owner?.phone || "").trim()) {
    issues.push({ level: "warn", code: "LEADER_PHONE_MISSING", message: auditPreflightMessages.leaderPhoneMissing });
  }
  const projectCollege = project.college.trim();
  const leaderCollege = project.owner?.college?.trim() ?? "";
  if (projectCollege && leaderCollege && projectCollege !== leaderCollege) {
    issues.push({ level: "warn", code: "LEADER_COLLEGE_MISMATCH", message: auditPreflightMessages.leaderCollegeMismatch });
  }

  return issues;
}
