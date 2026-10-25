import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserManagement } from "@/components/admin/user-management";
import { listManagedUsers } from "@/lib/admin-users";
import { getActiveUser } from "@/lib/auth.server";

export const metadata: Metadata = {
  title: "用户管理",
};

export default async function UsersPage() {
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
  const users = await listManagedUsers();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">用户管理</h1>
        <p className="mt-1 text-sm text-slate-500">审核平台账号并调整用户角色，所有操作均保留审计记录。</p>
      </div>
      <UserManagement initialUsers={users} currentUserId={user.id} />
    </div>
  );
}
