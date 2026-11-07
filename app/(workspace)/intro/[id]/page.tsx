import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { CompetitionLevel } from "@prisma/client";
import { ArrowLeft, ArrowUpRight, CalendarDays, FileText, PlayCircle, Route } from "lucide-react";
import { BreadcrumbTitle } from "@/components/layout/breadcrumbs";
import { introContentFor } from "@/components/competitions/competition-intro-data";
import BlurText from "@/components/react-bits/BlurText";
import SpotlightCard from "@/components/react-bits/SpotlightCard";
import { getActiveUser } from "@/lib/auth.server";
import { loadScopedLabels } from "@/lib/dict-labels";
import { prisma } from "@/lib/prisma";
import { competitionLevelLabels, formatDateTime } from "@/lib/presentation";

export const metadata: Metadata = { title: "赛事介绍" };
export const dynamic = "force-dynamic";

const VIDEO_FILE = /\.(mp4|webm|mov|m4v|ogv)$/i;

const levelTone: Record<CompetitionLevel, string> = {
  SCHOOL: "bg-slate-100 text-slate-600",
  PROVINCE: "bg-blue-50 text-blue-700",
  NATIONAL: "bg-indigo-50 text-indigo-700",
};

type PageProps = { params: { id: string } };

export default async function CompetitionIntroDetailPage({ params }: PageProps) {
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
  const optionLabels = (trackId: string, kind: "GROUP" | "CATEGORY") => {
    const scoped = labels.byTrack[trackId]?.[kind] ?? {};
    const source = Object.keys(scoped).length ? scoped : (labels.global[kind] ?? {});
    const values = Object.values(source);
    return values.length ? values.join(" · ") : "未配置";
  };

  const now = new Date();
  const applyWindow = competition.timeWindows.find((item) => item.stage === "SCHOOL") ?? competition.timeWindows[0];
  const applyOpen = Boolean(applyWindow && now >= applyWindow.startAt && now <= applyWindow.endAt);
  const applyState = !applyWindow
    ? { label: "报名时间未设置", tone: "bg-slate-100 text-slate-600" }
    : now < applyWindow.startAt
      ? { label: `${formatDateTime(applyWindow.startAt.toISOString())} 开放报名`, tone: "bg-amber-50 text-amber-700" }
      : applyOpen
        ? { label: `报名中 · 截止 ${formatDateTime(applyWindow.endAt.toISOString())}`, tone: "bg-emerald-50 text-emerald-700" }
        : { label: "报名已截止", tone: "bg-slate-100 text-slate-600" };

  const video = competition.attachments.find((file) => file.kind === "VIDEO" || VIDEO_FILE.test(file.fileName));
  const documents = competition.attachments.filter((file) => file !== video);

  return (
    <div className="space-y-6">
      <BreadcrumbTitle label={competition.name} />

      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-50 blur-3xl"
        />
        <div className="relative">
          <Link href="/intro" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
            <ArrowLeft aria-hidden="true" size={14} />
            返回赛事简介
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${levelTone[competition.level]}`}>
              {competitionLevelLabels[competition.level]}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {competition.year} 年
            </span>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${applyState.tone}`}>{applyState.label}</span>
          </div>

          <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-900">
            <BlurText
              animateBy="letters"
              blur={9}
              delay={26}
              distance={16}
              stepDuration={0.42}
              text={competition.name}
              trigger="load"
            />
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{intro.tagline}</p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href={`/competitions/${competition.id}`}
              className="inline-flex h-11 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-medium text-white transition duration-[160ms] ease-out hover:bg-blue-700 active:scale-[0.97] active:bg-blue-800 motion-reduce:active:scale-100"
            >
              查看赛事详情
            </Link>
            {user.role === "STUDENT" ? (
              applyOpen ? (
                <Link
                  href={`/apply?competitionId=${competition.id}`}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-6 text-sm font-medium text-blue-700 transition duration-[160ms] ease-out hover:bg-blue-100 active:scale-[0.97] motion-reduce:active:scale-100"
                >
                  我要报名
                </Link>
              ) : null
            ) : null}
            <Link
              href="/my"
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition duration-[160ms] ease-out hover:bg-slate-50 active:scale-[0.97] active:bg-slate-100 motion-reduce:active:scale-100"
            >
              我的项目
            </Link>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-xs text-slate-400">主办方</dt>
              <dd className="mt-1 text-slate-800">{competition.organizer ?? "未填写"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">赛道数</dt>
              <dd className="mt-1 text-slate-800">{topTracks.length} 条</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">赛事等级</dt>
              <dd className="mt-1 text-slate-800">{competitionLevelLabels[competition.level]}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">材料</dt>
              <dd className="mt-1 text-slate-800">{competition.attachments.length} 份</dd>
            </div>
          </dl>
        </div>
      </section>

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
        {intro.highlights.map((item) => (
          <div key={item.title} className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <SpotlightCard
              borderGlow={0.35}
              className="h-full p-4"
              intensity={0.45}
              proximity={44}
              softness={0.75}
              spotlightColor="#2563eb"
              spotlightSize={200}
              theme="light"
            >
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1.5 text-xs leading-6 text-slate-600">{item.desc}</p>
            </SpotlightCard>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base text-slate-900">赛道与组别</h2>
          <span className="text-xs text-slate-500">共 {topTracks.length} 条赛道</span>
        </div>
        {topTracks.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {topTracks.map((track) => (
              <div key={track.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Route aria-hidden="true" className="text-blue-600" size={16} />
                  {track.name}
                </p>
                {childrenOf(track.id).length ? (
                  <ul className="mt-2 space-y-1.5">
                    {childrenOf(track.id).map((child) => (
                      <li key={child.id} className="text-xs leading-6 text-slate-600">
                        <span className="font-medium text-slate-700">{child.name}</span>
                        <span className="text-slate-500"> · 组别：{optionLabels(child.id, "GROUP")}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    组别：{optionLabels(track.id, "GROUP")}
                    <br />
                    类别：{optionLabels(track.id, "CATEGORY")}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">该赛事尚未配置赛道，报名前请先看通知。</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base text-slate-900">参赛流程</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-2">
          {intro.steps.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                <p className="mt-0.5 text-xs leading-6 text-slate-600">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base text-slate-900">宣传片与赛事解读</h2>
          <span className="text-xs text-slate-500">视频素材接入位</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          上传的视频会在这里直接播放；没有素材时先占位，不显示空白播放器。
        </p>
        <div className="mt-4">
          {video ? (
            <video
              className="w-full rounded-xl border border-slate-200 bg-black"
              controls
              playsInline
              preload="metadata"
              src={video.filePath}
            >
              <track kind="captions" />
              你的浏览器不支持内嵌视频，可以
              <a href={video.filePath} className="text-blue-600 underline">直接下载观看</a>。
            </video>
          ) : (
            <div className="max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-b from-blue-50 via-white to-white shadow-sm">
              <SpotlightCard
                borderGlow={0.3}
                className="flex aspect-video flex-col items-center justify-center gap-2 px-6 text-center"
                intensity={0.4}
                proximity={64}
                shape="beam"
                softness={0.8}
                spotlightColor="#2563eb"
                spotlightSize={520}
                theme="light"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <PlayCircle aria-hidden="true" size={22} />
                </span>
                <p className="text-sm font-semibold text-slate-700">宣传片 / 赛事解读</p>
                <p className="max-w-md text-xs leading-6 text-slate-500">
                  还没有上传视频。管理员上传后，这里会变成可播放的宣传片，也可以在下面配一段赛事解读。
                </p>
              </SpotlightCard>
            </div>
          )}
        </div>
      </section>

      {documents.length ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base text-slate-900">官方通知与规程</h2>
          <p className="mt-1 text-xs text-slate-500">简介只做概览，报名条件与规则以这些文件为准。</p>
          <ul className="mt-4 divide-y divide-slate-100">
            {documents.map((file) => (
              <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="flex items-center gap-2 text-sm text-slate-800">
                  <FileText aria-hidden="true" className="text-slate-400" size={16} />
                  {file.title}
                </span>
                <a
                  href={file.filePath}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-slate-50"
                >
                  查看 / 下载
                  <ArrowUpRight aria-hidden="true" size={12} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <p className="flex items-start gap-2 text-xs leading-6 text-slate-600">
          <CalendarDays aria-hidden="true" className="mt-0.5 shrink-0 text-blue-600" size={14} />
          <span>
            {intro.note ?? "具体赛道、组别与时间安排以当年度报名通知为准。"}
            <span className="ml-1 text-slate-500">
              报名与材料提交请到
              <Link href={`/competitions/${competition.id}`} className="mx-1 text-blue-700 underline">
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
