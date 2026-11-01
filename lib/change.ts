import { ChangeRequestStatus, Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  CHANGE_TYPES,
  type ChangeListResult,
  type ChangePanelData,
  type ChangeRequestView,
  type ChangeType,
} from "@/types/change";

const CHANGE_WHITELIST = {
  PROJECT_NAME: { selector: undefined, fields: { name: "name" } },
  TRACK: { selector: undefined, fields: { trackId: "trackId", groupName: "groupName", categoryName: "categoryName" } },
  MEMBER: {
    selector: "memberId",
    fields: { memberId: "id", name: "name", personNo: "personNo", phone: "phone", email: "email", major: "major", trainingUnit: "trainingUnit" },
  },
  TEACHER: {
    selector: "teacherId",
    fields: { teacherId: "id", staffNo: "staffNo", name: "name", unit: "unit", title: "title", phone: "phone", email: "email" },
  },
  CONTACT: { selector: "memberId", fields: { memberId: "id", phone: "phone", email: "email" } },
  LEADER: { selector: "memberId", fields: { memberId: "ownerId" } },
  PAYEE: { selector: "memberId", fields: { memberId: "payeeMemberId" } },
} as const satisfies Record<ChangeType, { selector?: string; fields: Record<string, string> }>;

const SENSITIVE_TYPES = new Set<ChangeType>(["PROJECT_NAME", "TRACK", "LEADER", "PAYEE"]);
const REVIEWER_ROLES = new Set(["LEADER", "SECOND_LEADER", "THIRD_LEADER"]);
const DAY = 24 * 60 * 60 * 1000;

type Db = Prisma.TransactionClient;
type ChangeRequestWithRelations = Prisma.ChangeRequestGetPayload<{
  include: { project: { select: { name: true } }; applicant: { select: { name: true } } };
}>;

