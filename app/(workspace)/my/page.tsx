import { detailHref, listHref } from "@/components/data/list-link";
import { EmptyState } from "@/components/ui/empty-state";
import { Button, ButtonArrow } from "@/components/ui/button";
import { ProjectProgress } from "@/components/project/project-progress";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, FileEdit, Undo2 } from "lucide-react";
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
              href={`/my?filter=${item.key}`}
            >
              {item.label}
              <span className={`text-xs tabular-nums ${isActive ? "text-blue-100" : "text-slate-400"}`}>{count}</span>
            </Link>
          );
        })}
      </nav>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">名称</th><th className="px-4 py-3">赛道</th><th className="px-4 py-3">状态</th><th className="px-4 py-3">驳回原因</th><th className="px-4 py-3">最后修改时间</th><th className="px-4 py-3">操作</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((project) => (
                <tr key={project.id}>
                  <td className="max-w-72 px-4 py-3 font-medium text-slate-900"><Link href={detailHref("/my", project.id, from)} className="hover:text-blue-600">{project.name}</Link></td>
                  <td className="px-4 py-3 text-slate-600">{project.competitionName} / {project.trackName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={project.reviewStatus}>{registrationStatusLabels[project.reviewStatus]}</StatusBadge>
                    <div className="mt-2"><ProjectProgress status={project.reviewStatus} /></div>
                  </td>
                  <td className="max-w-56 px-4 py-3 text-slate-600">{project.rejectedReason ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(project.updatedAt.toISOString())}</td>
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
              {visible.length === 0 ? (
                <tr><td colSpan={6}>
                  {projects.length === 0 ? (
                    <EmptyState title="你还没有项目" description="先从已发布的赛事里选择一项，再填写报名；进度与材料都会在这里看到。" action={{ href: "/competitions", label: "浏览赛事" }} />
                  ) : (
                    <EmptyState
                      title={`没有「${active.label}」的项目`}
                      description={`你一共有 ${projects.length} 个项目，但当前没有符合这个状态的。`}
                      action={{ href: "/my", label: "查看全部项目" }}
                    />
                  )}
                </td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

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
