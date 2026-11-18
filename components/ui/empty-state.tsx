import Link from "next/link";
import type { ReactNode } from "react";
import { WhuGateEmblem } from "@/components/brand/whu-motifs";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: { href: string; label: string };
  /**
   * 图标，默认使用武大校门牌坊线稿徽记。同一页出现多个空态时可传入各自语义图标。
   */
  icon?: ReactNode;
};

/** 列表空态：武大建筑线稿 + 一句人话 + 可操作入口。纯展示组件，不取数、不碰业务规则。 */
export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 px-4 py-12 text-center">
      {icon ? (
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f8faf9] text-[#54635d] ring-1 ring-[#d5e2db]">
          {icon}
        </span>
      ) : (
        <WhuGateEmblem className="h-11 w-16 text-[#115740]/35" />
      )}
      <p className="font-display text-base font-semibold text-[#0f1d18]">{title}</p>
      {description ? <p className="max-w-md text-xs leading-5 text-[#5c6c65]">{description}</p> : null}
      {action ? (
        <Link
          className="mt-2 inline-flex h-9 items-center justify-center rounded-full border border-[#7f9384] bg-white px-4 text-sm font-medium text-[#162620] transition-colors duration-150 ease-out hover:border-[#115740]/50 hover:bg-[#eef5f1]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:active:scale-100"
          href={action.href}
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
