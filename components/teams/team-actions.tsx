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
      const result = (await response.json()) as ApiResponse<unknown>;
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
      const result = (await response.json()) as ApiResponse<unknown>;
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
      const result = (await response.json()) as ApiResponse<unknown>;
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
    <div className="space-y-3 border-t border-[#e5eee8] pt-4">
      {isAuthor && !removed && (status === "RECRUITING" || status === "FULL") ? (
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full rounded-full border-[#7f9384] text-[#24362f] hover:border-[#115740] hover:bg-[#f2f8f4]"
          loading={pending === "close"}
          disabled={pending !== null}
          onClick={() => void close()}
        >
          关闭招募
        </Button>
      ) : null}

      {!isAuthor && isStudent ? (
        requestActive && existingRequestStatus ? (
          <div className="rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-3.5 text-sm text-[#24362f]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">我的入队申请</span>
              <StatusBadge status={existingRequestStatus} scope="team">
                {joinStatusLabels[existingRequestStatus]}
              </StatusBadge>
            </div>
            <p className="mt-2 text-xs text-[#5c6c65]">
              {existingRequestStatus === "PENDING" ? "申请已提交，请等待发起人处理。" : "你已成为这支队伍的成员。"}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {existingRequestStatus === "DECLINED" ? (
              <p className="text-xs text-[#5c6c65]">上次申请已被婉拒，可以补充个人优势后再次申请。</p>
            ) : null}
            <label className="block text-sm text-[#24362f]">
              <span className="mb-1.5 block text-xs font-medium text-[#4a5c54]">申请留言</span>
              <textarea
                rows={3}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                disabled={!canApply || pending !== null}
                placeholder="介绍你的技能、经验和可投入时间（选填）"
                className="w-full rounded-xl border border-[#7f9384] bg-white px-3 py-2 text-sm text-[#0f1d18] outline-none transition-colors focus:border-[#115740] focus-visible:ring-2 focus-visible:ring-[#115740]/20 disabled:bg-[#f2f6f4] disabled:text-[#6c7e76]"
              />
            </label>
            <Button
              type="button"
              className="h-10 w-full rounded-full bg-[#115740] text-white hover:bg-[#0d4633] active:bg-[#093426] focus-visible:ring-[#115740]/30"
              loading={pending === "join"}
              disabled={!canApply || pending !== null}
              onClick={() => void join()}
            >
              申请加入
            </Button>
            {!canApply ? (
              <p className="text-xs text-[#5c6c65]">
                {removed
                  ? "帖子已下架，无法申请。"
                  : status === "RECRUITING"
                    ? "当前没有可申请的位置。"
                    : "当前帖子已停止招募。"}
              </p>
            ) : null}
          </div>
        )
      ) : null}

      {!isAuthor && !isStudent && !isAdmin ? <p className="text-xs text-[#5c6c65]">仅学生可以申请加入。</p> : null}

      {isAdmin && !removed ? (
        confirmingRemove ? (
          <div className="space-y-2.5 rounded-xl border border-red-200 bg-red-50/70 p-3.5">
            <label className="block text-xs font-medium text-red-800">
              <span className="mb-1.5 block">下架原因（选填）</span>
              <textarea
                rows={2}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="w-full rounded-lg border border-[#7f9384] bg-white px-3 py-2 text-sm text-[#0f1d18] outline-none transition-colors focus:border-red-600 focus-visible:ring-2 focus-visible:ring-red-200"
              />
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="rounded-full"
                loading={pending === "remove"}
                disabled={pending !== null}
                onClick={() => void remove()}
              >
                确认下架
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-[#7f9384] text-[#24362f] hover:border-[#115740] hover:bg-[#f2f8f4]"
                disabled={pending !== null}
                onClick={() => setConfirmingRemove(false)}
              >
                取消
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="destructive"
            className="h-10 w-full rounded-full"
            disabled={pending !== null}
            onClick={() => {
              setConfirmingRemove(true);
              setError("");
            }}
          >
            下架
          </Button>
        )
      ) : null}

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </p>
      ) : null}
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
      const result = (await response.json()) as ApiResponse<unknown>;
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
        <Button
          type="button"
          size="sm"
          className="rounded-full bg-[#115740] text-white hover:bg-[#0d4633] active:bg-[#093426] focus-visible:ring-[#115740]/30"
          loading={pending === "ACCEPT"}
          disabled={pending !== null}
          onClick={() => void decide("ACCEPT")}
        >
          接受
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full border-[#7f9384] text-[#24362f] hover:border-[#9e2a35] hover:bg-red-50/60 hover:text-[#9e2a35]"
          loading={pending === "DECLINE"}
          disabled={pending !== null}
          onClick={() => void decide("DECLINE")}
        >
          婉拒
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
