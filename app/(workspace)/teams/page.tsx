import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma, TeamPostStatus } from "@prisma/client";
import { Pagination } from "@/components/data/pagination";
import { detailHref, listHref } from "@/components/data/list-link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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

function skillList(value: string) {
  return value.split(/[,，、;；\n]/).map((item) => item.trim()).filter(Boolean);
}

function TeamCard({ post, from, now }: { post: TeamPost; from: string; now: number }) {
  const days = Math.max(0, Math.ceil((post.expiresAt.getTime() - now) / 86400000));
  const skills = skillList(post.skills);
  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-xs leading-5 text-slate-500">
          {post.competition ? `${post.competition.name} · ${post.competition.year}` : "未设置赛事"}
          <span className="block truncate">{post.track?.name ?? "不限赛道"}</span>
        </p>
        <StatusBadge status={post.status} scope="team">{statusLabels[post.status]}</StatusBadge>
      </div>
      <h2 className="mt-3 text-base font-semibold leading-6 text-slate-900">
        <Link href={detailHref("/teams", post.id, from)} className="hover:text-blue-600">{post.title}</Link>
      </h2>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{post.summary}</p>
      {skills.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.map((skill) => <span key={skill} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">{skill}</span>)}
        </div>
      ) : null}
      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-600">
          {post.author.name.trim().charAt(0) || "友"}
        </span>
        <div className="min-w-0 text-xs">
                      <Link href={`/u/${post.author.id}`} className="block truncate font-medium text-slate-800 hover:text-blue-600">{post.author.name}</Link>
          <p className="truncate text-slate-500">{post.author.college ?? "未填写学院"}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>人数 <strong className="text-sm tabular-nums text-slate-800">{post.currentCount}/{post.memberLimit}</strong></span>
        <span>{days > 0 ? `剩余 ${days} 天` : "今天截止"}</span>
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
    where.AND = [{
      OR: Array.from({ length: 9 }, (_, index) => ({
        memberLimit: index + 2,
        currentCount: { lt: index + 2 },
      })),
    }];
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">组队广场</h1>
          <p className="mt-1 text-sm text-slate-500">按赛事、技能和学院寻找队友，也可以发布自己的招募计划。</p>
        </div>
        {isStudent ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href="/my/teams">我的组队</Link></Button>
            <Button asChild><Link href="/teams/new">发布组队帖</Link></Button>
          </div>
        ) : null}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form action="/teams" method="get" className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-slate-600">
            <span className="mb-1 block">赛事</span>
            <select name="competitionId" defaultValue={competitionId} className="h-10 min-w-48 rounded-lg border border-slate-300 bg-white px-3 text-sm">
              <option value="">全部赛事</option>
              {competitions.map((competition) => <option key={competition.id} value={competition.id}>{competition.name}（{competition.year}）</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            <span className="mb-1 block">赛道</span>
            <select name="trackId" defaultValue={trackId} className="h-10 min-w-40 rounded-lg border border-slate-300 bg-white px-3 text-sm">
              <option value="">全部赛道</option>
              {competitions.map((competition) => (
                <optgroup key={competition.id} label={competition.name}>
                  {competition.tracks.map((track) => <option key={track.id} value={track.id}>{track.name}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            <span className="mb-1 block">技能</span>
            <input name="skill" defaultValue={skill} placeholder="如：前端、数据分析" className="h-10 w-40 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-600" />
          </label>
          <label className="text-sm text-slate-600">
            <span className="mb-1 block">学院</span>
            <select name="college" defaultValue={college} className="h-10 min-w-36 rounded-lg border border-slate-300 bg-white px-3 text-sm">
              <option value="">全部学院</option>
              {collegeRows.map((row) => row.college ? <option key={row.college} value={row.college}>{row.college}</option> : null)}
            </select>
          </label>
          <label className="min-w-52 flex-1 text-sm text-slate-600">
            <span className="mb-1 block">关键词</span>
            <input name="q" type="search" defaultValue={q} placeholder="搜索标题、简介或队友要求" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-600" />
          </label>
          <div className="text-sm text-slate-600">
            <span className="mb-1 block">排序</span>
            <div className="flex gap-2">
              <select name="sort" aria-label="排序字段" defaultValue={sort} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm">
                <option value="createdAt">按发布时间</option>
                <option value="expiresAt">按截止时间</option>
              </select>
              <select name="order" aria-label="排序方向" defaultValue={order} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm">
                <option value="desc">降序</option>
                <option value="asc">升序</option>
              </select>
            </div>
          </div>
          <label className="flex h-10 items-center gap-2 whitespace-nowrap text-sm text-slate-600">
            <input type="checkbox" name="open" value="1" defaultChecked={onlyOpen} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
            只看还缺人
          </label>
          <input type="hidden" name="pageSize" value={pageSize} />
          <div className="flex gap-2">
            <Button type="submit" size="sm">筛选</Button>
            <Button asChild variant="outline" size="sm"><Link href="/teams">重置</Link></Button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 shadow-sm">
        {list.length ? (
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map((post) => <TeamCard key={post.id} post={post} from={from} now={now.getTime()} />)}
          </div>
        ) : (
          <div className="bg-white"><EmptyState title="暂时没有符合条件的组队帖" description="试试放宽筛选条件，或发布一篇新的组队招募。" action={isStudent ? { href: "/teams/new", label: "发布组队帖" } : { href: "/teams", label: "清除筛选" }} /></div>
        )}
        <div className="bg-white">
          <Pagination basePath="/teams" query={{ competitionId, trackId, skill, college, open: onlyOpen ? "1" : "", q, sort, order, pageSize: String(pageSize) }} total={total} page={page} pageSize={pageSize} />
        </div>
      </section>
    </div>
  );
}
