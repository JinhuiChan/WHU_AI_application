import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Prisma, TeamPostStatus } from "@prisma/client";
import { WhuTitleRule } from "@/components/brand/whu-motifs";
import { BackLink } from "@/components/data/list-link";
import { BreadcrumbTitle } from "@/components/layout/breadcrumbs";
import { RequestDecisionButtons, TeamPostActions } from "@/components/teams/team-actions";
import { Button, ButtonArrow } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHead, SectionRule } from "@/components/ui/section-head";
import { StatusBadge } from "@/components/ui/status-badge";
import { getActiveUser } from "@/lib/auth.server";
import { firstParam } from "@/lib/list-query";
import { formatDate, formatDateTime } from "@/lib/presentation";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "组队详情" };
export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

const postStatusLabels: Record<TeamPostStatus, string> = {
  RECRUITING: "招募中",
  FULL: "已满员",
  CLOSED: "已关闭",
  EXPIRED: "已过期",
};

const joinStatusLabels = {
  PENDING: "待处理",
  ACCEPTED: "已接受",
  DECLINED: "已婉拒",
  CANCELLED: "已取消",
  LEFT: "已退出",
} as const;

function skillList(value: string) {
  return value.split(/[,，、;；\n]/).map((item) => item.trim()).filter(Boolean);
}

