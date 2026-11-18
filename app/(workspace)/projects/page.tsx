import { Button, ButtonArrow } from "@/components/ui/button";
import { WhuSeal, WhuTitleRule } from "@/components/brand/whu-motifs";
import { detailHref, listHref } from "@/components/data/list-link";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Pagination } from "@/components/data/pagination";
import { SectionHead } from "@/components/ui/section-head";
import { getActiveUser } from "@/lib/auth.server";
import { firstParam, optionalAwardLevel, optionalText, optionalYear, pageParams } from "@/lib/list-query";
import { awardLevelLabels, awardStatusLabels, projectStatusLabels } from "@/lib/presentation";
import { getProjectPage, listProjectFilterOptions } from "@/lib/projects";

export const metadata: Metadata = { title: "项目" };

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const filterControlClass =
  "h-10 rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition-colors placeholder:text-[#7c8e85] focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25";

function awardPillClass(level: string) {
  if (level === "S" || level === "A") {
    return "border border-[#ead7af] bg-[#fdf8ee] text-[#8a651b]";
  }
  return "border border-[#cde0d5] bg-[#eef5f1] text-[#115740]";
}

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
  const from = listHref("/projects", {
    year,
    competitionId,
    college,
    level,
    q,
    awarded: awarded ? "1" : "",
    page: page > 1 ? String(page) : "",
    pageSize: String(pageSize),
  });
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
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="t-page-title font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
            项目管理
          </h1>
          <WhuSeal label="项目总账" />
        </div>
        <p className="mt-1.5 flex items-center gap-2 text-sm text-[#54635d]">
          <WhuTitleRule />
          <span>检索全校参赛项目档案、获奖归档记录与成员版本全貌。</span>
        </p>
      </div>

      <section className="card p-4 sm:p-5">
        <form action="/projects" method="get" className="flex flex-wrap items-end gap-3">
          {awarded ? <input type="hidden" name="awarded" value="1" /> : null}
          <label className="text-sm font-medium text-[#24362f]">
            <span className="mb-1 block text-xs text-[#54635d]">赛事</span>
            <select name="competitionId" defaultValue={competitionId} className={`${filterControlClass} min-w-44`}>
              <option value="">全部赛事</option>
              {options.competitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-[#24362f]">
            <span className="mb-1 block text-xs text-[#54635d]">赛年</span>
            <select name="year" defaultValue={year} className={`${filterControlClass} min-w-28 tabular-nums`}>
              <option value="">全部赛年</option>
              {options.years.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-[#24362f]">
            <span className="mb-1 block text-xs text-[#54635d]">学院</span>
            <select name="college" defaultValue={college} className={`${filterControlClass} min-w-40`}>
              <option value="">全部学院</option>
              {options.colleges.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-[#24362f]">
            <span className="mb-1 block text-xs text-[#54635d]">获奖等级</span>
            <select name="level" defaultValue={level} className={`${filterControlClass} min-w-28`}>
              <option value="">全部奖项</option>
              {(["S", "A", "B", "C", "EXCELLENT"] as const).map((item) => <option key={item} value={item}>{awardLevelLabels[item]}</option>)}
            </select>
          </label>
          <label className="min-w-48 flex-1 text-sm font-medium text-[#24362f]">
            <span className="mb-1 block text-xs text-[#54635d]">关键词</span>
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="项目名称、学院或报名编号"
              className={`${filterControlClass} w-full`}
            />
          </label>
          <label className="text-sm font-medium text-[#24362f]">
            <span className="mb-1 block text-xs text-[#54635d]">每页条数</span>
            <select name="pageSize" defaultValue={String(pageSize)} className={`${filterControlClass} tabular-nums`}>
              {[10, 20, 50].map((size) => <option key={size} value={size}>{size} 条</option>)}
            </select>
          </label>
          <Button
            variant="default"
            size="default"
            type="submit"
            className="h-10 rounded-full bg-[#115740] px-5 text-white hover:bg-[#0d4633] active:scale-[0.98] active:bg-[#093526] focus-visible:ring-[#115740]/25 disabled:opacity-60"
          >
            筛选
          </Button>
          <Link
            href="/projects"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#7f9384] bg-white px-4 text-sm font-medium text-[#24362f] transition-colors duration-150 hover:border-[#115740] hover:bg-[#eef5f1] hover:text-[#115740] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 motion-reduce:active:scale-100"
          >
            重置
          </Link>
        </form>
      </section>

      <section className="overflow-hidden card">
        <div className="px-5 pt-5">
          <SectionHead
            meta={`共 ${data.total} 个`}
            sub="按赛事、赛年、学院与获奖情况筛选，点击项目名称查看立项全貌"
            title="项目台账"
          />
        </div>
        <div aria-hidden="true" className="mx-5 mt-4 h-px bg-[#d5e2db]/70" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="t-thead bg-[#f5faf7] text-xs text-[#43554d]">
              <tr>
                <th className="w-[25%] px-4 py-3 font-semibold">项目</th>
                <th className="w-[18%] px-4 py-3 font-semibold">赛事</th>
                <th className="w-[7%] px-4 py-3 font-semibold">赛年</th>
                <th className="w-[15%] px-4 py-3 font-semibold">学院</th>
                <th className="w-[11%] px-4 py-3 font-semibold">状态</th>
                <th className="w-[13%] px-4 py-3 font-semibold">获奖记录</th>
                <th className="w-[11%] min-w-[118px] px-4 py-3 text-right font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaf1ed]">
              {data.list.map((project) => (
                <tr key={project.id} className="align-middle text-[#24362f] hover:bg-[#f7faf8]">
                  <td className="px-4 py-3.5 font-semibold text-[#0f1d18]">
                    <Link
                      href={detailHref("/projects", project.id, from)}
                      className="transition-colors hover:text-[#115740] focus-visible:outline-none focus-visible:underline"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-[#54635d]">{project.competition?.name ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 tabular-nums">{project.year}</td>
                  <td className="px-4 py-3.5 text-[#33433d]">{project.college}</td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <StatusBadge status={project.status} scope="project">{projectStatusLabels[project.status]}</StatusBadge>
                  </td>
                  <td className="px-4 py-3.5">
                    {project.awards.length ? (
                      <div className="space-y-1">
                        {project.awards.map((award) => (
                          <div key={award.id} className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${awardPillClass(award.awardLevel)}`}
                            >
                              {awardLevelLabels[award.awardLevel]}
                            </span>
                            <span className="text-[#54635d]">{awardStatusLabels[award.status]}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-[#82948b]">暂无可见获奖</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="group h-8 rounded-full border-[#7f9384] bg-white px-3.5 text-[#115740] hover:border-[#115740] hover:bg-[#eef5f1] focus-visible:ring-[#115740]/25"
                    >
                      <Link href={detailHref("/projects", project.id, from)}>
                        查看全貌
                        <ButtonArrow />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {data.list.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="还没有符合条件的项目"
                      description="试试放宽赛年、奖项或关键字，也可以重置筛选查看全部项目。"
                      action={{ href: "/projects", label: "清除筛选" }}
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pagination basePath="/projects" query={{ competitionId, year, college, level, awarded: awarded ? "1" : "", q, pageSize: String(pageSize) }} total={data.total} page={data.page} pageSize={data.pageSize} />
      </section>
    </div>
  );
}
