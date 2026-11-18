import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { WhuEavesWatermark, WhuSeal, WhuTitleRule } from "@/components/brand/whu-motifs";
import { RankingTable } from "@/components/data/ranking-table";
import { SectionHead } from "@/components/ui/section-head";
import { getActiveUser } from "@/lib/auth.server";
import { getCollegeRankings, getDashboardSummary, listStatisticYears, parseStatisticYear } from "@/lib/dashboard";
import { firstParam } from "@/lib/list-query";
import { formatScore } from "@/lib/scoring";

export const metadata: Metadata = { title: "学院排行" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function RankingsPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");

  const years = await listStatisticYears();
  const currentYear = new Date().getFullYear();
  const availableYears = years.length ? years : [currentYear];
  const requestedYear = parseStatisticYear(firstParam(searchParams?.year) ?? null);
  const selectedYear = requestedYear && availableYears.includes(requestedYear) ? requestedYear : availableYears[0];

  const [rankings, summary] = await Promise.all([
    getCollegeRankings(selectedYear, user.role, 30),
    getDashboardSummary(selectedYear, user.role),
  ]);

  const topCollege = rankings[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="t-page-title font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
              学院排行
            </h1>
            <WhuSeal label="折算积分榜" />
          </div>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-[#54635d]">
            <WhuTitleRule />
            <span>按已核验发布的赛事等级与获奖等级折算年度积分，与统计看板共享同一权威数据源。</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <nav
            aria-label="切换排行赛年"
            className="inline-flex flex-wrap items-center gap-1 rounded-full border border-[#115740]/15 bg-[#dbe9e1]/80 p-1"
          >
            {availableYears.map((year) => {
              const active = year === selectedYear;
              return (
                <Link
                  key={year}
                  href={`/rankings?year=${year}`}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex h-8 items-center rounded-full px-3.5 text-xs font-semibold tabular-nums transition-colors duration-150 ${
                    active ? "bg-[#115740] text-white shadow-sm" : "text-[#33433d] hover:bg-white/80"
                  }`}
                >
                  {year} 赛年
                </Link>
              );
            })}
          </nav>
          <Link
            href={`/dashboard?year=${selectedYear}`}
            className="inline-flex h-9 items-center justify-center rounded-full border border-[#7f9384] bg-white px-4 text-xs font-medium text-[#162620] transition-colors hover:border-[#115740] hover:bg-[#eef5f1]"
          >
            返回统计看板
          </Link>
        </div>
      </div>

      <section aria-label="年度排行核心指标" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card relative flex flex-col justify-between overflow-hidden border-[#c0d5ca] bg-gradient-to-br from-white via-white to-[#eef5f1] p-5 before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-[#115740] before:via-[#1c7859] before:to-[#c59b45]">
          <div className="relative z-[1] flex items-center justify-between gap-2">
            <span className="t-label text-xs font-semibold text-[#3f524a]">年度榜首折算分</span>
            <span className="rounded-full bg-[#e3f0ea] px-2.5 py-0.5 text-[11px] font-semibold text-[#115740]">
              {selectedYear} 年度
            </span>
          </div>
          <div className="relative z-[1] mt-2.5 font-serif text-3xl font-semibold leading-tight text-[#115740] tabular-nums">
            {topCollege ? formatScore(topCollege.score) : "0.0"}
          </div>
          <p className="relative z-[1] mt-2 truncate text-xs text-[#54635d]">
            {topCollege ? `当前首位：${topCollege.college}` : "该赛年暂无有效获奖记录"}
          </p>
          <WhuEavesWatermark className="pointer-events-none absolute -bottom-3 -right-2 h-[88px] w-[156px] text-[#0d3b2e]/[0.055]" />
        </div>

        <div className="card flex flex-col justify-between p-5">
          <span className="t-label text-xs font-medium text-[#54635d]">参评学院数</span>
          <div className="mt-2.5 font-serif text-3xl font-semibold leading-tight text-[#0e1d17] tabular-nums">
            {summary.kpi.collegeCount}
          </div>
          <p className="mt-2 text-xs text-[#6c7e76]">本赛年有在库项目的培养单位</p>
        </div>

        <div className="card flex flex-col justify-between p-5">
          <span className="t-label text-xs font-medium text-[#54635d]">有效获奖总数</span>
          <div className="mt-2.5 font-serif text-3xl font-semibold leading-tight text-[#0e1d17] tabular-nums">
            {summary.kpi.awardCount}
          </div>
          <p className="mt-2 text-xs text-[#6c7e76]">
            {user.role === "ADMIN" ? "含已核验与已发布获奖记录" : "仅统计已正式发布获奖记录"}
          </p>
        </div>

        <div className="card flex flex-col justify-between p-5">
          <span className="t-label text-xs font-medium text-[#54635d]">年度参赛项目</span>
          <div className="mt-2.5 font-serif text-3xl font-semibold leading-tight text-[#0e1d17] tabular-nums">
            {summary.kpi.projectCount}
          </div>
          <p className="mt-2 text-xs text-[#6c7e76]">参赛学生共 {summary.kpi.participantCount} 人（去重）</p>
        </div>
      </section>

      <div className="card px-5 py-3.5">
        <SectionHead
          title="折算计分口径"
          sub="赛事基础分（国赛 10 分、省赛 5 分、校赛 2 分）乘以奖项等级系数（特等/S 1.5、一等/A 1.2、二等/B 1.0、三等/C 0.8、优秀 0.5），展开任意学院可逐条核对得分依据。"
          meta={`展示前 ${rankings.length} 个学院`}
        />
      </div>

      <RankingTable items={rankings} />
    </div>
  );
}
