"use client";

import { useState } from "react";
import Link from "next/link";
import type { AnomalyResolution, AnomalyStatus } from "@prisma/client";
import { anomalyResolutionLabels, anomalyRuleNames, formatDateTime } from "@/lib/presentation";
import type { AnomalyData } from "@/types/anomaly";
import type { ApiResponse } from "@/types/api";

const resolutions: AnomalyResolution[] = ["CONFIRMED", "FIXED", "UNTRACEABLE"];

function anomalyQuery(status: AnomalyStatus | null, ruleId: string | null) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (ruleId) params.set("ruleId", ruleId);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function AnomalyManagement({ initialData, isAdmin }: { initialData: AnomalyData; isAdmin: boolean }) {
  const [data, setData] = useState(initialData);
  const [drafts, setDrafts] = useState<Record<string, AnomalyResolution>>({});
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchResolution, setBatchResolution] = useState<AnomalyResolution>("CONFIRMED");
  const [filterPending, setFilterPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function filter(status: AnomalyStatus | null, ruleId: string | null) {
    setFilterPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/anomalies${anomalyQuery(status, ruleId)}`);
      const result = (await response.json()) as ApiResponse<AnomalyData>;
      if (!response.ok || result.code !== 0) throw new Error(result.message || "筛选失败");
      setData(result.data);
      setSelectedIds([]);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "筛选失败，请稍后重试");
    } finally {
      setFilterPending(false);
    }
  }

  async function resolveMany(ids: string[], resolution: AnomalyResolution) {
    if (!ids.length) return;
    setPendingIds(ids);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/anomalies${anomalyQuery(data.status, data.ruleId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, resolution }),
      });
      const result = (await response.json()) as ApiResponse<AnomalyData>;
      if (!response.ok || result.code !== 0) throw new Error(result.message || "处置失败");
      setData(result.data);
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
      setNotice(result.message);
      setDrafts((current) => {
        const next = { ...current };
        for (const id of ids) delete next[id];
        return next;
      });
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "处置失败，请稍后重试");
    } finally {
      setPendingIds([]);
    }
  }

  const filters: { label: string; value: AnomalyStatus | null }[] = [
    { label: "全部", value: null },
    { label: "待核实", value: "PENDING" },
    { label: "已处置", value: "RESOLVED" },
  ];
  const visiblePendingIds = data.groups.flatMap((group) =>
    group.items.filter((item) => item.status === "PENDING").map((item) => item.id),
  );
  const allVisibleSelected = visiblePendingIds.length > 0 && visiblePendingIds.every((id) => selectedIds.includes(id));

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-4"><div className="text-xs text-slate-500">异常总数</div><div className="mt-1 text-2xl font-semibold text-slate-900">{data.summary.total}</div></div>
          <div className="rounded-lg bg-amber-50 p-4"><div className="text-xs text-amber-700">待核实</div><div className="mt-1 text-2xl font-semibold text-amber-700">{data.summary.pending}</div></div>
          <div className="rounded-lg bg-green-50 p-4"><div className="text-xs text-green-700">已处置</div><div className="mt-1 text-2xl font-semibold text-green-700">{data.summary.resolved}</div></div>
          <div className="rounded-lg bg-blue-50 p-4"><div className="text-xs text-blue-700">处置率</div><div className="mt-1 text-2xl font-semibold text-blue-700">{data.summary.resolutionRate}%</div></div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="异常处置率" aria-valuenow={data.summary.resolutionRate} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${data.summary.resolutionRate}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500"><span>已处置 {data.summary.resolved} / 总数 {data.summary.total}</span><span>{data.summary.resolutionRate}%</span></div>
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2" aria-label="按状态筛选">
          {filters.map((item) => (
            <button key={item.label} type="button" disabled={filterPending || pendingIds.length > 0} onClick={() => filter(item.value, data.ruleId)} aria-pressed={data.status === item.value} className={`h-9 rounded-md px-4 text-sm ${data.status === item.value ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-500">
            规则筛选
            <select aria-label="按规则筛选" value={data.ruleId ?? ""} disabled={filterPending || pendingIds.length > 0} onChange={(event) => filter(data.status, event.target.value || null)} className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700">
              <option value="">全部规则</option>
              {Object.entries(anomalyRuleNames).map(([ruleId, ruleName]) => <option key={ruleId} value={ruleId}>{ruleId} {ruleName}</option>)}
            </select>
          </label>
          {!isAdmin ? <p className="text-xs text-slate-500">普通用户仅可查看</p> : null}
        </div>
      </div>

      {isAdmin ? (
        <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                aria-label="全选当前待核实异常"
                checked={allVisibleSelected}
                disabled={!visiblePendingIds.length || filterPending || pendingIds.length > 0}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setSelectedIds((current) => checked
                    ? [...new Set([...current, ...visiblePendingIds])]
                    : current.filter((id) => !visiblePendingIds.includes(id)));
                }}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              全选当前待核实
            </label>
            <span className="text-xs text-slate-500">已选 {selectedIds.length} 条</span>
          </div>
          <div className="flex gap-2">
            <select aria-label="批量处置结论" value={batchResolution} disabled={!selectedIds.length || pendingIds.length > 0} onChange={(event) => setBatchResolution(event.target.value as AnomalyResolution)} className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-600 disabled:bg-slate-100">
              {resolutions.map((resolution) => <option key={resolution} value={resolution}>{anomalyResolutionLabels[resolution]}</option>)}
            </select>
            <button type="button" disabled={!selectedIds.length || pendingIds.length > 0} onClick={() => resolveMany(selectedIds, batchResolution)} className="h-9 rounded-md bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {pendingIds.length > 1 ? "批量处置中…" : `批量处置${selectedIds.length ? `（${selectedIds.length}）` : ""}`}
            </button>
          </div>
        </section>
      ) : null}

      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {notice ? <div role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</div> : null}

      {data.groups.length ? data.groups.map((group) => (
        <section key={group.ruleId} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">{group.ruleId}</span>
              <h2 className="text-sm font-medium text-slate-900">{group.ruleName}</h2>
            </div>
            <span className="text-xs text-slate-500">{group.items.length} 条</span>
          </header>
          <div className="divide-y divide-slate-100">
            {group.items.map((item) => (
              <article key={item.id} className="p-4">
                <div className="flex items-start gap-3">
                  {isAdmin && item.status === "PENDING" ? (
                    <input
                      type="checkbox"
                      aria-label={`选择异常：${item.project.name}`}
                      checked={selectedIds.includes(item.id)}
                      disabled={pendingIds.length > 0}
                      onChange={(event) => setSelectedIds((current) => event.target.checked
                        ? [...current, item.id]
                        : current.filter((id) => id !== item.id))}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600"
                    />
                  ) : null}
                  <div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/projects/${item.project.id}`} className="font-medium text-slate-900 hover:text-blue-600">{item.project.name}</Link>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${item.status === "PENDING" ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>{item.status === "PENDING" ? "待核实" : "已处置"}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{item.project.year} · {item.project.college}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                      {item.status === "RESOLVED" ? (
                        <p className="mt-3 text-xs leading-5 text-slate-500">
                          处置结论：<span className="font-medium text-slate-700">{item.resolution ? anomalyResolutionLabels[item.resolution] : "—"}</span>
                          {item.resolvedBy ? ` · ${item.resolvedBy}` : ""}
                          {item.resolvedAt ? ` · ${formatDateTime(item.resolvedAt)}` : ""}
                        </p>
                      ) : null}
                    </div>
                    {isAdmin && item.status === "PENDING" ? (
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                        <select aria-label={`选择${item.project.name}的处置结论`} value={drafts[item.id] ?? "CONFIRMED"} disabled={pendingIds.length > 0} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: event.target.value as AnomalyResolution }))} className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-600">
                          {resolutions.map((resolution) => <option key={resolution} value={resolution}>{anomalyResolutionLabels[resolution]}</option>)}
                        </select>
                        <button type="button" disabled={pendingIds.length > 0} onClick={() => resolveMany([item.id], drafts[item.id] ?? "CONFIRMED")} className="h-9 rounded-md bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                          {pendingIds.includes(item.id) ? "提交中…" : "提交处置"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )) : (
        <section className="rounded-lg border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500 shadow-sm">当前筛选条件下暂无异常记录</section>
      )}
    </div>
  );
}
