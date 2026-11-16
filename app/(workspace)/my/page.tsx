import { detailHref, listHref } from "@/components/data/list-link";
import { EmptyState } from "@/components/ui/empty-state";
import { Button, ButtonArrow } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProjectProgress } from "@/components/project/project-progress";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, Compass, FileEdit, Filter, Search, Undo2 } from "lucide-react";
import { getMyProjects } from "@/lib/apply";
import { getActiveUser } from "@/lib/auth.server";
import { firstParam } from "@/lib/list-query";
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

type StepTone = "amber" | "blue" | "emerald" | "slate";

const STEP_STYLE: Record<StepTone, { circle: string; box: string }> = {
  amber: { circle: "bg-amber-100 text-amber-700", box: "border-amber-200 bg-amber-50/70" },
  blue: { circle: "bg-blue-100 text-blue-700", box: "border-blue-200 bg-blue-50/70" },
  emerald: { circle: "bg-emerald-100 text-emerald-700", box: "border-emerald-200 bg-emerald-50/70" },
  slate: { circle: "bg-slate-100 text-slate-600", box: "border-slate-200 bg-white" },
};

/**
 * 把「当前状态」翻译成「下一步做什么」。
 * 学生大多数时候只有一个项目，表格只有一行、下面一片空白，
 * 光看「已驳回」三个字并不知道该点哪里。这里只描述已有事实，不编造处理时限。
 */
