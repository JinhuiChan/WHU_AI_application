"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const pageNames: Record<string, string> = {
  "/dashboard": "看板",
  "/competitions": "赛事",
  "/projects": "项目",
  "/import": "数据导入",
  "/anomalies": "异常核实",
  "/assistant": "AI 助手",
  "/check": "材料检查",
  "/rankings": "学院排行",
  "/admin/users": "用户管理",
  "/admin/logs": "审计日志",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const detail = pathname.startsWith("/competitions/")
    ? { href: "/competitions", label: "赛事", current: "赛事详情" }
    : pathname.startsWith("/projects/")
      ? { href: "/projects", label: "项目", current: "项目全貌" }
      : null;
  const current = pageNames[pathname] ?? detail?.current ?? "页面详情";
  const parent: { label: string; href?: string } | null = pathname.startsWith("/admin")
    ? { label: "管理" }
    : detail;

  return (
    <nav aria-label="面包屑" className="min-w-0">
      <ol className="flex items-center gap-1 text-sm">
        <li>
          <Link href="/dashboard" className="text-slate-500 hover:text-blue-600">
            首页
          </Link>
        </li>
        {parent ? (
          <li className="flex items-center gap-1">
            <ChevronRight size={14} className="text-slate-400" aria-hidden="true" />
            {parent.href ? (
              <Link href={parent.href} className="text-slate-500 hover:text-blue-600">{parent.label}</Link>
            ) : <span className="text-slate-500">{parent.label}</span>}
          </li>
        ) : null}
        <li className="flex min-w-0 items-center gap-1">
          <ChevronRight size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
          <span className="truncate font-medium text-slate-900" aria-current="page">
            {current}
          </span>
        </li>
      </ol>
    </nav>
  );
}
