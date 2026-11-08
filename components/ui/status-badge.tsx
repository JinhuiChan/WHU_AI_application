import type { ReactNode } from "react";

/**
 * 状态配色，全站唯一口径。
 * `RegistrationStatus`（报名审核状态）和 `ProjectStatus`（项目状态）取值几乎重合，
 * 但同一个 SCHOOL_FINAL 在两边含义不同：
 *   - 报名审核里是「校内终审通过」→ 绿
 *   - 项目台账里是「校内终审」（还在审）→ 蓝
 * 所以用 scope 区分，不要按状态值一刀切。
 *
 * 颜色含义固定，不要临时改：
 * - 红：驳回、异常，需要人处理
 * - 橙：还没开始审（待审核、待学院审核），卡在入口
 * - 蓝：正在流转（学院审核中、待校级终审），不用本人动手
 * - 绿：通过、晋级
 * - 灰：未开始（草稿）、已结束（撤回、结项）
 */
type Tone = "danger" | "success" | "info" | "warn" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  danger: "bg-red-50 text-red-700 ring-red-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  info: "bg-blue-50 text-blue-700 ring-blue-200",
  warn: "bg-amber-50 text-amber-700 ring-amber-200",
  neutral: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function statusTone(status: string, scope: "registration" | "project" = "registration"): Tone {
  if (status === "REJECTED") return "danger";
  if (status === "PROVINCE_ADVANCED" || status === "NATIONAL_ADVANCED") return "success";
  if (status === "SCHOOL_FINAL") return scope === "registration" ? "success" : "info";
  if (status === "PENDING") return "warn";
  if (status === "COLLEGE_REVIEW" || status === "ACTIVE") return "info";
  return "neutral";
}

export function StatusBadge({
  status,
  scope = "registration",
  children,
}: {
  status: string;
  scope?: "registration" | "project";
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${TONE_CLASS[statusTone(status, scope)]}`}
    >
      {children}
    </span>
  );
}