export class ChangeError extends Error {
  constructor(public status: number, message: string, public data: unknown = null) {
    super(message);
    this.name = "ChangeError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isChangeType(value: unknown): value is ChangeType {
  return typeof value === "string" && (CHANGE_TYPES as readonly string[]).includes(value);
}

function parseType(value: unknown): ChangeType {
  if (!isChangeType(value)) throw new ChangeError(422, "不支持的变更类型");
  return value;
}

function normalizeValues(type: ChangeType, input: unknown) {
  if (!isRecord(input)) throw new ChangeError(422, "newValues 必须是字段与字符串值组成的对象");
  const definition = CHANGE_WHITELIST[type];
  const values: Record<string, string> = {};
  for (const [field, value] of Object.entries(input)) {
    if (!Object.hasOwn(definition.fields, field)) throw new ChangeError(422, `${type} 不允许修改字段 ${field}`);
    if (typeof value !== "string") throw new ChangeError(422, `字段 ${field} 的值必须是字符串`);
    const normalized = value.trim();
    if (normalized.length > 500) throw new ChangeError(422, `字段 ${field} 不能超过 500 字`);
    values[field] = normalized;
  }
  if (Object.keys(values).length === 0) throw new ChangeError(422, "请至少填写一个变更字段");
  if (definition.selector && !values[definition.selector]) throw new ChangeError(422, `请选择${definition.selector === "memberId" ? "成员" : "指导教师"}`);
  const onlySelector = definition.selector && Object.keys(values).every((field) => field === definition.selector);
  if (onlySelector && type !== "LEADER" && type !== "PAYEE") throw new ChangeError(422, "请至少填写一个变更字段");
  if (Object.hasOwn(values, "name") && !values.name) throw new ChangeError(422, "名称不能为空");
  if (type === "PROJECT_NAME" && values.name.length > 200) throw new ChangeError(422, "项目名称不能超过 200 字");
  if (type === "TEACHER" && Object.hasOwn(values, "unit") && !values.unit) throw new ChangeError(422, "教师单位不能为空");
  if (Object.hasOwn(values, "trackId") && !values.trackId) throw new ChangeError(422, "赛道不能为空");
  return values;
}

function normalizeReason(input: unknown, required: boolean) {
  if (input === undefined || input === null) {
    if (required) throw new ChangeError(422, "请填写申请理由");
    return null;
  }
  if (typeof input !== "string") throw new ChangeError(422, "理由必须是字符串");
  const reason = input.trim();
  if (required && !reason) throw new ChangeError(422, "请填写申请理由");
  if (reason.length > 200) throw new ChangeError(422, "理由不能超过 200 字");
  return reason || null;
}

function normalizeEvidence(input: unknown) {
  if (input === undefined || input === null) return { evidenceFileName: null, evidenceFileUrl: null };
  if (!isRecord(input)) throw new ChangeError(422, "佐证信息格式不正确");
  const fileName = input.fileName === undefined || input.fileName === null ? "" : input.fileName;
  const fileUrl = input.fileUrl === undefined || input.fileUrl === null ? "" : input.fileUrl;
  if (typeof fileName !== "string" || typeof fileUrl !== "string") throw new ChangeError(422, "佐证文件名和链接必须是字符串");
  const evidenceFileName = fileName.trim();
  const evidenceFileUrl = fileUrl.trim();
  if (evidenceFileName.length > 255 || evidenceFileUrl.length > 1000) throw new ChangeError(422, "佐证文件名或链接过长");
  if (evidenceFileUrl && !/^(https?:\/\/|\/)/i.test(evidenceFileUrl)) throw new ChangeError(422, "佐证链接仅支持 http(s) 或站内路径");
  return { evidenceFileName: evidenceFileName || null, evidenceFileUrl: evidenceFileUrl || null };
}

function stringRecord(input: unknown) {
  if (!isRecord(input)) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}

function parseDiff(json: string) {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!isRecord(parsed)) return { oldValues: {}, newValues: {} };
    return { oldValues: stringRecord(parsed.oldValues), newValues: stringRecord(parsed.newValues) };
  } catch {
    return { oldValues: {}, newValues: {} };
  }
}

function toView(request: ChangeRequestWithRelations): ChangeRequestView {
  const diff = parseDiff(request.fieldDiffJson);
  return {
    id: request.id,
    projectId: request.projectId,
    projectName: request.project.name,
    applicantName: request.applicant.name,
    type: request.type,
    reason: request.reason,
    evidenceFileName: request.evidenceFileName,
    evidenceFileUrl: request.evidenceFileUrl,
    status: request.status,
    collegeReason: request.collegeReason,
    schoolReason: request.schoolReason,
    cooldownUntil: request.cooldownUntil?.toISOString() ?? null,
    oldValues: diff.oldValues,
    newValues: diff.newValues,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

async function findChangeProject(db: Db, projectId: string) {
  return db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: {
      teamMembers: {
        select: { id: true, userId: true, role: true, name: true, personNo: true, phone: true, email: true, major: true, trainingUnit: true, isPayee: true },
        orderBy: { sortOrder: "asc" },
      },
      teachers: { select: { id: true, staffNo: true, name: true, unit: true, title: true, phone: true, email: true }, orderBy: { createdAt: "asc" } },
      competition: { select: { timeWindows: { select: { stage: true, endAt: true, enabled: true } } } },
    },
  });
}

type ChangeProject = NonNullable<Awaited<ReturnType<typeof findChangeProject>>>;

