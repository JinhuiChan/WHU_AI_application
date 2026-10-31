import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CompetitionCreate } from "@/components/admin/competition-create";
import { Pagination } from "@/components/data/pagination";
import { getActiveUser } from "@/lib/auth.server";
import { getCompetitionPage, listCompetitionYears } from "@/lib/competitions";
import { firstParam, optionalCompetitionLevel, optionalText, optionalYear, pageParams } from "@/lib/list-query";
import { competitionLevelLabels } from "@/lib/presentation";

export const metadata: Metadata = { title: "赛事" };

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function CompetitionsPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");

  const year = firstParam(searchParams?.year);
  const level = firstParam(searchParams?.level);
  const q = firstParam(searchParams?.q);
  const rawPageSize = firstParam(searchParams?.pageSize);
  const { page, pageSize } = pageParams(firstParam(searchParams?.page), rawPageSize);
  const [data, years] = await Promise.all([
    getCompetitionPage({
      year: optionalYear(year),
      level: optionalCompetitionLevel(level),
      q: optionalText(q),
      page,
      pageSize,
    }),
    listCompetitionYears(),
  ]);

  return (
    <div className="space-y-5">
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
            <Link href="/my" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              我的项目
            </Link>
            <Link href="/apply" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              我要报名
            </Link>
          </div>
        ) : null}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <form action="/competitions" method="get" className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-500">
            <span className="mb-1 block">赛年</span>
            <select name="year" defaultValue={year} className="h-10 min-w-28 rounded-md border border-slate-300 bg-white px-3 text-sm">
              <option value="">全部赛年</option>
              {years.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            <span className="mb-1 block">赛事等级</span>
            <select name="level" defaultValue={level} className="h-10 min-w-28 rounded-md border border-slate-300 bg-white px-3 text-sm">
              <option value="">全部等级</option>
              <option value="SCHOOL">校赛</option>
              <option value="PROVINCE">省赛</option>
              <option value="NATIONAL">国赛</option>
            </select>
          </label>
          <label className="min-w-52 flex-1 text-xs text-slate-500">
            <span className="mb-1 block">关键词</span>
            <input name="q" type="search" defaultValue={q} placeholder="赛事名称、主办方或系列标识" className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600" />
          </label>
          <label className="text-xs text-slate-500">
            <span className="mb-1 block">每页条数</span>
            <select name="pageSize" defaultValue={String(pageSize)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
              {[10, 20, 50].map((size) => <option key={size} value={size}>{size} 条</option>)}
            </select>
          </label>
          <button type="submit" className="h-10 rounded-md bg-blue-600 px-4 text-sm text-white hover:bg-blue-700">筛选</button>
          <Link href="/competitions" className="flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50">重置</Link>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">赛年</th>
                <th className="px-4 py-3 font-medium">赛事名称</th>
                <th className="px-4 py-3 font-medium">等级</th>
                <th className="px-4 py-3 font-medium">系列标识</th>
                <th className="px-4 py-3 font-medium">主办方</th>
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
                  <td className="px-4 py-4 text-xs text-slate-500">{competition.seriesId}</td>
                  <td className="px-4 py-4">{competition.organizer ?? "—"}</td>
                  <td className="px-4 py-4"><Link href={`/competitions/${competition.id}`} className="text-blue-600 hover:underline">查看详情</Link></td>
                </tr>
              ))}
              {data.list.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">暂无符合条件的赛事</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pagination basePath="/competitions" query={{ year, level, q, pageSize: String(pageSize) }} total={data.total} page={data.page} pageSize={data.pageSize} />
      </section>
    </div>
  );
}
