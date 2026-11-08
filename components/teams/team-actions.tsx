"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TeamJoinStatus, TeamPostStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ApiResponse } from "@/types/api";

const joinStatusLabels: Record<TeamJoinStatus, string> = {
  PENDING: "待处理",
  ACCEPTED: "已接受",
  DECLINED: "已婉拒",
  CANCELLED: "已取消",
  LEFT: "已退出",
};

export function TeamPostActions({
  postId,
  status,
  isAuthor,
  isAdmin,
  isStudent,
  removed,
  canApply,
  existingRequestStatus,
}: {
  postId: string;
  status: TeamPostStatus;
  isAuthor: boolean;
  isAdmin: boolean;
  isStudent: boolean;
  removed: boolean;
  canApply: boolean;
  existingRequestStatus?: TeamJoinStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"close" | "join" | "remove" | null>(null);
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [error, setError] = useState("");

  async function close() {
    setPending("close");
    setError("");
    try {
      const response = await fetch(`/api/teams/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLOSE" }),
      });
      const result = await response.json() as ApiResponse<unknown>;
      if (!response.ok || result.code !== 0) throw new Error(result.message || "关闭招募失败");
      toast.success(result.message || "组队帖已关闭");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "关闭招募失败");
    } finally {
      setPending(null);
    }
  }

  async function join() {
    setPending("join");
    setError("");
    try {
      const response = await fetch(`/api/teams/${postId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const result = await response.json() as ApiResponse<unknown>;
      if (!response.ok || result.code !== 0) throw new Error(result.message || "申请入队失败");
      toast.success(result.message || "入队申请已提交");
      setMessage("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "申请入队失败");
    } finally {
      setPending(null);
    }
  }

  async function remove() {
    setPending("remove");
    setError("");
    try {
      const response = await fetch(`/api/teams/${postId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const result = await response.json() as ApiResponse<unknown>;
      if (!response.ok || result.code !== 0) throw new Error(result.message || "下架组队帖失败");
      toast.success(result.message || "组队帖已下架");
      setConfirmingRemove(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "下架组队帖失败");
    } finally {
      setPending(null);
    }
  }

  const requestActive = existingRequestStatus === "PENDING" || existingRequestStatus === "ACCEPTED";

  return (
    <div className="space-y-3 border-t border-slate-100 pt-4">
      {isAuthor && !removed && (status === "RECRUITING" || status === "FULL") ? (
        <Button type="button" variant="outline" className="w-full" loading={pending === "close"} disabled={pending !== null} onClick={() => void close()}>
          关闭招募
        </Button>
      ) : null}
      {!isAuthor && isStudent ? (
        requestActive && existingRequestStatus ? (
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-2">
              <span>我的入队申请</span>
              <StatusBadge status={existingRequestStatus} scope="team">{joinStatusLabels[existingRequestStatus]}</StatusBadge>
            </div>
            <p className="mt-2 text-xs text-slate-500">{existingRequestStatus === "PENDING" ? "申请已提交，请等待发起人处理。" : "你已成为这支队伍的成员。"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {existingRequestStatus === "DECLINED" ? <p className="text-xs text-slate-500">上次申请已被婉拒，可以修改留言后再次申请。</p> : null}
            <label className="block text-sm text-slate-700">
              <span className="mb-1 block">申请留言</span>
              <textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} disabled={!canApply || pending !== null} placeholder="介绍你的技能、经验和可投入时间（选填）" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 disabled:bg-slate-50" />
            </label>
            <Button type="button" className="w-full" loading={pending === "join"} disabled={!canApply || pending !== null} onClick={() => void join()}>
              申请加入
            </Button>
            {!canApply ? <p className="text-xs text-slate-500">{removed ? "帖子已下架，无法申请。" : status === "RECRUITING" ? "当前没有可申请的位置。" : "当前帖子已停止招募。"}</p> : null}
          </div>
        )
      ) : null}
      {!isAuthor && !isStudent && !isAdmin ? <p className="text-xs text-slate-500">仅学生可以申请加入。</p> : null}
      {isAdmin && !removed ? (
        confirmingRemove ? (
          <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <label className="block text-xs text-red-700">
              <span className="mb-1 block">下架原因（选填）</span>
              <textarea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-red-400" />
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="destructive" size="sm" loading={pending === "remove"} disabled={pending !== null} onClick={() => void remove()}>确认下架</Button>
              <Button type="button" variant="outline" size="sm" disabled={pending !== null} onClick={() => setConfirmingRemove(false)}>取消</Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="destructive" className="w-full" disabled={pending !== null} onClick={() => { setConfirmingRemove(true); setError(""); }}>下架</Button>
        )
      ) : null}
      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

export function RequestDecisionButtons({ postId, requestId }: { postId: string; requestId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"ACCEPT" | "DECLINE" | null>(null);
  const [error, setError] = useState("");

  async function decide(action: "ACCEPT" | "DECLINE") {
    setPending(action);
    setError("");
    try {
      const response = await fetch(`/api/teams/${postId}/requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json() as ApiResponse<unknown>;
      if (!response.ok || result.code !== 0) throw new Error(result.message || "处理申请失败");
      toast.success(result.message || (action === "ACCEPT" ? "已接受入队申请" : "已婉拒入队申请"));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "处理申请失败");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" loading={pending === "ACCEPT"} disabled={pending !== null} onClick={() => void decide("ACCEPT")}>接受</Button>
        <Button type="button" size="sm" variant="outline" loading={pending === "DECLINE"} disabled={pending !== null} onClick={() => void decide("DECLINE")}>婉拒</Button>
      </div>
      {error ? <p role="alert" className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
