import type { Role } from "@prisma/client";
import { apiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export class TeacherError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "TeacherError";
  }
}

type Actor = { id: string; role: Role; name: string };

/** 老师可见的"我指导的项目"：优先按 userId 命中，其次按工号命中 */
export async function listTeacherProjects(actor: Actor) {
  if (actor.role !== "TEACHER") throw new TeacherError(403, "仅指导教师可访问");
  const me = await prisma.user.findFirst({
    where: { id: actor.id, deletedAt: null },
    select: { staffNo: true, name: true },
  });
  if (!me) throw new TeacherError(401, "账号不可用");

  const or: Array<Record<string, unknown>> = [{ userId: actor.id }];
  if (me.staffNo) or.push({ staffNo: me.staffNo });
  or.push({ staffNo: null, name: me.name });

  const rows = await prisma.teacher.findMany({
    where: { OR: or, project: { deletedAt: null } },
    select: {
      id: true,
      name: true,
      staffNo: true,
      unit: true,
      title: true,
      confirmStatus: true,
      confirmedAt: true,
      project: {
        select: {
          id: true,
          name: true,
          college: true,
          stage: true,
          status: true,
          competition: { select: { name: true } },
          track: { select: { name: true } },
          teamMembers: { select: { id: true } },
        },
      },
    },
    orderBy: [{ confirmStatus: "asc" }, { createdAt: "desc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    confirmStatus: row.confirmStatus,
    confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : null,
    projectId: row.project.id,
    projectName: row.project.name,
    college: row.project.college,
    stage: row.project.stage,
    status: row.project.status,
    competitionName: row.project.competition?.name ?? "未设置赛事",
    trackName: row.project.track?.name ?? "未设置赛道",
    memberCount: row.project.teamMembers.length,
  }));
}

export async function confirmTeacher(input: {
  teacherId: unknown;
  action: unknown;
  reason: unknown;
  actor: Actor;
}) {
  if (input.actor.role !== "TEACHER") throw new TeacherError(403, "仅指导教师可操作");
  const teacherId = typeof input.teacherId === "string" ? input.teacherId.trim() : "";
  if (!teacherId) throw new TeacherError(422, "缺少指导记录标识");
  if (input.action !== "confirm" && input.action !== "reject") throw new TeacherError(422, "操作类型不正确");
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (input.action === "reject" && reason.length === 0) throw new TeacherError(422, "请填写拒绝理由");
  if (reason.length > 200) throw new TeacherError(422, "理由不超过 200 字");

  const me = await prisma.user.findFirst({
    where: { id: input.actor.id, deletedAt: null },
    select: { staffNo: true, name: true },
  });
  if (!me) throw new TeacherError(401, "账号不可用");

  const teacher = await prisma.teacher.findFirst({
    where: {
      id: teacherId,
      OR: [
        { userId: input.actor.id },
        ...(me.staffNo ? [{ staffNo: me.staffNo }] : []),
        { staffNo: null, name: me.name },
      ],
    },
    select: { id: true, projectId: true, confirmStatus: true },
  });
  if (!teacher) throw new TeacherError(404, "指导记录不存在或无权操作");

  const now = new Date();
  const nextStatus = input.action === "confirm" ? "CONFIRMED" : "REJECTED";
  const updated = await prisma.teacher.updateMany({
    where: { id: teacher.id, confirmStatus: teacher.confirmStatus },
    data: { confirmStatus: nextStatus, confirmedAt: now },
  });
  if (updated.count !== 1) throw new TeacherError(409, "状态已变化，请刷新后重试");

  await writeAuditLog({
    actorId: input.actor.id,
    action: input.action === "confirm" ? "TEACHER_CONFIRMED" : "TEACHER_REJECTED",
    targetType: "Teacher",
    targetId: teacher.id,
    detail: { projectId: teacher.projectId, reason },
  });

  return { teacherId: teacher.id, confirmStatus: nextStatus };
}

export function teacherErrorResponse(error: unknown) {
  if (error instanceof TeacherError) return apiError(error.status, error.message);
  console.error("教师操作失败：", error instanceof Error ? error.message : error);
  return apiError(500, "操作失败，请稍后重试");
}
