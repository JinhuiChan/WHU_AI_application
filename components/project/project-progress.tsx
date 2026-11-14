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
  done: "border-brand bg-brand text-surface",
  draft: "border-brand bg-brand-soft text-brand-strong",
  warn: "border-amber-200 bg-amber-50 text-amber-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  neutral: "border-line bg-surface-muted text-ink-faint",
};

const LABEL_TONE: Record<StepTone, string> = {
  done: "text-ink-muted",
  draft: "text-brand-strong",
  warn: "text-amber-700",
  info: "text-blue-700",
  success: "text-emerald-700",
  danger: "text-red-700",
  neutral: "text-ink-faint",
};

export function ProjectProgress({
  status,
  rejectedStage,
}: {
  status: RegistrationStatus;
  rejectedStage?: "COLLEGE" | "SCHOOL";
}) {
  const config = STATUS_CONFIG[status];
  const rejectedSteps = status === "REJECTED"
    ? rejectedStage === "SCHOOL"
      ? [2]
      : rejectedStage === "COLLEGE"
        ? [1]
        : [1, 2]
    : [];
  // 驳回时"当前段"必须跟着驳回层级走；否则会拿 REJECTED 的默认 current=1，
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
    status === "WITHDRAWN" ? "text-ink-faint" : status === "REJECTED" ? "text-red-700" : "text-emerald-700";
  const rejectedLineEnd = rejectedSteps.length > 0 ? rejectedSteps[rejectedSteps.length - 1] : -1;

  function toneForStep(index: number): StepTone {
    if (status === "WITHDRAWN") return "neutral";
    if (rejectedSteps.includes(index)) return "danger";
    if (index === current) return config.tone;
    if (index < completed) return "done";
    return "neutral";
  }

  function connectorClass(index: number) {
    if (status === "WITHDRAWN") return "bg-line";
    if (status === "REJECTED") return index <= rejectedLineEnd ? "bg-red-200" : "bg-line";
    return index <= current ? "bg-brand" : "bg-line";
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[320px] rounded-card border border-line bg-surface px-3 py-3">
        <ol aria-label="项目进度" className="grid grid-cols-3">
          {STEPS.map((step, index) => {
            const tone = toneForStep(index);
            return (
              <li key={step} aria-current={index === current ? "step" : undefined} className="min-w-0 text-center">
                <div className="flex w-full items-center">
                  <span className={`h-0.5 flex-1 ${index === 0 ? "bg-transparent" : connectorClass(index)}`} />
                  <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${CIRCLE_TONE[tone]}`}>
                    {index + 1}
                  </span>
                  <span className={`h-0.5 flex-1 ${index === STEPS.length - 1 ? "bg-transparent" : connectorClass(index + 1)}`} />
                </div>
                <p className={`mt-2 text-xs font-medium ${LABEL_TONE[tone]}`}>{step}</p>
                {!endLabel && index === current ? <p className={`mt-1 text-xs ${LABEL_TONE[tone]}`}>{config.label}</p> : null}
              </li>
            );
          })}
        </ol>
        {endLabel ? <p className={`mt-2 text-right text-xs font-medium ${endLabelTone}`}>{endLabel}</p> : null}
      </div>
    </div>
  );
}
