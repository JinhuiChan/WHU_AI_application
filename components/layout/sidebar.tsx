"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Bot,
  FileCheck,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Settings,
  TrendingUp,
  Trophy,
  Upload,
  Users,
} from "lucide-react";
import type { Role } from "@prisma/client";

const navigation = [
  { href: "/dashboard", label: "看板", icon: LayoutDashboard },
  { href: "/rankings", label: "学院排行", icon: TrendingUp },
  { href: "/competitions", label: "赛事", icon: Trophy },
  { href: "/projects", label: "项目", icon: FolderKanban },
  { href: "/import", label: "导入", icon: Upload },
  { href: "/anomalies", label: "异常", icon: AlertTriangle },
  { href: "/assistant", label: "AI 助手", icon: Bot },
  { href: "/check", label: "材料检查", icon: FileCheck },
];

const administration = [
  { href: "/admin/users", label: "用户管理", icon: Users },
  { href: "/admin/logs", label: "审计日志", icon: FileText },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const mobileNavigation = [
    { href: "/dashboard", label: "看板", icon: LayoutDashboard },
    { href: "/competitions", label: "赛事", icon: Trophy },
    { href: "/projects", label: "项目", icon: FolderKanban },
    { href: "/assistant", label: "AI 助手", icon: Bot },
    role === "ADMIN"
      ? { href: "/admin/users", label: "管理", icon: Settings }
      : { href: "/check", label: "检查", icon: FileCheck },
  ];

  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-slate-200 bg-white md:flex">
        <Link href="/dashboard" className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">科</span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">科创赛事</span>
            <span className="block text-xs text-slate-500">综合管理服务平台</span>
          </span>
        </Link>
        <nav aria-label="主导航" className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition ${
                  active ? "bg-blue-50 font-medium text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
          {role === "ADMIN" ? (
            <div className="pt-5">
              <p className="mb-2 px-3 text-xs font-medium text-slate-400">管理</p>
              {administration.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition ${
                      active ? "bg-blue-50 font-medium text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon size={18} aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </nav>
      </aside>

      <nav aria-label="移动端导航" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white pb-safe md:hidden">
        {mobileNavigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] ${active ? "text-blue-600" : "text-slate-500"}`}
            >
              <Icon size={20} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
