import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RankingTable } from "@/components/data/ranking-table";
import { getActiveUser } from "@/lib/auth.server";
import { getCollegeRankings, listStatisticYears, parseStatisticYear } from "@/lib/dashboard";
import { firstParam } from "@/lib/list-query";

export const metadata: Metadata = { title: "学院排行" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function RankingsPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  const years = await listStatisticYears();
  const requestedYear = parseStatisticYear(firstParam(searchParams?.year));
  const year = requestedYear ?? years[0] ?? new Date().getFullYear();
  const yearOptions = [...new Set([year, ...years])].sort((a, b) => b - a);
  const rankings = await getCollegeRankings(year, user.role);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">学院排行</h1>
          <p className="mt-1 text-sm text-slate-500">{year} 赛年学院折算分与获奖构成，点击每行可查看项目明细。</p>
        </div>
        <a href={`/api/export/awards.xlsx?year=${year}`} className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">导出获奖 Excel</a>
      </div>

      <section className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        <h2 className="font-medium">折算公式</h2>
        <p className="mt-1"><strong>得分 = 赛事等级权重 × 奖项权重</strong></p>
        <p>赛事：国赛 10 / 省赛 5 / 校赛 2；奖项：S 1.5 / A 1.2 / B 1.0 / C 0.8 / EXCELLENT 0.5。</p>
        <p className="mt-1 text-xs text-blue-700">仅统计 VERIFIED、PUBLISHED 获奖，排除 DRAFT 与 VOIDED；普通用户仅可见 PUBLISHED。</p>
      </section>

      <form action="/rankings" method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-xs text-slate-500">
          <span className="mb-1 block">统计赛年</span>
          <select name="year" defaultValue={String(year)} className="h-10 min-w-32 rounded-md border border-slate-300 bg-white px-3 text-sm">
            {yearOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <button type="submit" className="h-10 rounded-md bg-slate-800 px-4 text-sm text-white hover:bg-slate-700">切换赛年</button>
      </form>

      <RankingTable items={rankings} />
    </div>
  );
}