function canRequestChange(project: ChangeProject, userId: string) {
  return project.ownerId === userId || project.teamMembers.some((member) => member.userId === userId && REVIEWER_ROLES.has(member.role));
}

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function currentValues(project: ChangeProject, type: ChangeType, values: Record<string, string>) {
  const definition = CHANGE_WHITELIST[type];
  let target: Record<string, unknown> = project as unknown as Record<string, unknown>;
  if (type === "MEMBER" || type === "CONTACT") {
    const member = project.teamMembers.find((item) => item.id === values.memberId);
    if (!member) throw new ChangeError(422, "所选成员不属于该项目");
    target = member as unknown as Record<string, unknown>;
  } else if (type === "TEACHER") {
    const teacher = project.teachers.find((item) => item.id === values.teacherId);
    if (!teacher) throw new ChangeError(422, "所选指导教师不属于该项目");
    target = teacher as unknown as Record<string, unknown>;
  }
  if (type === "LEADER") return { memberId: project.teamMembers.find((member) => member.role === "LEADER")?.id ?? "" };
  if (type === "PAYEE") return { memberId: project.payeeMemberId ?? "" };
  const result: Record<string, string> = {};
  for (const field of Object.keys(values)) result[field] = text(target[definition.fields[field as keyof typeof definition.fields]]);
  return result;
}

function changedFields(type: ChangeType, values: Record<string, string>) {
  const selector = CHANGE_WHITELIST[type].selector;
  return Object.keys(values).filter((field) => field !== selector || type === "LEADER" || type === "PAYEE");
}

function buildDiff(project: ChangeProject, type: ChangeType, values: Record<string, string>) {
  const current = currentValues(project, type, values);
  const oldValues: Record<string, string> = {};
  const newValues: Record<string, string> = {};
  const selector = CHANGE_WHITELIST[type].selector;
  if (selector) {
    oldValues[selector] = current[selector] ?? "";
    newValues[selector] = values[selector];
  }
  for (const field of changedFields(type, values)) {
    if ((current[field] ?? "") !== values[field]) {
      oldValues[field] = current[field] ?? "";
      newValues[field] = values[field];
    }
  }
  if (changedFields(type, newValues).length === 0) throw new ChangeError(422, "未检测到实际变更");
  return { oldValues, newValues };
}

function fieldKeys(type: ChangeType, values: Record<string, string>) {
  return changedFields(type, values).map((field) => {
    if (type === "MEMBER" || type === "CONTACT") return `member:${values.memberId}:${field}`;
    if (type === "TEACHER") return `teacher:${values.teacherId}:${field}`;
    if (type === "LEADER") return "project:leader";
    if (type === "PAYEE") return "project:payee";
    return `project:${field}`;
  });
}

async function assertNotCoolingDown(db: Db, projectId: string, type: ChangeType, values: Record<string, string>) {
  const requests = await db.changeRequest.findMany({
    where: { projectId, cooldownUntil: { gt: new Date() } },
    select: { type: true, fieldDiffJson: true, cooldownUntil: true },
  });
  const requestedFields = new Set(fieldKeys(type, values));
  for (const request of requests) {
    if (!isChangeType(request.type) || !request.cooldownUntil) continue;
    const existingFields = fieldKeys(request.type, parseDiff(request.fieldDiffJson).newValues);
    if (existingFields.some((field) => requestedFields.has(field))) {
      const cooldownUntil = request.cooldownUntil.toISOString();
      throw new ChangeError(422, `相同字段仍在冷却期，可再次提交时间：${cooldownUntil}`, { cooldownUntil });
    }
  }
}

async function assertValidTrack(db: Db, project: ChangeProject, trackId: string) {
  if (!project.competitionId) throw new ChangeError(422, "项目未关联赛事，不能修改赛道");
  const track = await db.track.findFirst({ where: { id: trackId, competitionId: project.competitionId, enabled: true }, select: { id: true } });
  if (!track) throw new ChangeError(422, "所选赛道不存在、未启用或不属于当前赛事");
}

