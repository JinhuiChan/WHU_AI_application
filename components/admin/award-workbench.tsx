"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pagination } from "@/components/data/pagination";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHead, SectionRule } from "@/components/ui/section-head";
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

const filterControlClass =
  "h-10 w-full rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15";

function initialDrafts(items: AdminAwardItem[]) {
  return Object.fromEntries(items.map((item) => [item.projectId, item.currentAward ?? ""]));
}

function awardBadgeClass(level: string) {
  if (level === "GOLD" || level === "S" || level === "A") {
    return "bg-[#fdf6e7] text-[#9a5b13] ring-1 ring-[#ead4a8]";
  }
  return "bg-[#eef5f1] text-[#115740] ring-1 ring-[#cbe0d4]";
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
      <section className="card p-5">
        <SectionHead
          title="奖项筛选"
          sub="列表仅展示已通过校级终审及以上的项目（含已有历史奖项项目），未审核与已驳回项目不在此列"
          meta={`共 ${data.total} 个项目`}
        />
        <SectionRule className="my-3.5" />
        <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1 text-sm text-[#33433d]">
            <span className="mb-1 block text-xs font-medium text-[#54635d]">赛事</span>
            <select name="competitionId" defaultValue={filters.competitionId} className={filterControlClass}>
              <option value="">全部赛事</option>
              {competitions.map((competition) => (
                <option key={competition.id} value={competition.id}>
                  {competition.year} · {competition.name}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-44 flex-1 text-sm text-[#33433d]">
            <span className="mb-1 block text-xs font-medium text-[#54635d]">学院</span>
            <select name="college" defaultValue={filters.college} className={filterControlClass}>
              <option value="">全部学院</option>
              {colleges.map((college) => (
                <option key={college} value={college}>
                  {college}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-36 text-sm text-[#33433d]">
            <span className="mb-1 block text-xs font-medium text-[#54635d]">奖项等级</span>
            <select name="level" defaultValue={filters.level} className={filterControlClass}>
              <option value="">全部等级</option>
              {adminAwardLevels.map((level) => (
                <option key={level} value={level}>
                  {awardLevelLabels[level]}
                </option>
              ))}
            </select>
          </label>
          <Button
            size="default"
            type="submit"
            className="h-10 bg-[#115740] px-6 text-white hover:bg-[#0d4633]"
          >
            筛选
          </Button>
          <Link
            href="/admin/awards"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#7f9384] bg-white px-5 text-sm font-medium text-[#162620] transition duration-150 hover:border-[#115740] hover:bg-[#eef5f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:active:scale-100"
          >
            重置
          </Link>
        </form>
      </section>

      <section className="overflow-hidden card">
        <div className="px-5 pt-4">
          <SectionHead
            title="奖项核定明细"
            sub="选择目标奖项等级后点击「保存」立即生效"
            meta={`第 ${data.page} 页 · 每页 ${data.pageSize} 条`}
          />
        </div>
        <SectionRule className="mx-5 mt-3.5" />
        {error ? (
          <div role="alert" className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div role="status" className="border-b border-[#badec9] bg-[#eef5f1] px-5 py-3 text-sm text-[#115740]">
            {notice}
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="t-thead bg-[#f5faf7] text-xs text-[#4d5e57]">
              <tr>
                <th className="w-[27%] px-4 py-3 font-medium">项目名称</th>
                <th className="w-[15%] px-4 py-3 font-medium">学院</th>
                <th className="w-[15%] px-4 py-3 font-medium">赛道</th>
                <th className="w-[14%] px-4 py-3 font-medium">当前奖项</th>
                <th className="w-[12%] px-4 py-3 font-medium">更新时间</th>
                <th className="w-[17%] min-w-[196px] px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef4f0]">
              {data.list.map((item) => {
                const draft = drafts[item.projectId] ?? "";
                const pending = pendingId === item.projectId;
                const transition = lastChange?.projectId === item.projectId && lastChange.changed ? lastChange : null;
                return (
                  <tr key={item.projectId} className="align-top text-[#26342e]">
                    <td className="max-w-xs px-4 py-3.5">
                      <Link
                        href={`/projects/${item.projectId}`}
                        className="font-medium text-[#0e1d17] transition-colors hover:text-[#115740] hover:underline"
                      >
                        {item.projectName}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">{item.college}</td>
                    <td className="px-4 py-3.5 text-xs text-[#3f524a]">{item.trackName}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.currentAward ? (
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${awardBadgeClass(item.currentAward)}`}
                          >
                            {awardLevelLabels[item.currentAward]}
                          </span>
                        ) : (
                          <span className="text-xs text-[#7c8e85]">未录入</span>
                        )}
                        {!item.eligible ? (
                          <span className="whitespace-nowrap rounded-full bg-[#fdf6e7] px-2 py-0.5 text-[11px] font-medium text-[#9a5b13] ring-1 ring-[#ead4a8]">
                            未通过终审
                          </span>
                        ) : null}
                      </div>
                      {transition ? (
                        <div className="mt-1 text-xs font-medium text-[#115740]">
                          已由「{transition.oldLevel ? awardLevelLabels[transition.oldLevel] : "未录入"}」更新为「
                          {awardLevelLabels[transition.newLevel]}」
                        </div>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-[#54635d] tabular-nums">
                      {item.updatedAt.slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap">
                        <select
                          aria-label={`${item.projectName}的奖项等级`}
                          value={draft}
                          disabled={pending || !item.eligible}
                          onChange={(event) => {
                            setDrafts((current) => ({ ...current, [item.projectId]: event.target.value }));
                            setLastChange(null);
                            setNotice("");
                          }}
                          className="select-pill h-8 shrink-0 rounded-full border border-[#7f9384] bg-white px-2.5 text-xs font-medium text-[#162620] outline-none transition focus:border-[#115740] disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">选择奖项</option>
                          {adminAwardLevels.map((level) => (
                            <option key={level} value={level}>
                              {awardLevelLabels[level]}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          type="button"
                          className="h-8 shrink-0 bg-[#115740] px-3.5 text-xs text-white hover:bg-[#0d4633]"
                          disabled={pending || !item.eligible || !draft || draft === item.currentAward}
                          onClick={() => void save(item)}
                        >
                          {pending ? "保存中…" : "保存"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!data.list.length ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      title="暂无符合条件的项目"
                      description="请尝试切换赛事、学院或奖项等级筛选条件，也可重置后查看全部候选项目。"
                      action={{ href: "/admin/awards", label: "重置筛选" }}
                    />
                  </td>
                </tr>
              ) : null}
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
