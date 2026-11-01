"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  requestId: string;
  status: string;
};

export function ChangeReviewActions({ requestId, status }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "reject">("idle");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const actionable = status === "PENDING_COLLEGE" || status === "PENDING_SCHOOL";

  async function send(action: "approve" | "reject") {
    setError("");
    if (action === "reject" && reason.trim().length === 0) {
      setError("请填写驳回理由");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/change/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action, reason: action === "reject" ? reason.trim() : undefined }),
      });
      const result = (await response.json()) as { code: number; message: string };
      if (!response.ok || result.code !== 0) {
        setError(result.message || "操作失败");
        return;
      }
      setMode("idle");
      setReason("");
      router.refresh();
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  if (!actionable) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => send("approve")}
          disabled={pending}
          className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          通过
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "reject" ? "idle" : "reject")}
          disabled={pending}
          className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          驳回
        </button>
      </div>
      {mode === "reject" ? (
        <div className="space-y-1">
          <textarea
            className="w-56 rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-blue-600"
            placeholder="驳回理由（必填，不超过 200 字）"
            maxLength={200}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <button
            type="button"
            onClick={() => send("reject")}
            disabled={pending}
            className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-60"
          >
            确认驳回
          </button>
        </div>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
