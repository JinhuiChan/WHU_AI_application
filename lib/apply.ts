import { Prisma } from "@prisma/client";
import type { MemberInput, PayeeInput, ProjectFormInput, TeacherInput } from "@/types/apply";
import { decryptField, encryptField, maskTail } from "@/lib/crypto";
import { getLabelMap } from "@/lib/dict";
import { prisma } from "@/lib/prisma";

export class ApplyError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApplyError";
  }
}

type Transaction = Prisma.TransactionClient;
type PayeeBankRecord = {
  boundFinancePlatform: boolean;
  organization: string | null;
  phone: string | null;
  idCardEncrypted: string | null;
  bankCardEncrypted: string | null;
  bankName: string | null;
  accountName: string | null;
};

const accessWhere = (userId: string) => ({
  deletedAt: null,
  OR: [{ ownerId: userId }, { teamMembers: { some: { userId } } }],
});

function nullable(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null;
}

function emptyPayee(): PayeeInput {
  return { boundFinancePlatform: false, organization: "", phone: "", idCard: "", bankCard: "", bankName: "", accountName: "" };
}

async function accessibleProject(transaction: Transaction, projectId: string, userId: string) {
  const project = await transaction.project.findFirst({
    where: { id: projectId, ...accessWhere(userId) },
    select: { id: true, ownerId: true, status: true, reviewStatus: true },
  });
  if (!project) throw new ApplyError(404, "项目不存在或无权访问");
  return project;
}

function validatePayee(payee: PayeeInput | undefined, owner: string) {
  if (!payee) throw new ApplyError(422, `请完善${owner}的领款信息`);
  if (payee.boundFinancePlatform) return;
  const values = [payee.organization, payee.phone, payee.idCard, payee.bankCard, payee.bankName, payee.accountName];
  if (values.some((value) => typeof value !== "string" || !value.trim())) {
    throw new ApplyError(422, `未绑定财务平台时，${owner}的银行信息必须完整`);
  }
}

function validateSubmission(input: ProjectFormInput, track: { kind: string; name: string }) {
  if (!Array.isArray(input.members) || !Array.isArray(input.teachers)) throw new ApplyError(422, "成员或老师数据格式不正确");
  if (input.members.length > 14) throw new ApplyError(422, "团队成员不能超过 14 名");
  if (input.teachers.length > 8) throw new ApplyError(422, "指导老师不能超过 8 名");
  const required: Array<[unknown, string]> = [
    [input.competitionId, "请选择赛事"],
    [input.trackId, "请选择项目赛道"],
    [input.groupName, "请选择项目组别"],
    [input.categoryName, "请选择项目类别"],
    [input.name, "请填写项目名称"],
    [input.leaderStudentNo, "负责人学号缺失"],
    [input.leaderName, "负责人姓名缺失"],
    [input.grade, "请填写年级"],
    [input.gender, "请选择性别"],
    [input.educationStage, "请选择培养阶段"],
    [input.trainingUnit, "请选择培养单位"],
    [input.applicationUnit, "请选择申报单位"],
    [input.ethnicity, "请选择民族"],
    [input.major, "请填写专业"],
    [input.phone, "请填写申报者手机号"],
    [input.email, "请填写申报者邮箱"],
    [input.work?.form, "请选择作品形式"],
    [input.work?.category, "请选择作品类别"],
    [input.work?.groupName, "请选择作品组别"],
  ];
  for (const [value, message] of required) {
    if (typeof value !== "string" || !value.trim()) throw new ApplyError(422, message);
  }
  if (!Number.isInteger(input.enrollmentYear) || !Number.isInteger(input.graduationYear)) throw new ApplyError(422, "入学和毕业年份须为整数");
  if (input.enrollmentYear < 2000 || input.enrollmentYear > 2100 || input.graduationYear < input.enrollmentYear) {
    throw new ApplyError(422, "请检查入学和毕业年份");
  }
  if (!/^1\d{10}$/.test(input.phone)) throw new ApplyError(422, "申报者手机号格式不正确");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new ApplyError(422, "申报者邮箱格式不正确");
  if (`${track.kind}${track.name}`.includes("企业命题")) {
    if (!input.propositionName?.trim() || !input.propositionCompany?.trim()) throw new ApplyError(422, "企业命题赛道须填写命题名称和命题企业");
  }
  if (!input.work?.fileName?.trim() && !input.work?.externalUrl?.trim()) throw new ApplyError(422, "请选择作品文件或填写作品外链");
  const payeeCount = Number(input.isPayee) + input.members.filter((member) => member.isPayee).length;
  if (payeeCount !== 1) throw new ApplyError(422, "全队必须且只能有一名奖金领款人");
  if (input.isPayee) validatePayee(input.payee, "负责人");
  input.members.forEach((member, index) => {
    if (member.isPayee) validatePayee(member.payee, `成员 ${index + 1}`);
    const memberRequired = [member.name, member.school, member.educationStage, member.trainingUnit, member.major, member.gender, member.ethnicity, member.phone];
    if (memberRequired.some((value) => typeof value !== "string" || !value.trim())) throw new ApplyError(422, `请完善成员 ${index + 1} 的信息`);
    if (member.isInternal && !member.personNo?.trim()) throw new ApplyError(422, `成员 ${index + 1} 缺少学号`);
    if (!Number.isInteger(member.enrollmentYear) || !Number.isInteger(member.graduationYear) || member.graduationYear < member.enrollmentYear) {
      throw new ApplyError(422, `成员 ${index + 1} 的年份不正确`);
    }
  });
  input.teachers.forEach((teacher, index) => {
    if ([teacher.name, teacher.phone, teacher.school, teacher.unit, teacher.title].some((value) => typeof value !== "string" || !value.trim())) {
      throw new ApplyError(422, `请完善指导老师 ${index + 1} 的信息`);
    }
    if (teacher.isInternal && !teacher.staffNo?.trim()) throw new ApplyError(422, `校内指导老师 ${index + 1} 缺少工号`);
  });
}

