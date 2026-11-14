"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardCheck,
  FileCheck,
  FileText,
  FolderKanban,
  ShieldAlert,
  LayoutDashboard,
  MessageCircle,
  Settings,
  Trophy,
  Upload,
  UserCheck,
  UserRound,
  Users,
} from "lucide-react";
import type { Role } from "@prisma/client";

const adminNavigation = [
  { href: "/dashboard", label: "看板", icon: LayoutDashboard },
  { href: "/competitions", label: "赛事", icon: Trophy },
  { href: "/intro", label: "赛事简介", icon: BookOpen },
  { href: "/projects", label: "项目", icon: FolderKanban },
];

const studentNavigation = [
  { href: "/dashboard", label: "看板", icon: LayoutDashboard },
  { href: "/competitions", label: "赛事与报名", icon: Trophy },
  { href: "/intro", label: "赛事简介", icon: BookOpen },
  { href: "/teams", label: "组队广场", icon: Users },
  { href: "/my/teams", label: "我的组队", icon: ClipboardCheck },
  { href: "/my", label: "我的项目", icon: FolderKanban },
  { href: "/profile", label: "个人中心", icon: UserRound },
];

const teacherNavigation = [
  { href: "/dashboard", label: "看板", icon: LayoutDashboard },
  { href: "/teacher", label: "指导项目", icon: UserCheck },
  { href: "/intro", label: "赛事简介", icon: BookOpen },
  { href: "/profile", label: "个人中心", icon: UserRound },
];

function navigationFor(roles: Role[]) {
  const set = new Set(roles);
  const assistant = { href: "/assistant", label: "赛事 AI 问答", icon: MessageCircle };
  // 管理员导航已覆盖全部管理入口
  if (set.has("ADMIN")) return [...adminNavigation, assistant];
  const dashboard = [{ href: "/dashboard", label: "看板", icon: LayoutDashboard }];
  const extra = [
    ...(set.has("STUDENT") ? studentNavigation.filter((item) => item.href !== "/dashboard") : []),
    ...(set.has("TEACHER") ? teacherNavigation.filter((item) => item.href !== "/dashboard") : []),
  ];
  return [...dashboard, ...extra, assistant];
}

const administration = [
  { href: "/review", label: "报名审核", icon: ClipboardCheck },
  { href: "/import", label: "数据导入", icon: Upload },
  { href: "/anomalies", label: "异常核实", icon: ShieldAlert },
  { href: "/check", label: "材料检查", icon: FileCheck },
  { href: "/admin/awards", label: "奖项录入", icon: Trophy },
  { href: "/admin/users", label: "用户管理", icon: Users },
  { href: "/admin/logs", label: "审计日志", icon: FileText },
];

export function Sidebar({ roles, badges }: { roles: Role[]; badges?: { review: number; changes: number; teamRequests: number; adminUsers: number } }) {
  const pathname = usePathname();
  const navigation = navigationFor(roles);
  const pendingTodo = badges ? badges.review + badges.changes : 0;
  const teamRequests = badges?.teamRequests ?? 0;
  const adminUsers = badges?.adminUsers ?? 0;
  const pendingTitle = badges ? `待审核项目 ${badges.review} 个 · 待审批变更 ${badges.changes} 条` : undefined;
  const mobileNavigation = [
    ...navigation.slice(0, 4),
    ...(roles.includes("ADMIN") ? [{ href: "/admin/users", label: "管理", icon: Settings }] : []),
  ];

  function isActive(href: string) {
    if (pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`))) return true;
    // /apply is part of the student "赛事与报名" flow — keep same selected state as competitions list
    if (href === "/competitions" && (pathname === "/apply" || pathname.startsWith("/apply/"))) return true;
    return false;
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-slate-200 bg-white md:flex">
        <Link href="/dashboard" className="flex h-16 items-center gap-3 border-b border-slate-200 px-5 py-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">科</span>
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
                className={`flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition ${
                  active ? "bg-blue-50 font-medium text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                {item.label}
                {item.href === "/my/teams" && teamRequests > 0 ? (
                  <span
                    title={`待处理入队申请 ${teamRequests} 条`}
                    className="ml-auto rounded-full bg-red-600 px-1.5 text-[11px] font-medium leading-4 text-white"
                  >
                    {teamRequests}
                  </span>
                ) : null}
              </Link>
            );
          })}
          {roles.includes("ADMIN") ? (
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
                    className={`flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition ${
                      active ? "bg-blue-50 font-medium text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon size={18} aria-hidden="true" />
                    {item.label}
                    {item.href === "/review" && pendingTodo > 0 ? (
                      <span
                        title={pendingTitle}
                        className="ml-auto rounded-full bg-red-600 px-1.5 text-[11px] font-medium leading-4 text-white"
                      >
                        {pendingTodo}
                      </span>
                    ) : null}
                    {item.href === "/admin/users" && adminUsers > 0 ? (
                      <span
                        title={`待审核的管理员申请 ${adminUsers} 个`}
                        className="ml-auto rounded-full bg-red-600 px-1.5 text-[11px] font-medium leading-4 text-white"
                      >
                        {adminUsers}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </nav>
      </aside>

      <nav aria-label="移动端导航" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white pb-safe md:hidden">
        {mobileNavigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] ${active ? "text-blue-600" : "text-slate-500"}`}
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
