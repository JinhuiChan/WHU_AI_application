import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma, TeamPostStatus } from "@prisma/client";
import { WhuSeal, WhuTitleRule } from "@/components/brand/whu-motifs";
import { Pagination } from "@/components/data/pagination";
import { detailHref, listHref } from "@/components/data/list-link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHead } from "@/components/ui/section-head";
import { StatusBadge } from "@/components/ui/status-badge";
import { getActiveUser } from "@/lib/auth.server";
import { firstParam, optionalText, pageParams } from "@/lib/list-query";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "组队广场" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const postSelect = {
  id: true,
  title: true,
  summary: true,
  skills: true,
  memberLimit: true,
  currentCount: true,
  status: true,
  expiresAt: true,
  author: { select: { id: true, name: true, college: true } },
  competition: { select: { id: true, name: true, year: true } },
  track: { select: { id: true, name: true } },
} satisfies Prisma.TeamPostSelect;

type TeamPost = Prisma.TeamPostGetPayload<{ select: typeof postSelect }>;

const statusLabels: Record<TeamPostStatus, string> = {
  RECRUITING: "招募中",
  FULL: "已满员",
  CLOSED: "已关闭",
  EXPIRED: "已过期",
};

const filterControlClass =
  "h-10 rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition-colors focus:border-[#115740] focus-visible:ring-2 focus-visible:ring-[#115740]/20";

function skillList(value: string) {
  return value.split(/[,，、;；\n]/).map((item) => item.trim()).filter(Boolean);
}

