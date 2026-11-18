"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useDialogA11y } from "@/components/ui/use-dialog-a11y";

export function RejectDialog({
  title,
  pending,
  onCancel,
  onConfirm,
}: {
  title: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const dialogRef = useDialogA11y(true, onCancel, !pending);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#09211a]/45 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-dialog-title"
    >
      <form
        className="w-full max-w-lg rounded-2xl border border-[#c9dad1] bg-white p-6 shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          const normalized = reason.trim();
          if (!normalized) {
            setError("请填写驳回理由");
            return;
          }
          onConfirm(normalized);
        }}
      >
        <h2 id="reject-dialog-title" className="font-display text-lg font-bold text-[#0e1d17]">
          {title}
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-[#54635d]">
          驳回后项目状态将更新为「已驳回」，所填理由与审核级别将完整留存于审核台账。
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-[6.5rem_1fr] sm:items-start">
          <label htmlFor="reject-dialog-reason" className="text-sm font-medium text-[#1b2b25] sm:pt-2">
            驳回理由 <span className="text-[#9e2a35]">*</span>
          </label>
          <div>
            <textarea
              id="reject-dialog-reason"
              autoFocus
              value={reason}
              maxLength={200}
              disabled={pending}
              onChange={(event) => {
                setReason(event.target.value);
                setError("");
              }}
              placeholder="请说明需补充或修改的具体事项，最多 200 字"
              className="min-h-32 w-full resize-y rounded-lg border border-[#7f9384] bg-white px-3 py-2 text-sm text-[#0f1d18] outline-none transition focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15 disabled:bg-slate-100"
            />
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-[#9e2a35]" role="alert">
                {error}
              </span>
              <span className="text-[#6c7e76] tabular-nums">{reason.length} / 200</span>
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2.5">
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
            取消
          </Button>
          <Button
            type="submit"
            variant="destructive"
            disabled={pending}
            className="border-red-300 bg-[#faeaea] text-[#9e2a35] hover:bg-red-100"
          >
            {pending ? "提交中…" : "确认驳回"}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
