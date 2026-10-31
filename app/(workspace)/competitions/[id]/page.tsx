import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CompetitionManagement } from "@/components/admin/competition-management";
import { getActiveUser } from "@/lib/auth.server";
import { getCompetitionDetail } from "@/lib/competitions";
import { listOptions } from "@/lib/dict";
import { prisma } from "@/lib/prisma";
import { awardLevelLabels, awardStatusLabels, competitionLevelLabels, dataSourceTypeLabels, formatDate, formatDateTime } from "@/lib/presentation";

export const metadata: Metadata = { title: "赛事详情" };
export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

export default async function CompetitionDetailPage({ params }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  const competition = await getCompetitionDetail(params.id, user.role);
  if (!competition) notFound();

  const [attachments, windows, tracks, groups, categories] = await Promise.all([
    prisma.competitionAttachment.findMany({
      where: { competitionId: params.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.timeWindow.findMany({
      where: { competitionId: params.id },
      orderBy: { startAt: "asc" },
    }),
    prisma.track.findMany({
      where: { competitionId: params.id, enabled: true },
      select: { id: true, parentId: true, name: true, kind: true },
      orderBy: { sortOrder: "asc" },
    }),
    listOptions("GROUP"),
    listOptions("CATEGORY"),
  ]);

  const now = new Date();
  const applyWindow = windows.find((item) => item.stage === "SCHOOL") ?? windows[0];
  const applyOpen = Boolean(applyWindow?.enabled && now >= applyWindow.startAt && now <= applyWindow.endAt);
  const applyState = !applyWindow
    ? { label: "报名时间未设置", tone: "bg-slate-100 text-slate-600" }
    : !applyWindow.enabled
      ? { label: "报名未开放", tone: "bg-slate-100 text-slate-600" }
      : applyOpen
        ? { label: `报名中 · 截止 ${formatDateTime(applyWindow.endAt.toISOString())}`, tone: "bg-emerald-50 text-emerald-700" }
        : now < applyWindow.startAt
          ? { label: `报名未开始 · ${formatDateTime(applyWindow.startAt.toISOString())} 开放`, tone: "bg-amber-50 text-amber-700" }
          : { label: "报名已截止", tone: "bg-slate-100 text-slate-600" };

  const topTracks = tracks.filter((track) => !track.parentId);
  const childrenOf = (id: string) => tracks.filter((track) => track.parentId === id);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/competitions" className="text-sm text-blue-600 hover:underline">返回赛事列表</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">{competition.name}</h1>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">{competitionLevelLabels[competition.level]}</span>
        </div>
      </div>

      {user.role === "ADMIN" ? (
        <CompetitionManagement
          competition={{ id: competition.id, name: competition.name, organizer: competition.organizer, description: competition.description }}
          attachments={attachments}
          initialWindow={applyWindow ? { startAt: applyWindow.startAt.toISOString(), endAt: applyWindow.endAt.toISOString(), enabled: applyWindow.enabled } : null}
        />
      ) : null}

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

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">报名</h2>
          <span className={`rounded-full px-3 py-1 text-xs ${applyState.tone}`}>{applyState.label}</span>
        </div>
        {competition.description ? (
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{competition.description}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {user.role === "STUDENT" ? (
            applyOpen ? (
              <Link href={`/apply?competitionId=${competition.id}`} className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">
                我要报名
              </Link>
            ) : (
              <span className="rounded-md bg-slate-100 px-5 py-2 text-sm text-slate-500">{applyWindow && !applyWindow.enabled ? "报名未开放" : "当前不在报名时间内"}</span>
            )
          ) : (
            <span className="text-sm text-slate-500">仅参赛学生可报名</span>
          )}
          <Link href="/my" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">我的项目</Link>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">时间安排</h2>
        {windows.length ? (
          <ul className="space-y-2 text-sm text-slate-700">
            {windows.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{item.stage === "SCHOOL" ? "校赛" : item.stage === "PROVINCE" ? "省赛" : "国赛"}</span>
                <span>{formatDateTime(item.startAt.toISOString())} 至 {formatDateTime(item.endAt.toISOString())}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">尚未设置时间窗口</p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">赛道与组别</h2>
        {topTracks.length ? (
          <div className="space-y-3">
            {topTracks.map((track) => (
              <div key={track.id} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-sm font-medium text-slate-900">{track.name}</p>
                {childrenOf(track.id).length ? (
                  <p className="mt-1 text-xs text-slate-600">
                    分支：{childrenOf(track.id).map((child) => child.name).join(" · ")}
                  </p>
                ) : null}
              </div>
            ))}
            <p className="text-xs text-slate-500">
              可选项别：{groups.length ? groups.map((item) => item.label).join(" · ") : "未配置"}
            </p>
            <p className="text-xs text-slate-500">
              可选类别：{categories.length ? categories.map((item) => item.label).join(" · ") : "未配置"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">尚未配置赛道</p>
        )}
      </section>

      {user.role !== "ADMIN" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">赛事文件</h2>
          <p className="mb-4 text-xs text-slate-500">报名前请先阅读通知与规程，确认所在赛道与组别。</p>
          {attachments.length ? (
            <ul className="divide-y divide-slate-100">
              {attachments.map((file) => (
                <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm text-slate-900">{file.title}</p>
                    <p className="text-xs text-slate-500">{file.kind === "RULE" ? "规程" : file.kind === "TEMPLATE" ? "模板" : "通知"} · {file.fileName}</p>
                  </div>
                  <a href={file.filePath} target="_blank" rel="noreferrer" className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                    查看 / 下载
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">暂无赛事文件</p>
          )}
        </section>
      ) : null}

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