export async function createChangeRequest(input: {
  projectId: unknown;
  type: unknown;
  newValues: unknown;
  reason: unknown;
  evidence?: unknown;
  actorId: string;
}) {
  if (typeof input.projectId !== "string" || !input.projectId.trim()) throw new ChangeError(422, "项目 ID 不能为空");
  const projectId = input.projectId.trim();
  const type = parseType(input.type);
  const values = normalizeValues(type, input.newValues);
  const reason = normalizeReason(input.reason, true);
  if (!reason) throw new ChangeError(422, "请填写申请理由");
  const evidence = normalizeEvidence(input.evidence);

  return prisma.$transaction(async (transaction) => {
    const project = await findChangeProject(transaction, projectId);
    if (!project) throw new ChangeError(404, "项目不存在");
    if (!canRequestChange(project, input.actorId)) throw new ChangeError(403, "仅项目负责人、第二负责人或第三负责人可发起变更");
    const diff = buildDiff(project, type, values);
    if (diff.newValues.trackId) await assertValidTrack(transaction, project, diff.newValues.trackId);
    await assertNotCoolingDown(transaction, projectId, type, diff.newValues);
    const request = await transaction.changeRequest.create({
      data: {
        projectId,
        applicantId: input.actorId,
        type,
        fieldDiffJson: JSON.stringify(diff),
        reason,
        ...evidence,
        status: "PENDING_COLLEGE",
      },
    });
    return { requestId: request.id, status: request.status };
  });
}

function positiveInteger(value: string | null, fallback: number, maximum?: number) {
  if (!value) return fallback;
  if (!/^\d+$/.test(value)) throw new ChangeError(422, "分页参数不正确");
  const parsed = Number(value);
  if (parsed < 1 || (maximum !== undefined && parsed > maximum)) throw new ChangeError(422, "分页参数不正确");
  return parsed;
}

export function parseChangeListQuery(params: URLSearchParams) {
  const status = params.get("status");
  if (status && !Object.values(ChangeRequestStatus).includes(status as ChangeRequestStatus)) throw new ChangeError(422, "变更申请状态不正确");
  const projectId = params.get("projectId")?.trim() || undefined;
  return {
    status: status ? status as ChangeRequestStatus : undefined,
    projectId,
    page: positiveInteger(params.get("page"), 1),
    pageSize: positiveInteger(params.get("pageSize"), 10, 50),
  };
}