async function saveDraft(transaction: Transaction, userId: string, input: ProjectFormInput, projectId?: string) {
  if (!input.competitionId?.trim() || !input.trackId?.trim()) throw new ApplyError(422, "保存草稿前请选择赛事与项目赛道");
  if (!Array.isArray(input.members) || !Array.isArray(input.teachers)) throw new ApplyError(422, "成员或老师数据格式不正确");
  if (input.members.length > 14 || input.teachers.length > 8) throw new ApplyError(422, "成员或老师人数超过上限");
  const [track, existing] = await Promise.all([
    transaction.track.findFirst({
      where: { id: input.trackId, competitionId: input.competitionId, enabled: true },
      select: { id: true, competition: { select: { year: true } } },
    }),
    projectId ? accessibleProject(transaction, projectId, userId) : Promise.resolve(null),
  ]);
  if (!track) throw new ApplyError(422, "赛事与赛道不匹配");

  const scalar = {
    name: input.name?.trim() || "未命名项目",
    college: input.applicationUnit?.trim() || input.trainingUnit?.trim() || "",
    year: track.competition.year,
    competitionId: input.competitionId,
    trackId: input.trackId,
    applicationUnit: input.applicationUnit?.trim() || "",
    trainingUnit: input.trainingUnit?.trim() || "",
    groupName: nullable(input.groupName),
    categoryName: nullable(input.categoryName),
    batchName: nullable(input.batchName),
    propositionName: nullable(input.propositionName),
    propositionCompany: nullable(input.propositionCompany),
    remark: nullable(input.remark),
    status: "DRAFT" as const,
    reviewStatus: "DRAFT" as const,
  };
  const project = existing
    ? await transaction.project.update({ where: { id: existing.id }, data: { ...scalar, payeeMemberId: null } })
    : await transaction.project.create({ data: { ...scalar, ownerId: userId, stage: "SCHOOL" } });

  if (existing) {
    await transaction.payeeBank.deleteMany({ where: { member: { projectId: project.id } } });
    await transaction.teacher.deleteMany({ where: { projectId: project.id } });
    await transaction.teamMember.deleteMany({ where: { projectId: project.id } });
    await transaction.work.deleteMany({ where: { projectId: project.id } });
  }

  const personNos = [...new Set(input.members.map((member) => member.personNo).filter((value): value is string => Boolean(value)))];
  const staffNos = [...new Set(input.teachers.map((teacher) => teacher.staffNo).filter((value): value is string => Boolean(value)))];
  const [students, teacherUsers] = await Promise.all([
    transaction.user.findMany({ where: { studentNo: { in: personNos }, role: "STUDENT", deletedAt: null }, select: { id: true, studentNo: true } }),
    transaction.user.findMany({ where: { staffNo: { in: staffNos }, role: "TEACHER", deletedAt: null }, select: { id: true, staffNo: true } }),
  ]);
  const studentIds = new Map(students.map((student) => [student.studentNo, student.id]));
  const teacherIds = new Map(teacherUsers.map((teacher) => [teacher.staffNo, teacher.id]));

  async function createBank(memberId: string, payee: PayeeInput | undefined) {
    if (!payee) return;
    if (payee.boundFinancePlatform) {
      await transaction.payeeBank.create({ data: { memberId, boundFinancePlatform: true } });
      return;
    }
    await transaction.payeeBank.create({
      data: {
        memberId,
        boundFinancePlatform: false,
        organization: nullable(payee.organization),
        phone: nullable(payee.phone),
        idCardEncrypted: payee.idCard?.trim() ? encryptField(payee.idCard.trim()) : null,
        bankCardEncrypted: payee.bankCard?.trim() ? encryptField(payee.bankCard.trim()) : null,
        bankName: nullable(payee.bankName),
        accountName: nullable(payee.accountName),
      },
    });
  }

  const leader = await transaction.teamMember.create({
    data: {
      projectId: project.id,
      userId: existing?.ownerId ?? userId,
      personNo: nullable(input.leaderStudentNo),
      name: input.leaderName?.trim() || "未填写负责人",
      role: "LEADER",
      school: "武汉大学",
      educationStage: input.educationStage?.trim() || "",
      trainingUnit: input.trainingUnit?.trim() || "",
      major: input.major?.trim() || "",
      gender: input.gender?.trim() || "",
      ethnicity: input.ethnicity?.trim() || "",
      enrollmentYear: input.enrollmentYear || null,
      graduationYear: input.graduationYear || null,
      phone: nullable(input.phone),
      email: nullable(input.email),
      remark: nullable(input.remark),
      sortOrder: 0,
      isPayee: Boolean(input.isPayee),
    },
  });
  await createBank(leader.id, input.payee);
  let payeeMemberId = input.isPayee ? leader.id : null;

  for (const [index, member] of input.members.entries()) {
    const created = await transaction.teamMember.create({
      data: {
        projectId: project.id,
        userId: member.personNo ? studentIds.get(member.personNo) ?? null : null,
        personNo: nullable(member.personNo),
        name: member.name?.trim() || "未填写成员",
        role: "MEMBER",
        backupOrder: member.backupOrder ?? null,
        isInternal: Boolean(member.isInternal),
        school: member.school?.trim() || "",
        educationStage: member.educationStage?.trim() || "",
        trainingUnit: member.trainingUnit?.trim() || "",
        major: member.major?.trim() || "",
        gender: member.gender?.trim() || "",
        ethnicity: member.ethnicity?.trim() || "",
        enrollmentYear: member.enrollmentYear || null,
        graduationYear: member.graduationYear || null,
        phone: nullable(member.phone),
        email: nullable(member.email),
        remark: nullable(member.remark),
        sortOrder: index,
        isPayee: Boolean(member.isPayee),
      },
    });
    await createBank(created.id, member.payee);
    if (member.isPayee) payeeMemberId = created.id;
  }
  for (const teacher of input.teachers) {
    await transaction.teacher.create({
      data: {
        projectId: project.id,
        userId: teacher.staffNo ? teacherIds.get(teacher.staffNo) ?? null : null,
        isInternal: Boolean(teacher.isInternal),
        staffNo: nullable(teacher.staffNo),
        name: teacher.name?.trim() || "未填写老师",
        gender: nullable(teacher.gender),
        phone: nullable(teacher.phone),
        school: teacher.school?.trim() || "武汉大学",
        unit: teacher.unit?.trim() || "",
        title: nullable(teacher.title),
        email: nullable(teacher.email),
      },
    });
  }
  await transaction.work.create({
    data: {
      projectId: project.id,
      fileName: nullable(input.work?.fileName),
      fileUrl: nullable(input.work?.fileUrl),
      externalUrl: nullable(input.work?.externalUrl),
      form: input.work?.form?.trim() || "",
      category: nullable(input.work?.category),
      groupName: nullable(input.work?.groupName),
      pptFileName: nullable(input.work?.pptFileName),
      pptFileUrl: nullable(input.work?.pptFileUrl),
    },
  });
  await transaction.project.update({ where: { id: project.id }, data: { payeeMemberId } });
  return project.id;
}

