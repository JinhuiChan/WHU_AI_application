"use client";

import { useState } from "react";

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="reject-dialog-title">
      <form
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
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
        <h2 id="reject-dialog-title" className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">驳回后项目状态为 REJECTED，理由和审核级别将保留在审核记录中。</p>
        <label className="mt-5 block text-sm font-medium text-slate-700">
          驳回理由 <span className="text-red-600">*</span>
          <textarea
            autoFocus
            value={reason}
            maxLength={200}
            disabled={pending}
            onChange={(event) => { setReason(event.target.value); setError(""); }}
            placeholder="请说明驳回原因，最多 200 字"
            className="mt-2 min-h-32 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-blue-600 disabled:bg-slate-100"
          />
        </label>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-red-600" role="alert">{error}</span>
          <span className="text-slate-400">{reason.length} / 200</span>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" disabled={pending} onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">取消</button>
          <button type="submit" disabled={pending} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">{pending ? "提交中…" : "确认驳回"}</button>
        </div>
      </form>
    </div>
  );
}
