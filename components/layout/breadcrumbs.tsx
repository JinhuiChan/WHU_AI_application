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
  const current = pageNames[pathname] ?? "页面详情";
  const inAdministration = pathname.startsWith("/admin");

  return (
    <nav aria-label="面包屑" className="min-w-0">
      <ol className="flex items-center gap-1 text-sm">
        <li>
          <Link href="/dashboard" className="text-slate-500 hover:text-blue-600">
            首页
          </Link>
        </li>
        {inAdministration ? (
          <li className="flex items-center gap-1">
            <ChevronRight size={14} className="text-slate-400" aria-hidden="true" />
            <span className="text-slate-500">管理</span>
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
