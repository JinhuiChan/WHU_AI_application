"use client";

import { useState } from "react";
import Link from "next/link";
import type { AnomalyResolution, AnomalyStatus } from "@prisma/client";
import { WhuEavesWatermark } from "@/components/brand/whu-motifs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
  const ruleEntries = Object.entries(anomalyRuleNames);
  const visiblePendingIds = data.groups.flatMap((group) =>
    group.items.filter((item) => item.status === "PENDING").map((item) => item.id),
  );
  const allVisibleSelected = visiblePendingIds.length > 0 && visiblePendingIds.every((id) => selectedIds.includes(id));
  const clampedRate = Math.max(0, Math.min(100, data.summary.resolutionRate));
  const hasPending = data.summary.pending > 0;
  const busy = filterPending || pendingIds.length > 0;

  return (
    <div className="space-y-4">
      <section aria-label="异常治理核心指标" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card flex flex-col justify-between p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="t-label text-xs font-medium text-[#54635d]">异常总数</span>
            <span className="rounded-full bg-[#eef5f1] px-2.5 py-0.5 text-[11px] font-medium text-[#115740]">
              全量稽核
            </span>
          </div>
          <div className="mt-2.5 font-serif text-3xl font-semibold leading-tight text-[#0e1d17] tabular-nums">
            {data.summary.total}
          </div>
          <p className="mt-2 text-xs text-[#6c7e76]">覆盖 R1 至 R6 六类一致性规则</p>
        </div>

        <div
          className={`card flex flex-col justify-between p-5 ${
            hasPending ? "border-l-[3px] border-l-[#9e2a35] bg-[#fffdfd]" : "border-[#dfeae4]"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className={`t-label text-xs font-medium ${hasPending ? "text-[#9e2a35]" : "text-[#54635d]"}`}>
              待核实
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                hasPending ? "bg-[#faeaea] text-[#9e2a35]" : "bg-[#eef5f1] text-[#115740]"
              }`}
            >
              {hasPending ? "待办预警" : "已清零"}
            </span>
          </div>
          <div
            className={`mt-2.5 font-serif text-3xl font-semibold leading-tight tabular-nums ${
              hasPending ? "text-[#9e2a35]" : "text-[#0e1d17]"
            }`}
          >
            {data.summary.pending}
          </div>
          <p className="mt-2 text-xs text-[#6c7e76]">需核验项目档案并登记处置结论</p>
        </div>

        <div className="card flex flex-col justify-between border-[#cbe0d4] bg-[#f8fbf9] p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="t-label text-xs font-medium text-[#115740]">已处置</span>
            <span className="rounded-full bg-[#e3f0ea] px-2.5 py-0.5 text-[11px] font-medium text-[#115740]">
              台账归档
            </span>
          </div>
          <div className="mt-2.5 font-serif text-3xl font-semibold leading-tight text-[#115740] tabular-nums">
            {data.summary.resolved}
          </div>
          <p className="mt-2 text-xs text-[#54635d]">处置人、时间与结论已留痕存证</p>
        </div>

        <div className="card relative flex flex-col justify-between overflow-hidden border-[#c0d5ca] bg-gradient-to-br from-white via-white to-[#eef5f1] p-5 before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-[#115740] before:via-[#1c7859] before:to-[#c59b45]">
          <div className="relative z-[1] flex items-center justify-between gap-2">
            <span className="t-label text-xs font-semibold text-[#3f524a]">处置率</span>
            <span className="rounded-full bg-[#e3f0ea] px-2.5 py-0.5 text-[11px] font-semibold text-[#115740] tabular-nums">
              {data.summary.resolved} / {data.summary.total}
            </span>
          </div>
          <div className="relative z-[1] mt-2.5 font-serif text-3xl font-semibold leading-tight text-[#115740] tabular-nums">
            {data.summary.resolutionRate}%
          </div>
          <div className="relative z-[1] mt-3">
            <div
              className="h-2 overflow-hidden rounded-full bg-[#dbe8e1]"
              role="progressbar"
              aria-label="异常处置率"
              aria-valuenow={clampedRate}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full w-full origin-left rounded-full bg-[#115740] transition-transform duration-300 motion-reduce:transition-none"
                style={{ transform: `scaleX(${clampedRate / 100})` }}
              />
            </div>
          </div>
          <WhuEavesWatermark className="pointer-events-none absolute -bottom-3 -right-2 h-[88px] w-[156px] text-[#0d3b2e]/[0.055]" />
        </div>
      </section>

      <section className="card space-y-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="按状态筛选">
            {filters.map((item) => {
              const active = data.status === item.value;
              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={busy}
                  onClick={() => void filter(item.value, data.ruleId)}
                  aria-pressed={active}
                  className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-xs font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
                    active
                      ? "bg-[#115740] text-white shadow-sm"
                      : "border border-[#7f9384] bg-white text-[#33433d] hover:border-[#115740] hover:bg-[#eef5f1]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          {!isAdmin ? <p className="text-xs text-[#5c6c65]">当前身份仅可查阅异常稽核台账</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-[#e5ede8] pt-3" role="group" aria-label="按规则筛选">
          <button
            type="button"
            disabled={busy}
            onClick={() => void filter(data.status, null)}
            aria-pressed={!data.ruleId}
            className={`inline-flex h-8 items-center rounded-full px-3.5 text-xs font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
              !data.ruleId
                ? "bg-[#115740] text-white"
                : "border border-[#7f9384] bg-[#f8fbf9] text-[#3f524a] hover:border-[#115740] hover:bg-[#eef5f1]"
            }`}
          >
            全部规则
          </button>
          {ruleEntries.map(([ruleId, ruleName]) => {
            const active = data.ruleId === ruleId;
            return (
              <button
                key={ruleId}
                type="button"
                disabled={busy}
                onClick={() => void filter(data.status, active ? null : ruleId)}
                aria-pressed={active}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
                  active
                    ? "bg-[#115740] text-white"
                    : "border border-[#7f9384] bg-white text-[#33433d] hover:border-[#115740] hover:bg-[#eef5f1]"
                }`}
              >
                <span className={active ? "font-semibold text-white" : "font-semibold text-[#115740]"}>{ruleId}</span>
                <span>{ruleName}</span>
              </button>
            );
          })}
        </div>
      </section>

      {isAdmin ? (
        <section className="flex flex-col gap-3 rounded-xl border border-[#c5d9ce] bg-[#eef5f1] p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#13261f]">
              <input
                type="checkbox"
                aria-label="全选当前待核实异常"
                checked={allVisibleSelected}
                disabled={!visiblePendingIds.length || busy}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setSelectedIds((current) =>
                    checked
                      ? [...new Set([...current, ...visiblePendingIds])]
                      : current.filter((id) => !visiblePendingIds.includes(id)),
                  );
                }}
                className="h-4 w-4 rounded border-[#7f9384] text-[#115740] focus:ring-[#115740]/20"
              />
              全选当前待核实
            </label>
            <span className="text-xs text-[#43554d] tabular-nums">
              已选 <span className="font-semibold text-[#115740]">{selectedIds.length}</span> 条（待核实共 {visiblePendingIds.length} 条）
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="批量处置结论"
              value={batchResolution}
              disabled={!selectedIds.length || pendingIds.length > 0}
              onChange={(event) => setBatchResolution(event.target.value as AnomalyResolution)}
              className="select-pill h-9 rounded-full border border-[#7f9384] bg-white px-4 text-xs font-medium text-[#162620] outline-none transition focus:border-[#115740] disabled:bg-slate-100 disabled:text-slate-400"
            >
              {resolutions.map((resolution) => (
                <option key={resolution} value={resolution}>
                  {anomalyResolutionLabels[resolution]}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              className="bg-[#115740] text-white hover:bg-[#0d4633]"
              disabled={!selectedIds.length || pendingIds.length > 0}
              onClick={() => void resolveMany(selectedIds, batchResolution)}
            >
              {pendingIds.length > 1 ? "批量处置中…" : `批量处置${selectedIds.length ? `（${selectedIds.length}）` : ""}`}
            </Button>
          </div>
        </section>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div role="status" className="rounded-xl border border-[#badec9] bg-[#eef5f1] px-4 py-3 text-sm text-[#115740]">
          {notice}
        </div>
      ) : null}

      {data.groups.length ? (
        data.groups.map((group) => (
          <section key={group.ruleId} className="overflow-hidden card">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#dfe9e3] bg-[#f6faf8] px-5 py-3.5">
              <h2 className="text-[15px] font-semibold text-[#0e1d17]">
                {group.ruleId} · {group.ruleName}
              </h2>
              <span className="inline-flex items-center rounded-full bg-[#eef5f1] px-2.5 py-0.5 text-xs font-semibold text-[#115740] tabular-nums">
                {group.items.length} 条记录
              </span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="t-thead bg-[#f5faf7] text-xs text-[#4d5e57]">
                  <tr>
                    <th className="w-[25%] px-5 py-2.5 font-medium">项目与所属学院</th>
                    <th className="w-[35%] px-4 py-2.5 font-medium">稽核异常描述</th>
                    <th className="w-[16%] px-4 py-2.5 font-medium">状态与留痕</th>
                    <th className="w-[24%] min-w-[228px] px-4 py-2.5 font-medium">核实处置</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef4f0]">
                  {group.items.map((item) => {
                    const isPending = item.status === "PENDING";
                    return (
                      <tr key={item.id} className="align-top text-[#26342e]">
                        <td className="px-5 py-3.5">
                          <div className="flex items-start gap-2.5">
                            {isAdmin && isPending ? (
                              <input
                                type="checkbox"
                                aria-label={`选择异常：${item.project.name}`}
                                checked={selectedIds.includes(item.id)}
                                disabled={pendingIds.length > 0}
                                onChange={(event) =>
                                  setSelectedIds((current) =>
                                    event.target.checked
                                      ? [...current, item.id]
                                      : current.filter((id) => id !== item.id),
                                  )
                                }
                                className="mt-1 h-4 w-4 shrink-0 rounded border-[#7f9384] text-[#115740] focus:ring-[#115740]/20"
                              />
                            ) : null}
                            <div className="min-w-0">
                              <Link
                                href={`/projects/${item.project.id}`}
                                className="font-semibold text-[#0e1d17] transition-colors hover:text-[#115740] hover:underline"
                              >
                                {item.project.name}
                              </Link>
                              <p className="mt-1 text-xs text-[#5c6c65] tabular-nums">
                                {item.project.year} 赛年 · {item.project.college}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm leading-6 text-[#33433d]">{item.description}</td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                              isPending
                                ? "bg-[#fdf6e7] text-[#9a5b13] ring-[#ead4a8]"
                                : "bg-[#eef5f1] text-[#115740] ring-[#cbe0d4]"
                            }`}
                          >
                            {isPending ? "待核实" : "已处置"}
                          </span>
                          {!isPending ? (
                            <div className="mt-2 space-y-0.5 text-xs text-[#5c6c65]">
                              <div className="font-medium text-[#162620]">
                                {item.resolution ? anomalyResolutionLabels[item.resolution] : "已归档"}
                              </div>
                              {item.resolvedBy ? <div>经办：{item.resolvedBy}</div> : null}
                              {item.resolvedAt ? (
                                <div className="tabular-nums">{formatDateTime(item.resolvedAt)}</div>
                              ) : null}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3.5">
                          {isAdmin && isPending ? (
                            <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap">
                              <select
                                aria-label={`选择${item.project.name}的处置结论`}
                                value={drafts[item.id] ?? "CONFIRMED"}
                                disabled={pendingIds.length > 0}
                                onChange={(event) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [item.id]: event.target.value as AnomalyResolution,
                                  }))
                                }
                                className="select-pill h-8 shrink-0 rounded-full border border-[#7f9384] bg-white px-2.5 text-xs font-medium text-[#162620] outline-none transition focus:border-[#115740]"
                              >
                                {resolutions.map((resolution) => (
                                  <option key={resolution} value={resolution}>
                                    {anomalyResolutionLabels[resolution]}
                                  </option>
                                ))}
                              </select>
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 shrink-0 bg-[#115740] px-3.5 text-xs text-white hover:bg-[#0d4633]"
                                disabled={pendingIds.length > 0}
                                onClick={() => void resolveMany([item.id], drafts[item.id] ?? "CONFIRMED")}
                              >
                                {pendingIds.includes(item.id) ? "提交中…" : "提交处置"}
                              </Button>
                            </div>
                          ) : (
                            <span className="whitespace-nowrap text-xs text-[#6c7e76]">
                              {isPending ? "待管理员核实" : "已完成归档"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))
      ) : (
        <section className="card">
          <EmptyState
            title="当前筛选条件下暂无异常记录"
            description="可切换状态或规则筛选芯片，查看其他稽核类别的历史处置台账。"
          />
        </section>
      )}
    </div>
  );
}
