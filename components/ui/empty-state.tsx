import Link from "next/link";
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: { href: string; label: string };
  /**
   * 图标，默认 Inbox。同一页出现多个空态时换成各自语义的图标（赛事用 Trophy、
   * 成员用 Users、材料用 FileText），否则读者看到三块一模一样的「收件箱」。
   */
  icon?: ReactNode;
};

/** 列表空态：图标 + 一句人话 + 可操作入口。纯展示组件，不取数、不碰业务规则。 */
export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 ring-1 ring-slate-200/70">
        {icon ?? <Inbox aria-hidden="true" size={20} />}
      </span>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description ? <p className="text-xs text-slate-500">{description}</p> : null}
      {action ? (
        <Link
          className="mt-2 inline-flex h-9 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition duration-[160ms] ease-out hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:ring-offset-2 active:scale-[0.97] motion-reduce:active:scale-100"
          href={action.href}
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
