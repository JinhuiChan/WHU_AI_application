import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CompetitionCreate } from "@/components/admin/competition-create";
import { CompetitionDeleteButton } from "@/components/admin/competition-delete-button";
import { Pagination } from "@/components/data/pagination";
import { getActiveUser } from "@/lib/auth.server";
import { getCompetitionPage, listCompetitionYears } from "@/lib/competitions";
import { firstParam, optionalCompetitionLevel, optionalPublishStatus, optionalText, optionalYear, pageParams } from "@/lib/list-query";
import { competitionLevelLabels, formatDateTime, publishStatusLabels, registrationStatusLabels } from "@/lib/presentation";

export const metadata: Metadata = { title: "赛事" };

function registrationTone(status: string) {
  if (status === "REJECTED") return "bg-red-50 text-red-700";
  if (status === "DRAFT") return "bg-slate-100 text-slate-600";
  if (status === "SCHOOL_FINAL" || status === "PROVINCE_ADVANCED" || status === "NATIONAL_ADVANCED") {
    return "bg-emerald-50 text-emerald-700";
  }
  return "bg-amber-50 text-amber-700";
}

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function CompetitionsPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");

  const year = firstParam(searchParams?.year);
  const level = firstParam(searchParams?.level);
  const publishStatus = firstParam(searchParams?.publishStatus);
  const q = firstParam(searchParams?.q);
  const rawPageSize = firstParam(searchParams?.pageSize);
  const { page, pageSize } = pageParams(firstParam(searchParams?.page), rawPageSize);
  const [data, years] = await Promise.all([
    getCompetitionPage(
      {
        year: optionalYear(year),
        level: optionalCompetitionLevel(level),
        publishStatus: user.role === "ADMIN" ? optionalPublishStatus(publishStatus) : undefined,
        q: optionalText(q),
        page,
        pageSize,
      },
      { studentId: user.role === "STUDENT" ? user.id : undefined, isAdmin: user.role === "ADMIN" },
    ),
    listCompetitionYears(),
  ]);
  const isStudent = user.role === "STUDENT";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{user.role === "STUDENT" ? "可报名赛事" : "赛事管理"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {user.role === "STUDENT"
              ? "点进赛事查看报名通知与参赛规程，确认赛道与组别后再报名。"
              : "按赛年、等级和关键词查找赛事，进入详情查看获奖名单。"}
          </p>
        </div>
        {user.role === "ADMIN" ? <CompetitionCreate /> : null}
        {user.role === "STUDENT" ? (
          <div className="flex items-center gap-2">
            <Link href="/my" className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition duration-[160ms] ease-out hover:bg-slate-50 active:scale-[0.97] active:bg-slate-100 motion-reduce:active:scale-100">
              我的项目
            </Link>
          </div>
        ) : null}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form action="/competitions" method="get" className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-slate-600">
            <span className="mb-1 block">赛年</span>
            <select name="year" defaultValue={year} className="h-10 min-w-28 rounded-lg border border-slate-300 bg-white px-3 text-sm">
              <option value="">全部赛年</option>
              {years.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            <span className="mb-1 block">赛事等级</span>
            <select name="level" defaultValue={level} className="h-10 min-w-28 rounded-lg border border-slate-300 bg-white px-3 text-sm">
              <option value="">全部等级</option>
              <option value="SCHOOL">校赛</option>
              <option value="PROVINCE">省赛</option>
              <option value="NATIONAL">国赛</option>
            </select>
          </label>
          {user.role === "ADMIN" ? (
            <label className="text-sm text-slate-600">
              <span className="mb-1 block">发布状态</span>
              <select name="publishStatus" defaultValue={publishStatus} className="h-10 min-w-28 rounded-lg border border-slate-300 bg-white px-3 text-sm">
                <option value="">全部状态</option>
                <option value="DRAFT">草稿</option>
                <option value="PUBLISHED">已发布</option>
                <option value="WITHDRAWN">已下架</option>
              </select>
            </label>
          ) : null}
          <label className="min-w-52 flex-1 text-sm text-slate-600">
            <span className="mb-1 block">关键词</span>
            <input name="q" type="search" defaultValue={q} placeholder={isStudent ? "赛事名称或主办方" : "赛事名称、主办方或系列标识"} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-600" />
          </label>
          <label className="text-sm text-slate-600">
            <span className="mb-1 block">每页条数</span>
            <select name="pageSize" defaultValue={String(pageSize)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm">
              {[10, 20, 50].map((size) => <option key={size} value={size}>{size} 条</option>)}
            </select>
          </label>
          <Button variant="default" size="sm" type="submit" >筛选</Button>
          <Link href="/competitions" className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition duration-[160ms] ease-out hover:bg-slate-50 active:scale-[0.97] active:bg-slate-100 motion-reduce:active:scale-100 px-4">重置</Link>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">赛年</th>
                <th className="px-4 py-3 font-medium">赛事名称</th>
                <th className="px-4 py-3 font-medium">等级</th>
                {isStudent ? (
                  <>
                    <th className="px-4 py-3 font-medium">报名截止</th>
                    <th className="px-4 py-3 font-medium">我的报名</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 font-medium">发布状态</th>
                    <th className="px-4 py-3 font-medium">系列标识</th>
                    <th className="px-4 py-3 font-medium">主办方</th>
                  </>
                )}
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.list.map((competition) => (
                <tr key={competition.id} className="text-slate-700 hover:bg-slate-50">
                  <td className="px-4 py-4">{competition.year}</td>
                  <td className="px-4 py-4 font-medium text-slate-900">
                    <Link href={`/competitions/${competition.id}`} className="hover:text-blue-600">{competition.name}</Link>
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">{competitionLevelLabels[competition.level]}</span>
                  </td>
                  {isStudent ? (
                    <>
                      <td className="px-4 py-4 text-xs text-slate-600">
                        {competition.registration?.windowEndAt ? (
                          <span className="flex flex-wrap items-center gap-2">
                            {formatDateTime(competition.registration.windowEndAt)}
                            {competition.registration.windowOpen ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">报名中</span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">已关闭</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400">未设置报名窗口</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs">
                        {competition.registration?.projectStatus ? (
                          <span className={`rounded-full px-2 py-0.5 ${registrationTone(competition.registration.projectStatus)}`}>
                            {registrationStatusLabels[competition.registration.projectStatus]}
                          </span>
                        ) : (
                          <span className="text-slate-400">未报名</span>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          competition.publishStatus === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-700"
                            : competition.publishStatus === "WITHDRAWN"
                              ? "bg-red-50 text-red-700"
                              : "bg-slate-100 text-slate-600"
                        }`}>
                          {publishStatusLabels[competition.publishStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500">{competition.seriesId}</td>
                      <td className="px-4 py-4">{competition.organizer ?? "—"}</td>
                    </>
                  )}
                  <td className="whitespace-nowrap px-4 py-4">
                    <Link href={`/competitions/${competition.id}`} className="text-blue-600 hover:underline">查看详情</Link>
                    {isStudent && competition.registration?.windowOpen && !competition.registration.projectId ? (
                      <Link href={`/apply?competitionId=${competition.id}`} className="ml-3 text-blue-600 hover:underline">立即报名</Link>
                    ) : null}
                    {isStudent && competition.registration?.projectStatus ? (
                      <Link href="/my" className="ml-3 text-slate-500 hover:underline">我的项目</Link>
                    ) : null}
                    {user.role === "ADMIN" ? (
                      <span className="ml-3 inline-block align-middle">
                        <CompetitionDeleteButton competitionId={competition.id} competitionName={competition.name} label="删除" />
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
              {data.list.length === 0 ? (
                <tr><td colSpan={isStudent ? 6 : 7}><EmptyState title="还没有符合条件的赛事" description="试试放宽赛年、状态或关键字，也可以重置筛选查看全部赛事。" action={{ href: "/competitions", label: "清除筛选" }} /></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pagination basePath="/competitions" query={{ year, level, publishStatus, q, pageSize: String(pageSize) }} total={data.total} page={data.page} pageSize={data.pageSize} />
      </section>
    </div>
  );
}
