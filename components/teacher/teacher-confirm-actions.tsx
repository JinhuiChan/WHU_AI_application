"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
      setError("请填写退回理由");
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
      toast.success(action === "confirm" ? "已确认指导关系" : "已退回指导申请");
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
    return <span className="text-xs text-[#7c8e85]">已处理</span>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap">
        <Button
          type="button"
          size="sm"
          onClick={() => void send("confirm")}
          loading={pending && mode === "idle"}
          disabled={pending}
          className="h-8 rounded-full bg-[#115740] px-3 text-xs font-medium text-white hover:bg-[#0d4633] active:bg-[#093426] focus-visible:ring-[#115740]/30"
        >
          确认指导
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-expanded={mode === "reject"}
          onClick={() => {
            setMode(mode === "reject" ? "idle" : "reject");
            setError("");
          }}
          disabled={pending}
          className="h-8 rounded-full border-[#7f9384] bg-white px-3 text-xs font-medium text-[#24362f] hover:border-[#9e2a35] hover:bg-red-50/60 hover:text-[#9e2a35]"
        >
          {mode === "reject" ? "收起" : "退回"}
        </Button>
      </div>

      {mode === "reject" ? (
        <div className="w-56 whitespace-normal space-y-2 rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-3">
          <label className="block text-xs font-medium text-[#24362f]">
            <span className="mb-1.5 flex items-center justify-between">
              <span>退回理由</span>
              <span className="font-normal tabular-nums text-[#6c7e76]">{Array.from(reason).length}/200</span>
            </span>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-[#7f9384] bg-white px-2.5 py-1.5 text-xs text-[#0f1d18] outline-none transition-colors focus:border-[#115740] focus-visible:ring-2 focus-visible:ring-[#115740]/20 disabled:bg-[#f2f6f4]"
              placeholder="说明指导信息不符之处（必填，不超过 200 字）"
              maxLength={200}
              disabled={pending}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <div className="flex items-center justify-end gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setMode("idle");
                setError("");
              }}
              disabled={pending}
              className="h-7 rounded-full border-[#7f9384] px-2.5 text-xs text-[#33433d] hover:border-[#115740] hover:bg-[#f2f8f4]"
            >
              取消
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => void send("reject")}
              loading={pending}
              disabled={pending}
              className="h-7 rounded-full px-3 text-xs"
            >
              确认退回
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
