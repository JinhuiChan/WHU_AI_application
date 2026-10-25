"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import type { ApiResponse } from "@/types/api";
import type { ManagedUser } from "@/types/user";

type UserAction = { action: "APPROVE" } | { action: "UPDATE_ROLE"; role: Role };

function roleDrafts(users: ManagedUser[]): Record<string, Role> {
  return Object.fromEntries(users.map((user) => [user.id, user.role] as const));
}

export function UserManagement({
  initialUsers,
  currentUserId,
}: {
  initialUsers: ManagedUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [draftRoles, setDraftRoles] = useState<Record<string, Role>>(() => roleDrafts(initialUsers));
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function updateUser(userId: string, action: UserAction) {
    setPendingId(userId);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const result = (await response.json()) as ApiResponse<ManagedUser[]>;
      if (!response.ok || result.code !== 0) {
        throw new Error(result.message || "操作失败");
      }
      setUsers(result.data);
      setDraftRoles(roleDrafts(result.data));
      setNotice(result.message);
      router.refresh();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "操作失败，请稍后重试");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {error ? <div role="alert" className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}
      {notice ? <div role="status" className="border-b border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</div> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">用户</th>
              <th className="px-4 py-3 font-medium">手机号</th>
              <th className="px-4 py-3 font-medium">角色</th>
              <th className="px-4 py-3 font-medium">审核状态</th>
              <th className="px-4 py-3 font-medium">审核信息</th>
              <th className="px-4 py-3 font-medium">创建时间</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => {
              const pending = pendingId === user.id;
              const isCurrentUser = user.id === currentUserId;
              const draftRole = draftRoles[user.id] ?? user.role;
              return (
                <tr key={user.id} className="text-slate-700">
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-900">
                      {user.name}
                      {isCurrentUser ? <span className="ml-2 text-xs font-normal text-blue-600">当前账号</span> : null}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{user.externalId ?? "本地账号"}</div>
                  </td>
                  <td className="px-4 py-4">{user.phone}</td>
                  <td className="px-4 py-4">
                    <select
                      aria-label={`修改${user.name}的角色`}
                      value={draftRole}
                      disabled={pending || isCurrentUser}
                      onChange={(event) => {
                        const role = event.target.value;
                        if (role === "ADMIN" || role === "USER") {
                          setDraftRoles((current) => ({ ...current, [user.id]: role }));
                        }
                      }}
                      className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs disabled:bg-slate-100"
                    >
                      <option value="ADMIN">管理员</option>
                      <option value="USER">普通用户</option>
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs ${user.approvedAt ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                      {user.approvedAt ? "已审核" : "待审核"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500">
                    {user.approvedBy ? <div>{user.approvedBy}</div> : "—"}
                    {user.approvedAt ? <div className="mt-1">{user.approvedAt.slice(0, 10)}</div> : null}
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500">{user.createdAt.slice(0, 10)}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={pending || Boolean(user.approvedAt)}
                        onClick={() => updateUser(user.id, { action: "APPROVE" })}
                        className="rounded-md border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {user.approvedAt ? "已审核" : "审核通过"}
                      </button>
                      <button
                        type="button"
                        disabled={pending || isCurrentUser || draftRole === user.role}
                        onClick={() => updateUser(user.id, { action: "UPDATE_ROLE", role: draftRole })}
                        className="rounded-md bg-blue-600 px-3 py-2 text-xs text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {pending ? "处理中…" : "保存角色"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
