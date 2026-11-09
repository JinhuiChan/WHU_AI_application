import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Prisma, TeamPostStatus } from "@prisma/client";
import { BackLink } from "@/components/data/list-link";
import { BreadcrumbTitle } from "@/components/layout/breadcrumbs";
import { RequestDecisionButtons, TeamPostActions } from "@/components/teams/team-actions";
import { Button, ButtonArrow } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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

  return (
    <div className="space-y-6">
      <BreadcrumbTitle label={post.title} />
      <div>
        <BackLink to={from} fallback="/teams" label={backLabel} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">{post.title}</h1>
          <StatusBadge status={status} scope="team">{postStatusLabels[status]}</StatusBadge>
        </div>
        <p className="mt-2 text-sm text-slate-500">{post.competition ? `${post.competition.name} · ${post.competition.year}` : "未设置赛事"}{post.track ? ` · ${post.track.name}` : ""}</p>
      </div>

      {post.removedBy ? (
        <div role="status" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          该组队帖已下架{post.removedReason ? `：${post.removedReason}` : "。"}
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">招募说明</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{post.summary}</p>
            {post.expectation ? (
              <div className="mt-5 border-t border-slate-100 pt-5">
                <h3 className="text-sm font-semibold text-slate-900">想找的队友</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{post.expectation}</p>
              </div>
            ) : null}
            {skills.length ? (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                {skills.map((skill) => <span key={skill} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">{skill}</span>)}
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">队伍成员 <span className="ml-1 font-normal tabular-nums text-slate-500">{post.currentCount}/{post.memberLimit}</span></h2>
            <ul className="mt-4 space-y-3">
              <li className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-medium text-blue-700">{post.author.name.trim().charAt(0) || "友"}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${post.author.id}`} className="text-sm font-medium text-slate-900 hover:text-blue-600">{post.author.name}</Link>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{post.author.college ?? "未填写学院"}{post.author.major ? ` · ${post.author.major}` : ""}</p>
                </div>
                <span className="text-xs text-slate-500">发起人</span>
              </li>
              {acceptedRequests.map((request) => (
                <li key={request.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-600">{request.user.name.trim().charAt(0) || "员"}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/u/${request.user.id}`} className="text-sm font-medium text-slate-900 hover:text-blue-600">{request.user.name}</Link>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{request.user.college ?? "未填写学院"}{request.user.major ? ` · ${request.user.major}` : ""}</p>
                  </div>
                  <span className="text-xs text-slate-500">成员 · {formatDate((request.handledAt ?? request.createdAt).toISOString())}加入</span>
                </li>
              ))}
            </ul>
          </section>

          {canManage || visibleRequests.length ? (
            <section id="applications" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900">{canManage ? "管理申请" : "我的申请"}</h2>
                {canManage ? <span className="text-xs text-slate-500">{post._count.requests} 条待处理</span> : null}
              </div>
              {visibleRequests.length ? (
                <ul className="mt-4 space-y-3">
                  {visibleRequests.map((request) => (
                    <li key={request.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-600">{request.user.name.trim().charAt(0) || "申"}</span>
                          <div className="min-w-0">
                            <Link href={`/u/${request.user.id}`} className="text-sm font-medium text-slate-900 hover:text-blue-600">{request.user.name}</Link>
                            <p className="mt-0.5 text-xs text-slate-500">{request.user.college ?? "未填写学院"}{request.user.major ? ` · ${request.user.major}` : ""}{request.user.grade ? ` · ${request.user.grade}` : ""}</p>
                          </div>
                        </div>
                        <StatusBadge status={request.status} scope="team">{joinStatusLabels[request.status]}</StatusBadge>
                      </div>
                      {request.message ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{request.message}</p> : <p className="mt-3 text-sm text-slate-400">未填写申请留言</p>}
                      <p className="mt-2 text-xs text-slate-400">申请于 {formatDateTime(request.createdAt.toISOString())}{request.handledAt ? ` · 处理于 ${formatDateTime(request.handledAt.toISOString())}` : ""}</p>
                      {canManage && request.status === "PENDING" ? <RequestDecisionButtons postId={post.id} requestId={request.id} /> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="还没有入队申请" description="有新申请时会显示在这里。" />
              )}
            </section>
          ) : null}
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">招募信息</h2>
            <StatusBadge status={status} scope="team">{postStatusLabels[status]}</StatusBadge>
          </div>
          <dl className="mt-4 space-y-4 text-sm">
            <div><dt className="text-xs text-slate-500">赛事</dt><dd className="mt-1 text-slate-900">{post.competition ? <Link href={`/competitions/${post.competition.id}`} className="hover:text-blue-600">{post.competition.name}（{post.competition.year}）</Link> : "未设置赛事"}</dd></div>
            <div><dt className="text-xs text-slate-500">赛道</dt><dd className="mt-1 text-slate-900">{post.track?.name ?? "不限赛道"}</dd></div>
            <div className="grid grid-cols-2 gap-3">
              <div><dt className="text-xs text-slate-500">当前人数</dt><dd className="mt-1 font-medium tabular-nums text-slate-900">{post.currentCount}/{post.memberLimit}</dd></div>
              <div><dt className="text-xs text-slate-500">还缺人数</dt><dd className="mt-1 font-medium tabular-nums text-slate-900">{Math.max(0, post.memberLimit - post.currentCount)}</dd></div>
            </div>
            <div><dt className="text-xs text-slate-500">招募范围</dt><dd className="mt-1 text-slate-900">{post.requirement || "全部"}</dd></div>
            <div><dt className="text-xs text-slate-500">截止时间</dt><dd className="mt-1 text-slate-900">{formatDateTime(post.expiresAt.toISOString())}</dd></div>
            <div><dt className="text-xs text-slate-500">发布时间</dt><dd className="mt-1 text-slate-900">{formatDate(post.createdAt.toISOString())}</dd></div>
            {post.contact ? <div><dt className="text-xs text-slate-500">联系方式</dt><dd className="mt-1 whitespace-pre-wrap break-words text-slate-900">{post.contact}</dd></div> : null}
          </dl>
          <div className="mt-5">
            {(isAuthor || isAcceptedMember) && post.competition ? (
              <Button asChild arrow className="group mb-3 w-full">
                <Link href={`/apply?competitionId=${post.competition.id}&teamPostId=${post.id}`}>去报名<ButtonArrow /></Link>
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