export async function createOrUpdateDraft(userId: string, input: ProjectFormInput, projectId?: string) {
  return prisma.$transaction(async (transaction) => ({ projectId: await saveDraft(transaction, userId, input, projectId) }));
}

export async function submitProject(userId: string, input: ProjectFormInput, projectId?: string) {
  return prisma.$transaction(async (transaction) => {
    const track = await transaction.track.findFirst({
      where: { id: input.trackId, competitionId: input.competitionId, enabled: true },
      select: { kind: true, name: true },
    });
    if (!track) throw new ApplyError(422, "赛事与赛道不匹配");
    validateSubmission(input, track);
    const id = await saveDraft(transaction, userId, input, projectId);
    const [previous, submissionCount] = await Promise.all([
      transaction.project.findUniqueOrThrow({ where: { id }, select: { status: true, reviewStatus: true } }),
      transaction.changeLog.count({ where: { projectId: id, field: "SUBMIT" } }),
    ]);
    await transaction.project.update({
      where: { id },
      data: { status: "PENDING", reviewStatus: "PENDING", submittedAt: new Date() },
    });
    await transaction.changeLog.create({
      data: {
        projectId: id,
        field: "SUBMIT",
        oldValue: `${previous.status}/${previous.reviewStatus}`,
        newValue: submissionCount === 0 ? "首次提交" : "重新提交",
        changedBy: userId,
        source: "DIRECT",
      },
    });
    return { projectId: id, submissionCount: submissionCount + 1 };
  });
}

