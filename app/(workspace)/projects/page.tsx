import { Button, ButtonArrow } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Pagination } from "@/components/data/pagination";
import { getActiveUser } from "@/lib/auth.server";
import { firstParam, optionalAwardLevel, optionalText, optionalYear, pageParams } from "@/lib/list-query";
import { awardLevelLabels, awardStatusLabels, projectStatusLabels } from "@/lib/presentation";
import { getProjectPage, listProjectFilterOptions } from "@/lib/projects";

export const metadata: Metadata = { title: "项目" };

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function ProjectsPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");

  const year = firstParam(searchParams?.year);
  const competitionId = firstParam(searchParams?.competitionId);
  const college = firstParam(searchParams?.college);
  const level = firstParam(searchParams?.level);
  const q = firstParam(searchParams?.q);
  const awarded = firstParam(searchParams?.awarded) === "1";
  const { page, pageSize } = pageParams(firstParam(searchParams?.page), firstParam(searchParams?.pageSize));
  const [data, options] = await Promise.all([
    getProjectPage(
      {
        competitionId: optionalText(competitionId),
        year: optionalYear(year),
        college: optionalText(college),
        level: optionalAwardLevel(level),
        awarded,
        q: optionalText(q),
        page,
        pageSize,
      },
      user.role,
    ),
    listProjectFilterOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">项目管理</h1>
        <p className="mt-1 text-sm text-slate-500">查看项目基本信息、获奖记录与成员版本全貌。</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form action="/projects" method="get" className="flex flex-wrap items-end gap-3">
          {awarded ? <input type="hidden" name="awarded" value="1" /> : null}
          <label className="text-sm text-slate-600">
            <span className="mb-1 block">赛事</span>
            <select name="competitionId" defaultValue={competitionId} className="h-10 min-w-52 rounded-lg border border-slate-300 bg-white px-3 text-sm">
              <option value="">全部赛事</option>
              {options.competitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            <span className="mb-1 block">赛年</span>
            <select name="year" defaultValue={year} className="h-10 min-w-28 rounded-lg border border-slate-300 bg-white px-3 text-sm">
              <option value="">全部赛年</option>
              {options.years.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            <span className="mb-1 block">学院</span>
            <select name="college" defaultValue={college} className="h-10 min-w-44 rounded-lg border border-slate-300 bg-white px-3 text-sm">
              <option value="">全部学院</option>
              {options.colleges.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            <span className="mb-1 block">获奖等级</span>
            <select name="level" defaultValue={level} className="h-10 min-w-28 rounded-lg border border-slate-300 bg-white px-3 text-sm">
              <option value="">全部奖项</option>
              {(["S", "A", "B", "C", "EXCELLENT"] as const).map((item) => <option key={item} value={item}>{awardLevelLabels[item]}</option>)}
            </select>
          </label>
          <label className="min-w-52 flex-1 text-sm text-slate-600">
            <span className="mb-1 block">关键词</span>
            <input name="q" type="search" defaultValue={q} placeholder="项目名称、学院或报名编号" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-600" />
          </label>
          <label className="text-sm text-slate-600">
            <span className="mb-1 block">每页条数</span>
            <select name="pageSize" defaultValue={String(pageSize)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm">
              {[10, 20, 50].map((size) => <option key={size} value={size}>{size} 条</option>)}
            </select>
          </label>
          <Button variant="default" size="sm" type="submit" >筛选</Button>
          <Link href="/projects" className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition duration-[160ms] ease-out hover:bg-slate-50 active:scale-[0.97] active:bg-slate-100 motion-reduce:active:scale-100 px-4">重置</Link>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">项目</th>
                <th className="px-4 py-3 font-medium">赛事</th>
                <th className="px-4 py-3 font-medium">赛年</th>
                <th className="px-4 py-3 font-medium">学院</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">获奖记录</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.list.map((project) => (
                <tr key={project.id} className="text-slate-700 hover:bg-slate-50">
                  <td className="max-w-md px-4 py-4 font-medium text-slate-900">
                    <Link href={`/projects/${project.id}`} className="hover:text-blue-600">{project.name}</Link>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500">{project.competition?.name ?? "—"}</td>
                  <td className="px-4 py-4">{project.year}</td>
                  <td className="px-4 py-4">{project.college}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={project.status} scope="project">{projectStatusLabels[project.status]}</StatusBadge>
                  </td>
                  <td className="px-4 py-4">
                    {project.awards.length ? (
                      <div className="space-y-1">
                        {project.awards.map((award) => (
                          <div key={award.id} className="text-xs">
                            <span className="mr-1 rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">{awardLevelLabels[award.awardLevel]}</span>
                            {awardStatusLabels[award.status]}
                          </div>
                        ))}
                      </div>
                    ) : <span className="text-xs text-slate-400">暂无可见获奖</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <Button asChild size="sm" variant="outline" className="group h-8 px-3">
                      <Link href={`/projects/${project.id}`}>
                        查看全貌
                        <ButtonArrow />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {data.list.length === 0 ? (
                <tr><td colSpan={7}><EmptyState title="还没有符合条件的项目" description="试试放宽赛年、奖项或关键字，也可以重置筛选查看全部项目。" action={{ href: "/projects", label: "清除筛选" }} /></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pagination basePath="/projects" query={{ competitionId, year, college, level, awarded: awarded ? "1" : "", q, pageSize: String(pageSize) }} total={data.total} page={data.page} pageSize={data.pageSize} />
      </section>
    </div>
  );
}
