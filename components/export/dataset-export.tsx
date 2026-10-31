"use client";

import { useState } from "react";
import { datasetFieldMap, datasetFields, defaultDatasetFields, requiredDatasetFields } from "@/lib/export-fields";
import type { DatasetFieldKey } from "@/lib/export-fields";

export function DatasetExport({
  scope,
  filters = {},
  buttonLabel,
}: {
  scope: "mine" | "all";
  filters?: Record<string, string>;
  buttonLabel: string;
}) {
  const [selected, setSelected] = useState<DatasetFieldKey[]>(defaultDatasetFields);
  const [confirmSensitive, setConfirmSensitive] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const sensitiveSelected = selected.some((field) => datasetFieldMap[field].sensitive);

  function toggle(field: DatasetFieldKey) {
    setSelected((current) => {
      if (current.includes(field)) {
        if (scope === "mine" && requiredDatasetFields.includes(field)) return current;
        return current.filter((item) => item !== field);
      }
      return [...current, field];
    });
  }

  function move(index: number, direction: -1 | 1) {
    setSelected((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <details>
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-blue-700 hover:bg-blue-50">{buttonLabel}<span className="ml-2 text-xs font-normal text-slate-400">字段勾选与调序</span></summary>
        <div className="grid gap-5 border-t border-slate-100 p-5 lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-slate-800">可选字段</h3>
              <button type="button" onClick={() => setSelected(defaultDatasetFields)} className="text-xs text-blue-600 hover:underline">恢复默认 27 列</button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {datasetFields.map((field) => {
                const required = scope === "mine" && requiredDatasetFields.includes(field.key);
                return (
                  <label key={field.key} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${field.sensitive ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-600"}`}>
                    <input type="checkbox" checked={selected.includes(field.key)} disabled={required || pending} onChange={() => toggle(field.key)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                    <span>{field.label}{field.sensitive ? "（敏感）" : ""}{required ? "（必选）" : ""}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-800">导出列顺序（{selected.length}）</h3>
            <ol className="mt-3 max-h-72 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
              {selected.map((field, index) => (
                <li key={field} className="flex items-center gap-2 rounded bg-slate-50 px-2 py-1.5 text-xs text-slate-700">
                  <span className="w-6 text-center text-slate-400">{index + 1}</span>
                  <span className="flex-1">{datasetFieldMap[field].label}</span>
                  <button type="button" aria-label={`上移${datasetFieldMap[field].label}`} disabled={index === 0 || pending} onClick={() => move(index, -1)} className="rounded border border-slate-300 px-2 py-0.5 disabled:opacity-30">上移</button>
                  <button type="button" aria-label={`下移${datasetFieldMap[field].label}`} disabled={index === selected.length - 1 || pending} onClick={() => move(index, 1)} className="rounded border border-slate-300 px-2 py-0.5 disabled:opacity-30">下移</button>
                </li>
              ))}
            </ol>
            {scope === "all" && sensitiveSelected ? (
              <label className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <input type="checkbox" checked={confirmSensitive} disabled={pending} onChange={(event) => setConfirmSensitive(event.target.checked)} className="mt-0.5 h-4 w-4" />
                <span>二次确认：导出完整身份证与银行卡号。不勾选则敏感列脱敏。</span>
              </label>
            ) : null}
            {scope === "mine" && sensitiveSelected ? <p className="mt-3 text-xs text-slate-500">学生数据表中的身份证与银行卡号始终脱敏。</p> : null}
            {scope === "all" ? <p className="mt-3 text-xs text-slate-500">按当前筛选结果导出，单次最多 5000 行。</p> : <p className="mt-3 text-xs text-slate-500">项目名称与状态为必选列，仅导出本人参与的项目。</p>}
            {error ? <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}
            {notice ? <p role="status" className="mt-3 text-xs text-emerald-600">{notice}</p> : null}
            <button
              type="button"
              disabled={!selected.length || pending}
              onClick={async () => {
                setPending(true);
                setError("");
                setNotice("");
                try {
                  const response = await fetch("/api/export/dataset", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...filters, scope, fields: selected, confirmSensitive: confirmSensitive ? "1" : "0" }),
                  });
                  if (!response.ok) {
                    const result = await response.json() as { message?: string };
                    throw new Error(result.message || "导出数据表失败");
                  }
                  const blob = await response.blob();
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement("a");
                  anchor.href = url;
                  anchor.download = "数据表.xlsx";
                  document.body.appendChild(anchor);
                  anchor.click();
                  anchor.remove();
                  URL.revokeObjectURL(url);
                  setNotice(`已导出 ${selected.length} 列`);
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "导出数据表失败");
                } finally {
                  setPending(false);
                }
              }}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? "导出中…" : buttonLabel}
            </button>
          </div>
        </div>
      </details>
    </section>
  );
}