export async function listChangeRequests(
  user: { id: string; role: Role },
  query: ReturnType<typeof parseChangeListQuery>,
): Promise<ChangeListResult> {
  if (user.role !== "ADMIN" && user.role !== "STUDENT") throw new ChangeError(403, "无权限查看变更申请");
  const where: Prisma.ChangeRequestWhereInput = {
    ...(user.role === "STUDENT" ? { applicantId: user.id } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.projectId ? { projectId: query.projectId } : {}),
  };
  const [total, requests] = await Promise.all([
    prisma.changeRequest.count({ where }),
    prisma.changeRequest.findMany({
      where,
      include: { project: { select: { name: true } }, applicant: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return { list: requests.map(toView), total, page: query.page, pageSize: query.pageSize };
}

export async function getChangeRequestPanel(projectId: string, userId: string): Promise<ChangePanelData | null> {
  const project = await findChangeProject(prisma, projectId);
  if (!project) return null;
  const canView = project.ownerId === userId || project.teamMembers.some((member) => member.userId === userId);
  if (!canView) return null;
  const [tracks, requests] = await Promise.all([
    project.competitionId
      ? prisma.track.findMany({ where: { competitionId: project.competitionId, enabled: true }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } })
      : Promise.resolve([]),
    prisma.changeRequest.findMany({
      where: { projectId },
      include: { project: { select: { name: true } }, applicant: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  return {
    canRequest: canRequestChange(project, userId),
    members: project.teamMembers.map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      personNo: member.personNo ?? "",
      phone: member.phone ?? "",
      email: member.email ?? "",
      major: member.major,
      trainingUnit: member.trainingUnit,
      hasUser: Boolean(member.userId),
    })),
    teachers: project.teachers.map((teacher) => ({
      id: teacher.id,
      staffNo: teacher.staffNo ?? "",
      name: teacher.name,
      unit: teacher.unit,
      title: teacher.title ?? "",
      phone: teacher.phone ?? "",
      email: teacher.email ?? "",
    })),
    tracks,
    current: {
      name: project.name,
      trackId: project.trackId ?? "",
      groupName: project.groupName ?? "",
      categoryName: project.categoryName ?? "",
      leaderMemberId: project.teamMembers.find((member) => member.role === "LEADER")?.id ?? "",
      payeeMemberId: project.payeeMemberId ?? "",
    },
    requests: requests.map(toView),
  };
}

async function writeChangeLogs(
  db: Db,
  projectId: string,
  requestId: string,
  type: ChangeType,
  oldValues: Record<string, string>,
  newValues: Record<string, string>,
  actorId: string,
) {
  for (const field of changedFields(type, newValues)) {
    const logField = type === "LEADER" ? "ownerId" : type === "PAYEE" ? "payeeMemberId" : field;
    await db.changeLog.create({
      data: {
        projectId,
        requestId,
        field: logField,
        oldValue: oldValues[field] ?? null,
        newValue: newValues[field] ?? null,
        changedBy: actorId,
        source: "CHANGE_REQUEST",
      },
    });
  }
}

async function applyChange(
  db: Db,
  project: ChangeProject,
  requestId: string,
  type: ChangeType,
  values: Record<string, string>,
  actorId: string,
) {
  const oldValues = currentValues(project, type, values);
  if (type === "PROJECT_NAME") {
    await db.project.update({ where: { id: project.id }, data: { name: values.name } });
  } else if (type === "TRACK") {
    if (values.trackId !== undefined) await assertValidTrack(db, project, values.trackId);
    const data: Prisma.ProjectUncheckedUpdateInput = {};
    if (values.trackId !== undefined) data.trackId = values.trackId;
    if (values.groupName !== undefined) data.groupName = values.groupName || null;
    if (values.categoryName !== undefined) data.categoryName = values.categoryName || null;
    await db.project.update({ where: { id: project.id }, data });
  } else if (type === "MEMBER" || type === "CONTACT") {
    const data: Prisma.TeamMemberUpdateManyMutationInput = {};
    if (type === "MEMBER") {
      if (values.name !== undefined) data.name = values.name;
      if (values.personNo !== undefined) data.personNo = values.personNo || null;
      if (values.major !== undefined) data.major = values.major;
      if (values.trainingUnit !== undefined) data.trainingUnit = values.trainingUnit;
    }
    if (values.phone !== undefined) data.phone = values.phone || null;
    if (values.email !== undefined) data.email = values.email || null;
    const updated = await db.teamMember.updateMany({ where: { id: values.memberId, projectId: project.id }, data });
    if (updated.count !== 1) throw new ChangeError(422, "所选成员不属于该项目");
  } else if (type === "TEACHER") {
    const data: Prisma.TeacherUpdateManyMutationInput = {};
    if (values.staffNo !== undefined) data.staffNo = values.staffNo || null;
    if (values.name !== undefined) data.name = values.name;
    if (values.unit !== undefined) data.unit = values.unit;
    if (values.title !== undefined) data.title = values.title || null;
    if (values.phone !== undefined) data.phone = values.phone || null;
    if (values.email !== undefined) data.email = values.email || null;
    const updated = await db.teacher.updateMany({ where: { id: values.teacherId, projectId: project.id }, data });
    if (updated.count !== 1) throw new ChangeError(422, "所选指导教师不属于该项目");
  } else if (type === "LEADER") {
    const target = project.teamMembers.find((member) => member.id === values.memberId);
    if (!target) throw new ChangeError(422, "所选负责人不属于该项目");
    if (!target.userId) throw new ChangeError(422, "所选负责人尚未关联平台账号");
    const currentLeader = project.teamMembers.find((member) => member.role === "LEADER");
    if (currentLeader && currentLeader.id !== target.id) {
      await db.teamMember.update({ where: { id: currentLeader.id }, data: { role: target.role === "LEADER" ? "MEMBER" : target.role } });
      await db.teamMember.update({ where: { id: target.id }, data: { role: "LEADER" } });
    }
    await db.project.update({ where: { id: project.id }, data: { ownerId: target.userId } });
  } else if (type === "PAYEE") {
    const target = project.teamMembers.find((member) => member.id === values.memberId);
    if (!target) throw new ChangeError(422, "所选领款人不属于该项目");
    await db.teamMember.updateMany({ where: { projectId: project.id, isPayee: true }, data: { isPayee: false } });
    await db.teamMember.update({ where: { id: target.id }, data: { isPayee: true } });
    await db.project.update({ where: { id: project.id }, data: { payeeMemberId: target.id } });
  } else {
    throw new ChangeError(422, "不支持的变更类型");
  }
  await writeChangeLogs(db, project.id, requestId, type, oldValues, values, actorId);
}

export async function reviewChangeRequest(input: { requestId: unknown; action: unknown; reason?: unknown; actorId: string }) {
  if (typeof input.requestId !== "string" || !input.requestId.trim()) throw new ChangeError(422, "申请 ID 不能为空");
  const requestId = input.requestId.trim();
  if (input.action !== "approve" && input.action !== "reject") throw new ChangeError(422, "审批动作仅支持 approve 或 reject");
  const action = input.action;
  const reason = normalizeReason(input.reason, action === "reject");
  if (action === "reject" && !reason) throw new ChangeError(422, "请填写驳回理由");

  return prisma.$transaction(async (transaction) => {
    const request = await transaction.changeRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new ChangeError(404, "变更申请不存在");
    if (request.status !== "PENDING_COLLEGE" && request.status !== "PENDING_SCHOOL") throw new ChangeError(422, "该申请已完成审批，请刷新后重试");
    const type = parseType(request.type);
    if (request.status === "PENDING_SCHOOL" && !SENSITIVE_TYPES.has(type)) throw new ChangeError(422, "常规变更无需校级审批");
    const values = normalizeValues(type, parseDiff(request.fieldDiffJson).newValues);
    const project = await findChangeProject(transaction, request.projectId);
    if (!project) throw new ChangeError(404, "项目不存在");
    const now = new Date();
    const level = request.status === "PENDING_COLLEGE" ? "COLLEGE" : "SCHOOL";
    let status: ChangeRequestStatus;
    let cooldownUntil: Date | null = null;

    if (action === "approve") {
      await applyChange(transaction, project, request.id, type, values, input.actorId);
      status = level === "COLLEGE" && SENSITIVE_TYPES.has(type) ? "PENDING_SCHOOL" : "APPROVED";
    } else {
      status = "REJECTED";
      const deadline = project.competition?.timeWindows
        .filter((window) => window.enabled && window.stage === project.stage)
        .sort((left, right) => right.endAt.getTime() - left.endAt.getTime())[0]?.endAt;
      cooldownUntil = deadline && deadline.getTime() - now.getTime() < 3 * DAY ? now : new Date(now.getTime() + 7 * DAY);
    }

    const data: Prisma.ChangeRequestUncheckedUpdateManyInput = { status, cooldownUntil };
    if (level === "COLLEGE") {
      data.collegeReviewerId = input.actorId;
      data.collegeReviewedAt = now;
      data.collegeReason = reason;
    } else {
      data.schoolReviewerId = input.actorId;
      data.schoolReviewedAt = now;
      data.schoolReason = reason;
    }
    const updated = await transaction.changeRequest.updateMany({ where: { id: request.id, status: request.status }, data });
    if (updated.count !== 1) throw new ChangeError(422, "申请状态已变化，请刷新后重试");
    return { requestId: request.id, status };
  });
}
