"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pagination } from "@/components/data/pagination";
import { awardLevelLabels } from "@/lib/presentation";
import type { ApiResponse } from "@/types/api";
import {
  adminAwardLevels,
  type AdminAwardItem,
  type AdminAwardLevel,
  type AdminAwardPage,
  type AdminAwardSaveResult,
} from "@/types/award";

type AwardFilters = {
  competitionId: string;
  college: string;
  level: string;
};

type AwardWorkbenchProps = {
  data: AdminAwardPage;
  competitions: Array<{ id: string; name: string; year: number }>;
  colleges: string[];
  filters: AwardFilters;
};

function initialDrafts(items: AdminAwardItem[]) {
  return Object.fromEntries(items.map((item) => [item.projectId, item.currentAward ?? ""]));
}

export function AwardWorkbench({ data, competitions, colleges, filters }: AwardWorkbenchProps) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>(() => initialDrafts(data.list));
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastChange, setLastChange] = useState<AdminAwardSaveResult | null>(null);

  useEffect(() => {
    setDrafts(initialDrafts(data.list));
  }, [data.list]);

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ["competitionId", "college", "level"] as const) {
      const value = formData.get(key);
      if (typeof value === "string" && value) params.set(key, value);
    }
    params.set("pageSize", String(data.pageSize));
    router.push(`/admin/awards?${params.toString()}`);
  }

  async function save(item: AdminAwardItem) {
    const awardLevel = drafts[item.projectId] as AdminAwardLevel | "";
    if (!awardLevel || awardLevel === item.currentAward || !item.eligible) return;
    setPendingId(item.projectId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/awards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: item.projectId, awardLevel }),
      });
      const result = (await response.json()) as ApiResponse<AdminAwardSaveResult | null>;
      if (!response.ok || result.code !== 0 || !result.data) {
        throw new Error(result.message || "保存奖项失败");
      }
      setLastChange(result.data);
      setNotice(result.message);
      router.refresh();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "保存奖项失败，请稍后重试");
    } finally {
      setPendingId("");
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1 text-xs text-slate-500">
            <span className="mb-1 block">赛事</span>
            <select name="competitionId" defaultValue={filters.competitionId} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">
              <option value="">全部赛事</option>
              {competitions.map((competition) => <option key={competition.id} value={competition.id}>{competition.year} · {competition.name}</option>)}
            </select>
          </label>
          <label className="min-w-44 flex-1 text-xs text-slate-500">
            <span className="mb-1 block">学院</span>
            <select name="college" defaultValue={filters.college} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">
              <option value="">全部学院</option>
              {colleges.map((college) => <option key={college} value={college}>{college}</option>)}
            </select>
          </label>
          <label className="min-w-36 text-xs text-slate-500">
            <span className="mb-1 block">奖项等级</span>
            <select name="level" defaultValue={filters.level} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">
              <option value="">全部等级</option>
              {adminAwardLevels.map((level) => <option key={level} value={level}>{awardLevelLabels[level]}</option>)}
            </select>
          </label>
          <button type="submit" className="h-10 rounded-md bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700">筛选</button>
          <Link href="/admin/awards" className="inline-flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50">重置</Link>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {error ? <div role="alert" className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}
        {notice ? <div role="status" className="border-b border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">项目名称</th>
                <th className="px-4 py-3 font-medium">学院</th>
                <th className="px-4 py-3 font-medium">赛道</th>
                <th className="px-4 py-3 font-medium">当前奖项</th>
                <th className="px-4 py-3 font-medium">更新时间</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.list.map((item) => {
                const draft = drafts[item.projectId] ?? "";
                const pending = pendingId === item.projectId;
                const transition = lastChange?.projectId === item.projectId && lastChange.changed ? lastChange : null;
                return (
                  <tr key={item.projectId} className="align-top text-slate-700">
                    <td className="max-w-md px-4 py-4 font-medium text-slate-900">{item.projectName}</td>
                    <td className="px-4 py-4">{item.college}</td>
                    <td className="px-4 py-4">{item.trackName}</td>
                    <td className="px-4 py-4">
                      <span className={item.currentAward ? "font-medium text-amber-700" : "text-slate-400"}>
                        {item.currentAward ? awardLevelLabels[item.currentAward] : "未录入"}
                      </span>
                      {transition ? (
                        <div className="mt-1 text-xs text-green-700">
                          {transition.oldLevel ? awardLevelLabels[transition.oldLevel] : "未录入"} → {awardLevelLabels[transition.newLevel]}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">{item.updatedAt.slice(0, 16).replace("T", " ")}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <select
                          aria-label={`${item.projectName}的奖项等级`}
                          value={draft}
                          disabled={pending || !item.eligible}
                          onChange={(event) => {
                            setDrafts((current) => ({ ...current, [item.projectId]: event.target.value }));
                            setLastChange(null);
                            setNotice("");
                          }}
                          className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs disabled:bg-slate-100"
                        >
                          <option value="">选择奖项</option>
                          {adminAwardLevels.map((level) => <option key={level} value={level}>{awardLevelLabels[level]}</option>)}
                        </select>
                        <button
                          type="button"
                          disabled={pending || !item.eligible || !draft || draft === item.currentAward}
                          onClick={() => save(item)}
                          className="rounded-md bg-blue-600 px-3 py-2 text-xs text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {pending ? "保存中…" : "保存"}
                        </button>
                      </div>
                      {!item.eligible ? <div className="mt-1 text-xs text-slate-400">未通过终审</div> : null}
                      {item.currentAward && draft && draft !== item.currentAward ? (
                        <div className="mt-1 text-xs text-blue-600">{awardLevelLabels[item.currentAward]} → {awardLevelLabels[draft as AdminAwardLevel]}</div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {!data.list.length ? <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">暂无符合条件的项目</td></tr> : null}
            </tbody>
          </table>
        </div>
        <Pagination
          basePath="/admin/awards"
          query={{ ...filters, pageSize: String(data.pageSize) }}
          total={data.total}
          page={data.page}
          pageSize={data.pageSize}
        />
      </section>
    </div>
  );
}
