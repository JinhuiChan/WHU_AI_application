"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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
    return <span className="text-xs text-[#6c7e76]">已办结</span>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap">
        <Button
          type="button"
          size="sm"
          onClick={() => void send("approve")}
          disabled={pending}
          className="h-8 rounded-full bg-[#115740] px-3.5 text-xs text-white hover:bg-[#0d4633] active:scale-[0.98] active:bg-[#093526] focus-visible:ring-[#115740]/25 disabled:opacity-60"
        >
          通过
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setMode(mode === "reject" ? "idle" : "reject")}
          disabled={pending}
          className="h-8 rounded-full border-[#c98a91] bg-white px-3.5 text-xs text-[#9e2a35] hover:border-[#9e2a35] hover:bg-[#fdf2f3] active:scale-[0.98] focus-visible:ring-[#9e2a35]/20 disabled:opacity-60"
        >
          驳回
        </Button>
      </div>
      {mode === "reject" ? (
        <div className="space-y-1.5 whitespace-normal">
          <textarea
            className="w-52 rounded-lg border border-[#7f9384] bg-white px-2.5 py-1.5 text-xs text-[#0f1d18] outline-none transition-colors placeholder:text-[#7c8e85] focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25"
            placeholder="驳回理由（必填，不超过 200 字）"
            maxLength={200}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void send("reject")}
            disabled={pending}
            className="h-8 rounded-full border-[#9e2a35] bg-[#9e2a35] px-4 text-xs text-white hover:bg-[#82202a] active:scale-[0.98] focus-visible:ring-[#9e2a35]/25 disabled:opacity-60"
          >
            确认驳回
          </Button>
        </div>
      ) : null}
      {error ? <p role="alert" className="text-xs text-[#9e2a35]">{error}</p> : null}
    </div>
  );
}
