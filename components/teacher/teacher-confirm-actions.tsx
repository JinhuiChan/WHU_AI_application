"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  teacherId: string;
  confirmStatus: string;
};

export function TeacherConfirmActions({ teacherId, confirmStatus }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "reject">("idle");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function send(action: "confirm" | "reject") {
    setError("");
    if (action === "reject" && reason.trim().length === 0) {
      setError("请填写拒绝理由");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/teacher/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, action, reason: action === "reject" ? reason.trim() : undefined }),
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

  if (confirmStatus !== "PENDING") {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => send("confirm")}
          disabled={pending}
          className="h-7 rounded-full px-3 text-xs font-medium"
        >
          确认指导关系
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setMode(mode === "reject" ? "idle" : "reject")}
          disabled={pending}
          className="h-7 rounded-full border-red-300 px-3 text-xs font-medium text-red-700 hover:bg-red-50 hover:text-red-700"
        >
          拒绝
        </Button>
      </div>
      {mode === "reject" ? (
        <div className="space-y-1">
          <textarea
            className="w-56 rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-blue-600"
            placeholder="拒绝理由（必填，不超过 200 字）"
            maxLength={200}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => send("reject")}
            disabled={pending}
            className="h-7 rounded-full border-red-300 px-2 text-xs text-red-700 hover:bg-red-50 hover:text-red-700"
          >
            确认拒绝
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
