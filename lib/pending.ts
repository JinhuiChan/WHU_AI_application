import type { ChangeRequestStatus, RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PendingBadges = {
  /** 报名审核待办：待学院审核 + 待校级终审 */
  review: number;
  /** 变更申请待办：学院待审 + 校级待审 */
  changes: number;
};

const pendingReviewStatuses: RegistrationStatus[] = ["PENDING", "COLLEGE_REVIEW"];
const pendingChangeStatuses: ChangeRequestStatus[] = ["PENDING_COLLEGE", "PENDING_SCHOOL"];

export async function getPendingBadges(): Promise<PendingBadges> {
  const [review, changes] = await Promise.all([
    prisma.project.count({ where: { deletedAt: null, reviewStatus: { in: pendingReviewStatuses } } }),
    prisma.changeRequest.count({ where: { status: { in: pendingChangeStatuses } } }),
  ]);
  return { review, changes };
}
