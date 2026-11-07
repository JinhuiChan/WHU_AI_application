import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, ClipboardCheck, FolderKanban, Trophy, Upload } from "lucide-react";
import { DashboardFilterBar } from "@/components/data/dashboard-filter-bar";
import { StatisticsCharts } from "@/components/data/statistics-charts";
import { getActiveUser } from "@/lib/auth.server";
import { firstParam } from "@/lib/list-query";
import { getStatisticsSummary, parseStatisticsQuery } from "@/lib/statistics";

export const metadata: Metadata = { title: "统计看板" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  const params = new URLSearchParams();
  for (const key of ["competitionId", "year", "stage"] as const) {
    const value = firstParam(searchParams?.[key]);
    if (value) params.set(key, value);
  }
  const summary = await getStatisticsSummary(parseStatisticsQuery(params), user);
  const scoped = summary.scope === "mine";
  const finalCount = summary.myStatus?.find((item) => item.status === "SCHOOL_FINAL")?.count ?? 0;
  const cards = scoped ? [
    { label: "我的项目数", value: summary.cards.totalProjects, note: "当前筛选内本人参与的项目" },
    { label: "我的待审核", value: summary.cards.pendingReviewCount, note: "待学院审核或待校级终审" },
    { label: "我的终审通过", value: finalCount, note: "校内终审通过项目" },
    { label: "我的晋级省赛", value: summary.cards.provinceAdvancedCount, note: "含已晋级国赛项目" },
  ] : [
    { label: "项目总数", value: summary.cards.totalProjects, note: "当前筛选内的全部项目" },
    { label: "报名总人数（去重）", value: summary.cards.totalParticipants, note: "按成员学号去重" },
    { label: "待审核数", value: summary.cards.pendingReviewCount, note: "待学院审核或待校级终审" },
    { label: "晋级省赛数", value: summary.cards.provinceAdvancedCount, note: "含已晋级国赛项目" },
  ];

  const isAdmin = user.role === "ADMIN";
  const quickLinks = isAdmin ? [
    { href: "/projects", label: "项目台账", note: "查看与检索全部参赛项目", icon: FolderKanban },
    { href: "/review", label: "报名审核", note: "处理待学院与校级审核项目", icon: ClipboardCheck },
    { href: "/import", label: "数据导入", note: "导入外部平台导出的数据", icon: Upload },
  ] : [
    { href: "/competitions", label: "赛事与报名", note: "查看已发布赛事与报名入口", icon: Trophy },
    { href: "/my", label: "我的项目", note: "查看本人参与的项目与状态", icon: FolderKanban },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{scoped ? "我的统计" : "统计看板"}</h1>
        <p className="mt-1 text-sm text-slate-500">{scoped ? "仅统计本人参与的项目与状态，不展示全校数据。" : "所有数字按当前筛选条件实时聚合。"}</p>
      </div>

      <section className={`grid gap-3 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-3" : "lg:grid-cols-2"}`} aria-label="快捷入口">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-[160ms] hover:border-blue-300 hover:bg-blue-50/40 active:scale-[0.98] motion-reduce:active:scale-100"
              href={item.href}
              key={item.href}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon aria-hidden="true" size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-900">{item.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{item.note}</span>
              </span>
              <ArrowUpRight aria-hidden="true" className="shrink-0 text-slate-400 transition group-hover:text-blue-600" size={16} />
            </Link>
          );
        })}
      </section>

      <DashboardFilterBar
        competitions={summary.options.competitions}
        years={summary.options.years}
        current={{
          competitionId: summary.filters.competitionId ?? "",
          year: summary.filters.year?.toString() ?? "",
          stage: summary.filters.stage ?? "",
        }}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card) => (
          <section
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            key={card.label}
          >
            <h2 className="text-xs text-slate-500">{card.label}</h2>
            <div className="mt-3 text-3xl font-semibold text-slate-900">{card.value}</div>
            <p className="mt-3 text-xs text-slate-400">{card.note}</p>
          </section>
        ))}
      </div>

      {scoped ? (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">我的状态</h2>
            <p className="mt-1 text-xs text-slate-500">仅汇总当前筛选内本人参与的项目</p>
          </div>
          <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-4">
            {(summary.myStatus ?? []).filter((item) => item.count > 0).map((item) => (
              <div key={item.status} className="rounded-lg bg-slate-50 p-4">
                <div className="text-xs text-slate-500">{item.label}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{item.count}</div>
              </div>
            ))}
            {summary.cards.totalProjects === 0 ? (
              <div className="col-span-full py-8 text-center">
                <p className="text-sm text-slate-600">这个筛选条件下还没有你参与的项目。</p>
                <p className="mt-1 text-xs text-slate-400">换个赛事或年份试试，也可以清除筛选看看全部数据。</p>
                <Link
                  className="mt-4 inline-flex h-9 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-700 transition hover:bg-slate-50"
                  href="/dashboard"
                >
                  清除筛选
                </Link>
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <>
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">学院统计</h2>
              <p className="mt-1 text-xs text-slate-500">点击学院名可下钻到对应审核项目列表</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr><th className="px-5 py-3 font-medium">学院</th><th className="px-5 py-3 font-medium">项目数</th><th className="px-5 py-3 font-medium">人数（去重）</th><th className="px-5 py-3 font-medium">晋级省赛数</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.byCollege.map((item) => (
                    <tr key={item.college} className="text-slate-700">
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {isAdmin ? <Link href={`/review?college=${encodeURIComponent(item.college)}`} className="text-blue-700 hover:underline">{item.college}</Link> : item.college}
                      </td>
                      <td className="px-5 py-3">{item.projectCount}</td>
                      <td className="px-5 py-3">{item.participantCount}</td>
                      <td className="px-5 py-3">{item.provinceAdvancedCount}</td>
                    </tr>
                  ))}
                  {!summary.byCollege.length ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center">
                        <p className="text-sm text-slate-600">这个筛选条件下还没有项目数据。</p>
                        <p className="mt-1 text-xs text-slate-400">换个赛事、年份或阶段试试，也可以清除筛选。</p>
                        <Link
                          className="mt-4 inline-flex h-9 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-700 transition hover:bg-slate-50"
                          href="/dashboard"
                        >
                          清除筛选
                        </Link>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
          <StatisticsCharts byTrack={summary.byTrack} byStage={summary.byStage} byAward={summary.byAward} />
        </>
      )}
    </div>
  );
}