function nextStepFor(project: { reviewStatus: string; rejectedReason?: string | null }) {
  switch (project.reviewStatus) {
    case "REJECTED":
      return {
        tone: "amber" as StepTone,
        icon: AlertTriangle,
        title: "被退回了，需要补材料后重新提交",
        body: project.rejectedReason
          ? `退回原因：${project.rejectedReason}`
          : "退回原因还没填写。可以先检查团队成员、指导老师与材料是否齐全。",
        action: "去处理",
      };
    case "DRAFT":
      return {
        tone: "slate" as StepTone,
        icon: FileEdit,
        title: "这份报名还是草稿，没有提交",
        body: "填写完成后提交，才会进入学院审核队列。提交前可以随时修改。",
        action: "继续填写",
      };
    case "PENDING":
    case "COLLEGE_REVIEW":
      return {
        tone: "blue" as StepTone,
        icon: Clock3,
        title: "已提交，正在等待审核",
        body: "审核由学院和学校依次处理，结果会自动更新在这里，不需要重复提交。",
        action: "查看报名详情",
      };
    case "SCHOOL_FINAL":
      return {
        tone: "emerald" as StepTone,
        icon: CheckCircle2,
        title: "已通过校内终审",
        body: "材料已冻结留档。省赛通知发布后，按通知在外部平台完成报名。",
        action: "查看冻结版本",
      };
    case "PROVINCE_ADVANCED":
    case "NATIONAL_ADVANCED":
      return {
        tone: "emerald" as StepTone,
        icon: CheckCircle2,
        title: "已晋级到下一阶段",
        body: "后续材料与复核要求以通知为准，平台保留的是当时提交的版本。",
        action: "查看项目",
      };
    case "WITHDRAWN":
      return {
        tone: "slate" as StepTone,
        icon: Undo2,
        title: "这份报名已撤回",
        body: "撤回后不再参与当前批次审核。需要重新参加时，可以新发起一次报名。",
        action: "浏览赛事",
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
  const passedCount = countOf(["SCHOOL_FINAL"]);
  const rejectedCount = countOf(["REJECTED"]);

  // 搜索只在已筛选出来的结果里做，不改查询、不加接口参数——
  // 学生项目量级是几个到几十个，服务端一次取完再过滤足够，也不会和分页打架（这页没有分页）。
  const query = (firstParam(searchParams?.q) || "").trim();
  const keyword = query.toLowerCase();
  const rows = keyword
    ? visible.filter((project) =>
        `${project.name} ${project.competitionName} ${project.trackName}`.toLowerCase().includes(keyword),
      )
    : visible;

  // 保留搜索词，切换状态筛选时不至于把刚打的字清掉
  const filterHref = (key: string) =>
    `/my?filter=${key}${query ? `&q=${encodeURIComponent(query)}` : ""}`;

  // 优先挑需要本人动手的：被驳回 → 等审核 → 其余
  const focus =
    visible.find((project) => project.reviewStatus === "REJECTED") ??
    visible.find((project) => project.reviewStatus === "PENDING" || project.reviewStatus === "COLLEGE_REVIEW") ??
    visible[0];
  const step = focus ? nextStepFor(focus) : null;
  const StepIcon = step?.icon;
  const stepHref = focus && focus.reviewStatus === "WITHDRAWN" ? "/competitions" : focus ? `/my/${focus.id}` : "/my";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">我的项目</h1>
          <p className="mt-1 text-sm text-slate-500">
            查看本人负责或参与项目的报名进度。
            {active.key === "all" ? "" : `当前只看「${active.label}」，共 ${visible.length} 个。`}
          </p>
        </div>
        <Link href="/competitions" className="inline-flex h-10 items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-medium text-white transition duration-[160ms] ease-out hover:bg-blue-700 active:scale-[0.97] active:bg-blue-800 motion-reduce:active:scale-100">新建报名</Link>
      </div>

      {/* 概览条：原来这一页只有 h1 + 一个表格，学生打开后要逐行读才知道自己什么状态。
          四块指标全部来自已有数据（reviewStatus 分组，口径与 lib/statistics.ts 一致），
          不新增查询、不编造趋势。每块下面那行小字说明「这个数字代表什么」，
          没有它，四个数字只是四个数字。 */}
      <Card aria-label="进度概览" as="section" className="p-3">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="t-metric bg-slate-100">
            <p className="t-metric-label text-slate-600">我的项目</p>
            <p className="t-metric-value text-slate-900">{projects.length}</p>
            <p className="t-metric-note text-slate-600">全部状态合计</p>
          </div>
          <div className="t-metric bg-amber-50">
            <p className="t-metric-label text-amber-700">待审核</p>
            <p className="t-metric-value text-amber-700">{pendingCount}</p>
            <p className="t-metric-note text-amber-700">学院与校级审核中</p>
          </div>
          <div className="t-metric bg-emerald-50">
            <p className="t-metric-label text-emerald-700">已通过</p>
            <p className="t-metric-value text-emerald-700">{passedCount}</p>
            <p className="t-metric-note text-emerald-700">校内终审通过</p>
          </div>
          <div className={`t-metric ${rejectedCount > 0 ? "bg-red-50" : "bg-slate-100"}`}>
            <p className={`t-metric-label ${rejectedCount > 0 ? "text-red-700" : "text-slate-600"}`}>已驳回</p>
            <p className={`t-metric-value ${rejectedCount > 0 ? "text-red-700" : "text-slate-900"}`}>
              {rejectedCount}
            </p>
            <p className={`t-metric-note ${rejectedCount > 0 ? "text-red-700" : "text-slate-600"}`}>需补材料后重提</p>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="按状态筛选" className="flex flex-wrap gap-2">
          {FILTERS.map((item) => {
            const count = countOf(item.statuses);
            const isActive = item.key === active.key;
            return (
              <Link
                key={item.key}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition duration-[160ms] ${
                  isActive
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
                }`}
                href={filterHref(item.key)}
              >
                {item.label}
                <span className={`text-xs tabular-nums ${isActive ? "text-blue-100" : "text-slate-400"}`}>{count}</span>
              </Link>
            );
          })}
        </nav>

        {/* 搜索走原生 GET 表单：不需要客户端组件、不需要改查询，刷新后地址栏就是可分享的状态 */}
        <form action="/my" className="flex items-center gap-2">
          {filterKey !== "all" ? <input type="hidden" name="filter" value={filterKey} /> : null}
          <input
            aria-label="搜索我的项目"
            className="h-9 w-44 rounded-full border border-slate-300 bg-white px-3.5 text-sm text-slate-700 outline-none transition duration-[160ms] placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            defaultValue={query}
            name="q"
            placeholder="搜索项目 / 赛事"
            type="search"
          />
          <Button className="h-9" size="sm" type="submit" variant="outline">
            搜索
          </Button>
          {query ? (
            <Link
              className="text-sm text-slate-500 transition hover:text-blue-600"
              href={filterKey === "all" ? "/my" : `/my?filter=${filterKey}`}
            >
              清除
            </Link>
          ) : null}
        </form>
      </div>

      <Card as="section" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3">项目</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">提交</th>
                <th className="px-4 py-3">驳回原因</th>
                <th className="px-4 py-3">最后修改</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((project) => (
                <tr key={project.id}>
                  <td className="max-w-72 px-4 py-3">
                    <Link
                      className="font-medium text-slate-900 hover:text-blue-600"
                      href={detailHref("/my", project.id, from)}
                    >
                      {project.name}
                    </Link>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {project.competitionName} / {project.trackName}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={project.reviewStatus}>{registrationStatusLabels[project.reviewStatus]}</StatusBadge>
                    <div className="mt-2"><ProjectProgress status={project.reviewStatus} /></div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {project.submissionCount > 0 ? `${project.submissionCount} 次` : "未提交"}
                  </td>
                  <td className="max-w-56 px-4 py-3 text-slate-600">{project.rejectedReason ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600" title={formatDateTime(project.updatedAt.toISOString())}>
                    {relativeTime(project.updatedAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Button asChild size="sm" variant="outline" className="group h-8 px-3">
                      <Link href={detailHref("/my", project.id, from)}>
                        查看
                        <ButtonArrow />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr><td colSpan={6}>
                  {projects.length === 0 ? (
                    <EmptyState
                      title="你还没有项目"
                      description="先从已发布的赛事里选择一项，再填写报名；进度与材料都会在这里看到。"
                      action={{ href: "/competitions", label: "浏览赛事" }}
                      icon={<Compass aria-hidden="true" size={20} />}
                    />
                  ) : query ? (
                    <EmptyState
                      title={`没有匹配「${query}」的项目`}
                      description={`当前筛选内共 ${visible.length} 个，但项目名称、赛事、赛道都不含这个关键词。`}
                      action={{ href: filterHref("all"), label: "清除搜索" }}
                      icon={<Search aria-hidden="true" size={20} />}
                    />
                  ) : (
                    <EmptyState
                      title={`没有「${active.label}」的项目`}
                      description={`你一共有 ${projects.length} 个项目，但当前没有符合这个状态的。`}
                      action={{ href: "/my", label: "查看全部项目" }}
                      icon={<Filter aria-hidden="true" size={20} />}
                    />
                  )}
                </td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {step && focus && StepIcon ? (
        <section className={`rounded-xl border p-4 shadow-sm ${STEP_STYLE[step.tone].box}`} aria-label="下一步该做什么">
          <div className="flex flex-wrap items-start gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${STEP_STYLE[step.tone].circle}`}>
              <StepIcon size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{step.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{step.body}</p>
              <p className="mt-1.5 text-xs text-slate-400">
                对应项目：{focus.name}
                {visible.length > 1 ? `　（另有 ${visible.length - 1} 个，见上表）` : ""}
              </p>
            </div>
            <Button asChild variant="outline" className="group">
              <Link href={stepHref}>
                {step.action}
                <ButtonArrow />
              </Link>
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