export default async function TeamDetailPage({ params, searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");

  const post = await prisma.teamPost.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      authorId: true,
      title: true,
      summary: true,
      expectation: true,
      skills: true,
      memberLimit: true,
      currentCount: true,
      requirement: true,
      contact: true,
      status: true,
      expiresAt: true,
      removedBy: true,
      removedReason: true,
      createdAt: true,
      author: { select: { id: true, name: true, college: true, major: true } },
      competition: { select: { id: true, name: true, year: true } },
      track: { select: { id: true, name: true } },
      _count: { select: { requests: { where: { status: "PENDING" } } } },
    } satisfies Prisma.TeamPostSelect,
  });
  const isAdmin = user.roles.includes("ADMIN");
  if (!post || (post.removedBy && !isAdmin)) notFound();

  const isAuthor = post.authorId === user.id;
  const canManage = isAuthor || isAdmin;
  const requestSelect = {
    id: true,
    postId: true,
    message: true,
    status: true,
    handledAt: true,
    createdAt: true,
    user: { select: { id: true, name: true, studentNo: true, college: true, major: true, grade: true } },
  } satisfies Prisma.TeamJoinRequestSelect;
  const [acceptedRequests, visibleRequests] = await Promise.all([
    prisma.teamJoinRequest.findMany({
      where: { postId: post.id, status: "ACCEPTED" },
      select: requestSelect,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.teamJoinRequest.findMany({
      where: { postId: post.id, ...(canManage ? {} : { userId: user.id }) },
      select: requestSelect,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    }),
  ]);

  const now = new Date();
  const status: TeamPostStatus = post.status === "RECRUITING" && post.expiresAt <= now ? "EXPIRED" : post.status;
  const myLatestRequest = canManage ? null : visibleRequests[0];
  const isAcceptedMember = acceptedRequests.some((request) => request.user.id === user.id);
  const requestActive = myLatestRequest?.status === "PENDING" || myLatestRequest?.status === "ACCEPTED";
  const canApply = !post.removedBy && status === "RECRUITING" && post.currentCount < post.memberLimit && !requestActive;
  const from = firstParam(searchParams?.from);
  const backLabel = from.startsWith("/my/teams") ? "返回我的组队" : "返回组队广场";
  const skills = skillList(post.skills);
  const ratio = post.memberLimit > 0 ? Math.min(1, Math.max(0, post.currentCount / post.memberLimit)) : 0;

  return (
    <div className="space-y-5">
      <BreadcrumbTitle label={post.title} />
      <div>
        <BackLink to={from} fallback="/teams" label={backLabel} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="t-page-title font-display text-[24px] font-bold tracking-tight text-[#0e1d17] sm:text-[26px]">
            {post.title}
          </h1>
          <StatusBadge status={status} scope="team">
            {postStatusLabels[status]}
          </StatusBadge>
        </div>
        <p className="mt-2 flex items-center gap-2 text-sm text-[#54635d]">
          <WhuTitleRule />
          <span>
            {post.competition ? `${post.competition.name}（${post.competition.year}）` : "未设置赛事"}
            {post.track ? `，${post.track.name}` : ""}
          </span>
        </p>
      </div>

      {post.removedBy ? (
        <div role="status" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          该组队帖已下架{post.removedReason ? `：${post.removedReason}` : "。"}
        </div>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_316px]">
        <div className="min-w-0 space-y-5">
          <section className="card p-5 sm:p-6">
            <SectionHead title="招募说明" sub="项目方向、已有进展与理想队友要求" />
            <SectionRule className="mt-3.5" />
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#1f3029]">{post.summary}</p>
            {post.expectation ? (
              <div className="mt-5 border-t border-[#e5eee8] pt-5">
                <h3 className="text-sm font-semibold text-[#0f1d18]">想找的队友</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#1f3029]">{post.expectation}</p>
              </div>
            ) : null}
            {skills.length ? (
              <div className="mt-5 border-t border-[#e5eee8] pt-4">
                <span className="t-label block text-xs text-[#5c6c65]">所需专长技能</span>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-full border border-[#d0e0d6] bg-[#eef5f1] px-3 py-1 text-xs font-medium text-[#115740]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="card p-5 sm:p-6">
            <SectionHead
              title="队伍成员"
              sub="发起人与已通过入队申请的正式成员"
              meta={
                <span className="inline-flex items-center rounded-full border border-[#d0e0d6] bg-[#eef5f1] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-[#115740]">
                  {post.currentCount}/{post.memberLimit} 人
                </span>
              }
            />
            <div aria-hidden="true" className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-[#e4eee8]">
              <div
                className={`h-full w-full origin-left rounded-full transition-transform duration-300 motion-reduce:transition-none ${
                  ratio >= 1 ? "bg-[#7f9384]" : "bg-[#115740]"
                }`}
                style={{ transform: `scaleX(${ratio})` }}
              />
            </div>

            <ul className="mt-4 space-y-2.5">
              <li className="flex items-center gap-3 rounded-xl border border-[#d5e2db] bg-[#f8fbf9] px-3.5 py-3">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#c59b45]/65 bg-[#115740] font-display text-sm font-semibold text-[#f3e3b3]"
                >
                  {Array.from(post.author.name.trim())[0] || "友"}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/u/${post.author.id}`}
                    className="rounded-sm text-sm font-semibold text-[#0f1d18] transition-colors hover:text-[#115740] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
                  >
                    {post.author.name}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-[#5c6c65]">
                    {post.author.college ?? "未填写学院"}
                    {post.author.major ? `，${post.author.major}` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-[#dfc890] bg-[#fcf7eb] px-2.5 py-0.5 text-xs font-medium text-[#7d5914]">
                  发起人
                </span>
              </li>

              {acceptedRequests.map((request) => (
                <li
                  key={request.id}
                  className="flex items-center gap-3 rounded-xl border border-[#d5e2db] bg-[#f8fbf9] px-3.5 py-3"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e3ede7] font-display text-sm font-semibold text-[#115740] ring-1 ring-[#c8dbd0]"
                  >
                    {Array.from(request.user.name.trim())[0] || "员"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/u/${request.user.id}`}
                      className="rounded-sm text-sm font-medium text-[#0f1d18] transition-colors hover:text-[#115740] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
                    >
                      {request.user.name}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-[#5c6c65]">
                      {request.user.college ?? "未填写学院"}
                      {request.user.major ? `，${request.user.major}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-[#5c6c65]">
                    成员（{formatDate((request.handledAt ?? request.createdAt).toISOString())} 加入）
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {canManage || visibleRequests.length ? (
            <section id="applications" className="card p-5 sm:p-6">
              <SectionHead
                title={canManage ? "管理申请" : "我的申请"}
                sub={canManage ? "查阅申请留言并及时作出入队决定" : "你在本招募帖提交的入队申请记录"}
                meta={
                  canManage ? (
                    <span className="inline-flex items-center rounded-full bg-[#eef5f1] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-[#115740]">
                      {post._count.requests} 条待处理
                    </span>
                  ) : undefined
                }
              />
              <SectionRule className="mt-3.5" />
              {visibleRequests.length ? (
                <ul className="mt-4 space-y-3">
                  {visibleRequests.map((request) => (
                    <li key={request.id} className="rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e3ede7] font-display text-sm font-semibold text-[#115740] ring-1 ring-[#c8dbd0]"
                          >
                            {Array.from(request.user.name.trim())[0] || "申"}
                          </span>
                          <div className="min-w-0">
                            <Link
                              href={`/u/${request.user.id}`}
                              className="rounded-sm text-sm font-medium text-[#0f1d18] transition-colors hover:text-[#115740] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
                            >
                              {request.user.name}
                            </Link>
                            <p className="mt-0.5 text-xs text-[#5c6c65]">
                              {request.user.college ?? "未填写学院"}
                              {request.user.major ? `，${request.user.major}` : ""}
                              {request.user.grade ? `（${request.user.grade}）` : ""}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={request.status} scope="team">
                          {joinStatusLabels[request.status]}
                        </StatusBadge>
                      </div>
                      {request.message ? (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#24362f]">{request.message}</p>
                      ) : (
                        <p className="mt-3 text-sm text-[#6c7e76]">未填写申请留言</p>
                      )}
                      <p className="mt-2 text-xs tabular-nums text-[#6c7e76]">
                        申请于 {formatDateTime(request.createdAt.toISOString())}
                        {request.handledAt ? `，处理于 ${formatDateTime(request.handledAt.toISOString())}` : ""}
                      </p>
                      {canManage && request.status === "PENDING" ? (
                        <RequestDecisionButtons postId={post.id} requestId={request.id} />
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="还没有入队申请" description="有新申请时会显示在这里。" />
              )}
            </section>
          ) : null}
        </div>

        <aside className="card p-5 lg:sticky lg:top-24">
          <SectionHead
            title="招募信息"
            meta={
              <StatusBadge status={status} scope="team">
                {postStatusLabels[status]}
              </StatusBadge>
            }
          />
          <SectionRule className="mt-3.5" />

          <dl className="mt-4 space-y-3.5 text-sm">
            <div>
              <dt className="t-label text-xs text-[#5c6c65]">赛事</dt>
              <dd className="mt-1 font-medium text-[#0f1d18]">
                {post.competition ? (
                  <Link
                    href={`/competitions/${post.competition.id}`}
                    className="rounded-sm transition-colors hover:text-[#115740] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
                  >
                    {post.competition.name}（{post.competition.year}）
                  </Link>
                ) : (
                  "未设置赛事"
                )}
              </dd>
            </div>
            <div>
              <dt className="t-label text-xs text-[#5c6c65]">赛道</dt>
              <dd className="mt-1 text-[#0f1d18]">{post.track?.name ?? "不限赛道"}</dd>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-3">
              <div>
                <dt className="t-label text-xs text-[#5c6c65]">当前人数</dt>
                <dd className="mt-1 font-display text-lg font-bold tabular-nums text-[#0f1d18]">
                  {post.currentCount}/{post.memberLimit}
                </dd>
              </div>
              <div>
                <dt className="t-label text-xs text-[#5c6c65]">还缺名额</dt>
                <dd className="mt-1 font-display text-lg font-bold tabular-nums text-[#115740]">
                  {Math.max(0, post.memberLimit - post.currentCount)}
                </dd>
              </div>
            </div>
            <div>
              <dt className="t-label text-xs text-[#5c6c65]">招募范围</dt>
              <dd className="mt-1 text-[#0f1d18]">{post.requirement || "全部"}</dd>
            </div>
            <div>
              <dt className="t-label text-xs text-[#5c6c65]">截止时间</dt>
              <dd className="mt-1 tabular-nums text-[#0f1d18]">{formatDateTime(post.expiresAt.toISOString())}</dd>
            </div>
            <div>
              <dt className="t-label text-xs text-[#5c6c65]">发布时间</dt>
              <dd className="mt-1 tabular-nums text-[#0f1d18]">{formatDate(post.createdAt.toISOString())}</dd>
            </div>
            {post.contact ? (
              <div>
                <dt className="t-label text-xs text-[#5c6c65]">联系方式</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words text-[#0f1d18]">{post.contact}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-5">
            {(isAuthor || isAcceptedMember) && post.competition ? (
              <Button
                asChild
                arrow
                className="group mb-3 h-10 w-full rounded-full bg-[#115740] text-white hover:bg-[#0d4633] active:bg-[#093426] focus-visible:ring-[#115740]/30"
              >
                <Link href={`/apply?competitionId=${post.competition.id}&teamPostId=${post.id}`}>
                  去报名
                  <ButtonArrow />
                </Link>
              </Button>
            ) : null}
            <TeamPostActions
              postId={post.id}
              status={status}
              isAuthor={isAuthor}
              isAdmin={isAdmin}
              isStudent={user.role === "STUDENT"}
              removed={Boolean(post.removedBy)}
              canApply={canApply}
              existingRequestStatus={myLatestRequest?.status}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
