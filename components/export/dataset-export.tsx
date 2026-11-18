"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { datasetFieldMap, datasetFields, defaultDatasetFields, requiredDatasetFields } from "@/lib/export-fields";
import type { DatasetFieldKey } from "@/lib/export-fields";

export function DatasetExport({
  scope,
  filters = {},
  buttonLabel,
  embedded = false,
}: {
  scope: "mine" | "all";
  filters?: Record<string, string>;
  buttonLabel: string;
  embedded?: boolean;
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

  const inner = (
    <details className="group">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-3 text-xs font-semibold text-[#115740] transition-colors hover:bg-[#f5faf7] marker:content-none">
        <span>
          {buttonLabel}
          <span className="ml-2 font-normal text-[#54635d]">按当前筛选导出 Excel · 支持字段勾选与列序调整</span>
        </span>
        <span className="inline-flex items-center rounded-full bg-[#eef5f1] px-2.5 py-0.5 text-[11px] font-medium text-[#115740]">
          <span className="group-open:hidden">展开字段配置</span>
          <span className="hidden group-open:inline">收起字段配置</span>
        </span>
      </summary>
      <div className="grid gap-5 border-t border-[#dce7e0] bg-white p-5 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[#0f1d18]">可选导出字段</h3>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setSelected(defaultDatasetFields)}
              className="h-8 rounded-full border-[#7f9384] bg-white px-3.5 text-xs text-[#162620] hover:border-[#115740] hover:bg-[#eef5f1]"
            >
              恢复默认 27 列
            </Button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {datasetFields.map((field) => {
              const required = scope === "mine" && requiredDatasetFields.includes(field.key);
              return (
                <label
                  key={field.key}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors ${
                    field.sensitive
                      ? "border-[#e8cf9d] bg-[#fbf3e2]/70 text-[#9a6712]"
                      : "border-[#d5e2db] bg-[#f8fbf9] text-[#33433d] hover:border-[#115740]/45"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(field.key)}
                    disabled={required || pending}
                    onChange={() => toggle(field.key)}
                    className="h-4 w-4 shrink-0 rounded border-[#7f9384] accent-[#115740] text-[#115740] focus:ring-2 focus:ring-[#115740]/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <span>
                    {field.label}
                    {field.sensitive ? "（敏感）" : ""}
                    {required ? "（必选）" : ""}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[#0f1d18] tabular-nums">导出列顺序（已选 {selected.length} 列）</h3>
          <ol className="mt-3 max-h-72 space-y-1.5 overflow-y-auto rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-2.5">
            {selected.map((field, index) => (
              <li
                key={field}
                className="flex items-center gap-2 rounded-lg border border-[#e3ede7] bg-white px-2.5 py-1.5 text-xs text-[#162620]"
              >
                <span className="w-6 text-center font-display font-semibold text-[#54635d] tabular-nums">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate">{datasetFieldMap[field].label}</span>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  aria-label={`上移${datasetFieldMap[field].label}`}
                  disabled={index === 0 || pending}
                  onClick={() => move(index, -1)}
                  className="h-7 rounded-full border-[#7f9384] px-2.5 text-xs text-[#33433d] hover:border-[#115740] hover:bg-[#eef5f1]"
                >
                  上移
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  aria-label={`下移${datasetFieldMap[field].label}`}
                  disabled={index === selected.length - 1 || pending}
                  onClick={() => move(index, 1)}
                  className="h-7 rounded-full border-[#7f9384] px-2.5 text-xs text-[#33433d] hover:border-[#115740] hover:bg-[#eef5f1]"
                >
                  下移
                </Button>
              </li>
            ))}
          </ol>

          {scope === "all" && sensitiveSelected ? (
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#e8cf9d] bg-[#fbf3e2] p-3 text-xs leading-5 text-[#9a6712]">
              <input
                type="checkbox"
                checked={confirmSensitive}
                disabled={pending}
                onChange={(event) => setConfirmSensitive(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#7f9384] accent-[#115740] text-[#115740] focus:ring-2 focus:ring-[#115740]/20"
              />
              <span>二次确认：导出完整身份证与银行卡号。不勾选则敏感列自动脱敏。</span>
            </label>
          ) : null}

          {scope === "mine" && sensitiveSelected ? (
            <p className="mt-3 text-xs text-[#54635d]">学生数据表中的身份证与银行卡号始终自动脱敏。</p>
          ) : null}
          {scope === "all" ? (
            <p className="mt-2 text-xs text-[#54635d]">按当前筛选结果导出，单次最多 5000 行。</p>
          ) : (
            <p className="mt-2 text-xs text-[#54635d]">项目名称与状态为必选列，仅导出本人参与的项目。</p>
          )}
          {error ? (
            <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-[#b91c1c]">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="mt-3 text-xs font-medium text-[#115740]">
              {notice}
            </p>
          ) : null}

          <Button
            variant="default"
            size="default"
            type="button"
            loading={pending}
            disabled={!selected.length || pending}
            onClick={async () => {
              setPending(true);
              setError("");
              setNotice("");
              try {
                const response = await fetch("/api/export/dataset", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...filters,
                    scope,
                    fields: selected,
                    confirmSensitive: confirmSensitive ? "1" : "0",
                  }),
                });
                if (!response.ok) {
                  const result = (await response.json()) as { message?: string };
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
            className="mt-4 rounded-full bg-[#115740] px-6 text-white hover:bg-[#0d4633] active:bg-[#093325] focus-visible:ring-[#115740]/25"
          >
            {pending ? "导出中…" : buttonLabel}
          </Button>
        </div>
      </div>
    </details>
  );

  if (embedded) {
    return <div className="border-t border-[#dce7e0] bg-white">{inner}</div>;
  }
  return <section className="overflow-hidden card">{inner}</section>;
}
