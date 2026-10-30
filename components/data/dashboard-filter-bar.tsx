"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function DashboardFilterBar({
  competitions,
  years,
  current,
}: {
  competitions: { id: string; name: string }[];
  years: number[];
  current: { competitionId: string; year: string; stage: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function update(key: "competitionId" | "year" | "stage", value: string) {
    const next = { ...current, [key]: value };
    const params = new URLSearchParams();
    if (next.competitionId) params.set("competitionId", next.competitionId);
    if (next.year) params.set("year", next.year);
    if (next.stage) params.set("stage", next.stage);
    startTransition(() => router.push(`/dashboard${params.size ? `?${params}` : ""}`));
  }

  return (
    <section className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <label className="text-xs text-slate-500">
        <span className="mb-1 block">赛事</span>
        <select value={current.competitionId} disabled={pending} onChange={(event) => update("competitionId", event.target.value)} className="h-10 min-w-52 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700">
          <option value="">全部赛事</option>
          {competitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="text-xs text-slate-500">
        <span className="mb-1 block">赛年</span>
        <select value={current.year} disabled={pending} onChange={(event) => update("year", event.target.value)} className="h-10 min-w-32 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700">
          <option value="">全部赛年</option>
          {years.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label className="text-xs text-slate-500">
        <span className="mb-1 block">阶段</span>
        <select value={current.stage} disabled={pending} onChange={(event) => update("stage", event.target.value)} className="h-10 min-w-32 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700">
          <option value="">全部阶段</option>
          <option value="SCHOOL">校赛</option>
          <option value="PROVINCE">省赛</option>
          <option value="NATIONAL">国赛</option>
        </select>
      </label>
      <button type="button" disabled={pending} onClick={() => startTransition(() => router.push("/dashboard"))} className="h-10 rounded-md border border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">重置</button>
      {pending ? <span className="pb-3 text-xs text-slate-400">正在刷新统计…</span> : null}
    </section>
  );
}
