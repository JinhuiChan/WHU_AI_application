import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Building2, CalendarDays, Layers, PlayCircle } from "lucide-react";
import { WhuRoofDivider, WhuSeal } from "@/components/brand/whu-motifs";
import { introContentFor } from "@/components/competitions/competition-intro-data";
import { eventTone, LevelPill } from "@/components/competitions/event-tone";
import { detailHref } from "@/components/data/list-link";
import { EmptyState } from "@/components/ui/empty-state";
import { getActiveUser } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";
import introHero from "../../../public/images/intro-hero.webp";

export const metadata: Metadata = { title: "赛事简介" };
export const dynamic = "force-dynamic";

const VIDEO_FILE = /\.(mp4|webm|mov|m4v|ogv)$/i;

export default async function CompetitionIntroPage() {
  const user = await getActiveUser();
  if (!user) redirect("/login");

  // 简介页是对外展示页：草稿/已下架一律不出现，管理员也不例外。
  const competitions = await prisma.competition.findMany({
    where: { publishStatus: "PUBLISHED" },
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
      {/* 校史文化横幅：老图书馆琉璃瓦实景插画 + 珞珈蓝渐变护字层 + 思源宋体主标题 */}
      <section className="on-dark relative isolate overflow-hidden rounded-2xl bg-[#002554] text-white ring-1 ring-inset ring-white/10">
        <Image
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none object-cover object-[72%_42%]"
          fill
          priority
          src={introHero}
          unoptimized
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(102deg, rgba(0,26,61,0.96) 0%, rgba(0,37,84,0.88) 40%, rgba(0,37,84,0.45) 68%, rgba(17,87,64,0.18) 100%)",
          }}
        />
        <div className="relative flex flex-col justify-between gap-6 p-6 sm:p-8 lg:min-h-[248px] lg:flex-row lg:items-end lg:p-10">
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-3">
              <WhuSeal
                className="border-white/25 bg-white/10 text-white backdrop-blur-sm [&>span:last-child]:text-white/75"
                label="珞珈科创"
                sub="WHU ARCHIVE"
              />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8fd1ba]">
                LUOJIA COMPETITION GUIDE
              </span>
            </div>
            <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              赛事指南与赛道全览
            </h1>
            <p className="mt-2.5 max-w-lg text-sm leading-6 text-white/80">
              先看清每项赛事的定位、赛道设置与时间节点，再选择适合团队的赛道报名。点开卡片阅读完整章程与宣传片。
            </p>
            {user.role === "ADMIN" ? (
              <p className="mt-2 text-xs text-white/60">
                当前仅展示已发布赛事；草稿与已下架赛事请在「赛事管理」中维护或预览。
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-xs text-white/90 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6ee7b7]" />
              已开放发布
              <span className="font-mono font-semibold text-white tabular-nums">{competitions.length}</span> 项
            </span>
            <Link
              href="/competitions"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-white px-5 text-sm font-medium text-[#002554] shadow-sm transition duration-150 hover:bg-[#f7f5f0] active:scale-[0.98]"
            >
              前往赛事报名
              <ArrowUpRight aria-hidden="true" size={15} />
            </Link>
          </div>
        </div>
      </section>

      <WhuRoofDivider />

      {competitions.length ? (
        <section aria-label="赛事简介目录" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {competitions.map((competition, idx) => {
            const intro = introContentFor(competition.seriesId);
            const tone = eventTone(competition.level);
            const hasVideo = competition.attachments.some(
              (file) => file.kind === "VIDEO" || VIDEO_FILE.test(file.fileName),
            );
            const indexLabel = String(idx + 1).padStart(2, "0");

            return (
              <Link
                key={competition.id}
                href={detailHref("/intro", competition.id, "/intro")}
                className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-[#e5e0d5] bg-white transition duration-150 ease-out hover:border-[#002554]/35 hover:shadow-md hover:shadow-[#002554]/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#002554]"
              >
                {/* 顶部 2px 等级识别细线，对应全站赛事色标 */}
                <div aria-hidden="true" className="h-[2.5px] w-full" style={{ backgroundColor: tone.from }} />

                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-medium tracking-[0.16em] text-slate-400">
                      ARCHIVE · {indexLabel}
                    </span>
                    <span className="flex flex-wrap items-center justify-end gap-1.5">
                      {hasVideo ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#f2efe8] px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          <PlayCircle aria-hidden="true" size={12} className="text-[#115740]" />
                          含宣传片
                        </span>
                      ) : null}
                      <LevelPill className="px-2.5 py-0.5 text-xs font-medium" level={competition.level} />
                    </span>
                  </div>

                  <div className="mt-4">
                    <h2 className="font-display text-xl font-semibold leading-snug text-slate-900 transition-colors group-hover:text-[#002554]">
                      {competition.name}
                    </h2>
                    <p className="mt-2.5 text-sm leading-6 text-slate-600">{intro.tagline}</p>
                  </div>

                  <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[#e5e0d5] pt-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays aria-hidden="true" className="shrink-0 text-slate-400" size={14} />
                      <span className="font-mono tabular-nums">{competition.year}</span>
                      <span>赛年</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers aria-hidden="true" className="shrink-0 text-slate-400" size={14} />
                      <span className="font-mono tabular-nums">{competition.tracks.length}</span>
                      <span>条赛道</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5 truncate">
                      <Building2 aria-hidden="true" className="shrink-0 text-slate-400" size={14} />
                      <span className="truncate">{competition.organizer ?? "主办方未填写"}</span>
                    </div>
                  </dl>

                  <div className="mt-4 flex items-center justify-between border-t border-dashed border-[#e5e0d5] pt-3">
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-400">
                      {tone.eyebrow}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#002554]">
                      查阅简章
                      <ArrowUpRight
                        aria-hidden="true"
                        className="transition duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        size={14}
                      />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      ) : (
        <section className="card">
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
