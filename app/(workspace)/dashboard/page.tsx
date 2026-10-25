import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardCharts } from "@/components/data/dashboard-charts";
import { getActiveUser } from "@/lib/auth.server";
import { getCollegeRankings, getDashboardSummary, listStatisticYears, parseStatisticYear } from "@/lib/dashboard";
import { firstParam } from "@/lib/list-query";

export const metadata: Metadata = { title: "看板" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  const years = await listStatisticYears();
  const requestedYear = parseStatisticYear(firstParam(searchParams?.year));
  const year = requestedYear ?? years[0] ?? new Date().getFullYear();
  const yearOptions = [...new Set([year, ...years])].sort((a, b) => b - a);
  const [summary, rankings] = await Promise.all([
    getDashboardSummary(year, user.role),
    getCollegeRankings(year, user.role),
  ]);
  const cards = [
    { label: "本年参赛项目数", value: summary.kpi.projectCount, note: "个 ACTIVE / 已退出项目", href: `/projects?year=${year}` },
    { label: "本年参与人数", value: summary.kpi.participantCount, note: "按成员学号去重", href: `/projects?year=${year}` },
    { label: "本年获奖数", value: summary.kpi.awardCount, note: "已核验 + 已发布", href: `/projects?year=${year}&awarded=1` },
    { label: "覆盖学院数", value: summary.kpi.collegeCount, note: "有参赛项目的学院", href: `/projects?year=${year}` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">数据看板</h1>
          <p className="mt-1 text-sm text-slate-500">{year} 赛年科创数据概览，点击指标卡可下钻到项目列表。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/rankings?year=${year}`} className="inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-600 hover:bg-slate-50">学院排行</Link>
          <a href={`/api/export/awards.xlsx?year=${year}`} className="inline-flex h-10 items-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">导出获奖 Excel</a>
        </div>
      </div>

      <form action="/dashboard" method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-xs text-slate-500">
          <span className="mb-1 block">统计赛年</span>
          <select name="year" defaultValue={String(year)} className="h-10 min-w-32 rounded-md border border-slate-300 bg-white px-3 text-sm">
            {yearOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <button type="submit" className="h-10 rounded-md bg-slate-800 px-4 text-sm text-white hover:bg-slate-700">切换赛年</button>
      </form>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow">
            <div className="text-xs text-slate-500">{card.label}</div>
            <div className="mt-3 text-3xl font-semibold text-slate-900">{card.value}</div>
            <div className="mt-3 text-xs text-slate-400">{card.note}</div>
            <div className="mt-4 text-xs font-medium text-blue-600">查看项目 →</div>
          </Link>
        ))}
      </div>

      <DashboardCharts trend={summary.trend} rankings={rankings.map((item) => ({ college: item.college, score: item.score }))} />
    </div>
  );
}
