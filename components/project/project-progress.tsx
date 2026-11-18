import type { RegistrationStatus } from "@prisma/client";

type StepTone = "done" | "draft" | "warn" | "info" | "success" | "danger" | "neutral";

type StatusConfig = {
  current: number;
  completed: number;
  label: string;
  tone: StepTone;
};

// 只展示系统真正能推进到的阶段：nextStatus() 仅产出 PENDING/COLLEGE_REVIEW/SCHOOL_FINAL/REJECTED，
// PROVINCE_ADVANCED 与 NATIONAL_ADVANCED 没有任何写入路径（只会被读取），
// 画出来也永远是灰色，因此不纳入进度轴。
const STEPS = ["提交", "学院初审", "学校终审"];

const STATUS_CONFIG: Record<RegistrationStatus, StatusConfig> = {
  DRAFT: { current: 0, completed: 0, label: "未提交", tone: "draft" },
  PENDING: { current: 1, completed: 1, label: "待学院审核", tone: "warn" },
  COLLEGE_REVIEW: { current: 2, completed: 2, label: "待校级终审", tone: "info" },
  SCHOOL_FINAL: { current: 2, completed: 3, label: "校内终审通过", tone: "success" },
  REJECTED: { current: 1, completed: 1, label: "已驳回", tone: "danger" },
  PROVINCE_ADVANCED: { current: -1, completed: 3, label: "已晋级省赛", tone: "success" },
  NATIONAL_ADVANCED: { current: -1, completed: 3, label: "已晋级国赛", tone: "success" },
  WITHDRAWN: { current: -1, completed: 0, label: "已撤回", tone: "neutral" },
};

const CIRCLE_TONE: Record<StepTone, string> = {
  done: "border-[#115740] bg-[#115740] text-white",
  draft: "border-[#c59b45] bg-[#fdf8ee] text-[#8a651b]",
  warn: "border-[#c59b45] bg-[#fdf8ee] text-[#8a651b]",
  info: "border-[#115740] bg-[#eef5f1] text-[#115740]",
  success: "border-[#115740] bg-[#115740] text-white",
  danger: "border-[#e5b8bd] bg-[#fdf2f3] text-[#9e2a35]",
  neutral: "border-[#d5e2db] bg-[#f4f8f5] text-[#7a8c83]",
};

const LABEL_TONE: Record<StepTone, string> = {
  done: "text-[#115740]",
  draft: "text-[#8a651b]",
  warn: "text-[#8a651b]",
  info: "text-[#115740]",
  success: "text-[#115740]",
  danger: "text-[#9e2a35]",
  neutral: "text-[#7a8c83]",
};

const BADGE_TONE: Record<StepTone, string> = {
  done: "border-[#cde0d5] bg-[#eef5f1] text-[#115740]",
  draft: "border-[#ead7af] bg-[#fdf8ee] text-[#8a651b]",
  warn: "border-[#ead7af] bg-[#fdf8ee] text-[#8a651b]",
  info: "border-[#cde0d5] bg-[#eef5f1] text-[#115740]",
  success: "border-[#cde0d5] bg-[#eef5f1] text-[#115740]",
  danger: "border-[#e5b8bd] bg-[#fdf2f3] text-[#9e2a35]",
  neutral: "border-[#d5e2db] bg-[#f4f8f5] text-[#6c7e76]",
};

