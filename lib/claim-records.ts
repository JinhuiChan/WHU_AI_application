import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ClaimClient = Prisma.TransactionClient | PrismaClient;

export type ClaimedRecordSummary = {
  /** 本次新绑定为负责人的项目数 */
  projects: number;
  /** 本次新绑定到当前账号的团队成员记录数 */
  members: number;
  /** 本次新绑定到当前账号的指导老师记录数 */
  teachers: number;
};

export const emptyClaimedRecords: ClaimedRecordSummary = { projects: 0, members: 0, teachers: 0 };

export function hasClaimedRecords(claimed: ClaimedRecordSummary) {
  return claimed.projects + claimed.members + claimed.teachers > 0;
}

/**
 * 把「数据导入」写入的历史报名数据关联到当前账号。
 *
 * 导入中心只按学号/工号保存文本（TeamMember.personNo、Teacher.staffNo），不写 userId；
 * 学生注册或登录时调用本函数，按学号/工号把历史记录补绑到账号上：
 *   - 学生：personNo == studentNo 的团队成员记录 → userId；其作为负责人的项目 ownerId 为空时 → ownerId
 *   - 教师：staffNo == staffNo 的指导老师记录 → userId
 * 只填充空值，不覆盖已有绑定，可重复执行（没有历史数据时是空操作）。
 */
export async function claimHistoricalRecords(
  user: { id: string; studentNo?: string | null; staffNo?: string | null },
  client: ClaimClient = prisma,
): Promise<ClaimedRecordSummary> {
  const claimed: ClaimedRecordSummary = { ...emptyClaimedRecords };

  if (user.studentNo) {
    const memberResult = await client.teamMember.updateMany({
      where: { userId: null, personNo: user.studentNo },
      data: { userId: user.id },
    });
    claimed.members = memberResult.count;

    const leaderMemberships = await client.teamMember.findMany({
      where: { userId: user.id, role: "LEADER" },
      select: { projectId: true },
    });
    if (leaderMemberships.length) {
      const projectResult = await client.project.updateMany({
        where: { id: { in: leaderMemberships.map((item) => item.projectId) }, ownerId: null },
        data: { ownerId: user.id },
      });
      claimed.projects = projectResult.count;
    }
  }

  if (user.staffNo) {
    const teacherResult = await client.teacher.updateMany({
      where: { userId: null, staffNo: user.staffNo },
      data: { userId: user.id },
    });
    claimed.teachers = teacherResult.count;
  }

  return claimed;
}
