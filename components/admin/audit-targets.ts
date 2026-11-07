import { prisma } from "@/lib/prisma";

/**
 * 审计日志的「操作对象」只存了类型和内部编号，直接显示等于什么也没说。
 * 这里按类型把当前页涉及的对象批量查一次名字，避免 N+1。
 *
 * 内部编号仍然保留 —— 排查问题、对数据库、跟后端对数时都要用到，
 * 只是降到第二行的小字，等宽字体、可选中复制。
 */
export type AuditTargetInfo = {
  label: string;
  name?: string;
  note?: string;
};

const TYPE_LABEL: Record<string, string> = {
  User: "用户",
  Project: "项目",
  Competition: "赛事",
  Track: "赛道",
  CompetitionAttachment: "赛事文件",
  ImportBatch: "导入批次",
  Award: "奖项",
  Anomaly: "异常",
  TimeWindow: "时间窗",
  Teacher: "指导老师",
  SealedFile: "盖章件",
  MaterialCheck: "材料检查",
  Assistant: "AI 助手",
};

function idsOf(rows: Array<{ targetType: string; targetId: string }>, type: string) {
  return [...new Set(rows.filter((row) => row.targetType === type).map((row) => row.targetId))];
}

export async function resolveAuditTargets(rows: Array<{ targetType: string; targetId: string }>) {
  const map = new Map<string, AuditTargetInfo>();
  const put = (type: string, id: string, info: AuditTargetInfo) => map.set(`${type}:${id}`, info);

  const userIds = idsOf(rows, "User");
  const projectIds = idsOf(rows, "Project");
  const competitionIds = idsOf(rows, "Competition");
  const trackIds = idsOf(rows, "Track");
  const teacherIds = idsOf(rows, "Teacher");
  const attachmentIds = idsOf(rows, "CompetitionAttachment");

  const [users, projects, competitions, tracks, teachers, attachments] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, phone: true, role: true } })
      : Promise.resolve([]),
    projectIds.length
      ? prisma.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, name: true, college: true, competition: { select: { name: true } } },
        })
      : Promise.resolve([]),
    competitionIds.length
      ? prisma.competition.findMany({ where: { id: { in: competitionIds } }, select: { id: true, name: true, year: true } })
      : Promise.resolve([]),
    trackIds.length
      ? prisma.track.findMany({
          where: { id: { in: trackIds } },
          select: { id: true, name: true, competition: { select: { name: true } } },
        })
      : Promise.resolve([]),
    teacherIds.length
      ? prisma.teacher.findMany({ where: { id: { in: teacherIds } }, select: { id: true, name: true, unit: true } })
      : Promise.resolve([]),
    attachmentIds.length
      ? prisma.competitionAttachment.findMany({
          where: { id: { in: attachmentIds } },
          select: { id: true, title: true, fileName: true },
        })
      : Promise.resolve([]),
  ]);

  for (const user of users) {
    put("User", user.id, { label: TYPE_LABEL.User, name: user.name, note: user.phone });
  }
  for (const project of projects) {
    put("Project", project.id, {
      label: TYPE_LABEL.Project,
      name: project.name,
      note: [project.competition?.name, project.college].filter(Boolean).join(" · ") || undefined,
    });
  }
  for (const competition of competitions) {
    put("Competition", competition.id, { label: TYPE_LABEL.Competition, name: competition.name, note: `${competition.year} 年` });
  }
  for (const track of tracks) {
    put("Track", track.id, { label: TYPE_LABEL.Track, name: track.name, note: track.competition?.name });
  }
  for (const teacher of teachers) {
    put("Teacher", teacher.id, { label: TYPE_LABEL.Teacher, name: teacher.name, note: teacher.unit });
  }
  for (const attachment of attachments) {
    put("CompetitionAttachment", attachment.id, {
      label: TYPE_LABEL.CompetitionAttachment,
      name: attachment.title,
      note: attachment.fileName,
    });
  }

  return { typeLabel: (type: string) => TYPE_LABEL[type] ?? type, lookup: (type: string, id: string) => map.get(`${type}:${id}`) };
}