function TeamCard({ post, from, now }: { post: TeamPost; from: string; now: number }) {
  const days = Math.max(0, Math.ceil((post.expiresAt.getTime() - now) / 86400000));
  const skills = skillList(post.skills);
  const ratio = post.memberLimit > 0 ? Math.min(1, Math.max(0, post.currentCount / post.memberLimit)) : 0;
  const isUrgent = post.status === "RECRUITING" && days <= 3;

  return (
    <article className="flex h-full flex-col card p-5 transition duration-150 hover:border-[#7f9384] hover:shadow-[0_8px_22px_-12px_rgba(17,87,64,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-xs leading-5 text-[#54635d]">
          <p className="truncate font-medium text-[#2c3e36]">
            {post.competition ? `${post.competition.name}（${post.competition.year}）` : "未设置赛事"}
          </p>
          <p className="truncate text-[#687971]">{post.track?.name ?? "不限赛道"}</p>
        </div>
        <StatusBadge status={post.status} scope="team">
          {statusLabels[post.status]}
        </StatusBadge>
      </div>

      <h2 className="mt-3 text-base font-semibold leading-6 text-[#0f1d18]">
        <Link
          href={detailHref("/teams", post.id, from)}
          className="rounded-sm transition-colors hover:text-[#115740] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
        >
          {post.title}
        </Link>
      </h2>

      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#4a5c54]">{post.summary}</p>

      {skills.length ? (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center rounded-full border border-[#d0e0d6] bg-[#eef5f1] px-2.5 py-0.5 text-xs font-medium text-[#115740]"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-auto pt-4">
        <div className="flex items-center gap-2.5 border-t border-[#e5eee8] pt-3.5">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e3ede7] font-display text-sm font-semibold text-[#115740] ring-1 ring-[#c8dbd0]"
          >
            {Array.from(post.author.name.trim())[0] || "友"}
          </span>
          <div className="min-w-0 text-xs">
            <Link
              href={`/u/${post.author.id}`}
              className="block truncate font-medium text-[#14261f] transition-colors hover:text-[#115740] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
            >
              {post.author.name}
            </Link>
            <p className="truncate text-[#5c6c65]">{post.author.college ?? "未填写学院"}</p>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-xs text-[#54635d]">
            <span>
              招募名额{" "}
              <strong className="font-display text-sm font-semibold tabular-nums text-[#0f1d18]">
                {post.currentCount}/{post.memberLimit}
              </strong>
            </span>
            <span className={isUrgent ? "font-medium tabular-nums text-[#b45309]" : "tabular-nums"}>
              {days > 0 ? `剩余 ${days} 天` : "今天截止"}
            </span>
          </div>
          <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-[#e4eee8]">
            <div
              className={`h-full w-full origin-left rounded-full transition-transform duration-300 motion-reduce:transition-none ${
                ratio >= 1 ? "bg-[#7f9384]" : "bg-[#115740]"
              }`}
              style={{ transform: `scaleX(${ratio})` }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export default async function TeamsPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");

  const competitionId = firstParam(searchParams?.competitionId);
  const trackId = firstParam(searchParams?.trackId);
  const skill = firstParam(searchParams?.skill);
  const college = firstParam(searchParams?.college);
  const q = firstParam(searchParams?.q);
  const onlyOpen = firstParam(searchParams?.open) === "1";
  const sort = firstParam(searchParams?.sort) === "expiresAt" ? "expiresAt" : "createdAt";
  const order = firstParam(searchParams?.order) === "asc" ? "asc" : "desc";
  const rawPageSize = firstParam(searchParams?.pageSize);
  const { page, pageSize } = pageParams(firstParam(searchParams?.page), rawPageSize || "12");
  const now = new Date();

  const where: Prisma.TeamPostWhereInput = {
    removedBy: null,
    status: onlyOpen ? "RECRUITING" : { in: ["RECRUITING", "FULL"] },
    expiresAt: { gt: now },
  };
  if (onlyOpen) {
    where.AND = [
      {
        OR: Array.from({ length: 9 }, (_, index) => ({
          memberLimit: index + 2,
          currentCount: { lt: index + 2 },
        })),
      },
    ];
  }
  if (competitionId) where.competitionId = competitionId;
  if (trackId) where.trackId = trackId;
  if (optionalText(skill)) where.skills = { contains: optionalText(skill) };
  if (college) where.author = { is: { college } };
  if (optionalText(q)) {
    where.OR = [
      { title: { contains: optionalText(q) } },
      { summary: { contains: optionalText(q) } },
      { expectation: { contains: optionalText(q) } },
      { skills: { contains: optionalText(q) } },
    ];
  }

  const [data, competitions, collegeRows] = await Promise.all([
    prisma.$transaction([
      prisma.teamPost.findMany({
        where,
        orderBy: [{ [sort]: order }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: postSelect,
      }),
      prisma.teamPost.count({ where }),
    ]),
    prisma.competition.findMany({
      where: { publishStatus: "PUBLISHED" },
      select: {
        id: true,
        name: true,
        year: true,
        tracks: { where: { enabled: true }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: [{ year: "desc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      where: { deletedAt: null, college: { not: null }, teamPosts: { some: { removedBy: null } } },
      select: { college: true },
      distinct: ["college"],
      orderBy: { college: "asc" },
    }),
  ]);
  const [list, total] = data;
  const isStudent = user.role === "STUDENT";
  const from = listHref("/teams", {
    competitionId,
    trackId,
    skill,
    college,
    open: onlyOpen ? "1" : "",
    q,
    sort,
    order,
    page: page > 1 ? String(page) : "",
    pageSize: String(pageSize),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="t-page-title font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
              组队广场
            </h1>
            <WhuSeal label="跨院招募" />
          </div>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-[#54635d]">
            <WhuTitleRule />
            <span>按赛事、专长技能与院系寻访志同道合的队友，也可发布本人项目的招募计划。</span>
          </p>
        </div>
        {isStudent ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-full border-[#7f9384] px-5 text-[#1c2e26] hover:border-[#115740] hover:bg-[#f2f8f4]"
            >
              <Link href="/my/teams">我的组队</Link>
            </Button>
            <Button
              asChild
              className="h-10 rounded-full bg-[#115740] px-5 text-white hover:bg-[#0d4633] active:bg-[#093426] focus-visible:ring-[#115740]/30"
            >
              <Link href="/teams/new">发布组队帖</Link>
            </Button>
          </div>
        ) : null}
      </div>

      <section className="card p-4 sm:p-5">
        <form action="/teams" method="get" className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-[#33433d]">
            <span className="mb-1.5 block text-xs font-medium text-[#4a5c54]">赛事</span>
            <select name="competitionId" defaultValue={competitionId} className={`${filterControlClass} min-w-48`}>
              <option value="">全部赛事</option>
              {competitions.map((competition) => (
                <option key={competition.id} value={competition.id}>
                  {competition.name}（{competition.year}）
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-[#33433d]">
            <span className="mb-1.5 block text-xs font-medium text-[#4a5c54]">赛道</span>
            <select name="trackId" defaultValue={trackId} className={`${filterControlClass} min-w-40`}>
              <option value="">全部赛道</option>
              {competitions.map((competition) => (
                <optgroup key={competition.id} label={competition.name}>
                  {competition.tracks.map((track) => (
                    <option key={track.id} value={track.id}>
                      {track.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="text-sm text-[#33433d]">
            <span className="mb-1.5 block text-xs font-medium text-[#4a5c54]">技能</span>
            <input
              name="skill"
              defaultValue={skill}
              placeholder="如：前端、数据分析"
              className={`${filterControlClass} w-40`}
            />
          </label>
          <label className="text-sm text-[#33433d]">
            <span className="mb-1.5 block text-xs font-medium text-[#4a5c54]">学院</span>
            <select name="college" defaultValue={college} className={`${filterControlClass} min-w-36`}>
              <option value="">全部学院</option>
              {collegeRows.map((row) =>
                row.college ? (
                  <option key={row.college} value={row.college}>
                    {row.college}
                  </option>
                ) : null,
              )}
            </select>
          </label>
          <label className="min-w-52 flex-1 text-sm text-[#33433d]">
            <span className="mb-1.5 block text-xs font-medium text-[#4a5c54]">关键词</span>
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="搜索标题、简介或队友要求"
              className={`${filterControlClass} w-full`}
            />
          </label>
          <div className="text-sm text-[#33433d]">
            <span className="mb-1.5 block text-xs font-medium text-[#4a5c54]">排序</span>
            <div className="flex gap-2">
              <select name="sort" aria-label="排序字段" defaultValue={sort} className={filterControlClass}>
                <option value="createdAt">按发布时间</option>
                <option value="expiresAt">按截止时间</option>
              </select>
              <select name="order" aria-label="排序方向" defaultValue={order} className={filterControlClass}>
                <option value="desc">降序</option>
                <option value="asc">升序</option>
              </select>
            </div>
          </div>
          <label className="flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border border-[#7f9384] bg-white px-3.5 text-sm text-[#24362f] transition-colors hover:border-[#115740] hover:bg-[#f7faf8]">
            <input
              type="checkbox"
              name="open"
              value="1"
              defaultChecked={onlyOpen}
              className="h-4 w-4 rounded border-[#7f9384] text-[#115740] accent-[#115740] focus-visible:ring-2 focus-visible:ring-[#115740]/25"
            />
            只看还缺人
          </label>
          <input type="hidden" name="pageSize" value={pageSize} />
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              className="h-10 rounded-full bg-[#115740] px-5 text-white hover:bg-[#0d4633] active:bg-[#093426] focus-visible:ring-[#115740]/30"
            >
              筛选
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-full border-[#7f9384] px-5 text-[#24362f] hover:border-[#115740] hover:bg-[#f2f8f4]"
            >
              <Link href="/teams">重置</Link>
            </Button>
          </div>
        </form>
      </section>

      <section aria-label="组队招募列表" className="space-y-4">
        <SectionHead
          title="在招队伍"
          sub={onlyOpen ? "当前仅展示仍有空缺名额的招募队伍" : "点击标题可查阅招募要求与当前成员，向发起人提交入队申请"}
          meta={<span className="tabular-nums">共 {total} 支队伍</span>}
        />

        {list.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map((post) => (
              <TeamCard key={post.id} post={post} from={from} now={now.getTime()} />
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState
              title="暂时没有符合条件的组队帖"
              description="试试放宽筛选条件，或主动发布一篇新的组队招募吸引跨院队友。"
              action={
                isStudent
                  ? { href: "/teams/new", label: "发布组队帖" }
                  : { href: "/teams", label: "清除筛选" }
              }
            />
          </div>
        )}

        <Pagination
          basePath="/teams"
          query={{
            competitionId,
            trackId,
            skill,
            college,
            open: onlyOpen ? "1" : "",
            q,
            sort,
            order,
            pageSize: String(pageSize),
          }}
          total={total}
          page={page}
          pageSize={pageSize}
        />
      </section>
    </div>
  );
}
