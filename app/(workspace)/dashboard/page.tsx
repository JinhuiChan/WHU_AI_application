import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BookOpen, ClipboardCheck, FolderKanban, Trophy, Upload, type LucideIcon } from "lucide-react";
import { WhuEavesWatermark, WhuSeal, WhuTitleRule } from "@/components/brand/whu-motifs";
import { DashboardFilterBar } from "@/components/data/dashboard-filter-bar";
import { SectionHead } from "@/components/ui/section-head";
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
  // href 只给「点过去确实能看到对应明细」的卡片；没有对应页面的保持不可点，
  // 避免点进去看到的是一份无关列表。筛选口径与 lib/statistics.ts 的统计一致（reviewStatus）。
  const cards = scoped ? [
    { label: "我的项目数", value: summary.cards.totalProjects, note: "当前筛选内本人参与的项目", href: "/my?filter=all" },
    { label: "我的待审核", value: summary.cards.pendingReviewCount, note: "待学院审核或待校级终审", href: "/my?filter=pending" },
    { label: "我的终审通过", value: finalCount, note: "校内终审通过项目", href: "/my?filter=final" },
    { label: "我的晋级省赛", value: summary.cards.provinceAdvancedCount, note: "含已晋级国赛项目", href: "/my?filter=advanced" },
  ] : [
    { label: "项目总数", value: summary.cards.totalProjects, note: "当前筛选内的全部项目", href: "/projects" },
    { label: "报名总人数（去重）", value: summary.cards.totalParticipants, note: "按成员学号去重", href: null },
    { label: "待审核数", value: summary.cards.pendingReviewCount, note: "待学院审核或待校级终审", href: "/review" },
    { label: "晋级省赛数", value: summary.cards.provinceAdvancedCount, note: "含已晋级国赛项目", href: null },
  ];

  // 「我的状态」里每个状态块点进去对应的筛选：与 /my 的 filter 取值保持一致
  const statusFilter: Record<string, string> = {
    DRAFT: "draft",
    PENDING: "pending",
    COLLEGE_REVIEW: "pending",
    SCHOOL_FINAL: "final",
    REJECTED: "rejected",
    PROVINCE_ADVANCED: "advanced",
    NATIONAL_ADVANCED: "advanced",
    WITHDRAWN: "withdrawn",
  };

  const isAdmin = user.role === "ADMIN";

  // 大卡里的环形图：学生看「审核通过率」，管理员看「审核处理率」。
  // 两个都用同一份已有数据算，不新增查询；分母为 0 时环画 0，文案明说暂无项目。
  const totalProjects = summary.cards.totalProjects;
  const ringPercent = totalProjects > 0
    ? Math.round((scoped ? finalCount / totalProjects : (totalProjects - summary.cards.pendingReviewCount) / totalProjects) * 100)
    : 0;
  const ringLabel = scoped ? "审核通过率" : "审核处理率";
  const ringNumerator = scoped ? finalCount : totalProjects - summary.cards.pendingReviewCount;

  // 状态分布条：语义色固定，红=驳回、橙=待处理、绿=通过、蓝=晋级、灰=草稿/撤回。
  // 这是全站唯一一处分状态配色的地方，不要拿去做别的图。
  const STATUS_TONE: Record<string, string> = {
    DRAFT: "#cbd5e1",
    PENDING: "#d97706",
    COLLEGE_REVIEW: "#d97706",
    SCHOOL_FINAL: "#134e45",
    REJECTED: "#b91c1c",
    PROVINCE_ADVANCED: "#2e5996",
    NATIONAL_ADVANCED: "#1e4278",
    WITHDRAWN: "#94a3b8",
  };
  const statusRows = (summary.myStatus ?? []).filter((item) => item.count > 0);
  const statusTotal = statusRows.reduce((sum, item) => sum + item.count, 0);
  const rejectedCount = (summary.myStatus ?? [])
    .filter((item) => item.status === "REJECTED")
    .reduce((sum, item) => sum + item.count, 0);

  // 图标底色按功能分类，保持柔和浅底，避免高饱和色块抢戏
  const ICON_TONE = {
    blue: "bg-[#eef5f1] text-[#115740]",
    teal: "bg-teal-50 text-teal-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-[#f8e7e9] text-[#8a2c36]",
  } as const;

  type IconTone = keyof typeof ICON_TONE;
  type QuickLink = { href: string; label: string; note: string; icon: LucideIcon; tone: IconTone };

  const quickLinks: QuickLink[] = isAdmin ? [
    { href: "/projects", label: "项目台账", note: "查看与检索全部参赛项目", icon: FolderKanban, tone: "blue" },
    { href: "/review", label: "报名审核", note: "处理待学院与校级审核项目", icon: ClipboardCheck, tone: "amber" },
    { href: "/import", label: "数据导入", note: "导入外部平台导出的数据", icon: Upload, tone: "rose" },
    { href: "/intro", label: "赛事简介", note: "学生看到的赛事介绍与视频位", icon: BookOpen, tone: "teal" },
  ] : [
    { href: "/competitions", label: "赛事与报名", note: "查看已发布赛事与报名入口", icon: Trophy, tone: "blue" },
    { href: "/intro", label: "赛事简介", note: "先了解赛事定位、赛道与流程", icon: BookOpen, tone: "teal" },
    { href: "/my", label: "我的项目", note: "查看本人参与的项目与状态", icon: FolderKanban, tone: "emerald" },
  ];

  const pendingCnt = summary.cards.pendingReviewCount;
  const advCnt = summary.cards.provinceAdvancedCount;
  const schoolPassCnt = scoped
    ? Math.max(0, finalCount - advCnt)
    : Math.max(0, totalProjects - pendingCnt - advCnt);
  const maxCollegeProjects = Math.max(1, ...summary.byCollege.map((item) => item.projectCount));
  const advShareText = totalProjects > 0 ? `${((advCnt / totalProjects) * 100).toFixed(1)}%` : "0%";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="t-page-title font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
              {scoped ? "我的统计" : "统计看板"}
            </h1>
            <WhuSeal label={scoped ? "个人台账" : "珞珈台账"} />
          </div>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-[#54635d]">
            <WhuTitleRule />
            <span>
              {scoped
                ? "仅统计本人参与的项目与状态，点击卡片可穿透查看对应明细。"
                : "实时聚合全校申报进度与院系分布，点击任意卡片或学院下钻明细。"}
            </span>
          </p>
        </div>
        <DashboardFilterBar
          competitions={summary.options.competitions}
          years={summary.options.years}
          current={{
            competitionId: summary.filters.competitionId ?? "",
            year: summary.filters.year?.toString() ?? "",
            stage: summary.filters.stage ?? "",
          }}
        />
      </div>

      <section className={`grid gap-2.5 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"}`} aria-label="快捷入口">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              className="group flex items-center gap-3 rounded-xl border border-[#14221b]/[0.075] bg-white/75 px-3.5 py-2.5 transition duration-150 hover:border-[#657a6f] hover:bg-white active:scale-[0.99] motion-reduce:active:scale-100"
              href={item.href}
              key={item.href}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ICON_TONE[item.tone]}`}>
                <Icon aria-hidden="true" size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-[#13231d]">{item.label}</span>
                <span className="block truncate text-[11px] text-[#677770]">{item.note}</span>
              </span>
              <ArrowUpRight aria-hidden="true" className="shrink-0 text-[#9ab0a5] transition group-hover:text-[#002554]" size={14} />
            </Link>
          );
        })}
      </section>

      {/* Bento：主卡采用宣纸青玉微釉 + 双圈刻度环 + 宋体展示大数 + 状态分段条 + 老图书馆重檐暗纹 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
        {cards.map((card, index) => {
          const isWarning = card.value > 0 && /待审核|异常|退回|待补|超期/.test(card.label);
          const interactive = Boolean(card.href);
          const big = index === 0;
          const wide = index === 3;
          const span = big
            ? "sm:col-span-2 xl:col-span-6 xl:row-span-2"
            : wide
              ? "sm:col-span-2 xl:col-span-6"
              : "xl:col-span-3";
          const className = [
            "relative overflow-hidden card p-5",
            big
              ? "flex flex-col justify-between border-[#c0d5ca] bg-gradient-to-br from-white via-white to-[#f0f7f3] shadow-[0_8px_24px_-12px_rgba(17,87,64,0.16),0_1px_3px_rgba(17,87,64,0.05)] before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-[#115740] before:via-[#1c7859] before:to-[#c59b45]"
              : wide
                ? "flex items-center justify-between gap-4 py-4"
                : "flex flex-col justify-between",
            span,
            isWarning && !big ? "border-l-[3px] border-l-[#9e2a35] bg-[#fffdfd]" : "",
            interactive
              ? "group block transition duration-[160ms] hover:border-[#657a6f] hover:bg-[#f7faf8] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740] motion-reduce:active:scale-100"
              : "",
          ].filter(Boolean).join(" ");
          const circumference = 2 * Math.PI * 27;
          const body = big ? (
            <>
              <div className="relative z-[1] flex items-center justify-between gap-2">
                <h2 className="t-label text-xs font-semibold text-[#43554d]">
                  {card.label} · {scoped ? "本人参与" : "全校在库"}
                </h2>
                <span className="inline-flex items-center rounded-full bg-[#e3f0ea] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#115740] tabular-nums">
                  {ringLabel} {ringPercent}%
                </span>
              </div>
              <div className="relative z-[1] flex items-center gap-5 py-4">
                <svg aria-hidden="true" className="shrink-0" height="78" viewBox="0 0 68 68" width="78">
                  <circle cx="34" cy="34" fill="none" r="27" stroke="#dfeae4" strokeWidth="5.5" />
                  <circle cx="34" cy="34" fill="none" r="21" stroke="#d0e0d7" strokeDasharray="2 3" strokeWidth="1" />
                  <circle
                    cx="34"
                    cy="34"
                    fill="none"
                    r="27"
                    stroke={isWarning ? "#d97706" : "#115740"}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - ringPercent / 100)}
                    strokeLinecap="round"
                    strokeWidth="5.5"
                    transform="rotate(-90 34 34)"
                  />
                </svg>
                <div className="min-w-0">
                  <div className="font-display text-[46px] font-bold leading-none tracking-tight text-[#0b1f18] tabular-nums">
                    {card.value}
                  </div>
                  <p className="mt-2 text-xs text-[#54635d]">
                    {scoped ? "终审通过" : "已终审结项"}{" "}
                    <span className="font-semibold text-[#0f1d18] tabular-nums">{ringNumerator} 项</span>
                    <span className="text-[#6c7e76] tabular-nums"> · 流转待审 {pendingCnt} 项</span>
                  </p>
                </div>
              </div>
              <div className="relative z-[1] border-t border-[#e2ede7] pt-3">
                <div className="flex h-1.5 overflow-hidden rounded-full bg-[#e5efe9] gap-[2px]">
                  {totalProjects > 0 ? (
                    <>
                      {schoolPassCnt > 0 ? (
                        <span style={{ width: `${(schoolPassCnt / totalProjects) * 100}%` }} className="bg-[#115740]" />
                      ) : null}
                      {advCnt > 0 ? (
                        <span style={{ width: `${(advCnt / totalProjects) * 100}%` }} className="bg-[#002554]" />
                      ) : null}
                      {pendingCnt > 0 ? (
                        <span style={{ width: `${(pendingCnt / totalProjects) * 100}%` }} className="bg-[#d97706]" />
                      ) : null}
                    </>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-[#54635d] tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#115740]" />
                    {scoped ? "校赛已通过" : "校终审结项"} {schoolPassCnt}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#002554]" />
                    晋级省/国赛 {advCnt}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#d97706]" />
                    待审核 {pendingCnt}
                  </span>
                </div>
              </div>
              <WhuEavesWatermark className="pointer-events-none absolute -bottom-2 -right-1.5 h-[116px] w-[204px] text-[#0d3b2e]/[0.05]" />
            </>
          ) : wide ? (
            <>
              <div className="min-w-0">
                <h2 className="t-label text-xs text-[#5c6c65]">{card.label}</h2>
                <p className="mt-1.5 text-xs text-[#7c8e85]">
                  占当前在库项目的 <span className="font-medium text-[#43554d] tabular-nums">{advShareText}</span> · {card.note}
                </p>
              </div>
              <div className="shrink-0 font-display text-[36px] font-bold leading-none text-[#002554] tabular-nums">
                {card.value}
              </div>
            </>
          ) : (
            <>
              <h2 className={`t-label text-xs ${isWarning ? "font-semibold !text-[#9e2a35]" : "text-[#5c6c65]"}`}>
                {card.label}
              </h2>
              <div
                className={`mt-2 font-display text-[33px] font-bold leading-tight tabular-nums ${
                  isWarning ? "text-[#9e2a35]" : "text-[#0f1d18]"
                }`}
              >
                {card.value}
              </div>
              <p className={`mt-2 text-xs ${isWarning ? "text-[#9e5960]" : "text-[#82948b]"} ${interactive ? "pr-5" : ""}`}>
                {card.note}
              </p>
              {interactive ? (
                <ArrowUpRight
                  aria-hidden="true"
                  className={`absolute right-4 top-4 transition ${
                    isWarning ? "text-[#c48188] group-hover:text-[#9e2a35]" : "text-slate-300 group-hover:text-[#002554]"
                  }`}
                  size={15}
                />
              ) : null}
            </>
          );
          return card.href ? (
            <Link className={className} href={card.href} key={card.label}>
              {body}
            </Link>
          ) : (
            <section className={className} key={card.label}>
              {body}
            </section>
          );
        })}
      </div>

      {scoped ? (
        <section className="card">
          <div className="px-5 pt-5">
            <SectionHead
              meta={`共 ${statusTotal} 个项目`}
              sub="仅汇总当前筛选内本人参与的项目，图例可点"
              title="我的状态分布"
            />
          </div>
          {statusTotal === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-slate-600">这个筛选条件下还没有你参与的项目。</p>
              <p className="mt-1 text-xs text-slate-400">换个赛事或年份试试，也可以清除筛选看看全部数据。</p>
              <Link
                className="mt-4 inline-flex h-9 items-center justify-center rounded-full border border-[#7f9384] bg-white px-4 text-sm text-[#24362f] transition hover:border-[#115740] hover:bg-[#f2f8f4]"
                href="/dashboard"
              >
                清除筛选
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center">
              {/* 占比条：一眼看出哪一类占大头，比一排独立数字更直观 */}
              <div className="min-w-0 flex-1">
                <div
                  aria-label={`共 ${statusTotal} 个项目，按状态占比`}
                  className="flex h-2 overflow-hidden rounded-full bg-slate-100"
                  role="img"
                >
                  {statusRows.map((item) => (
                    <span
                      key={item.status}
                      style={{ backgroundColor: STATUS_TONE[item.status] ?? "#94a3b8", width: `${(item.count / statusTotal) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                  {statusRows.map((item) => (
                    <Link
                      className="group inline-flex items-center gap-1.5 rounded-sm text-xs text-slate-600 transition-colors hover:text-[#115740] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
                      href={`/my?filter=${statusFilter[item.status] ?? "all"}`}
                      key={item.status}
                    >
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 rounded-[3px]"
                        style={{ backgroundColor: STATUS_TONE[item.status] ?? "#94a3b8" }}
                      />
                      {item.label}
                      <span className="font-semibold text-slate-900 tabular-nums">{item.count}</span>
                      <span className="text-slate-400 tabular-nums">{Math.round((item.count / statusTotal) * 100)}%</span>
                    </Link>
                  ))}
                </div>
              </div>
              {/* 万一有驳回，把空出来的空间变成下一步动作，而不是留白 */}
              {rejectedCount > 0 ? (
                <Link
                  className="group flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50/60 px-4 py-3 transition hover:border-red-200 hover:bg-red-50 lg:w-72 lg:shrink-0"
                  href="/my?filter=rejected"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-red-700">有 {rejectedCount} 个项目被驳回</span>
                    <span className="mt-0.5 block text-xs text-slate-500">看驳回原因并重新提交</span>
                  </span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-red-600 transition group-hover:bg-red-600 group-hover:text-white">
                    <ArrowUpRight aria-hidden="true" size={14} />
                  </span>
                </Link>
              ) : null}
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="overflow-hidden card">
            <div className="px-5 pt-4">
              <SectionHead
                meta={`共 ${summary.byCollege.length} 个学院`}
                sub="点击学院名可下钻审核列表 · 条形长度表示申报量占比"
                title="学院统计"
              />
            </div>
            <div aria-hidden="true" className="mx-5 mt-3.5 h-px bg-[#d5e2db]/60" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="t-thead bg-[#f5faf7] text-xs text-[#4d5e57]">
                  <tr>
                    <th className="w-[32%] px-5 py-2.5 font-medium">学院</th>
                    <th className="w-[28%] px-5 py-2.5 font-medium">项目数与院系占比</th>
                    <th className="w-[20%] px-5 py-2.5 font-medium">参赛人数（去重）</th>
                    <th className="w-[20%] px-5 py-2.5 font-medium">晋级省赛数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef4f0]">
                  {summary.byCollege.map((item) => {
                    const barWidth = `${Math.max(8, Math.round((item.projectCount / maxCollegeProjects) * 100))}%`;
                    return (
                      <tr key={item.college} className="text-slate-700">
                        <td className="px-5 py-2.5 font-semibold text-slate-900">
                          {isAdmin ? (
                            <Link href={`/review?college=${encodeURIComponent(item.college)}`} className="text-[#002554] hover:underline">
                              {item.college}
                            </Link>
                          ) : (
                            item.college
                          )}
                        </td>
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-3">
                            <span className="w-5 font-display text-sm font-bold text-[#0f1d18] tabular-nums">{item.projectCount}</span>
                            <span className="block h-[7px] w-32 overflow-hidden rounded-full bg-[#e2ece6]">
                              <span
                                className="block h-full rounded-full bg-gradient-to-r from-[#115740] to-[#237a5d]"
                                style={{ width: item.projectCount > 0 ? barWidth : "0%" }}
                              />
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-2.5 text-[#33433d] tabular-nums">{item.participantCount} 人</td>
                        <td className="px-5 py-2.5 tabular-nums">
                          {item.provinceAdvancedCount > 0 ? (
                            <span className="inline-flex rounded-full bg-[#e6eef8] px-2.5 py-0.5 text-xs font-semibold text-[#002554]">
                              {item.provinceAdvancedCount} 项晋级
                            </span>
                          ) : (
                            <span className="text-[#95a59d]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!summary.byCollege.length ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center">
                        <p className="text-sm text-slate-600">这个筛选条件下还没有项目数据。</p>
                        <p className="mt-1 text-xs text-slate-400">换个赛事、年份或阶段试试，也可以清除筛选。</p>
                        <Link
                          className="mt-4 inline-flex h-9 items-center justify-center rounded-full border border-[#7f9384] bg-white px-4 text-sm text-[#24362f] transition hover:border-[#115740] hover:bg-[#f2f8f4]"
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
