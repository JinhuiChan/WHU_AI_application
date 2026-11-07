import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CompetitionLevel } from "@prisma/client";
import { ArrowUpRight, Building2, CalendarDays, Layers, PlayCircle, Trophy } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { detailHref } from "@/components/data/list-link";
import SpotlightCard from "@/components/react-bits/SpotlightCard";
import { introContentFor } from "@/components/competitions/competition-intro-data";
import { getActiveUser } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";
import { competitionLevelLabels } from "@/lib/presentation";

export const metadata: Metadata = { title: "赛事简介" };
export const dynamic = "force-dynamic";

const VIDEO_FILE = /\.(mp4|webm|mov|m4v|ogv)$/i;

const levelTone: Record<CompetitionLevel, string> = {
  SCHOOL: "bg-slate-100 text-slate-600",
  PROVINCE: "bg-blue-50 text-blue-700",
  NATIONAL: "bg-indigo-50 text-indigo-700",
};

export default async function CompetitionIntroPage() {
  const user = await getActiveUser();
  if (!user) redirect("/login");

  const competitions = await prisma.competition.findMany({
    where: user.role === "ADMIN" ? {} : { publishStatus: "PUBLISHED" },
    orderBy: [{ year: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      level: true,
      year: true,
      organizer: true,
      seriesId: true,
      description: true,
      tracks: { where: { enabled: true, parentId: null }, select: { id: true } },
      attachments: { select: { kind: true, fileName: true } },
      _count: { select: { projects: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">赛事简介</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            先弄清楚每个赛事是干什么的、有哪些赛道、要经过哪些环节，再决定报哪一个。点开卡片看完整介绍。
          </p>
        </div>
        <Link
          href="/competitions"
          className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition duration-[160ms] ease-out hover:bg-slate-50 active:scale-[0.97] active:bg-slate-100 motion-reduce:active:scale-100"
        >
          赛事与报名
        </Link>
      </div>

      {competitions.length ? (
        <section aria-label="赛事简介卡片" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {competitions.map((competition) => {
            const intro = introContentFor(competition.seriesId);
            const hasVideo = competition.attachments.some(
              (file) => file.kind === "VIDEO" || VIDEO_FILE.test(file.fileName),
            );
            return (
              <Link
                key={competition.id}
                href={detailHref("/intro", competition.id, "/intro")}
                className="group block rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-[180ms] ease-out hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <SpotlightCard
                  borderGlow={0.4}
                  className="flex h-full flex-col gap-4 p-5"
                  intensity={0.5}
                  proximity={56}
                  softness={0.75}
                  spotlightColor="#2563eb"
                  spotlightSize={280}
                  theme="light"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Trophy aria-hidden="true" size={20} />
                    </span>
                    <span className="flex flex-wrap items-center justify-end gap-1.5">
                      {hasVideo ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600">
                          <PlayCircle aria-hidden="true" size={12} />
                          含宣传片
                        </span>
                      ) : null}
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${levelTone[competition.level]}`}>
                        {competitionLevelLabels[competition.level]}
                      </span>
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg text-slate-900">{competition.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{intro.tagline}</p>
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays aria-hidden="true" className="shrink-0 text-slate-400" size={14} />
                      {competition.year} 年
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Layers aria-hidden="true" className="shrink-0 text-slate-400" size={14} />
                      {competition.tracks.length} 条赛道
                    </span>
                    <span className="col-span-2 inline-flex items-center gap-1.5">
                      <Building2 aria-hidden="true" className="shrink-0 text-slate-400" size={14} />
                      {competition.organizer ?? "主办方未填写"}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600">
                    查看简介
                    <ArrowUpRight
                      aria-hidden="true"
                      className="transition duration-[160ms] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      size={16}
                    />
                  </span>
                </SpotlightCard>
              </Link>
            );
          })}
        </section>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            title="还没有已发布的赛事"
            description="赛事发布后会在这里按年份列出，管理员可以在赛事管理里创建并发布。"
            action={user.role === "ADMIN" ? { href: "/competitions", label: "去赛事管理" } : { href: "/dashboard", label: "回到看板" }}
          />
        </section>
      )}
    </div>
  );
}
