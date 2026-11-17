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
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f5faf7] text-slate-400 ring-1 ring-[#d2e2d8]">
          {icon}
        </span>
      ) : (
        <WhuGateEmblem className="h-11 w-16 text-[#115740]/30" />
      )}
      <p className="font-display text-base font-semibold text-slate-800">{title}</p>
      {description ? <p className="max-w-md text-xs leading-5 text-slate-500">{description}</p> : null}
      {action ? (
        <Link
          className="mt-2 inline-flex h-9 items-center justify-center rounded-full border border-[#b4cbbd] bg-white px-4 text-sm font-medium text-slate-700 transition duration-150 ease-out hover:border-[#115740]/40 hover:bg-[#f5faf7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:ring-offset-2 active:scale-[0.98]"
          href={action.href}
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
