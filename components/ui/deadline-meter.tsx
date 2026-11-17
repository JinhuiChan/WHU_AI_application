/**
 * 报名窗口：剩余天数胶囊 + 统一的窗口进度/紧迫度计算。
 *
 * 绝对时间（2026/12/31 23:59）不携带任何紧迫信息，学生得自己心算。
 * 这里把「还剩几天」直接算出来，并统一所有页面使用的胶囊色与进度条色：
 *   未开始   —— 蓝（信息提示，不借用待处理橙色）
 *   大于 7 天 —— 中性灰蓝胶囊 + 蓝色进度条
 *   7 天内   —— 橙（提示该动手了）
 *   3 天内   —— 红（真正的紧迫）
 *   已结束   —— 灰
 *
 * 仅在服务端组件中使用（依赖当前时间 new Date()，客户端引用会导致水合不一致）。
 * 所有日期格式化固定走 Asia/Shanghai，不依赖运行环境的系统时区。
 */
export type DeadlineUrgency = "unset" | "upcoming" | "normal" | "soon" | "urgent" | "closed";

export type DeadlineState = {
  /** 面板上显示的主文案，如「还剩 7 天」「今天截止」「05.01 开始」 */
  label: string;
  /** 紧迫度分级，胶囊与进度条同源 */
  urgency: DeadlineUrgency;
  /** 胶囊配色 */
  tone: string;
  /** 进度条与左侧色条配色 */
  barTone: string;
  /** 0-100，窗口已走过的百分比；无开始时间时为 null */
  percent: number | null;
  /** 是否处于开放窗口内（已开始且未结束） */
  running: boolean;
  closed: boolean;
  /** 截止时间的可读文案（北京时间） */
  endText: string | null;
  /** 开始时间的可读文案（北京时间） */
  startText: string | null;
};

const TZ = "Asia/Shanghai";
const DAY = 24 * 60 * 60 * 1000;

const URGENCY_STYLE: Record<DeadlineUrgency, { tone: string; barTone: string }> = {
  unset: { tone: "bg-slate-100 text-slate-600", barTone: "bg-slate-300" },
  closed: { tone: "bg-slate-100 text-slate-600", barTone: "bg-slate-300" },
  upcoming: { tone: "bg-blue-50 text-blue-700", barTone: "bg-blue-300" },
  normal: { tone: "bg-slate-100 text-slate-700", barTone: "bg-blue-600" },
  soon: { tone: "bg-amber-50 text-amber-700", barTone: "bg-amber-500" },
  urgent: { tone: "bg-red-50 text-red-700", barTone: "bg-red-500" },
};

function partsCN(d: Date) {
  const p = new Intl.DateTimeFormat("zh-CN", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (type: string) => p.find((x) => x.type === type)?.value ?? "";
  const rawHour = get("hour");
  return {
    y: get("year"),
    m: get("month"),
    d: get("day"),
    hh: rawHour === "24" ? "00" : rawHour,
    mm: get("minute"),
  };
}

function toDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtMD(value: Date): string {
  const x = partsCN(value);
  return `${x.m}.${x.d}`;
}

export function fmtYMDHM(value: Date): string {
  const x = partsCN(value);
  return `${x.y}/${x.m}/${x.d} ${x.hh}:${x.mm}`;
}

export function sameYearCN(a: Date, b: Date): boolean {
  return partsCN(a).y === partsCN(b).y;
}

function sameDayCN(a: Date, b: Date): boolean {
  const pa = partsCN(a);
  const pb = partsCN(b);
  return pa.y === pb.y && pa.m === pb.m && pa.d === pb.d;
}

export function deadlineState(
  startAt?: string | Date | null,
  endAt?: string | Date | null,
  now: Date = new Date(),
): DeadlineState {
  const start = toDate(startAt);
  const end = toDate(endAt);
  const startText = start ? fmtYMDHM(start) : null;
  const endText = end ? fmtYMDHM(end) : null;

  if (!end) {
    return {
      label: "未设置窗口",
      urgency: "unset",
      ...URGENCY_STYLE.unset,
      percent: null,
      running: false,
      closed: false,
      endText: null,
      startText,
    };
  }

  let percent: number | null = null;
  if (start && end.getTime() > start.getTime()) {
    const raw = ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100;
    percent = Math.max(0, Math.min(100, Math.round(raw)));
  }

  // 先判已结束再算天数：剩余 -0.5 天时 ceil 会得到 0，会被误当成「今天截止」
  if (now.getTime() > end.getTime()) {
    return {
      label: "已结束",
      urgency: "closed",
      ...URGENCY_STYLE.closed,
      percent: percent ?? 100,
      running: false,
      closed: true,
      endText,
      startText,
    };
  }

  if (start && now.getTime() < start.getTime()) {
    return {
      label: `${fmtMD(start)} 开始`,
      urgency: "upcoming",
      ...URGENCY_STYLE.upcoming,
      percent: percent ?? 0,
      running: false,
      closed: false,
      endText,
      startText,
    };
  }

  const days = Math.ceil((end.getTime() - now.getTime()) / DAY);
  const urgency: DeadlineUrgency = days <= 3 ? "urgent" : days <= 7 ? "soon" : "normal";
  const label = days <= 0 || sameDayCN(now, end) ? "今天截止" : `还剩 ${days} 天`;

  return {
    label,
    urgency,
    ...URGENCY_STYLE[urgency],
    percent,
    running: true,
    closed: false,
    endText,
    startText,
  };
}

/** 表格与移动端卡片行内用：胶囊 + 截止日期 */
export function DeadlinePill({
  startAt,
  endAt,
}: {
  startAt?: string | Date | null;
  endAt?: string | Date | null;
}) {
  const state = deadlineState(startAt, endAt);
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${state.tone}`}>{state.label}</span>
      {state.endText ? <span className="text-xs text-slate-500">截止 {state.endText}</span> : null}
    </span>
  );
}