export function ProjectProgress({
  status,
  rejectedStage,
  compact = false,
}: {
  status: RegistrationStatus;
  rejectedStage?: "COLLEGE" | "SCHOOL";
  compact?: boolean;
}) {
  const config = STATUS_CONFIG[status];
  const rejectedSteps = status === "REJECTED"
    ? rejectedStage === "SCHOOL"
      ? [2]
      : rejectedStage === "COLLEGE"
        ? [1]
        : [1, 2]
    : [];
  // 驳回时“当前段”必须跟着驳回层级走；否则会拿 REJECTED 的默认 current=1，
  // 把标签错误地挂在「学院初审」下面（学校驳回也会显示在学院段）。
  const rejectedIndex = rejectedStage === "SCHOOL" ? 2 : rejectedStage === "COLLEGE" ? 1 : -1;
  const current = status === "REJECTED" ? rejectedIndex : config.current;
  const completed = status === "REJECTED" && rejectedStage === "SCHOOL" ? 2 : config.completed;
  const endLabel =
    status === "WITHDRAWN" ||
    (status === "REJECTED" && !rejectedStage) ||
    status === "PROVINCE_ADVANCED" ||
    status === "NATIONAL_ADVANCED"
      ? config.label
      : null;
  const endLabelTone =
    status === "WITHDRAWN" ? "text-[#7a8c83]" : status === "REJECTED" ? "text-[#9e2a35]" : "text-[#115740]";
  const rejectedLineEnd = rejectedSteps.length > 0 ? rejectedSteps[rejectedSteps.length - 1] : -1;

  function toneForStep(index: number): StepTone {
    if (status === "WITHDRAWN") return "neutral";
    if (rejectedSteps.includes(index)) return "danger";
    if (index === current) return config.tone;
    if (index < completed) return "done";
    return "neutral";
  }

  function connectorClass(index: number) {
    if (status === "WITHDRAWN") return "bg-[#d5e2db]";
    if (status === "REJECTED") return index <= rejectedLineEnd ? "bg-[#e5b8bd]" : "bg-[#d5e2db]";
    if (index <= completed - 1 || index <= current) return "bg-[#115740]";
    return "bg-[#d5e2db]";
  }

  if (compact) {
    return (
      <ol aria-label="项目进度" className="inline-flex items-center gap-1 text-[11px]">
        {STEPS.map((step, index) => {
          const tone = toneForStep(index);
          const shortStep = index === 0 ? "提交" : index === 1 ? "初审" : "终审";
          return (
            <li
              key={step}
              aria-current={index === current ? "step" : undefined}
              className="inline-flex items-center gap-1 whitespace-nowrap"
            >
              {index > 0 ? (
                <span aria-hidden="true" className={`h-0.5 w-2.5 rounded-full ${connectorClass(index)}`} />
              ) : null}
              <span
                className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold tabular-nums ${CIRCLE_TONE[tone]}`}
              >
                {index + 1}
              </span>
              <span className={`font-medium ${LABEL_TONE[tone]}`}>{shortStep}</span>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[300px] rounded-xl border border-[#d5e2db] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(20,34,27,0.03)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#e5efe9] pb-2.5">
          <span className="text-xs font-semibold text-[#33433d]">审核流转节点</span>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${BADGE_TONE[config.tone]}`}>
            {config.label}
          </span>
        </div>
        <ol aria-label="项目进度" className="grid grid-cols-3">
          {STEPS.map((step, index) => {
            const tone = toneForStep(index);
            return (
              <li key={step} aria-current={index === current ? "step" : undefined} className="min-w-0 text-center">
                <div className="flex w-full items-center">
                  <span className={`h-0.5 flex-1 ${index === 0 ? "bg-transparent" : connectorClass(index)}`} />
                  <span
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-display text-xs font-bold tabular-nums ${CIRCLE_TONE[tone]}`}
                  >
                    {index + 1}
                  </span>
                  <span className={`h-0.5 flex-1 ${index === STEPS.length - 1 ? "bg-transparent" : connectorClass(index + 1)}`} />
                </div>
                <p className={`mt-2 text-xs font-semibold ${LABEL_TONE[tone]}`}>{step}</p>
                {!endLabel && index === current ? (
                  <p className={`mt-0.5 text-[11px] ${LABEL_TONE[tone]}`}>{config.label}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
        {endLabel ? <p className={`mt-2 text-right text-xs font-medium ${endLabelTone}`}>{endLabel}</p> : null}
      </div>
    </div>
  );
}
