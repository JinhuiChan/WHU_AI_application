import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CompetitionDeleteButton } from "@/components/admin/competition-delete-button";
import { CompetitionManagement } from "@/components/admin/competition-management";
import { CompetitionPublishButton } from "@/components/admin/competition-publish-button";
import { TrackEditor } from "@/components/admin/track-editor";
import { WhuEavesWatermark, WhuSeal } from "@/components/brand/whu-motifs";
import { eventTone, LevelPill } from "@/components/competitions/event-tone";
import { BackLink } from "@/components/data/list-link";
import { BreadcrumbTitle } from "@/components/layout/breadcrumbs";
import { deadlineState } from "@/components/ui/deadline-meter";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHead, SectionRule } from "@/components/ui/section-head";
import { syncPendingAttachments } from "@/lib/attachment-knowledge";
import { getActiveUser } from "@/lib/auth.server";
import { getCompetitionDetail } from "@/lib/competitions";
import { loadScopedLabels } from "@/lib/dict-labels";
import { firstParam } from "@/lib/list-query";
import {
  awardLevelLabels,
  awardStatusLabels,
  competitionLevelLabels,
  dataSourceTypeLabels,
  formatDate,
  formatDateTime,
  publishStatusLabels,
} from "@/lib/presentation";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "赛事详情" };
export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

function awardCapsuleClass(level: string) {
  if (level === "S" || level === "A" || level === "GOLD") {
    return "bg-[#fdf6e7] text-[#9a5b13] ring-1 ring-[#ead4a8]";
  }
  return "bg-[#eef5f1] text-[#115740] ring-1 ring-[#cbe0d4]";
}

