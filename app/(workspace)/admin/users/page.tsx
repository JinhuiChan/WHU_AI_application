import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { UserManagement } from "@/components/admin/user-management";
import { WhuSeal, WhuTitleRule } from "@/components/brand/whu-motifs";
import { WorkspaceForbidden } from "@/components/ui/workspace-forbidden";
import { countManagedUsers, countPendingAdminRegistrations, listManagedUsers } from "@/lib/admin-users";
import { getActiveUser } from "@/lib/auth.server";
import { firstParam } from "@/lib/list-query";

export const metadata: Metadata = {
  title: "用户管理",
};

export const dynamic = "force-dynamic";

const TABS = [
  { key: "STUDENT", label: "学生" },
  { key: "TEACHER", label: "指导教师" },
  { key: "ADMIN", label: "管理员" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function isTabKey(value: string | undefined): value is TabKey {
  return TABS.some((tab) => tab.key === value);
}

export default async function UsersPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await getActiveUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "ADMIN") {
    return <WorkspaceForbidden message="仅管理员可以访问用户管理。" />;
  }

  const roleParam = firstParam(searchParams?.role);
  const [counts, pendingAdmins] = await Promise.all([countManagedUsers(), countPendingAdminRegistrations()]);
  const activeRole: TabKey = isTabKey(roleParam) ? roleParam : pendingAdmins > 0 ? "ADMIN" : "STUDENT";
  const users = await listManagedUsers(activeRole as Role);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="t-page-title font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
            用户管理
          </h1>
          <WhuSeal label="身份与权限" />
        </div>
        <p className="mt-1.5 flex items-center gap-2 text-sm text-[#54635d]">
          <WhuTitleRule />
          <span>按身份分类核定账号准入与多重角色权限，所有变更均实时记入审计日志。</span>
        </p>
      </div>

      <nav aria-label="用户身份分类" className="flex flex-wrap items-center gap-2">
        {TABS.map((tab) => {
          const active = tab.key === activeRole;
          const pending = tab.key === "ADMIN" ? pendingAdmins : 0;
          return (
            <Link
              key={tab.key}
              href={`/admin/users?role=${tab.key}`}
              aria-current={active ? "page" : undefined}
              className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm transition-colors duration-150 ${
                active
                  ? "border-[#115740] bg-[#115740] font-medium text-white shadow-sm"
                  : "border-[#7f9384] bg-white text-[#162620] hover:border-[#115740] hover:bg-[#eef5f1]"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                  active ? "bg-white/20 text-white" : "bg-[#eef5f1] text-[#115740]"
                }`}
              >
                {counts[tab.key]}
              </span>
              {pending > 0 ? (
                <span
                  title={`待审核的管理员申请 ${pending} 个`}
                  className="rounded-full bg-[#9e2a35] px-2 py-0.5 text-[11px] font-semibold leading-none text-white tabular-nums"
                >
                  待审 {pending}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {activeRole === "ADMIN" && pendingAdmins > 0 ? (
        <p className="rounded-xl border border-[#ead4a8] bg-[#fdf6e7] px-4 py-3 text-sm text-[#854d0e]">
          当前有 <span className="font-semibold tabular-nums">{pendingAdmins}</span> 个管理员注册申请待核验，审核通过后方可登录工作台。
        </p>
      ) : null}

      <UserManagement key={activeRole} initialUsers={users} currentUserId={user.id} activeRole={activeRole as Role} />
    </div>
  );
}
