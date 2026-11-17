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
import { WhuArchWatermark } from "@/components/brand/whu-motifs";
import { WhuCrest } from "@/components/layout/brand-mark";

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

// 移动端底部栏最多 5 格，按「每天真正要点的那几页」排序，不做桌面导航的截断。
// 赛事简介从赛事列表进、组队广场从我的组队进，都不占位；
// 管理端把「报名审核」提到第一排，它是管理员每天开的第一页。
const studentMobileNavigation = [
  { href: "/dashboard", label: "看板", icon: LayoutDashboard },
  { href: "/competitions", label: "赛事", icon: Trophy },
  { href: "/my", label: "我的项目", icon: FolderKanban },
  { href: "/my/teams", label: "我的组队", icon: ClipboardCheck },
  { href: "/profile", label: "我的", icon: UserRound },
];

const adminMobileNavigation = [
  { href: "/dashboard", label: "看板", icon: LayoutDashboard },
  { href: "/review", label: "审核", icon: ClipboardCheck },
  { href: "/projects", label: "项目", icon: FolderKanban },
  { href: "/intro", label: "简介", icon: BookOpen },
  { href: "/admin/users", label: "管理", icon: Settings },
];

const teacherMobileNavigation = [
  { href: "/dashboard", label: "看板", icon: LayoutDashboard },
  { href: "/teacher", label: "指导项目", icon: UserCheck },
  { href: "/intro", label: "赛事简介", icon: BookOpen },
  { href: "/profile", label: "我的", icon: UserRound },
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

function mobileNavigationFor(roles: Role[]) {
  const set = new Set(roles);
  if (set.has("ADMIN")) return adminMobileNavigation;
  if (!set.has("STUDENT") && set.has("TEACHER")) return teacherMobileNavigation;
  // 学生兼教师时补一格「指导」顶掉「我的」，个人中心从右上角头像菜单进
  if (set.has("STUDENT") && set.has("TEACHER")) {
    return [...studentMobileNavigation.slice(0, 4), { href: "/teacher", label: "指导", icon: UserCheck }];
  }
  return studentMobileNavigation;
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
  const mobileNavigation = mobileNavigationFor(roles);
  // 桌面侧栏的角标在移动端也要能看见，否则「有 3 条入队申请」在手机上完全无提示
  function mobileBadge(href: string) {
    if (href === "/my/teams" && teamRequests > 0) return teamRequests;
    if (href === "/review" && pendingTodo > 0) return pendingTodo;
    if (href === "/admin/users" && adminUsers > 0) return adminUsers;
    return 0;
  }

  function isActive(href: string) {
    if (pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`))) return true;
    // /apply is part of the student "赛事与报名" flow — keep same selected state as competitions list
    if (href === "/competitions" && (pathname === "/apply" || pathname.startsWith("/apply/"))) return true;
    return false;
  }

  return (
    <>
      <aside className="app-shell-aside fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-[#0d3b2e] text-[#cde2d8] md:flex">
        <Link href="/dashboard" className="flex items-center gap-3 px-5 pb-4 pt-6">
          <WhuCrest framed size={38} />
          <span className="min-w-0">
            <span className="block truncate font-display text-[16px] font-bold tracking-tight text-white">珞珈科创</span>
            <span className="mt-0.5 block truncate text-[11px] text-[#9ec2b3]">武汉大学竞赛平台</span>
          </span>
        </Link>
        <nav aria-label="主导航" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13.5px] transition duration-150 ${
                  active
                    ? "bg-[#edf4ef] font-semibold text-[#0d3b2e]"
                    : "text-[#cde2d8] hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                <Icon size={16} aria-hidden="true" className={active ? "text-[#0d3b2e]" : "text-[#8fb8a7]"} />
                <span className="truncate">{item.label}</span>
                {item.href === "/my/teams" && teamRequests > 0 ? (
                  <span
                    title={`待处理入队申请 ${teamRequests} 条`}
                    className="ml-auto rounded-full bg-[#fde8e9] px-1.5 py-0.5 text-[11px] font-semibold leading-none text-[#8b1e28] tabular-nums"
                  >
                    {teamRequests}
                  </span>
                ) : null}
              </Link>
            );
          })}
          {roles.includes("ADMIN") ? (
            <div className="pt-5">
              <p className="mb-1.5 px-3 text-[11.5px] font-medium text-[#87b09f]">管理工作台</p>
              <div className="space-y-0.5">
              {administration.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13.5px] transition duration-150 ${
                      active
                        ? "bg-[#edf4ef] font-semibold text-[#0d3b2e]"
                        : "text-[#cde2d8] hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    <Icon size={16} aria-hidden="true" className={active ? "text-[#0d3b2e]" : "text-[#8fb8a7]"} />
                    <span className="truncate">{item.label}</span>
                    {item.href === "/review" && pendingTodo > 0 ? (
                      <span
                        title={pendingTitle}
                        className="ml-auto rounded-full bg-[#fde8e9] px-1.5 py-0.5 text-[11px] font-semibold leading-none text-[#8b1e28] tabular-nums"
                      >
                        {pendingTodo}
                      </span>
                    ) : null}
                    {item.href === "/admin/users" && adminUsers > 0 ? (
                      <span
                        title={`待审核的管理员申请 ${adminUsers} 个`}
                        className="ml-auto rounded-full bg-[#fde8e9] px-1.5 py-0.5 text-[11px] font-semibold leading-none text-[#8b1e28] tabular-nums"
                      >
                        {adminUsers}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
              </div>
            </div>
          ) : null}
        </nav>
        <div className="pointer-events-none shrink-0 overflow-hidden px-4 pb-4 pt-2">
          <WhuArchWatermark className="mx-auto w-44 text-white/[0.06]" />
        </div>
      </aside>

      <nav aria-label="移动端导航" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[#d5e2db] bg-[#fbfdfc]/95 pb-safe md:hidden">
        {mobileNavigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const badge = mobileBadge(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs ${active ? "font-medium text-[#115740]" : "text-slate-500"}`}
            >
              <span className="relative">
                <Icon size={19} aria-hidden="true" />
                {badge > 0 ? (
                  <span
                    title={`待处理 ${badge} 条`}
                    className="absolute -right-2.5 -top-1 min-w-4 rounded-full bg-red-600 px-1 text-center text-[11px] font-medium leading-4 text-white"
                  >
                    {badge}
                  </span>
                ) : null}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
