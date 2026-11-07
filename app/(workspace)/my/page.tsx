import { EmptyState } from "@/components/ui/empty-state";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
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

export default async function MyProjectsPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/dashboard");
  const projects = await getMyProjects(user.id);

  const filterKey = firstParam(searchParams?.filter) || "all";
  const active = FILTERS.find((item) => item.key === filterKey) ?? FILTERS[0];
  const visible = projects.filter((project) => matches(active.statuses, project.reviewStatus));
  const countOf = (statuses: string[]) => projects.filter((project) => matches(statuses, project.reviewStatus)).length;

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
        <Link href="/competitions" className="inline-flex h-11 items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-medium text-white transition duration-[160ms] ease-out hover:bg-blue-700 active:scale-[0.97] active:bg-blue-800 motion-reduce:active:scale-100">新建报名</Link>
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
                  <td className="max-w-72 px-4 py-3 font-medium text-slate-900"><Link href={`/my/${project.id}`} className="hover:text-blue-600">{project.name}</Link></td>
                  <td className="px-4 py-3 text-slate-600">{project.competitionName} / {project.trackName}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">{registrationStatusLabels[project.reviewStatus]}</span></td>
                  <td className="max-w-56 px-4 py-3 text-slate-600">{project.rejectedReason ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(project.updatedAt.toISOString())}</td>
                  <td className="px-4 py-3"><Link href={`/my/${project.id}`} className="text-blue-600 hover:underline">查看</Link></td>
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
    </div>
  );
}
