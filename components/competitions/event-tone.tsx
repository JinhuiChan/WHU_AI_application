import { cn } from "@/components/ui/cn";
import { competitionLevelLabels } from "@/lib/presentation";
import type { CompetitionLevel } from "@prisma/client";

/**
 * 赛事色标：同一个赛事在卡片、表格、列表里必须是同一种颜色。
 *
 * 颜色按**等级**取（国赛蓝 / 省赛绿 / 校赛紫），不按赛事 id 取 ——
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
  NATIONAL: { from: "#1b3b6b", to: "#0f2547", dot: "#1b3b6b", soft: "#eef3f9", ink: "#1b3b6b", eyebrow: "NATIONAL ROUND" },
  PROVINCE: { from: "#134e45", to: "#0a312b", dot: "#134e45", soft: "#ecf6f4", ink: "#134e45", eyebrow: "PROVINCIAL ROUND" },
  SCHOOL: { from: "#4c3575", to: "#2e1e4b", dot: "#4c3575", soft: "#f4f1fa", ink: "#4c3575", eyebrow: "COLLEGE ROUND" },
  DEFAULT: { from: "#3f4b5c", to: "#252e3c", dot: "#475569", soft: "#f1f5f9", ink: "#334155", eyebrow: "COMPETITION" },
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

/** 赛事等级胶囊：全站统一由 eventTone 取色，不再各页分别写一套配色表。 */
export function LevelPill({ level, className }: { level: CompetitionLevel; className?: string }) {
  const tone = eventTone(level);
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs", className)}
      style={{ backgroundColor: tone.soft, color: tone.ink }}
    >
      {competitionLevelLabels[level]}
    </span>
  );
}
