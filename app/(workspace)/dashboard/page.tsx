import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BookOpen, ClipboardCheck, FolderKanban, Trophy, Upload, type LucideIcon } from "lucide-react";
import { DashboardFilterBar } from "@/components/data/dashboard-filter-bar";
import { SectionHead } from "@/components/ui/section-head";
import { StatisticsCharts } from "@/components/data/statistics-charts";
import { getActiveUser } from "@/lib/auth.server";
import { firstParam } from "@/lib/list-query";
import { getStatisticsSummary, parseStatisticsQuery } from "@/lib/statistics";
import CountUp from "@/components/react-bits/CountUp";
import SpotlightCard from "@/components/react-bits/SpotlightCard";

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
    SCHOOL_FINAL: "#0e8a75",
    REJECTED: "#dc2626",
    PROVINCE_ADVANCED: "#2563eb",
    NATIONAL_ADVANCED: "#1d4ed8",
    WITHDRAWN: "#94a3b8",
  };
  const statusRows = (summary.myStatus ?? []).filter((item) => item.count > 0);
  const statusTotal = statusRows.reduce((sum, item) => sum + item.count, 0);
  const rejectedCount = (summary.myStatus ?? [])
    .filter((item) => item.status === "REJECTED")
    .reduce((sum, item) => sum + item.count, 0);

  // 图标底色按功能分类，让四个入口在扫视时就能分开，不用逐个读字。
  // 这层是「标识色」，和状态徽章那套「语义色」（红=错误/橙=待处理/绿=通过）分工不同：
  // 标识色只保证「同一类功能永远是同一个颜色」，不承载业务含义；
  // 语义色必须严格对应状态。两套不要混用，否则紫色也会被读成某种状态。
  const ICON_TONE = {
    blue: "bg-blue-100 text-blue-700 ring-blue-200",
    teal: "bg-teal-100 text-teal-700 ring-teal-200",
    emerald: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-100 text-amber-700 ring-amber-200",
    violet: "bg-violet-100 text-violet-700 ring-violet-200",
  } as const;

  type IconTone = keyof typeof ICON_TONE;
  type QuickLink = { href: string; label: string; note: string; icon: LucideIcon; tone: IconTone };

  const quickLinks: QuickLink[] = isAdmin ? [
    { href: "/projects", label: "项目台账", note: "查看与检索全部参赛项目", icon: FolderKanban, tone: "blue" },
    { href: "/review", label: "报名审核", note: "处理待学院与校级审核项目", icon: ClipboardCheck, tone: "amber" },
    { href: "/import", label: "数据导入", note: "导入外部平台导出的数据", icon: Upload, tone: "violet" },
    { href: "/intro", label: "赛事简介", note: "学生看到的赛事介绍与视频位", icon: BookOpen, tone: "teal" },
  ] : [
    { href: "/competitions", label: "赛事与报名", note: "查看已发布赛事与报名入口", icon: Trophy, tone: "blue" },
    { href: "/intro", label: "赛事简介", note: "先了解赛事定位、赛道与流程", icon: BookOpen, tone: "teal" },
    { href: "/my", label: "我的项目", note: "查看本人参与的项目与状态", icon: FolderKanban, tone: "emerald" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="t-page-title text-xl font-semibold text-slate-900">{scoped ? "我的统计" : "统计看板"}</h1>
        <p className="mt-1 text-sm text-slate-500">{scoped ? "仅统计本人参与的项目与状态，不展示全校数据。" : "所有数字按当前筛选条件实时聚合。"}</p>
      </div>

      <section className={`grid gap-3 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"}`} aria-label="快捷入口">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              className="group block card transition duration-[160ms] hover:border-blue-300 active:scale-[0.98] motion-reduce:active:scale-100"
              href={item.href}
              key={item.href}
            >
              <SpotlightCard
                borderGlow={0.4}
                className="flex items-center gap-3 p-4"
                intensity={0.55}
                proximity={48}
                softness={0.75}
                spotlightColor="#2563eb"
                spotlightSize={180}
                theme="light"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ${ICON_TONE[item.tone]}`}>
                  <Icon aria-hidden="true" size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-900">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{item.note}</span>
                </span>
                <ArrowUpRight aria-hidden="true" className="shrink-0 text-slate-400 transition group-hover:text-blue-600" size={16} />
              </SpotlightCard>
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

      {/* Bento：第一块放大带环形进度，其余三块退成次要信息。
          原来四块等宽等高，眼睛在四个同尺寸方块之间没有落点。
          环的百分比来自已有统计字段，不新增查询。 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12">
        {cards.map((card, index) => {
          // 只在真的有数字时才标红：0 个待审核不是需要处理的事，标红会变成常驻噪音
          const isWarning = card.value > 0 && /待审核|异常|退回|待补|超期/.test(card.label);
          const interactive = Boolean(card.href);
          const big = index === 0;
          const span = big
            ? "sm:col-span-2 xl:col-span-6 xl:row-span-2"
            : index === 3
              ? "sm:col-span-2 xl:col-span-6"
              : "xl:col-span-3";
          const className = [
            "relative card p-5",
            big ? "flex flex-col" : "",
            span,
            isWarning ? "t-warn" : "",
            interactive
              ? "group block transition duration-[160ms] hover:border-blue-300 hover:bg-blue-50/30 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 motion-reduce:active:scale-100"
              : "",
          ].filter(Boolean).join(" ");
          const circumference = 2 * Math.PI * 26;
          const body = (
            <>
              <h2 className="t-label text-xs text-slate-500">{card.label}</h2>
              {big ? (
                <div className="flex flex-1 items-center gap-5 py-4">
                  <svg aria-hidden="true" className="shrink-0" height="84" viewBox="0 0 64 64" width="84">
                    <circle cx="32" cy="32" fill="none" r="26" stroke="#eef2f7" strokeWidth="7" />
                    <circle
                      cx="32"
                      cy="32"
                      fill="none"
                      r="26"
                      stroke={isWarning ? "#d97706" : "#2563eb"}
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - ringPercent / 100)}
                      strokeLinecap="round"
                      strokeWidth="7"
                      transform="rotate(-90 32 32)"
                    />
                  </svg>
                  <div className="min-w-0">
                    <div className={`text-5xl font-semibold tabular-nums ${isWarning ? "t-warn-value" : "text-slate-900"}`}>
                      <CountUp to={card.value} duration={1.1} delay={0} trigger="load" easing="easeOut" />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      {ringLabel} <span className="font-semibold text-slate-900 tabular-nums">{ringPercent}%</span>
                      <span className="text-slate-400 tabular-nums"> · {ringNumerator}/{totalProjects}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className={`t-hero-title mt-3 text-3xl font-semibold ${isWarning ? "t-warn-value" : "text-slate-900"}`}>
                  <CountUp to={card.value} duration={1.1} delay={index * 0.08} trigger="load" easing="easeOut" />
                </div>
              )}
              <p className={`text-xs text-slate-400 ${big ? "mt-auto" : "mt-3"} ${interactive ? "pr-5" : ""}`}>{card.note}</p>
              {interactive ? (
                <ArrowUpRight
                  aria-hidden="true"
                  className="absolute right-4 top-4 text-slate-300 transition group-hover:text-blue-600"
                  size={16}
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
              eyebrow="SECTION 01 · MY STATUS"
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
                className="mt-4 inline-flex h-9 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-700 transition hover:bg-slate-50"
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
                      className="group inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-700"
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
                    <span className="mt-0.5 block text-[11px] text-slate-500">看驳回原因并重新提交</span>
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
            <div className="px-5 pt-5">
              <SectionHead
                eyebrow="SECTION 02 · BY COLLEGE"
                meta={`共 ${summary.byCollege.length} 个学院`}
                sub="点击学院名可下钻到对应审核项目列表"
                title="学院统计"
              />
            </div>
            <div aria-hidden="true" className="mx-5 mt-4 h-px bg-gradient-to-r from-slate-200 to-transparent" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="t-thead bg-slate-50 text-xs text-slate-500">
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
