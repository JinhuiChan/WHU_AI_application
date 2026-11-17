import type { ReactNode } from "react";

/**
 * 区块头：eyebrow + 标题 + 一句解释 + 右侧 meta。
 *
 * 为什么要这三层：区块现在都是「白卡 + 一行 16px 标题」，滚动时每块开头长得一样，
 * 眼睛没有停顿点。加一层小号英文标记和一句副标题后，区块之间才有节奏。
 *
 * eyebrow 只写「SECTION 序号 + 英文短语」，不承担业务含义；
 * 真正的信息在标题与副标题上，两者都不许省略成空串。
 */
export function SectionHead({
  eyebrow,
  title,
  sub,
  meta,
  className,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-x-3 gap-y-1 ${className ?? ""}`}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>
        ) : null}
        <h2 className={`text-base text-slate-900 ${eyebrow ? "mt-1" : ""}`}>{title}</h2>
        {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
      </div>
      {meta ? <div className="shrink-0 text-xs text-slate-500">{meta}</div> : null}
    </div>
  );
}

/** 区块头下方的渐隐细线：比 1px 实线轻，收口更自然 */
export function SectionRule({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`h-px bg-gradient-to-r from-slate-200 to-transparent ${className ?? ""}`}
    />
  );
}
