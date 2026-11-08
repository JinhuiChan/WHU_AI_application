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
  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-slate-500">{post.competition?.name ?? "未设置赛事"} · {post.track?.name ?? "不限赛道"}</p>
        <StatusBadge status={status} scope="team">{postStatusLabels[status]}</StatusBadge>
      </div>
      <h2 className="mt-3 font-semibold text-slate-900">
        {post.removedBy ? post.title : <Link href={detailHref("/teams", post.id, from)} className="hover:text-blue-600">{post.title}</Link>}
      </h2>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{post.summary}</p>
      {skills.length ? <div className="mt-3 flex flex-wrap gap-1.5">{skills.map((skill) => <span key={skill} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">{skill}</span>)}</div> : null}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 [margin-top:1rem]">
        <span>人数 <strong className="text-sm tabular-nums text-slate-800">{post.currentCount}/{post.memberLimit}</strong></span>
        <span>截止 {formatDateTime(post.expiresAt)}</span>
      </div>
      {post.removedBy ? <p className="mt-2 text-xs text-red-600">帖子已下架</p> : null}
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
    <div className="space-y-6">
      <nav aria-label="我的组队分类" className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <Link key={tab.key} href={`/my/teams?tab=${tab.key}`} aria-current={active ? "page" : undefined} className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition duration-[160ms] ${active ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"}`}>
              {tab.label}
              <span className={`text-xs tabular-nums ${active ? "text-blue-100" : tab.key === "received" && pendingCount ? "text-red-600" : "text-slate-400"}`}>{tab.count}</span>
            </Link>
          );
        })}
      </nav>

      {activeTab === "posts" ? (
        posts.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{posts.map((post) => <PostCard key={post.id} post={post} from={from} />)}</div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white"><EmptyState title="你还没有发布组队帖" description="介绍项目方向与需要的队友，让合适的同学找到你。" action={{ href: "/teams/new", label: "发布组队帖" }} /></div>
        )
      ) : null}

      {activeTab === "received" ? (
        received.length ? (
          <ul className="space-y-4">
            {orderedReceived.map((request) => (
              <li key={request.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-600">{request.user.name.trim().charAt(0) || "申"}</span>
                    <div className="min-w-0">
                      <Link href={`/u/${request.user.id}`} className="font-medium text-slate-900 hover:text-blue-600">{request.user.name}</Link>
                      <p className="mt-0.5 text-xs text-slate-500">{request.user.college ?? "未填写学院"}{request.user.major ? ` · ${request.user.major}` : ""}{request.user.studentNo ? ` · ${request.user.studentNo}` : ""}</p>
                    </div>
                  </div>
                  <StatusBadge status={request.status} scope="team">{joinStatusLabels[request.status]}</StatusBadge>
                </div>
                <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="text-xs text-slate-500">申请加入</p>
                  {request.post.removedBy ? <p className="mt-1 font-medium text-slate-700">{request.post.title}</p> : <Link href={detailHref("/teams", request.post.id, from)} className="mt-1 block font-medium text-slate-900 hover:text-blue-600">{request.post.title}</Link>}
                  <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-700">{request.message || "未填写申请留言"}</p>
                </div>
                <p className="mt-3 text-xs text-slate-400">申请于 {formatDateTime(request.createdAt)}{request.handledAt ? ` · 处理于 ${formatDateTime(request.handledAt)}` : ""}</p>
                {request.status === "PENDING" ? <RequestDecisionButtons postId={request.post.id} requestId={request.id} /> : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white"><EmptyState title="还没有收到入队申请" description="学生申请你发布的组队帖后，会显示在这里。" action={{ href: "/my/teams?tab=posts", label: "查看我发布的" }} /></div>
        )
      ) : null}

      {activeTab === "sent" ? (
        sent.length ? (
          <ul className="space-y-4">
            {sent.map((request) => {
              const postStatus = visibleStatus(request.post);
              return (
                <li key={request.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">{request.post.competition?.name ?? "未设置赛事"} · {request.post.track?.name ?? "不限赛道"}</p>
                      {request.post.removedBy ? <h2 className="mt-1 font-semibold text-slate-700">{request.post.title}</h2> : <Link href={detailHref("/teams", request.post.id, from)} className="mt-1 block font-semibold text-slate-900 hover:text-blue-600">{request.post.title}</Link>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={postStatus} scope="team">{postStatusLabels[postStatus]}</StatusBadge>
                      <StatusBadge status={request.status} scope="team">{joinStatusLabels[request.status]}</StatusBadge>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{request.message || "未填写申请留言"}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <p className="text-xs text-slate-400">申请于 {formatDateTime(request.createdAt)}{request.handledAt ? ` · 处理于 ${formatDateTime(request.handledAt)}` : ""}</p>
                    {!request.post.removedBy ? <Button asChild size="sm" variant="outline"><Link href={detailHref("/teams", request.post.id, from)}>查看组队详情</Link></Button> : <span className="text-xs text-red-600">帖子已下架</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white"><EmptyState title="你还没有发出入队申请" description="去组队广场看看正在招募的队伍，找到适合你的项目。" action={{ href: "/teams", label: "浏览组队广场" }} /></div>
        )
      ) : null}
    </div>
  );
}
