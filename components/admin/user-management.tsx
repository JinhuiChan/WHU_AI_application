"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHead, SectionRule } from "@/components/ui/section-head";
import { formatDate } from "@/lib/presentation";
import type { ApiResponse } from "@/types/api";
import type { ManagedUser } from "@/types/user";

type UserAction =
  | { action: "APPROVE" }
  | { action: "REJECT" }
  | { action: "UPDATE_ROLES"; roles: Role[] };

const IDENTITY_OPTIONS: Array<{ key: Role; label: string }> = [
  { key: "STUDENT", label: "学生" },
  { key: "TEACHER", label: "指导教师" },
  { key: "ADMIN", label: "管理员" },
];

const ROLE_TITLE: Record<string, string> = {
  STUDENT: "学生账号名册",
  TEACHER: "指导教师名册",
  ADMIN: "管理员与申请名册",
};

function pickIdentities(roles: Role[]): Role[] {
  return IDENTITY_OPTIONS.map((option) => option.key).filter((key) => roles.includes(key));
}

function identityDrafts(users: ManagedUser[]): Record<string, Role[]> {
  return Object.fromEntries(users.map((user) => [user.id, pickIdentities(user.roles)] as const));
}

function sameIdentities(a: Role[], b: Role[]): boolean {
  return a.length === b.length && a.every((item) => b.includes(item));
}

