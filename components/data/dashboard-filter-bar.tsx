"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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
    <section
      aria-label="看板筛选"
      className="inline-flex flex-wrap items-center gap-1.5 rounded-2xl border border-[#115740]/12 bg-[#dbe9e1]/80 p-1.5 sm:flex-nowrap sm:rounded-full"
    >
      <label className="inline-flex h-8 items-center rounded-full border border-[#7f9384] bg-white pl-3 pr-2 text-xs text-[#5c6c65] shadow-[0_1px_2px_rgba(15,29,24,0.04)] transition focus-within:border-[#115740]">
        <span className="shrink-0 leading-none">赛事</span>
        <select
          value={current.competitionId}
          disabled={pending}
          onChange={(event) => update("competitionId", event.target.value)}
          className="select-pill h-full max-w-[144px] cursor-pointer truncate border-0 bg-transparent py-0 pl-1.5 pr-1 text-xs font-semibold leading-8 text-[#162620] outline-none focus:outline-none"
        >
          <option value="">全部赛事</option>
          {competitions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="inline-flex h-8 items-center rounded-full border border-[#7f9384] bg-white pl-3 pr-2 text-xs text-[#5c6c65] shadow-[0_1px_2px_rgba(15,29,24,0.04)] transition focus-within:border-[#115740]">
        <span className="shrink-0 leading-none">赛年</span>
        <select
          value={current.year}
          disabled={pending}
          onChange={(event) => update("year", event.target.value)}
          className="select-pill h-full cursor-pointer border-0 bg-transparent py-0 pl-1.5 pr-1 text-xs font-semibold leading-8 text-[#162620] outline-none focus:outline-none"
        >
          <option value="">全部赛年</option>
          {years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="inline-flex h-8 items-center rounded-full border border-[#7f9384] bg-white pl-3 pr-2 text-xs text-[#5c6c65] shadow-[0_1px_2px_rgba(15,29,24,0.04)] transition focus-within:border-[#115740]">
        <span className="shrink-0 leading-none">阶段</span>
        <select
          value={current.stage}
          disabled={pending}
          onChange={(event) => update("stage", event.target.value)}
          className="select-pill h-full cursor-pointer border-0 bg-transparent py-0 pl-1.5 pr-1 text-xs font-semibold leading-8 text-[#162620] outline-none focus:outline-none"
        >
          <option value="">全部阶段</option>
          <option value="SCHOOL">校赛</option>
          <option value="PROVINCE">省赛</option>
          <option value="NATIONAL">国赛</option>
        </select>
      </label>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => router.push("/dashboard"))}
        className="h-8 shrink-0 px-3 text-xs text-[#3b4d45] hover:bg-white/75 hover:text-[#0f1d18]"
      >
        {pending ? "刷新中…" : "重置"}
      </Button>
    </section>
  );
}
