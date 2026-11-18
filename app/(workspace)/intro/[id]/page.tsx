import { BackLink } from "@/components/data/list-link";
import { firstParam } from "@/lib/list-query";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowUpRight, CalendarDays, FileText, PlayCircle } from "lucide-react";
import { levelCardTheme, TRACK_BLOCK_TONES } from "@/components/brand/whu-photos";
import { BreadcrumbTitle } from "@/components/layout/breadcrumbs";
import { introContentFor } from "@/components/competitions/competition-intro-data";
import { LevelPill } from "@/components/competitions/event-tone";
import { TrackCard } from "@/components/competitions/track-card";
import { deadlineState, fmtMD, sameYearCN } from "@/components/ui/deadline-meter";
import { SectionHead } from "@/components/ui/section-head";
import { Button, ButtonArrow } from "@/components/ui/button";
import { getActiveUser } from "@/lib/auth.server";
import { loadScopedLabels } from "@/lib/dict-labels";
import { prisma } from "@/lib/prisma";
import { competitionLevelLabels } from "@/lib/presentation";

export const metadata: Metadata = { title: "赛事介绍" };
export const dynamic = "force-dynamic";

const VIDEO_FILE = /\.(mp4|webm|mov|m4v|ogv)$/i;

// 时间窗口阶段。这是 ProjectStage 枚举的学生视角译名，别直接印枚举值。
const STAGE_LABEL: Record<string, string> = {
  SCHOOL: "校赛",
  PROVINCE: "省赛",
  NATIONAL: "国赛",
  FINISHED: "赛后",
};

type PageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function CompetitionIntroDetailPage({ params, searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");

  const competition = await prisma.competition.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      level: true,
      year: true,
      organizer: true,
      seriesId: true,
      description: true,
      publishStatus: true,
      tracks: {
        where: { enabled: true },
        select: { id: true, parentId: true, name: true, kind: true },
        orderBy: { sortOrder: "asc" },
      },
      attachments: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      timeWindows: { where: { enabled: true }, orderBy: { startAt: "asc" } },
    },
  });
  if (!competition) notFound();
  // 草稿与已下架赛事对学生按不存在处理，和赛事详情页保持一致
  if (user.role !== "ADMIN" && competition.publishStatus !== "PUBLISHED") notFound();

  const intro = introContentFor(competition.seriesId);
  const topTracks = competition.tracks.filter((track) => !track.parentId);
  const childrenOf = (id: string) => competition.tracks.filter((track) => track.parentId === id);

  // 组别 / 类别沿用赛事详情页的取法：先看该赛道自己的字典，没有就用全局字典
  const labels = await loadScopedLabels();

  // 赛道卡副标题：只放组别，最多三项，其余折叠成「等 N 项」。
  // 卡片宽度只有三四百像素，把组别和类别的完整枚举都列上会换四五行、压住右侧插画；
  // 而学生在这一屏要做的是「选一条赛道」，不是「读完所有枚举」——完整清单在赛事详情页。
  const trackDetail = (trackId: string) => {
    const scoped: Record<string, string> = labels.byTrack[trackId]?.GROUP ?? {};
    const source: Record<string, string> = Object.keys(scoped).length
      ? scoped
      : (labels.global.GROUP ?? {});
    const groups = Object.values(source);
    if (!groups.length) return "具体组别以当年度通知为准";
    const shown = groups.slice(0, 3);
    return groups.length > shown.length
      ? `组别：${shown.join(" · ")} 等 ${groups.length} 项`
      : `组别：${shown.join(" · ")}`;
  };

  const now = new Date();
  const applyWindow = competition.timeWindows.find((item) => item.stage === "SCHOOL") ?? competition.timeWindows[0];
  const applyWinState = applyWindow ? deadlineState(applyWindow.startAt, applyWindow.endAt, now) : null;
  const applyOpen = Boolean(applyWinState?.running);
  const applyState = !applyWinState
    ? { label: "报名时间未设置", tone: "bg-slate-100 text-slate-600" }
    : applyWinState.urgency === "upcoming"
      ? { label: `${applyWinState.startText} 开放报名`, tone: applyWinState.tone }
      : applyWinState.running
        ? { label: `报名中 · 截止 ${applyWinState.endText}`, tone: "bg-emerald-50 text-emerald-700" }
        : { label: "报名已截止", tone: applyWinState.tone };

  const video = competition.attachments.find((file) => file.kind === "VIDEO" || VIDEO_FILE.test(file.fileName));
  const documents = competition.attachments.filter((file) => file !== video);

  // 关键时间：学生打开简介页的第一个问题是「还来不来得及」。
  // 只渲染真正配置了的阶段 —— 现在库里每个赛事只有一条校赛窗口，
  // 硬凑成三列（校赛/省赛/国赛）会有两格是编的。有数据就多行，没数据整块不出现。
  // 紧迫度、颜色与剩余天数统一由 deadlineState 计算，避免同页和列表出现两套口径。
  const keyDates = competition.timeWindows.map((item) => {
    const state = deadlineState(item.startAt, item.endAt, now);
    const startYear = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric" }).format(item.startAt).replace(/年$/, "");
    const endYear = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric" }).format(item.endAt).replace(/年$/, "");
    const sameYear = sameYearCN(item.startAt, item.endAt);
    const label = state.running ? `进行中 · ${state.label}` : state.label;
    return {
      id: item.id,
      stage: item.stage,
      range: `${startYear}.${fmtMD(item.startAt)} — ${sameYear ? fmtMD(item.endAt) : `${endYear}.${fmtMD(item.endAt)}`}`,
      percent: state.percent ?? 0,
      running: state.running,
      tone: state.tone,
      bar: state.barTone,
      label,
    };
  });

  const cardTheme = levelCardTheme(competition.level);
  const trackGroupsFor = (trackId: string) => {
    const scoped: Record<string, string> = labels.byTrack[trackId]?.GROUP ?? {};
    const source: Record<string, string> = Object.keys(scoped).length ? scoped : (labels.global.GROUP ?? {});
    return Object.values(source);
  };
  const trackCategoriesFor = (trackId: string) => {
    const scoped: Record<string, string> = labels.byTrack[trackId]?.CATEGORY ?? {};
    const source: Record<string, string> = Object.keys(scoped).length ? scoped : (labels.global.CATEGORY ?? {});
    return Object.values(source);
  };
  const highlightTones = [
    { bg: "#eef4fb", border: "#cfe0f5", title: "#002554" },
    { bg: "#ebf6f2", border: "#c7e6db", title: "#115740" },
    { bg: "#fdf2e6", border: "#f5dec4", title: "#92400e" },
  ];

  return (
    <div className="space-y-6">
      <BreadcrumbTitle label={competition.name} />

      <section
        className="overflow-hidden rounded-2xl border p-6 shadow-sm md:p-8"
        style={{ backgroundColor: cardTheme.surface, borderColor: cardTheme.border }}
      >
        <div className="grid gap-6 md:grid-cols-[1.35fr_0.65fr] md:items-center">
          <div>
            <BackLink to={firstParam(searchParams?.from)} fallback="/intro" label="返回赛事简介" />

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <LevelPill className="bg-white/90 px-2.5 py-0.5 text-xs font-semibold ring-1 ring-black/5" level={competition.level} />
              <span className="rounded-full bg-white/85 px-2.5 py-0.5 font-mono text-xs font-medium text-slate-700 ring-1 ring-black/5">
                {competition.year} 年
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-black/5 ${applyState.tone}`}>{applyState.label}</span>
            </div>

            <h1
              className={`mt-3 ${cardTheme.titleFontClass} text-3xl leading-tight sm:text-4xl`}
              style={{ color: cardTheme.titleInk }}
            >
              {competition.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">{intro.tagline}</p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                asChild
                className="group rounded-full bg-[#115740] text-white hover:bg-[#0d4633] active:bg-[#093426] focus-visible:ring-[#115740]/30"
              >
                <Link href={`/competitions/${competition.id}`}>
                  查看赛事详情
                  <ButtonArrow />
                </Link>
              </Button>
              {user.role === "STUDENT" ? (
                applyOpen ? (
                  <Link
                    href={`/apply?competitionId=${competition.id}`}
                    className="group inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#115740]/45 bg-white/95 px-6 text-sm font-medium text-[#115740] transition duration-150 ease-out hover:bg-white active:scale-[0.98] motion-reduce:active:scale-100 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
                  >
                    我要报名
                    <ButtonArrow />
                  </Link>
                ) : null
              ) : null}
              <Link
                href="/my"
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#7f9384] bg-white/90 px-5 text-sm font-medium text-[#24362f] transition duration-150 ease-out hover:border-[#115740] hover:bg-white active:scale-[0.98] motion-reduce:active:scale-100 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
              >
                我的项目
              </Link>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-black/10 pt-4 text-sm md:grid-cols-4">
              <div>
                <dt className="text-xs text-slate-500">主办方</dt>
                <dd className="mt-1 font-medium text-slate-900">{competition.organizer ?? "未填写"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">赛道数</dt>
                <dd className="mt-1 font-mono font-medium text-slate-900 tabular-nums">{topTracks.length} 条</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">赛事等级</dt>
                <dd className="mt-1 font-medium" style={{ color: cardTheme.titleInk }}>{competitionLevelLabels[competition.level]}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">材料</dt>
                <dd className="mt-1 font-mono font-medium text-slate-900 tabular-nums">{competition.attachments.length} 份</dd>
              </div>
            </dl>
          </div>

          <figure className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
            <div className="relative aspect-[16/10] w-full">
              <Image
                alt={cardTheme.photoCaption}
                className="object-cover object-center"
                fill
                priority
                sizes="(min-width: 768px) 32vw, 100vw"
                src={cardTheme.photo}
                unoptimized
              />
            </div>
            <figcaption className="px-3.5 py-2 text-xs font-medium text-[#53675d]">
              {cardTheme.photoCaption}
            </figcaption>
          </figure>
        </div>
      </section>

      {keyDates.length ? (
        <section aria-label="关键时间" className="card overflow-hidden">
          <div className="px-5 pt-5">
            <SectionHead
              meta="具体安排以当年度通知为准"
              sub="还剩几天直接算好，不用自己数日历"
              title="关键时间"
            />
          </div>
          <div aria-hidden="true" className="mx-5 mt-4 h-px bg-[#d5e2db]/60" />
          <ul className="divide-y divide-slate-100">
            {keyDates.map((item) => (
              <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4" key={item.id}>
                <span className="flex min-w-[4.5rem] items-center gap-2">
                  <span aria-hidden="true" className={`h-7 w-1 rounded-full ${item.bar}`} />
                  <span className="text-sm font-medium text-slate-700">{STAGE_LABEL[item.stage] ?? item.stage}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold tracking-tight text-slate-900 tabular-nums">{item.range}</span>
                  <span aria-hidden="true" className="mt-1.5 flex items-center gap-2">
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className={`block h-full rounded-full ${item.bar}`}
                        style={{ width: `${item.percent}%` }}
                      />
                    </span>
                    <span className="shrink-0 text-xs text-slate-400 tabular-nums">
                      {item.running ? `已过 ${item.percent}%` : item.percent >= 100 ? "窗口已关闭" : "尚未开始"}
                    </span>
                  </span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${item.tone}`}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base text-slate-900">这个赛事是什么</h2>
        <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
          {competition.description ? (
            <p className="whitespace-pre-line">{competition.description}</p>
          ) : (
            intro.intro.map((paragraph) => <p key={paragraph.slice(0, 16)}>{paragraph}</p>)
          )}
        </div>
      </section>

      <section aria-label="赛事看点" className="grid gap-3 md:grid-cols-3">
        {intro.highlights.map((item, idx) => {
          const hlTone = highlightTones[idx % highlightTones.length];
          return (
            <div
              key={item.title}
              className="h-full rounded-xl border p-5"
              style={{ backgroundColor: hlTone.bg, borderColor: hlTone.border }}
            >
              <p className="font-display text-base font-semibold" style={{ color: hlTone.title }}>
                {item.title}
              </p>
              <p className="mt-1.5 text-xs leading-6 text-slate-700">{item.desc}</p>
            </div>
          );
        })}
      </section>

      {/* 赛道区块不再套白卡：渐变卡自己就是强调块，再包一层白底会把它压回"内容容器"的层级。
          紧随其后附上「按类型分背景色块与字体颜色区分」的赛道组别一览表。 */}
      <section aria-label="赛道与组别" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-slate-900">赛道与组别</h2>
          <span className="font-mono text-xs text-slate-500">共 {topTracks.length} 条赛道</span>
        </div>
        {topTracks.length ? (
          <>
            <div className={`grid gap-4 md:grid-cols-2 ${topTracks.length >= 3 ? "xl:grid-cols-3" : ""}`}>
              {topTracks.map((track, index) => (
                <TrackCard
                  detail={trackDetail(track.id)}
                  href={`/competitions/${competition.id}`}
                  index={index}
                  key={track.id}
                  name={track.name}
                  subTracks={childrenOf(track.id).map((child) => child.name)}
                />
              ))}
            </div>

            {/* 按类型分背景色块与字体色彩区分的「赛道与组别对照表」 */}
            <div className="overflow-hidden rounded-xl border border-[#d5e2db] bg-white">
              <div className="border-b border-[#d5e2db] bg-[#f7faf8] px-5 py-3">
                <h3 className="text-sm font-semibold text-slate-900">赛道、组别与可选类别对照表</h3>
                <p className="mt-0.5 text-xs text-slate-500">以颜色块区分不同赛道归属，具体申报条件以当年度正式通知为准。</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#d5e2db] bg-[#edf4ef] text-xs font-medium text-slate-600">
                      <th className="w-48 px-4 py-3">赛道类型</th>
                      <th className="w-56 px-4 py-3">子赛道 / 组别</th>
                      <th className="px-4 py-3">可选类别与申报方向</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d5e2db]">
                    {topTracks.map((track, index) => {
                      const t = TRACK_BLOCK_TONES[index % TRACK_BLOCK_TONES.length];
                      const subs = childrenOf(track.id).map((c) => c.name);
                      const groups = trackGroupsFor(track.id);
                      const cats = trackCategoriesFor(track.id);
                      const groupList = subs.length ? subs : groups;
                      return (
                        <tr key={track.id} className="align-top">
                          <td
                            className="border-r px-4 py-4 font-display text-sm font-semibold"
                            style={{ backgroundColor: t.bg, color: t.strong, borderColor: t.border }}
                          >
                            {track.name}
                          </td>
                          <td
                            className="border-r px-4 py-4 text-xs font-medium leading-6"
                            style={{ backgroundColor: t.softBg, color: t.text, borderColor: t.border }}
                          >
                            {groupList.length ? (
                              <ul className="space-y-1">
                                {groupList.map((g) => (
                                  <li key={g}>{g}</li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-slate-400">以当年度通知为准</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-xs leading-6 text-slate-700">
                            {cats.length ? cats.join(" · ") : "按报名表系统字典选择对应类别"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">该赛事尚未配置赛道，报名前请先看通知。</p>
        )}
      </section>

      <section className="rounded-2xl border border-[#d5e2db] bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#0f1d18]">参赛流程</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-2">
          {intro.steps.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#cfe0d6] bg-[#eef5f1] font-display text-xs font-semibold tabular-nums text-[#115740]">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0f1d18]">{step.title}</p>
                <p className="mt-0.5 text-xs leading-6 text-[#4a5c54]">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-[#d5e2db] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-[#0f1d18]">宣传片与赛事解读</h2>
          {user.role === "ADMIN" ? (
            <Link
              href={`/competitions/${competition.id}#media`}
              className="rounded-sm text-xs font-medium text-[#115740] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
            >
              管理宣传片
            </Link>
          ) : (
            <span className="text-xs text-[#5c6c65]">视频素材接入位</span>
          )}
        </div>
        <p className="mt-1 text-xs text-[#5c6c65]">
          上传的视频会在这里直接播放；没有素材时先占位，不显示空白播放器。
        </p>
        <div className="mt-4">
          {video ? (
            <video
              className="w-full max-w-3xl rounded-xl border border-[#cfe0d6] bg-black"
              controls
              playsInline
              preload="metadata"
              src={video.filePath}
            >
              <track kind="captions" />
              你的浏览器不支持内嵌视频，可以
              <a href={video.filePath} className="text-[#115740] underline">直接下载观看</a>。
            </video>
          ) : (
            <div className="flex aspect-video max-w-3xl flex-col items-center justify-center gap-2 rounded-xl border border-[#cfe0d6] bg-[#f6faf8] px-6 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef5f1] text-[#115740] ring-1 ring-[#cfe0d6]">
                <PlayCircle aria-hidden="true" size={20} />
              </span>
              <p className="text-sm font-semibold text-[#0f1d18]">宣传片 / 赛事解读</p>
              <p className="max-w-md text-xs leading-6 text-[#5c6c65]">
                还没有上传视频。管理员上传后，这里会变成可播放的宣传片，也可以在下面配一段赛事解读。
              </p>
              {user.role === "ADMIN" ? (
                <Link
                  href={`/competitions/${competition.id}#media`}
                  className="mt-1 inline-flex h-9 items-center justify-center rounded-full border border-[#7f9384] bg-white px-4 text-xs font-medium text-[#24362f] transition-colors hover:border-[#115740] hover:bg-[#eef5f1] hover:text-[#115740] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
                >
                  去上传宣传片
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {documents.length ? (
        <section className="rounded-2xl border border-[#d5e2db] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#0f1d18]">官方通知与规程</h2>
          <p className="mt-1 text-xs text-[#5c6c65]">简介只做概览，报名条件与规则以这些文件为准。</p>
          <ul className="mt-4 divide-y divide-[#eaf1ed]">
            {documents.map((file) => (
              <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="flex items-center gap-2 text-sm text-[#14261f]">
                  <FileText aria-hidden="true" className="text-[#115740]/70" size={16} />
                  {file.title}
                </span>
                <a
                  href={file.filePath}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1 rounded-full border border-[#7f9384] bg-white px-3.5 text-xs font-medium text-[#24362f] transition-colors hover:border-[#115740] hover:bg-[#eef5f1] hover:text-[#115740] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
                >
                  查看 / 下载
                  <ArrowUpRight aria-hidden="true" size={12} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-[#cfe0d6] bg-[#eef5f1]/75 p-4">
        <p className="flex items-start gap-2 text-xs leading-6 text-[#33433d]">
          <CalendarDays aria-hidden="true" className="mt-0.5 shrink-0 text-[#115740]" size={14} />
          <span>
            {intro.note ?? "具体赛道、组别与时间安排以当年度报名通知为准。"}
            <span className="ml-1 text-[#54635d]">
              报名与材料提交请到
              <Link
                href={`/competitions/${competition.id}`}
                className="mx-1 rounded-sm font-medium text-[#115740] underline hover:text-[#0d4633] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
              >
                赛事详情
              </Link>
              办理。
            </span>
          </span>
        </p>
      </section>
    </div>
  );
}
