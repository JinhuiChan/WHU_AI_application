"use client";

import Link from "next/link";
import type { TeamJoinStatus, TeamPostStatus } from "@prisma/client";
import { detailHref } from "@/components/data/list-link";
import { RequestDecisionButtons } from "@/components/teams/team-actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/presentation";

export type MyTeamPost = {
  id: string;
  title: string;
  summary: string;
  skills: string;
  memberLimit: number;
  currentCount: number;
  status: TeamPostStatus;
  expiresAt: string;
  createdAt: string;
  removedBy: string | null;
  competition: { id: string; name: string; year: number } | null;
  track: { id: string; name: string } | null;
};

export type IncomingTeamRequest = {
  id: string;
  message: string;
  status: TeamJoinStatus;
  createdAt: string;
  handledAt: string | null;
  user: { id: string; name: string; studentNo: string | null; college: string | null; major: string | null };
  post: MyTeamPost;
};

export type OutgoingTeamRequest = {
  id: string;
  message: string;
  status: TeamJoinStatus;
  createdAt: string;
  handledAt: string | null;
  post: MyTeamPost;
};

type Tab = "posts" | "received" | "sent";

const postStatusLabels: Record<TeamPostStatus, string> = {
  RECRUITING: "招募中",
  FULL: "已满员",
  CLOSED: "已关闭",
  EXPIRED: "已过期",
};

const joinStatusLabels: Record<TeamJoinStatus, string> = {
  PENDING: "待处理",
  ACCEPTED: "已接受",
  DECLINED: "已婉拒",
  CANCELLED: "已取消",
  LEFT: "已退出",
};

function skillList(value: string) {
  return value.split(/[,，、;；\n]/).map((item) => item.trim()).filter(Boolean);
}

function visibleStatus(post: Pick<MyTeamPost, "status" | "expiresAt">): TeamPostStatus {
  return post.status === "RECRUITING" && new Date(post.expiresAt).getTime() <= Date.now() ? "EXPIRED" : post.status;
}

function PostCard({ post, from }: { post: MyTeamPost; from: string }) {
  const status = visibleStatus(post);
  const skills = skillList(post.skills);
  const ratio = post.memberLimit > 0 ? Math.min(1, Math.max(0, post.currentCount / post.memberLimit)) : 0;

  return (
    <article className="flex h-full flex-col card p-5 transition duration-150 hover:border-[#7f9384] hover:shadow-[0_8px_22px_-12px_rgba(17,87,64,0.16)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-xs leading-5 text-[#54635d]">
          <p className="truncate font-medium text-[#2c3e36]">
            {post.competition ? `${post.competition.name}（${post.competition.year}）` : "未设置赛事"}
          </p>
          <p className="truncate text-[#687971]">{post.track?.name ?? "不限赛道"}</p>
        </div>
        <StatusBadge status={status} scope="team">
          {postStatusLabels[status]}
        </StatusBadge>
      </div>

      <h2 className="mt-3 text-base font-semibold leading-6 text-[#0f1d18]">
        {post.removedBy ? (
          post.title
        ) : (
          <Link
            href={detailHref("/teams", post.id, from)}
            className="rounded-sm transition-colors hover:text-[#115740] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
          >
            {post.title}
          </Link>
        )}
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

      <div className="mt-auto space-y-2 border-t border-[#e5eee8] pt-3.5 [margin-top:1rem]">
        <div className="flex items-center justify-between gap-3 text-xs text-[#54635d]">
          <span>
            招募名额{" "}
            <strong className="font-display text-sm font-semibold tabular-nums text-[#0f1d18]">
              {post.currentCount}/{post.memberLimit}
            </strong>
          </span>
          <span className="tabular-nums">截止 {formatDateTime(post.expiresAt)}</span>
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

      {post.removedBy ? <p className="mt-2.5 text-xs font-medium text-red-700">帖子已下架</p> : null}
    </article>
  );
}

