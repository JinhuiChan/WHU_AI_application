import { detailHref, listHref } from "@/components/data/list-link";
import { WhuEavesWatermark, WhuSeal, WhuTitleRule } from "@/components/brand/whu-motifs";
import { EmptyState } from "@/components/ui/empty-state";
import { Button, ButtonArrow } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProjectProgress } from "@/components/project/project-progress";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, Compass, FileEdit, Filter, Plus, Search, Undo2 } from "lucide-react";
import { getMyProjects } from "@/lib/apply";
import { getActiveUser } from "@/lib/auth.server";
import { firstParam } from "@/lib/list-query";
import { SectionHead } from "@/components/ui/section-head";
import { formatDateTime, registrationStatusLabels } from "@/lib/presentation";

export const metadata: Metadata = { title: "我的项目" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

/**
 * 看板统计卡与「我的状态」点进来时带的筛选。
 * 口径必须与 lib/statistics.ts 一致（都按 reviewStatus 分组），
 * 否则会出现「卡片写着 1、列表却是 0」这种自相矛盾。
 */
const FILTERS: Array<{ key: string; label: string; statuses: string[] }> = [
  { key: "all", label: "全部", statuses: [] },
  { key: "pending", label: "待审核", statuses: ["PENDING", "COLLEGE_REVIEW"] },
  { key: "final", label: "终审通过", statuses: ["SCHOOL_FINAL"] },
  { key: "advanced", label: "晋级省赛", statuses: ["PROVINCE_ADVANCED", "NATIONAL_ADVANCED"] },
  { key: "rejected", label: "已驳回", statuses: ["REJECTED"] },
  { key: "draft", label: "草稿", statuses: ["DRAFT"] },
  { key: "withdrawn", label: "已撤回", statuses: ["WITHDRAWN"] },
];

const matches = (statuses: string[], value: string) => statuses.length === 0 || statuses.includes(value);

/**
 * 相对时间：表格里「2026/11/01 10:39」要读三秒才知道是多久以前。
 * 换成「3 天前」一眼就懂，完整时间挂在 title 上，需要精确值时鼠标停一下就出来。
 */
function relativeTime(date: Date) {
  const diff = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;
  return date.toISOString().slice(0, 10).replace(/-/g, "/");
}

type StepTone = "amber" | "celadon" | "stone";

const STEP_STYLE: Record<StepTone, { circle: string; box: string; tag: string; cta: string }> = {
  amber: {
    circle: "border border-[#e3c78e] bg-[#f7ebd2] text-[#8a651b]",
    box: "border-[#e3c78e] border-l-[4px] border-l-[#c59b45] bg-gradient-to-r from-[#fdf8ee] via-[#fefbf5] to-white",
    tag: "border border-[#ead7af] bg-white/90 text-[#8a651b]",
    cta: "bg-[#115740] text-white hover:bg-[#0d4633] active:bg-[#093526] focus-visible:ring-[#115740]/25",
  },
  celadon: {
    circle: "border border-[#c0d5ca] bg-[#e3f0ea] text-[#115740]",
    box: "border-[#c5dad0] border-l-[4px] border-l-[#115740] bg-gradient-to-r from-[#eef5f1] via-[#f8fbf9] to-white",
    tag: "border border-[#cde0d5] bg-white/90 text-[#115740]",
    cta: "border-[#7f9384] bg-white text-[#1b2e26] hover:border-[#115740] hover:bg-[#eef5f1] focus-visible:ring-[#115740]/25",
  },
  stone: {
    circle: "border border-[#d5e2db] bg-[#eef3f0] text-[#54635d]",
    box: "border-[#d5e2db] border-l-[4px] border-l-[#7f9384] bg-gradient-to-r from-[#f6faf8] to-white",
    tag: "border border-[#d5e2db] bg-white text-[#54635d]",
    cta: "border-[#7f9384] bg-white text-[#1b2e26] hover:border-[#115740] hover:bg-[#eef5f1] focus-visible:ring-[#115740]/25",
  },
};

/**
 * 把「当前状态」翻译成「下一步做什么」。
 * 优先高亮被驳回与未提交草稿，采用温润琥珀/青瓷书签提示卡。
 */
function nextStepFor(project: { reviewStatus: string; rejectedReason?: string | null }) {
  switch (project.reviewStatus) {
    case "REJECTED":
      return {
        tone: "amber" as StepTone,
        badge: "退回待改",
        icon: AlertTriangle,
        title: "被退回了，需补充或修订材料后重新提交",
        body: project.rejectedReason
          ? `退回原因：${project.rejectedReason}`
          : "退回原因尚未注明，请先核查团队成员、指导老师与材料完整性。",
        action: "去处理",
        solidCta: true,
      };
    case "DRAFT":
      return {
        tone: "amber" as StepTone,
        badge: "草稿待提",
        icon: FileEdit,
        title: "这份报名尚处草稿状态，还未正式提交",
        body: "填写完备并点击提交后，方会进入学院与校级审核队列；提交前可随时修订。",
        action: "继续填写",
        solidCta: true,
      };
    case "PENDING":
    case "COLLEGE_REVIEW":
      return {
        tone: "celadon" as StepTone,
        badge: "流转待审",
        icon: Clock3,
        title: "材料已提交，正在等待学院与校级依次核验",
        body: "审核结果将自动同步至此，期间无需重复提交，可进入详情查看盖章件状态。",
        action: "查看报名详情",
        solidCta: false,
      };
    case "SCHOOL_FINAL":
      return {
        tone: "celadon" as StepTone,
        badge: "终审通过",
        icon: CheckCircle2,
        title: "已通过校内终审，立项档案已留存",
        body: "校内材料已归档留存；后续省赛通知发布后，请按赛事规程完成下一阶段申报。",
        action: "查看归档版本",
        solidCta: false,
      };
    case "PROVINCE_ADVANCED":
    case "NATIONAL_ADVANCED":
      return {
        tone: "celadon" as StepTone,
        badge: "晋级立项",
        icon: CheckCircle2,
        title: "已晋级至下一竞赛阶段",
        body: "后续复核与路演材料要求以最新通知为准，平台持续保留提交快照。",
        action: "查看项目",
        solidCta: false,
      };
    case "WITHDRAWN":
      return {
        tone: "stone" as StepTone,
        badge: "已撤回",
        icon: Undo2,
        title: "这份报名已撤回",
        body: "撤回后不再参与当前批次审核；如需重新参赛，可前往赛事页重新发起报名。",
        action: "浏览赛事",
        solidCta: false,
      };
    default:
      return null;
  }
}

export default async function MyProjectsPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/dashboard");
  const projects = await getMyProjects(user.id);

  const filterKey = firstParam(searchParams?.filter) || "all";
  const from = listHref("/my", { filter: filterKey === "all" ? "" : filterKey });
  const active = FILTERS.find((item) => item.key === filterKey) ?? FILTERS[0];
  const visible = projects.filter((project) => matches(active.statuses, project.reviewStatus));
  const countOf = (statuses: string[]) => projects.filter((project) => matches(statuses, project.reviewStatus)).length;
  const pendingCount = countOf(["PENDING", "COLLEGE_REVIEW"]);
  const passedCount = countOf(["SCHOOL_FINAL", "PROVINCE_ADVANCED", "NATIONAL_ADVANCED"]);
  const rejectedCount = countOf(["REJECTED"]);
  const draftCount = countOf(["DRAFT"]);

  const query = (firstParam(searchParams?.q) || "").trim();
  const keyword = query.toLowerCase();
  const rows = keyword
    ? visible.filter((project) =>
        `${project.name} ${project.competitionName} ${project.trackName}`.toLowerCase().includes(keyword),
      )
    : visible;

  const filterHref = (key: string) =>
    `/my?filter=${key}${query ? `&q=${encodeURIComponent(query)}` : ""}`;

  // 优先挑需要本人动手的项目：已驳回 → 草稿待提交 → 待审核 → 其余
  const focus =
    visible.find((project) => project.reviewStatus === "REJECTED") ??
    visible.find((project) => project.reviewStatus === "DRAFT") ??
    visible.find((project) => project.reviewStatus === "PENDING" || project.reviewStatus === "COLLEGE_REVIEW") ??
    visible[0];
  const step = focus ? nextStepFor(focus) : null;
  const StepIcon = step?.icon;
  const stepHref = focus && focus.reviewStatus === "WITHDRAWN" ? "/competitions" : focus ? `/my/${focus.id}` : "/my";

  const metricCards = [
    {
      label: "我的项目",
      badge: "个人总览",
      badgeClass: "bg-[#e3f0ea] text-[#115740]",
      value: projects.length,
      valueClass: "text-[#0b1f18]",
      note: draftCount > 0 ? `含草稿 ${draftCount} 项待提交` : "本人负责或参与的全部项目",
      href: filterHref("all"),
      cardTone:
        "border-[#c0d5ca] bg-gradient-to-br from-white via-white to-[#f0f7f3] before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-[#115740] before:via-[#1c7859] before:to-[#c59b45]",
      withWatermark: true,
    },
    {
      label: "待审核",
      badge: "流转中",
      badgeClass: "bg-[#fdf8ee] text-[#8a651b] ring-1 ring-[#ead7af]",
      value: pendingCount,
      valueClass: pendingCount > 0 ? "text-[#8a651b]" : "text-[#0f1d18]",
      note: "学院初审与校级终审中",
      href: filterHref("pending"),
      cardTone:
        "before:absolute before:inset-x-0 before:top-0 before:h-[2.5px] before:bg-[#c59b45]",
      withWatermark: false,
    },
    {
      label: "已通过",
      badge: "终审归档",
      badgeClass: "bg-[#eef5f1] text-[#115740] ring-1 ring-[#cde0d5]",
      value: passedCount,
      valueClass: "text-[#115740]",
      note: "校内终审通过及晋级项目",
      href: filterHref("final"),
      cardTone:
        "before:absolute before:inset-x-0 before:top-0 before:h-[2.5px] before:bg-[#115740]",
      withWatermark: false,
    },
    {
      label: "已驳回",
      badge: rejectedCount > 0 ? "需修订" : "零退回",
      badgeClass:
        rejectedCount > 0
          ? "bg-[#fdf2f3] text-[#9e2a35] ring-1 ring-[#e5b8bd]"
          : "bg-[#f2f6f4] text-[#5c6c65] ring-1 ring-[#d5e2db]",
      value: rejectedCount,
      valueClass: rejectedCount > 0 ? "text-[#9e2a35]" : "text-[#0f1d18]",
      note: "需补齐材料后重新提交",
      href: filterHref("rejected"),
      cardTone:
        rejectedCount > 0
          ? "bg-[#fffdfd] before:absolute before:inset-x-0 before:top-0 before:h-[2.5px] before:bg-[#9e2a35]"
          : "before:absolute before:inset-x-0 before:top-0 before:h-[2.5px] before:bg-[#b8cbc0]",
      withWatermark: false,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="t-page-title font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
              我的项目
            </h1>
            <WhuSeal label="个人台账" />
          </div>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-[#54635d]">
            <WhuTitleRule />
            <span>
              查看本人负责或参与项目的报名流转与归档状态。
              {active.key === "all" ? "" : `当前筛选「${active.label}」，共 ${visible.length} 项。`}
            </span>
          </p>
        </div>
        <Link
          href="/competitions"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#115740] px-5 text-sm font-medium text-white shadow-sm transition-colors duration-150 hover:bg-[#0d4633] active:scale-[0.98] active:bg-[#093526] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 focus-visible:ring-offset-2 motion-reduce:active:scale-100"
        >
          <Plus aria-hidden="true" size={16} />
          新建报名
        </Link>
      </div>

      {/* 书院 Bento 4 格概览统计卡：与 /dashboard 呼应，宋体大号 tabular-nums 数字 + 顶部语义色线与青瓷徽标 */}
      <section aria-label="进度概览" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metricCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`group relative flex flex-col justify-between overflow-hidden card p-4 sm:p-5 transition duration-150 hover:border-[#657a6f] hover:bg-[#f7faf8] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 motion-reduce:active:scale-100 ${card.cardTone}`}
          >
            <div className="relative z-[1] flex items-center justify-between gap-2">
              <span className="t-label text-xs font-semibold text-[#43554d]">{card.label}</span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${card.badgeClass}`}>
                {card.badge}
              </span>
            </div>
            <div className="relative z-[1] mt-3 flex items-baseline justify-between gap-2">
              <span className={`font-display text-3xl font-semibold leading-none tracking-tight tabular-nums sm:text-[34px] ${card.valueClass}`}>
                {card.value}
              </span>
              <ArrowUpRight
                aria-hidden="true"
                className="shrink-0 text-[#9ab0a5] transition-colors group-hover:text-[#115740]"
                size={15}
              />
            </div>
            <p className="relative z-[1] mt-2.5 text-xs text-[#5c6c65]">{card.note}</p>
            {card.withWatermark ? (
              <WhuEavesWatermark className="pointer-events-none absolute -bottom-3 -right-2 h-[88px] w-[154px] text-[#0d3b2e]/[0.055]" />
            ) : null}
          </Link>
        ))}
      </section>

      {/* 温润琥珀/青瓷书签待办焦点提示卡 */}
      {step && focus && StepIcon ? (
        <section
          className={`rounded-xl border p-4 shadow-[0_2px_10px_-6px_rgba(17,87,64,0.12)] ${STEP_STYLE[step.tone].box}`}
          aria-label="下一步该做什么"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${STEP_STYLE[step.tone].circle}`}>
                <StepIcon size={17} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STEP_STYLE[step.tone].tag}`}>
                    {step.badge}
                  </span>
                  <p className="text-sm font-semibold text-[#0f1d18]">{step.title}</p>
                </div>
                <p className="mt-1 text-sm leading-6 text-[#43554d]">{step.body}</p>
                <p className="mt-1 text-xs text-[#6c7e76]">
                  关联项目：<span className="font-medium text-[#24362f]">{focus.name}</span>
                  {visible.length > 1 ? `（另有 ${visible.length - 1} 项见下方台账）` : ""}
                </p>
              </div>
            </div>
            <Button
              asChild
              variant={step.solidCta ? "default" : "outline"}
              className={`group shrink-0 rounded-full ${STEP_STYLE[step.tone].cta}`}
            >
              <Link href={stepHref}>
                {step.action}
                <ButtonArrow />
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="按状态筛选" className="flex flex-wrap gap-1.5">
          {FILTERS.map((item) => {
            const count = countOf(item.statuses);
            const isActive = item.key === active.key;
            return (
              <Link
                key={item.key}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 motion-reduce:active:scale-100 ${
                  isActive
                    ? "border-[#115740] bg-[#115740] font-medium text-white"
                    : "border-[#7f9384] bg-white text-[#24362f] hover:border-[#115740] hover:bg-[#eef5f1]"
                }`}
                href={filterHref(item.key)}
              >
                {item.label}
                <span className={`text-xs tabular-nums ${isActive ? "text-white/85" : "text-[#6c7e76]"}`}>{count}</span>
              </Link>
            );
          })}
        </nav>

        <form action="/my" className="flex items-center gap-2">
          {filterKey !== "all" ? <input type="hidden" name="filter" value={filterKey} /> : null}
          <input
            aria-label="搜索我的项目"
            className="h-9 w-44 rounded-full border border-[#7f9384] bg-white px-3.5 text-sm text-[#0f1d18] outline-none transition-colors duration-150 placeholder:text-[#7c8e85] focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 sm:w-52"
            defaultValue={query}
            name="q"
            placeholder="搜索项目 / 赛事"
            type="search"
          />
          <Button
            className="h-9 rounded-full border-[#7f9384] bg-white px-4 text-[#1b2e26] hover:border-[#115740] hover:bg-[#eef5f1] focus-visible:ring-[#115740]/25 disabled:opacity-60"
            size="sm"
            type="submit"
            variant="outline"
          >
            搜索
          </Button>
          {query ? (
            <Link
              className="inline-flex h-9 items-center rounded-full border border-[#7f9384] bg-white px-3.5 text-xs font-medium text-[#43554d] transition-colors hover:border-[#115740] hover:bg-[#eef5f1] hover:text-[#115740] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 motion-reduce:active:scale-100"
              href={filterKey === "all" ? "/my" : `/my?filter=${filterKey}`}
            >
              清除
            </Link>
          ) : null}
        </form>
      </div>

      <Card as="section" className="overflow-hidden">
        <div className="px-5 pt-5">
          <SectionHead
            meta={`共 ${rows.length} 项`}
            sub="审核节点、驳回原因、提交次数与最近修订时间集中存档"
            title="项目明细"
          />
        </div>
        <div aria-hidden="true" className="mx-5 mt-4 h-px bg-[#d5e2db]/70" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="t-thead bg-[#f5faf7] text-xs text-[#43554d]">
              <tr>
                <th className="w-[28%] px-4 py-3 font-semibold">项目与赛道</th>
                <th className="w-[22%] px-4 py-3 font-semibold">流转状态</th>
                <th className="w-[9%] px-4 py-3 font-semibold">提交</th>
                <th className="w-[20%] px-4 py-3 font-semibold">驳回原因</th>
                <th className="w-[10%] px-4 py-3 font-semibold">最后修改</th>
                <th className="w-[11%] min-w-[108px] px-4 py-3 text-right font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaf1ed]">
              {rows.map((project) => (
                <tr key={project.id} className="align-middle">
                  <td className="px-4 py-3.5">
                    <Link
                      className="font-semibold text-[#0f1d18] transition-colors hover:text-[#115740] focus-visible:outline-none focus-visible:underline"
                      href={detailHref("/my", project.id, from)}
                    >
                      {project.name}
                    </Link>
                    <div className="mt-0.5 text-xs text-[#5c6c65]">
                      {project.competitionName} / {project.trackName}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col items-start gap-1.5">
                      <StatusBadge status={project.reviewStatus}>
                        {registrationStatusLabels[project.reviewStatus]}
                      </StatusBadge>
                      <ProjectProgress status={project.reviewStatus} compact />
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-[#33433d] tabular-nums">
                    {project.submissionCount > 0 ? `${project.submissionCount} 次` : "未提交"}
                  </td>
                  <td className="px-4 py-3.5 text-xs leading-5 text-[#43554d]">
                    <span className="line-clamp-2" title={project.rejectedReason ?? undefined}>
                      {project.rejectedReason ?? "—"}
                    </span>
                  </td>
                  <td
                    className="whitespace-nowrap px-4 py-3.5 text-xs text-[#54635d] tabular-nums"
                    title={formatDateTime(project.updatedAt.toISOString())}
                  >
                    {relativeTime(project.updatedAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="group h-8 rounded-full border-[#7f9384] bg-white px-3.5 text-[#115740] hover:border-[#115740] hover:bg-[#eef5f1] focus-visible:ring-[#115740]/25"
                    >
                      <Link href={detailHref("/my", project.id, from)}>
                        查看
                        <ButtonArrow />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    {projects.length === 0 ? (
                      <EmptyState
                        title="你还没有项目"
                        description="先从已发布的赛事中选择赛项发起报名；提交后的审核进度与归档材料都会汇总在此。"
                        action={{ href: "/competitions", label: "浏览赛事" }}
                        icon={<Compass aria-hidden="true" size={20} />}
                      />
                    ) : query ? (
                      <EmptyState
                        title={`没有匹配「${query}」的项目`}
                        description={`当前筛选内共 ${visible.length} 项，但项目名称、赛事或赛道均不含该关键词。`}
                        action={{ href: filterHref("all"), label: "清除搜索" }}
                        icon={<Search aria-hidden="true" size={20} />}
                      />
                    ) : (
                      <EmptyState
                        title={`没有「${active.label}」的项目`}
                        description={`你目前共有 ${projects.length} 个项目，当前筛选状态下暂无记录。`}
                        action={{ href: "/my", label: "查看全部项目" }}
                        icon={<Filter aria-hidden="true" size={20} />}
                      />
                    )}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
