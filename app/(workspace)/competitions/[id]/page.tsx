import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActiveUser } from "@/lib/auth.server";
import { getCompetitionDetail } from "@/lib/competitions";
import { awardLevelLabels, awardStatusLabels, competitionLevelLabels, dataSourceTypeLabels, formatDate, formatDateTime } from "@/lib/presentation";

export const metadata: Metadata = { title: "赛事详情" };

type PageProps = {
  params: { id: string };
};

export default async function CompetitionDetailPage({ params }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  const competition = await getCompetitionDetail(params.id, user.role);
  if (!competition) notFound();

  return (
    <div className="space-y-5">
      <div>
        <Link href="/competitions" className="text-sm text-blue-600 hover:underline">返回赛事列表</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">{competition.name}</h1>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">{competitionLevelLabels[competition.level]}</span>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">赛事信息</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
          <div><dt className="text-xs text-slate-500">赛年</dt><dd className="mt-1 text-slate-900">{competition.year}</dd></div>
          <div><dt className="text-xs text-slate-500">等级</dt><dd className="mt-1 text-slate-900">{competitionLevelLabels[competition.level]}</dd></div>
          <div><dt className="text-xs text-slate-500">系列标识</dt><dd className="mt-1 break-all text-slate-900">{competition.seriesId}</dd></div>
          <div><dt className="text-xs text-slate-500">主办方</dt><dd className="mt-1 text-slate-900">{competition.organizer ?? "—"}</dd></div>
          <div><dt className="text-xs text-slate-500">创建时间</dt><dd className="mt-1 text-slate-900">{formatDate(competition.createdAt)}</dd></div>
        </dl>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">获奖名单（{competition.awards.length}）</h2>
          <p className="mt-1 text-xs text-slate-500">来源与核验信息按获奖记录展示，未登记来源时明确标注。</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">项目</th>
                <th className="px-4 py-3 font-medium">学院</th>
                <th className="px-4 py-3 font-medium">奖项</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">来源类型</th>
                <th className="px-4 py-3 font-medium">来源标识</th>
                <th className="px-4 py-3 font-medium">核验人</th>
                <th className="px-4 py-3 font-medium">核验时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {competition.awards.map((award) => (
                <tr key={award.id} className="align-top text-slate-700">
                  <td className="max-w-sm px-4 py-4">
                    <Link href={`/projects/${award.project.id}`} className="font-medium text-slate-900 hover:text-blue-600">{award.project.name}</Link>
                  </td>
                  <td className="px-4 py-4">{award.project.college}</td>
                  <td className="px-4 py-4"><span className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">{awardLevelLabels[award.awardLevel]}</span></td>
                  <td className="px-4 py-4">{awardStatusLabels[award.status]}</td>
                  <td className="px-4 py-4">
                    {award.sources.length ? award.sources.map((source) => (
                      <div key={`${source.batchId}-${source.sourceRef}-${source.syncedAt}`} className="text-xs">{dataSourceTypeLabels[source.sourceType]}</div>
                    )) : <span className="text-xs text-slate-400">未登记</span>}
                  </td>
                  <td className="max-w-52 px-4 py-4">
                    {award.sources.length ? award.sources.map((source) => (
                      <div key={`${source.batchId}-${source.sourceRef}`} className="break-all text-xs">{source.sourceRef}</div>
                    )) : <span className="text-xs text-slate-400">未登记</span>}
                  </td>
                  <td className="px-4 py-4">{award.verifierName}</td>
                  <td className="px-4 py-4 text-xs">{formatDateTime(award.verifiedAt)}</td>
                </tr>
              ))}
              {competition.awards.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">暂无可见获奖记录</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
