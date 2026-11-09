import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { MyTeams } from "@/components/teams/my-teams";
import { Button } from "@/components/ui/button";
import { getActiveUser } from "@/lib/auth.server";
import { firstParam } from "@/lib/list-query";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "我的组队" };
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
  createdAt: true,
  removedBy: true,
  competition: { select: { id: true, name: true, year: true } },
  track: { select: { id: true, name: true } },
} satisfies Prisma.TeamPostSelect;

type PostRow = Prisma.TeamPostGetPayload<{ select: typeof postSelect }>;

function serializePost(post: PostRow) {
  return {
    ...post,
    expiresAt: post.expiresAt.toISOString(),
    createdAt: post.createdAt.toISOString(),
  };
}

export default async function MyTeamsPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/dashboard");

  const [posts, received, sent] = await prisma.$transaction([
    prisma.teamPost.findMany({
      where: { authorId: user.id },
      select: postSelect,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    }),
    prisma.teamJoinRequest.findMany({
      where: { post: { authorId: user.id } },
      select: {
        id: true,
        message: true,
        status: true,
        createdAt: true,
        handledAt: true,
        user: { select: { id: true, name: true, studentNo: true, college: true, major: true } },
        post: { select: postSelect },
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    }),
    prisma.teamJoinRequest.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        message: true,
        status: true,
        createdAt: true,
        handledAt: true,
        post: { select: postSelect },
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    }),
  ]);

  const requestedTab = firstParam(searchParams?.tab);
  const activeTab = requestedTab === "received" || requestedTab === "sent" ? requestedTab : "posts";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">我的组队</h1>
          <p className="mt-1 text-sm text-slate-500">管理发布的招募、处理收到的申请，并跟踪自己发出的申请。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/teams">组队广场</Link></Button>
          <Button asChild><Link href="/teams/new">发布组队帖</Link></Button>
        </div>
      </div>
      <MyTeams
        activeTab={activeTab}
        posts={posts.map(serializePost)}
        received={received.map((request) => ({
          ...request,
          createdAt: request.createdAt.toISOString(),
          handledAt: request.handledAt?.toISOString() ?? null,
          post: serializePost(request.post),
        }))}
        sent={sent.map((request) => ({
          ...request,
          createdAt: request.createdAt.toISOString(),
          handledAt: request.handledAt?.toISOString() ?? null,
          post: serializePost(request.post),
        }))}
      />
    </div>
  );
}
