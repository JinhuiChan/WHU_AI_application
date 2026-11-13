import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { UserManagement } from "@/components/admin/user-management";
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
    return (
      <section className="rounded-lg border border-red-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-red-600">403 无权限</h1>
        <p className="mt-2 text-sm text-slate-500">仅管理员可以访问用户管理。</p>
      </section>
    );
  }

  const roleParam = firstParam(searchParams?.role);
  // 有管理员注册申请待审核时，默认落在「管理员」分类，省得管理员满页找
  const [counts, pendingAdmins] = await Promise.all([countManagedUsers(), countPendingAdminRegistrations()]);
  const activeRole: TabKey = isTabKey(roleParam) ? roleParam : pendingAdmins > 0 ? "ADMIN" : "STUDENT";
  const users = await listManagedUsers(activeRole as Role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">用户管理</h1>
        <p className="mt-1 text-sm text-slate-500">
          按身份分三类管理账号与角色，所有操作均保留审计记录。一个人可以同时拥有多个身份，会在对应分类里各出现一次。
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((tab) => {
          const active = tab.key === activeRole;
          const pending = tab.key === "ADMIN" ? pendingAdmins : 0;
          return (
            <Link
              key={tab.key}
              href={`/admin/users?role=${tab.key}`}
              aria-current={active ? "page" : undefined}
              className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm transition ${
                active
                  ? "border-blue-200 bg-blue-50 font-medium text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
              <span className={`text-xs ${active ? "text-blue-500" : "text-slate-400"}`}>{counts[tab.key]}</span>
              {pending > 0 ? (
                <span
                  title={`待审核的管理员申请 ${pending} 个`}
                  className="rounded-full bg-red-600 px-1.5 text-[11px] font-medium leading-4 text-white"
                >
                  {pending}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {activeRole === "ADMIN" && pendingAdmins > 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          有 {pendingAdmins} 个管理员注册申请待审核，通过后才能登录。请在此页核对身份后点「审核通过」或「驳回」。
        </p>
      ) : null}

      <UserManagement initialUsers={users} currentUserId={user.id} activeRole={activeRole as Role} />
    </div>
  );
}
