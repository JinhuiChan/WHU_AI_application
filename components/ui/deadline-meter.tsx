/**
 * 报名窗口：剩余天数胶囊 + 窗口进度条。
 *
 * 绝对时间（2026/12/31 23:59）不携带任何紧迫信息，学生得自己心算。
 * 这里把「还剩几天」直接算出来，并按 7 天 / 3 天两个阈值换色：
 *   大于 7 天 —— 中性灰蓝，不抢注意力
 *   7 天内   —— 橙（提示该动手了）
 *   3 天内   —— 红（真正的紧迫）
 *   已关闭   —— 灰，且不再显示进度
 *
 * 只在服务端算：这个组件没有交互，用 Date 不会产生水合不一致。
 */
export type DeadlineState = {
  /** 面板上显示的主文案，如「还剩 7 天」 */
  label: string;
  /** 胶囊配色 */
  tone: string;
  /** 0-100，窗口已走过的百分比；无开始时间时为 null */
  percent: number | null;
  closed: boolean;
  /** 截止时间的可读文案 */
  endText: string | null;
};

const DAY = 24 * 60 * 60 * 1000;

export function deadlineState(startAt?: string | null, endAt?: string | null): DeadlineState {
  if (!endAt) {
    return { label: "未设置窗口", tone: "bg-slate-100 text-slate-500", percent: null, closed: false, endText: null };
  }
  const end = new Date(endAt);
  const now = new Date();
  const endText = Number.isNaN(end.getTime())
    ? null
    : `${end.getFullYear()}/${String(end.getMonth() + 1).padStart(2, "0")}/${String(end.getDate()).padStart(2, "0")} ${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;

  let percent: number | null = null;
  if (startAt) {
    const start = new Date(startAt);
    if (!Number.isNaN(start.getTime()) && end.getTime() > start.getTime()) {
      const raw = ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100;
      percent = Math.max(0, Math.min(100, Math.round(raw)));
    }
  }

  if (Number.isNaN(end.getTime()) || end.getTime() <= now.getTime()) {
    return { label: "已结束", tone: "bg-slate-100 text-slate-500", percent, closed: true, endText };
  }

  const days = Math.ceil((end.getTime() - now.getTime()) / DAY);
  if (days <= 3) return { label: `还剩 ${days} 天`, tone: "bg-red-50 text-red-700", percent, closed: false, endText };
  if (days <= 7) return { label: `还剩 ${days} 天`, tone: "bg-amber-50 text-amber-700", percent, closed: false, endText };
  return { label: `还剩 ${days} 天`, tone: "bg-slate-100 text-slate-600", percent, closed: false, endText };
}

/** 表格里只用一行：胶囊 + 截止日期 */
export function DeadlinePill({ startAt, endAt }: { startAt?: string | null; endAt?: string | null }) {
  const state = deadlineState(startAt, endAt);
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${state.tone}`}>{state.label}</span>
      {state.endText ? <span className="text-[11px] text-slate-500">截止 {state.endText}</span> : null}
    </span>
  );
}

/** 卡片里用完整版：胶囊 + 进度条 + 已过百分比 */
export function DeadlineMeter({
  startAt,
  endAt,
  className,
}: {
  startAt?: string | null;
  endAt?: string | null;
  className?: string;
}) {
  const state = deadlineState(startAt, endAt);
  const barTone = state.closed
    ? "bg-slate-300"
    : state.percent !== null && state.percent >= 90
      ? "bg-red-500"
      : state.percent !== null && state.percent >= 70
        ? "bg-amber-500"
        : "bg-blue-600";

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">报名截止</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${state.tone}`}>{state.label}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div
          aria-hidden="true"
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
        >
          <div className={`h-full rounded-full ${barTone}`} style={{ width: `${state.percent ?? 0}%` }} />
        </div>
        <span className="shrink-0 text-[11px] text-slate-500">
          {state.percent === null ? "—" : `已过 ${state.percent}%`}
        </span>
      </div>
      {state.endText ? <p className="mt-1.5 text-[11px] text-slate-400">{state.endText} 关闭</p> : null}
    </div>
  );
}
