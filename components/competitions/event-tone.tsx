/**
 * 赛事色标：同一个赛事在卡片、表格、列表里必须是同一种颜色。
 *
 * 颜色按**等级**取（国赛蓝 / 省赛绿 / 校赛橙），不按赛事 id 取 ——
 * 等级是稳定字段，新增赛事也不会突然换色；而按 id 轮转配色，
 * 同一个赛事在不同页面会出现不同颜色，色标就失效了。
 *
 * 这里只做「标识色」，不承载状态：
 * 红色永远是错误、橙色永远是待处理，不能拿去当赛事色。
 */
export type EventTone = {
  /** 深色卡片渐变起止 */
  from: string;
  to: string;
  /** 表格/列表里的色块与文字色，取渐变起始色保证与卡片一致 */
  dot: string;
  /** 浅底胶囊的背景与文字 */
  soft: string;
  ink: string;
  /** 卡片左上角的英文等级标记 */
  eyebrow: string;
};

const TONES: Record<string, EventTone> = {
  NATIONAL: { from: "#1a73e8", to: "#0b47b8", dot: "#1a73e8", soft: "#eff6ff", ink: "#1d4ed8", eyebrow: "NATIONAL ROUND" },
  PROVINCE: { from: "#0e8a75", to: "#04604f", dot: "#0e8a75", soft: "#ecfdf5", ink: "#047857", eyebrow: "PROVINCIAL ROUND" },
  SCHOOL: { from: "#c2580f", to: "#8a3c08", dot: "#c2580f", soft: "#fff7ed", ink: "#b45309", eyebrow: "COLLEGE ROUND" },
  DEFAULT: { from: "#8c2b4d", to: "#5e1a33", dot: "#8c2b4d", soft: "#fdf2f8", ink: "#9d174d", eyebrow: "COMPETITION" },
};

export function eventTone(level?: string | null): EventTone {
  return TONES[level ?? ""] ?? TONES.DEFAULT;
}

/** 表格行首的赛事色块。纯装饰，靠 aria-hidden 让读屏跳过。 */
export function EventSwatch({ level, className }: { level?: string | null; className?: string }) {
  const tone = eventTone(level);
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-[3px] ${className ?? ""}`}
      style={{ backgroundColor: tone.dot }}
    />
  );
}