export function UserManagement({
  initialUsers,
  currentUserId,
  activeRole,
}: {
  initialUsers: ManagedUser[];
  currentUserId: string;
  activeRole: Role;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [draftRoles, setDraftRoles] = useState<Record<string, Role[]>>(() => identityDrafts(initialUsers));
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
      const scoped = result.data.filter((item) => item.roles.includes(activeRole));
      setUsers(scoped);
      setDraftRoles(identityDrafts(scoped));
      setNotice(result.message);
      router.refresh();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "操作失败，请稍后重试");
    } finally {
      setPendingId(null);
    }
  }

  function toggleIdentity(userId: string, role: Role) {
    setDraftRoles((current) => {
      const picked = current[userId] ?? [];
      const next = picked.includes(role) ? picked.filter((item) => item !== role) : [...picked, role];
      return { ...current, [userId]: next };
    });
  }

  const normalizedQuery = query.trim().toLowerCase();
  const visibleUsers = normalizedQuery
    ? users.filter(
        (item) =>
          item.name.toLowerCase().includes(normalizedQuery) ||
          item.phone.includes(normalizedQuery) ||
          (item.externalId ?? "").toLowerCase().includes(normalizedQuery),
      )
    : users;

  return (
    <section className="overflow-hidden card">
      <div className="flex flex-col gap-3 px-5 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHead
          title={ROLE_TITLE[activeRole] ?? "账号列表"}
          sub="点击身份胶囊可增减角色，点击「保存身份」生效"
          meta={`显示 ${visibleUsers.length} / 共 ${users.length} 人`}
        />
        <div className="flex items-center gap-2">
          <input
            type="search"
            aria-label="搜索姓名、手机号或学工号"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索姓名、手机号或学工号"
            className="h-10 w-full rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15 sm:w-64"
          />
          {query ? (
            <Button type="button" variant="outline" size="default" className="h-10 px-4" onClick={() => setQuery("")}>
              清除
            </Button>
          ) : null}
        </div>
      </div>
      <SectionRule className="mx-5 mt-3.5" />

      {error ? (
        <div role="alert" className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div role="status" className="border-b border-[#badec9] bg-[#eef5f1] px-5 py-3 text-sm text-[#115740]">
          {notice}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="t-thead bg-[#f5faf7] text-xs text-[#4d5e57]">
            <tr>
              <th className="px-4 py-3 font-medium">用户</th>
              <th className="px-3 py-3 font-medium">手机号</th>
              <th className="px-3 py-3 font-medium">身份（可多选）</th>
              <th className="px-3 py-3 font-medium">审核状态</th>
              <th className="px-3 py-3 font-medium">审核信息</th>
              <th className="px-3 py-3 font-medium">创建时间</th>
              <th className="min-w-[232px] px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef4f0]">
            {visibleUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-0">
                  <EmptyState
                    title={query ? "未找到匹配的账号" : "该分类下暂无账号"}
                    description={query ? "请更换姓名、手机号或学工号关键词后重试。" : "切换上方身份分类可查看其他角色名册。"}
                  />
                </td>
              </tr>
            ) : null}
            {visibleUsers.map((user) => {
              const pending = pendingId === user.id;
              const isCurrentUser = user.id === currentUserId;
              const draft = draftRoles[user.id] ?? pickIdentities(user.roles);
              const changed = !sameIdentities(draft, pickIdentities(user.roles));
              return (
                <tr key={user.id} className="text-[#26342e]">
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap items-center gap-1.5 font-medium text-[#0e1d17]">
                      <span>{user.name}</span>
                      {isCurrentUser ? (
                        <span className="rounded-full bg-[#eef5f1] px-2 py-0.5 text-xs font-medium text-[#115740]">
                          当前账号
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-xs text-[#6c7e76] tabular-nums">{user.externalId ?? "本地账号"}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-xs text-[#162620] tabular-nums">{user.phone}</td>
                  <td className="px-3 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {IDENTITY_OPTIONS.map((option) => {
                        const checked = draft.includes(option.key);
                        return (
                          <button
                            key={option.key}
                            type="button"
                            aria-pressed={checked}
                            disabled={pending || isCurrentUser}
                            onClick={() => toggleIdentity(user.id, option.key)}
                            title={isCurrentUser ? "不能修改当前登录账号的身份" : undefined}
                            className={`h-7 rounded-full border px-2.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                              checked
                                ? "border-[#115740]/40 bg-[#eef5f1] font-medium text-[#115740]"
                                : "border-[#7f9384] bg-white text-[#33433d] hover:border-[#115740] hover:bg-[#eef5f1]"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-1 text-xs text-[#6c7e76]">
                      {draft.length > 1
                        ? `多身份：${draft.map((item) => IDENTITY_OPTIONS.find((option) => option.key === item)?.label).join(" + ")}`
                        : "单一身份"}
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.approvalStatus === "APPROVED"
                          ? "bg-[#eef5f1] text-[#115740] ring-1 ring-[#cbe0d4]"
                          : user.approvalStatus === "REJECTED"
                            ? "bg-[#faeaea] text-[#9e2a35] ring-1 ring-[#eccacd]"
                            : "bg-[#fdf6e7] text-[#9a5b13] ring-1 ring-[#ead4a8]"
                      }`}
                    >
                      {user.approvalStatus === "APPROVED" ? "已审核" : user.approvalStatus === "REJECTED" ? "已驳回" : "待审核"}
                    </span>
                    <div className="mt-1 text-xs text-[#54635d]">
                      {user.roles
                        .map((item) =>
                          item === "ADMIN" ? "管理员" : item === "STUDENT" ? "学生" : item === "TEACHER" ? "指导教师" : "普通用户",
                        )
                        .join(" + ")}
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-xs text-[#54635d]">
                    {user.approvedBy ? <div>{user.approvedBy}</div> : <span className="text-[#8c9c95]">系统自动</span>}
                    {user.approvedAt ? <div className="mt-0.5 tabular-nums">{formatDate(user.approvedAt)}</div> : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-xs text-[#54635d] tabular-nums">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        className="h-8 px-3 text-xs"
                        disabled={pending || user.approvalStatus === "APPROVED"}
                        onClick={() => void updateUser(user.id, { action: "APPROVE" })}
                      >
                        {user.approvalStatus === "APPROVED" ? "已审核" : "审核通过"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        type="button"
                        className="h-8 px-3 text-xs"
                        disabled={pending || isCurrentUser || user.approvalStatus === "REJECTED"}
                        onClick={() => void updateUser(user.id, { action: "REJECT" })}
                      >
                        驳回
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        className="h-8 bg-[#115740] px-3.5 text-xs text-white hover:bg-[#0d4633]"
                        disabled={pending || isCurrentUser || !changed || draft.length === 0}
                        onClick={() => void updateUser(user.id, { action: "UPDATE_ROLES", roles: draft })}
                      >
                        {pending ? "处理中…" : "保存身份"}
                      </Button>
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