export default async function CompetitionDetailPage({ params, searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  const competition = await getCompetitionDetail(params.id, user.role);
  if (!competition) notFound();
  if (user.role !== "ADMIN" && competition.publishStatus !== "PUBLISHED") notFound();

  if (user.role === "ADMIN") await syncPendingAttachments([params.id]);
  const [attachments, windows, tracks] = await Promise.all([
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
  ]);

  const labels = await loadScopedLabels();
  const optionLabels = (trackId: string, kind: "GROUP" | "CATEGORY") => {
    const scoped = labels.byTrack[trackId]?.[kind] ?? {};
    const source = Object.keys(scoped).length ? scoped : (labels.global[kind] ?? {});
    const values = Object.values(source);
    return values.length ? values.join(" / ") : "未配置";
  };

  const now = new Date();
  const applyWindow = windows.find((item) => item.stage === "SCHOOL") ?? windows[0];
  const applyWinState = applyWindow ? deadlineState(applyWindow.startAt, applyWindow.endAt, now) : null;
  const applyOpen = Boolean(applyWindow?.enabled && applyWinState?.running);
  const applyState = !applyWindow
    ? { label: "报名时间未设置", tone: "bg-[#f1f5f3] text-[#54635d] ring-1 ring-[#d5e2db]" }
    : !applyWindow.enabled
      ? { label: "报名未开放", tone: "bg-[#f1f5f3] text-[#54635d] ring-1 ring-[#d5e2db]" }
      : applyWinState?.running
        ? { label: `报名中 · 截止 ${applyWinState.endText}`, tone: "bg-[#eef5f1] text-[#115740] ring-1 ring-[#badec9]" }
        : applyWinState?.urgency === "upcoming"
          ? { label: `报名未开始 · ${applyWinState.startText} 开放`, tone: "bg-[#fdf6e7] text-[#9a5b13] ring-1 ring-[#ead4a8]" }
          : { label: "报名已截止", tone: "bg-[#f1f5f3] text-[#54635d] ring-1 ring-[#d5e2db]" };

  const tone = eventTone(competition.level);
  const topTracks = tracks.filter((track) => !track.parentId);
  const childrenOf = (id: string) => tracks.filter((track) => track.parentId === id);
  const documents = attachments.filter(
    (file) => file.kind !== "VIDEO" && !/\.(mp4|webm|mov|m4v|ogv)$/i.test(file.fileName),
  );

  return (
    <div className="space-y-5">
      <BreadcrumbTitle label={competition.name} />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <BackLink to={firstParam(searchParams?.from)} fallback="/competitions" label="返回赛事列表" />
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/intro/${competition.id}`}
            className="inline-flex h-8 items-center rounded-full border border-[#7f9384] bg-white px-3.5 text-xs font-medium text-[#162620] transition-colors hover:border-[#115740] hover:bg-[#eef5f1]"
          >
            查看赛事简介
          </Link>
          {competition.publishStatus === "PUBLISHED" ? (
            <Link
              href={`/assistant?competitionId=${competition.id}`}
              className="inline-flex h-8 items-center rounded-full border border-[#7f9384] bg-white px-3.5 text-xs font-medium text-[#115740] transition-colors hover:border-[#115740] hover:bg-[#eef5f1]"
            >
              问这场比赛
            </Link>
          ) : null}
          {user.role === "ADMIN" ? (
            <Link
              href="#competition-files"
              className="inline-flex h-8 items-center rounded-full border border-[#7f9384] bg-white px-3.5 text-xs font-medium text-[#162620] transition-colors hover:border-[#115740] hover:bg-[#eef5f1]"
            >
              维护赛事资料
            </Link>
          ) : null}
        </div>
      </div>

      <section className="card relative overflow-hidden border-[#c0d5ca] bg-gradient-to-br from-white via-white to-[#eef5f1] p-6">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[3.5px]"
          style={{
            backgroundImage: `linear-gradient(90deg, ${tone.from} 0%, #115740 56%, #c59b45 100%)`,
          }}
        />
        <div className="relative z-[1]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <LevelPill level={competition.level} className="font-semibold" />
              <WhuSeal label={`${competition.year} 赛年`} />
            </div>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${applyState.tone}`}>
              {applyState.label}
            </span>
          </div>

          <h1 className="t-page-title mt-3 font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[30px]">
            {competition.name}
          </h1>

          {competition.description ? (
            <p className="mt-3 max-w-4xl whitespace-pre-line text-sm leading-6 text-[#3f524a]">
              {competition.description}
            </p>
          ) : null}

          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-[#dce8e1] pt-4 text-sm md:grid-cols-5">
            <div>
              <dt className="t-label text-xs text-[#5c6c65]">赛年</dt>
              <dd className="mt-1 font-serif text-base font-semibold text-[#0e1d17] tabular-nums">
                {competition.year}
              </dd>
            </div>
            <div>
              <dt className="t-label text-xs text-[#5c6c65]">赛事等级</dt>
              <dd className="mt-1 font-medium text-[#0e1d17]">{competitionLevelLabels[competition.level]}</dd>
            </div>
            <div>
              <dt className="t-label text-xs text-[#5c6c65]">系列标识</dt>
              <dd className="mt-1 break-all font-mono text-xs text-[#33433d]">{competition.seriesId}</dd>
            </div>
            <div>
              <dt className="t-label text-xs text-[#5c6c65]">主办方</dt>
              <dd className="mt-1 font-medium text-[#0e1d17]">{competition.organizer ?? "待补充"}</dd>
            </div>
            <div>
              <dt className="t-label text-xs text-[#5c6c65]">创建时间</dt>
              <dd className="mt-1 text-[#33433d] tabular-nums">{formatDate(competition.createdAt)}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {user.role === "STUDENT" ? (
              applyOpen ? (
                <Link
                  href={`/apply?competitionId=${competition.id}`}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[#115740] px-6 text-sm font-medium text-white transition-colors hover:bg-[#0d4633]"
                >
                  我要报名
                </Link>
              ) : (
                <span className="inline-flex h-10 items-center justify-center rounded-full border border-[#d5e2db] bg-[#f4f8f6] px-5 text-sm text-[#5c6c65]">
                  {applyWindow && !applyWindow.enabled ? "报名未开放" : "当前不在报名时间内"}
                </span>
              )
            ) : (
              <span className="inline-flex h-9 items-center rounded-full bg-[#eef5f1] px-4 text-xs font-medium text-[#115740]">
                仅参赛学生身份可发起报名
              </span>
            )}
            <Link
              href="/my"
              className="inline-flex h-10 items-center justify-center rounded-full border border-[#7f9384] bg-white px-5 text-sm font-medium text-[#162620] transition-colors hover:border-[#115740] hover:bg-[#f7faf8]"
            >
              我的项目
            </Link>
          </div>
        </div>
        <WhuEavesWatermark className="pointer-events-none absolute -bottom-3 -right-2 h-[126px] w-[220px] text-[#0d3b2e]/[0.055]" />
      </section>

      {user.role === "ADMIN" ? (
        <CompetitionManagement
          competition={{
            id: competition.id,
            name: competition.name,
            organizer: competition.organizer,
            description: competition.description,
          }}
          attachments={attachments}
          initialWindow={
            applyWindow
              ? {
                  startAt: applyWindow.startAt.toISOString(),
                  endAt: applyWindow.endAt.toISOString(),
                  enabled: applyWindow.enabled,
                }
              : null
          }
        />
      ) : null}

      <section className="card p-5">
        <SectionHead
          title="时间安排"
          sub="各赛段报名与材料提交起止窗口"
          meta={windows.length ? `共 ${windows.length} 个阶段窗口` : undefined}
        />
        <SectionRule className="my-3.5" />
        {windows.length ? (
          <ol className="relative space-y-3 pl-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-[#cfe0d7]">
            {windows.map((item) => {
              const stageName = item.stage === "SCHOOL" ? "校赛" : item.stage === "PROVINCE" ? "省赛" : "国赛";
              return (
                <li
                  key={item.id}
                  className="relative flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#dce8e1] bg-[#f8fbf9] px-4 py-3 text-sm"
                >
                  <span
                    aria-hidden="true"
                    className="absolute -left-[17px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-white bg-[#115740]"
                  />
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center rounded-full bg-[#eef5f1] px-2.5 py-0.5 text-xs font-semibold text-[#115740]">
                      {stageName}
                    </span>
                    <span className="text-[#162620] tabular-nums">
                      {formatDateTime(item.startAt.toISOString())} 至 {formatDateTime(item.endAt.toISOString())}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      item.enabled ? "bg-[#eef5f1] text-[#115740]" : "bg-[#f1f5f3] text-[#6c7e76]"
                    }`}
                  >
                    {item.enabled ? "已启用" : "已停用"}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="inline-empty text-sm">尚未设置时间窗口</p>
        )}
      </section>

      {user.role === "ADMIN" ? (
        <TrackEditor competitionId={competition.id} />
      ) : (
        <section className="card p-5">
          <SectionHead
            title="赛道与组别"
            sub="报名前请确认项目所属赛道、组别与类别口径"
            meta={topTracks.length ? `${topTracks.length} 个主赛道` : undefined}
          />
          <SectionRule className="my-3.5" />
          {topTracks.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {topTracks.map((track) => (
                <div key={track.id} className="rounded-xl border border-[#d5e2db] bg-[#f8fbf9] px-4 py-3.5">
                  <p className="text-sm font-semibold text-[#0e1d17]">{track.name}</p>
                  {childrenOf(track.id).length ? (
                    <div className="mt-2 space-y-1.5">
                      {childrenOf(track.id).map((child) => (
                        <p key={child.id} className="text-xs leading-5 text-[#4d5e57]">
                          <span className="font-medium text-[#115740]">{child.name}</span>
                          {" · 组别："}
                          {optionLabels(child.id, "GROUP")}
                          {" · 类别："}
                          {optionLabels(child.id, "CATEGORY")}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1.5 text-xs leading-5 text-[#4d5e57]">
                      组别：{optionLabels(track.id, "GROUP")} · 类别：{optionLabels(track.id, "CATEGORY")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="inline-empty text-sm">尚未配置赛道</p>
          )}
        </section>
      )}

      {user.role !== "ADMIN" ? (
        <section className="card p-5">
          <SectionHead
            title="赛事文件"
            sub="报名前请先研读通知与规程，确认所在赛道与组别要求"
            meta={`${documents.length} 份文件`}
          />
          <SectionRule className="my-3.5" />
          {documents.length ? (
            <ul className="space-y-2.5">
              {documents.map((file) => (
                <li
                  key={file.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce8e1] bg-[#f8fbf9] px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-[#eef5f1] px-2.5 py-0.5 text-xs font-medium text-[#115740]">
                        {file.kind === "RULE" ? "规程" : file.kind === "TEMPLATE" ? "模板" : "通知"}
                      </span>
                      <p className="text-sm font-medium text-[#0e1d17]">{file.title}</p>
                    </div>
                    {file.filePath.startsWith("/samples/") ? (
                      <p className="mt-1 text-xs text-[#9a5b13]">内置演示资料，不作为正式问答依据</p>
                    ) : null}
                    {file.knowledgeStatus === "REPLACED" ? (
                      <p className="mt-1 text-xs text-[#6c7e76]">已被新版替换，仅供历史查阅</p>
                    ) : null}
                    <p className="mt-1 text-xs text-[#5c6c65]">{file.fileName}</p>
                  </div>
                  <a
                    href={file.filePath}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 shrink-0 items-center rounded-full border border-[#7f9384] bg-white px-4 text-xs font-medium text-[#115740] transition-colors hover:border-[#115740] hover:bg-[#eef5f1]"
                  >
                    查看 / 下载
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="inline-empty text-sm">暂无赛事文件</p>
          )}
        </section>
      ) : null}

      <section className="overflow-hidden card">
        <div className="px-5 pt-4">
          <SectionHead
            title={`获奖名单（${competition.awards.length}）`}
            sub="按获奖记录展示来源与核验信息，未登记来源时明确标注"
          />
        </div>
        <SectionRule className="mx-5 mt-3.5" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="t-thead bg-[#f5faf7] text-xs text-[#4d5e57]">
              <tr>
                <th className="px-4 py-3 font-medium">项目</th>
                <th className="px-4 py-3 font-medium">学院</th>
                <th className="px-4 py-3 font-medium">奖项</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">来源与标识</th>
                <th className="px-4 py-3 font-medium">核验人</th>
                <th className="px-4 py-3 font-medium">核验时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef4f0]">
              {competition.awards.map((award) => (
                <tr key={award.id} className="align-top text-[#26342e]">
                  <td className="max-w-xs px-4 py-3.5">
                    <Link
                      href={`/projects/${award.project.id}`}
                      className="font-medium text-[#0e1d17] transition-colors hover:text-[#115740] hover:underline"
                    >
                      {award.project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">{award.project.college}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${awardCapsuleClass(award.awardLevel)}`}
                    >
                      {awardLevelLabels[award.awardLevel]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs font-medium text-[#3f524a]">
                    {awardStatusLabels[award.status]}
                  </td>
                  <td className="max-w-52 px-4 py-3.5 text-xs">
                    {award.sources.length ? (
                      award.sources.map((source) => (
                        <div key={`${source.batchId}-${source.sourceRef}-${source.syncedAt}`} className="space-y-0.5">
                          <span className="font-medium text-[#162620]">{dataSourceTypeLabels[source.sourceType]}</span>
                          <span className="block break-all text-[#5c6c65]">{source.sourceRef}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[#7c8e85]">未登记</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">{award.verifierName}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs text-[#54635d] tabular-nums">
                    {formatDateTime(award.verifiedAt)}
                  </td>
                </tr>
              ))}
              {competition.awards.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <EmptyState
                      title="暂无可见获奖记录"
                      description="待赛事奖项核验或正式发布后，获奖项目与溯源信息将在此展示。"
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {user.role === "ADMIN" ? (
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#0e1d17]">发布状态</h2>
              <p className="mt-1 text-xs text-[#54635d]">
                草稿与已下架赛事仅管理员可见；点击「发布赛事」后学生端才会展示。
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                competition.publishStatus === "PUBLISHED"
                  ? "bg-[#eef5f1] text-[#115740] ring-1 ring-[#cbe0d4]"
                  : competition.publishStatus === "WITHDRAWN"
                    ? "bg-[#faeaea] text-[#9e2a35] ring-1 ring-[#eccacd]"
                    : "bg-[#f1f5f3] text-[#54635d] ring-1 ring-[#d5e2db]"
              }`}
            >
              {publishStatusLabels[competition.publishStatus]}
            </span>
          </div>
          <div className="mt-3">
            <CompetitionPublishButton competitionId={competition.id} status={competition.publishStatus} />
          </div>
        </section>
      ) : null}

      {user.role === "ADMIN" ? (
        <section className="card border-[#eccacd] bg-[#fffdfd] p-5">
          <h2 className="text-sm font-semibold text-[#9e2a35]">危险操作</h2>
          <p className="mt-1 text-xs text-[#54635d]">
            误建的赛事可在此删除；已有项目报名或奖项记录的赛事不允许删除（服务端会自动拦截）。
          </p>
          <div className="mt-3">
            <CompetitionDeleteButton
              competitionId={competition.id}
              competitionName={competition.name}
              redirectTo="/competitions"
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
