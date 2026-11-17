import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, PlayCircle } from "lucide-react";
import { levelCardTheme } from "@/components/brand/whu-photos";
import { introContentFor } from "@/components/competitions/competition-intro-data";
import { LevelPill } from "@/components/competitions/event-tone";
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
      {/* 校史文化横幅：保留纯粹珞珈蓝与老图书馆摄影轮廓，去除玻璃气泡与英文眉标 */}
      <section className="on-dark relative isolate overflow-hidden rounded-2xl bg-[#002554] text-white">
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
              "linear-gradient(96deg, #002554 0%, rgba(0,37,84,0.94) 44%, rgba(0,37,84,0.56) 76%, rgba(0,37,84,0.25) 100%)",
          }}
        />
        <div className="relative flex flex-col justify-between gap-6 p-7 sm:p-9 lg:min-h-[214px] lg:flex-row lg:items-end lg:px-10 lg:py-9">
          <div className="max-w-xl">
            <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-[34px]">
              赛事指南与赛道全览
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-[#dce7f5]">
              先看清每项赛事的定位、赛道设置与时间节点，再选择适合团队当前阶段的赛道；点开下方卡片可阅读完整章程与宣传片。
            </p>
            {user.role === "ADMIN" ? (
              <p className="mt-2 text-xs text-white/65">
                当前仅展示已发布赛事；草稿与已下架赛事请在「赛事管理」中维护或预览。
              </p>
            ) : null}
          </div>

          <div className="flex flex-col items-start gap-2.5 lg:items-end">
            <Link
              href="/competitions"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-white px-5 text-sm font-semibold text-[#002554] transition duration-150 hover:bg-[#edf4ef] active:scale-[0.98]"
            >
              前往赛事报名
              <ArrowUpRight aria-hidden="true" size={15} />
            </Link>
            <span className="text-xs text-[#e2ecf8] tabular-nums">
              当前已开放 {competitions.length} 项年度赛事
            </span>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-baseline justify-between gap-2 pt-1">
        <h2 className="font-display text-xl font-bold text-[#0e1d17]">本学年已发布赛事</h2>
        <span className="text-xs text-[#5b6a64]">按国赛、省赛与校内培育体系区分校园色阶</span>
      </div>

      {competitions.length ? (
        <section aria-label="赛事简介目录" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {competitions.map((competition) => {
            const intro = introContentFor(competition.seriesId);
            const cardTheme = levelCardTheme(competition.level);
            const hasVideo = competition.attachments.some(
              (file) => file.kind === "VIDEO" || VIDEO_FILE.test(file.fileName),
            );

            return (
              <Link
                key={competition.id}
                href={detailHref("/intro", competition.id, "/intro")}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border transition duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#002554]"
                style={{
                  backgroundColor: cardTheme.surface,
                  borderColor: cardTheme.border,
                }}
              >
                {/* 独立无遮罩校园实景建筑画窗，保留照片清透细节 */}
                <div className="relative h-40 w-full overflow-hidden bg-[#dbe3df]">
                  <Image
                    alt={cardTheme.photoCaption}
                    className="object-cover object-center"
                    fill
                    src={cardTheme.photo}
                    unoptimized
                  />
                </div>

                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <LevelPill className="px-2.5 py-0.5 text-xs font-semibold" level={competition.level} />
                    {hasVideo ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-0.5 text-xs font-medium text-[#115740]">
                        <PlayCircle aria-hidden="true" size={12} />
                        含宣传片
                      </span>
                    ) : null}
                  </div>

                  <h3
                    className={`mt-3 ${cardTheme.titleFontClass} leading-snug`}
                    style={{ color: cardTheme.titleInk }}
                  >
                    {competition.name}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#46554f]">{intro.tagline}</p>

                  <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-2 pt-5 text-xs text-[#4c5b55]">
                    <div className="tabular-nums">{competition.year} 赛年</div>
                    <div className="tabular-nums">{competition.tracks.length} 条赛道</div>
                    <div className="col-span-2 truncate font-medium text-[#36453f]">
                      主办：{competition.organizer ?? "未填写"}
                    </div>
                  </dl>

                  <div className="mt-4 flex items-center justify-between border-t border-black/[0.08] pt-3">
                    <span className="text-xs text-[#677770]">{cardTheme.photoCaption}</span>
                    <span
                      className="inline-flex items-center gap-1 text-xs font-semibold"
                      style={{ color: cardTheme.titleInk }}
                    >
                      查阅简章
                      <ArrowUpRight
                        aria-hidden="true"
                        className="transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
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

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#d5e2db] bg-white/90 px-5 py-4">
        <p className="text-sm text-[#46554f]">
          <strong className="font-semibold text-[#10201a]">不确定选哪条赛道？</strong>
          <span className="ml-2">点进任意赛事查看「赛道与组别对照表」，或向赛事 AI 助手核对学院限项规则。</span>
        </p>
        <Link
          href="/assistant"
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-[#7f9384] bg-white px-4 text-xs font-semibold text-[#002554] transition hover:bg-[#f7faf8]"
        >
          打开赛事 AI 问答 →
        </Link>
      </div>
    </div>
  );
}