export async function withdrawProject(projectId: string, userId: string) {
  return prisma.$transaction(async (transaction) => {
    const project = await accessibleProject(transaction, projectId, userId);
    await transaction.project.update({ where: { id: project.id }, data: { status: "WITHDRAWN", reviewStatus: "WITHDRAWN" } });
    await transaction.changeLog.create({
      data: {
        projectId: project.id,
        field: "WITHDRAW",
        oldValue: `${project.status}/${project.reviewStatus}`,
        newValue: "撤回报名",
        changedBy: userId,
        source: "DIRECT",
      },
    });
    return { projectId: project.id };
  });
}

export async function getMyProjects(userId: string) {
  const projects = await prisma.project.findMany({
    where: accessWhere(userId),
    select: {
      id: true,
      name: true,
      status: true,
      reviewStatus: true,
      updatedAt: true,
      competition: { select: { name: true } },
      track: { select: { name: true } },
      reviews: { where: { result: "REJECTED" }, orderBy: { createdAt: "desc" }, take: 1, select: { reason: true } },
      _count: { select: { changeLogs: { where: { field: "SUBMIT" } } } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    competitionName: project.competition?.name ?? "未设置赛事",
    trackName: project.track?.name ?? "未设置赛道",
    status: project.status,
    reviewStatus: project.reviewStatus,
    rejectedReason: project.reviews[0]?.reason ?? null,
    updatedAt: project.updatedAt,
    submissionCount: project._count.changeLogs,
  }));
}

function masked(value: string | null) {
  if (!value) return null;
  try {
    return maskTail(decryptField(value));
  } catch {
    return "密文不可用";
  }
}

function bankView(bank: PayeeBankRecord | null) {
  if (!bank) return null;
  return {
    boundFinancePlatform: bank.boundFinancePlatform,
    organization: bank.organization,
    phone: bank.phone,
    bankName: bank.bankName,
    accountName: bank.accountName,
    idCardMasked: masked(bank.idCardEncrypted),
    bankCardMasked: masked(bank.bankCardEncrypted),
  };
}

function bankInput(bank: PayeeBankRecord | null): PayeeInput | undefined {
  if (!bank) return undefined;
  if (bank.boundFinancePlatform) return { boundFinancePlatform: true };
  return {
    boundFinancePlatform: false,
    organization: bank.organization ?? "",
    phone: bank.phone ?? "",
    idCard: "",
    bankCard: "",
    bankName: bank.bankName ?? "",
    accountName: bank.accountName ?? "",
  };
}

export async function getMyProject(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...accessWhere(userId) },
    include: {
      owner: { select: { studentNo: true, grade: true, phone: true, email: true } },
      competition: { select: { name: true, timeWindows: true } },
      track: { select: { name: true, kind: true } },
      teamMembers: { include: { payeeBank: true }, orderBy: { sortOrder: "asc" } },
      teachers: { orderBy: { createdAt: "asc" } },
      work: true,
      reviews: { where: { result: "REJECTED" }, orderBy: { createdAt: "desc" }, take: 1, select: { reason: true } },
      _count: { select: { changeLogs: { where: { field: "SUBMIT" } } } },
    },
  });
  if (!project) return null;
  const [educationStages, ethnicities, workForms, groups, categories] = await Promise.all([
    getLabelMap("EDUCATION_STAGE"),
    getLabelMap("ETHNICITY"),
    getLabelMap("WORK_FORM"),
    getLabelMap("GROUP"),
    getLabelMap("CATEGORY"),
  ]);
  const label = (map: Record<string, string>, value: string | null) => value ? map[value] ?? value : "";
  const leader = project.teamMembers.find((member) => member.role === "LEADER") ?? project.teamMembers[0];
  if (!leader) return null;
  const memberInput = (member: (typeof project.teamMembers)[number]): MemberInput => ({
    id: member.id,
    isInternal: member.isInternal,
    personNo: member.personNo,
    name: member.name,
    school: member.school,
    educationStage: member.educationStage,
    trainingUnit: member.trainingUnit,
    major: member.major,
    gender: member.gender,
    ethnicity: member.ethnicity,
    enrollmentYear: member.enrollmentYear ?? 0,
    graduationYear: member.graduationYear ?? 0,
    phone: member.phone ?? "",
    email: member.email ?? "",
    remark: member.remark ?? "",
    sortOrder: member.sortOrder,
    backupOrder: member.backupOrder === 2 || member.backupOrder === 3 ? member.backupOrder : undefined,
    isPayee: member.isPayee,
    payee: bankInput(member.payeeBank) ?? (member.isPayee ? emptyPayee() : undefined),
  });
  const formInput: ProjectFormInput = {
    competitionId: project.competitionId ?? "",
    trackId: project.trackId ?? "",
    batchName: project.batchName ?? "",
    name: project.name,
    leaderStudentNo: leader.personNo ?? project.owner?.studentNo ?? "",
    leaderName: leader.name,
    grade: project.owner?.grade ?? "",
    gender: leader.gender,
    educationStage: leader.educationStage,
    trainingUnit: project.trainingUnit,
    applicationUnit: project.applicationUnit,
    ethnicity: leader.ethnicity,
    major: leader.major,
    enrollmentYear: leader.enrollmentYear ?? 0,
    graduationYear: leader.graduationYear ?? 0,
    phone: leader.phone ?? project.owner?.phone ?? "",
    email: leader.email ?? project.owner?.email ?? "",
    remark: project.remark ?? "",
    groupName: project.groupName ?? "",
    categoryName: project.categoryName ?? "",
    propositionName: project.propositionName ?? "",
    propositionCompany: project.propositionCompany ?? "",
    isPayee: leader.isPayee,
    payee: bankInput(leader.payeeBank) ?? (leader.isPayee ? emptyPayee() : undefined),
    teachers: project.teachers.map((teacher): TeacherInput => ({
      id: teacher.id,
      isInternal: teacher.isInternal,
      staffNo: teacher.staffNo,
      name: teacher.name,
      gender: teacher.gender ?? "",
      phone: teacher.phone ?? "",
      school: teacher.school,
      unit: teacher.unit,
      title: teacher.title ?? "",
      email: teacher.email ?? "",
    })),
    members: project.teamMembers.filter((member) => member.role !== "LEADER").map(memberInput),
    work: {
      fileName: project.work?.fileName ?? "",
      fileUrl: project.work?.fileUrl ?? "",
      externalUrl: project.work?.externalUrl ?? "",
      form: project.work?.form ?? "",
      category: project.work?.category ?? "",
      groupName: project.work?.groupName ?? "",
      pptFileName: project.work?.pptFileName ?? "",
      pptFileUrl: project.work?.pptFileUrl ?? "",
    },
  };
  const now = new Date();
  const canEdit = project.competition?.timeWindows.some((window) => (
    window.stage === project.stage && window.enabled && window.startAt <= now && window.endAt >= now
  )) ?? false;
  const memberView = (member: (typeof project.teamMembers)[number]) => {
    const { payeeBank, ...rest } = member;
    return {
      ...rest,
      educationStageLabel: label(educationStages, member.educationStage),
      ethnicityLabel: label(ethnicities, member.ethnicity),
      payeeBank: bankView(payeeBank),
    };
  };
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    reviewStatus: project.reviewStatus,
    stage: project.stage,
    competitionName: project.competition?.name ?? "未设置赛事",
    trackName: project.track?.name ?? "未设置赛道",
    groupLabel: label(groups, project.groupName),
    categoryLabel: label(categories, project.categoryName),
    applicationUnit: project.applicationUnit,
    trainingUnit: project.trainingUnit,
    propositionName: project.propositionName,
    propositionCompany: project.propositionCompany,
    rejectedReason: project.reviews[0]?.reason ?? null,
    updatedAt: project.updatedAt,
    submittedAt: project.submittedAt,
    submissionCount: project._count.changeLogs,
    canEdit,
    leader: memberView(leader),
    members: project.teamMembers.filter((member) => member.role !== "LEADER").map(memberView),
    teachers: project.teachers,
    work: project.work ? {
      ...project.work,
      formLabel: label(workForms, project.work.form),
      categoryLabel: label(categories, project.work.category),
      groupLabel: label(groups, project.work.groupName),
    } : null,
    formInput,
  };
}