export function MyTeams({
  activeTab,
  posts,
  received,
  sent,
}: {
  activeTab: Tab;
  posts: MyTeamPost[];
  received: IncomingTeamRequest[];
  sent: OutgoingTeamRequest[];
}) {
  const pendingCount = received.filter((request) => request.status === "PENDING").length;
  const from = `/my/teams?tab=${activeTab}`;
  const tabs: Array<{ key: Tab; label: string; count: string }> = [
    { key: "posts", label: "我发布的", count: String(posts.length) },
    { key: "received", label: "收到的申请", count: `${pendingCount} 待处理` },
    { key: "sent", label: "我发出的", count: String(sent.length) },
  ];
  const orderedReceived = [...received].sort((a, b) => Number(b.status === "PENDING") - Number(a.status === "PENDING"));

  return (
    <div className="space-y-5">
      <nav aria-label="我的组队分类" className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <Link
              key={tab.key}
              href={`/my/teams?tab=${tab.key}`}
              aria-current={active ? "page" : undefined}
              className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition duration-150 active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740] ${
                active
                  ? "border-[#115740] bg-[#115740] text-white"
                  : "border-[#7f9384] bg-white text-[#24362f] hover:border-[#115740] hover:bg-[#f2f8f4]"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                  active
                    ? "bg-white/20 text-white"
                    : tab.key === "received" && pendingCount
                      ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                      : "bg-[#eef5f1] text-[#4a5c54]"
                }`}
              >
                {tab.count}
              </span>
            </Link>
          );
        })}
      </nav>

      {activeTab === "posts" ? (
        posts.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} from={from} />
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyState
              title="你还没有发布组队帖"
              description="介绍项目方向与需要的队友，让合适的同学找到你。"
              action={{ href: "/teams/new", label: "发布组队帖" }}
            />
          </div>
        )
      ) : null}

      {activeTab === "received" ? (
        received.length ? (
          <ul className="space-y-4">
            {orderedReceived.map((request) => (
              <li key={request.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e3ede7] font-display text-sm font-semibold text-[#115740] ring-1 ring-[#c8dbd0]"
                    >
                      {Array.from(request.user.name.trim())[0] || "申"}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/u/${request.user.id}`}
                        className="rounded-sm font-medium text-[#0f1d18] transition-colors hover:text-[#115740] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
                      >
                        {request.user.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-[#5c6c65]">
                        {request.user.college ?? "未填写学院"}
                        {request.user.major ? `，${request.user.major}` : ""}
                        {request.user.studentNo ? `（${request.user.studentNo}）` : ""}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={request.status} scope="team">
                    {joinStatusLabels[request.status]}
                  </StatusBadge>
                </div>

                <div className="mt-4 rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-3.5 text-sm">
                  <p className="text-xs font-medium text-[#5c6c65]">申请加入队伍</p>
                  {request.post.removedBy ? (
                    <p className="mt-1 font-medium text-[#33433d]">{request.post.title}</p>
                  ) : (
                    <Link
                      href={detailHref("/teams", request.post.id, from)}
                      className="mt-1 inline-block rounded-sm font-semibold text-[#0f1d18] transition-colors hover:text-[#115740] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
                    >
                      {request.post.title}
                    </Link>
                  )}
                  <p className="mt-2 whitespace-pre-wrap leading-6 text-[#24362f]">
                    {request.message || "未填写申请留言"}
                  </p>
                </div>

                <p className="mt-3 text-xs tabular-nums text-[#6c7e76]">
                  申请于 {formatDateTime(request.createdAt)}
                  {request.handledAt ? `，处理于 ${formatDateTime(request.handledAt)}` : ""}
                </p>

                {request.status === "PENDING" ? (
                  <RequestDecisionButtons postId={request.post.id} requestId={request.id} />
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="card">
            <EmptyState
              title="还没有收到入队申请"
              description="学生申请你发布的组队帖后，会显示在这里。"
              action={{ href: "/my/teams?tab=posts", label: "查看我发布的" }}
            />
          </div>
        )
      ) : null}

      {activeTab === "sent" ? (
        sent.length ? (
          <ul className="space-y-4">
            {sent.map((request) => {
              const postStatus = visibleStatus(request.post);
              return (
                <li key={request.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-[#5c6c65]">
                        {request.post.competition?.name ?? "未设置赛事"}，{request.post.track?.name ?? "不限赛道"}
                      </p>
                      {request.post.removedBy ? (
                        <h2 className="mt-1 font-semibold text-[#33433d]">{request.post.title}</h2>
                      ) : (
                        <Link
                          href={detailHref("/teams", request.post.id, from)}
                          className="mt-1 inline-block rounded-sm font-semibold text-[#0f1d18] transition-colors hover:text-[#115740] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
                        >
                          {request.post.title}
                        </Link>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={postStatus} scope="team">
                        {postStatusLabels[postStatus]}
                      </StatusBadge>
                      <StatusBadge status={request.status} scope="team">
                        {joinStatusLabels[request.status]}
                      </StatusBadge>
                    </div>
                  </div>
                  <p className="mt-3 rounded-xl border border-[#e3ede7] bg-[#f8fbf9] px-3.5 py-2.5 whitespace-pre-wrap text-sm leading-6 text-[#24362f]">
                    {request.message || "未填写申请留言"}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e5eee8] pt-3">
                    <p className="text-xs tabular-nums text-[#6c7e76]">
                      申请于 {formatDateTime(request.createdAt)}
                      {request.handledAt ? `，处理于 ${formatDateTime(request.handledAt)}` : ""}
                    </p>
                    {!request.post.removedBy ? (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="rounded-full border-[#7f9384] text-[#24362f] hover:border-[#115740] hover:bg-[#f2f8f4]"
                      >
                        <Link href={detailHref("/teams", request.post.id, from)}>查看组队详情</Link>
                      </Button>
                    ) : (
                      <span className="text-xs font-medium text-red-700">帖子已下架</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="card">
            <EmptyState
              title="你还没有发出入队申请"
              description="去组队广场看看正在招募的队伍，找到适合你的项目。"
              action={{ href: "/teams", label: "浏览组队广场" }}
            />
          </div>
        )
      ) : null}
    </div>
  );
}
