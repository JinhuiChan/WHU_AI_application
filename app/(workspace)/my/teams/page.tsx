import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { WhuSeal, WhuTitleRule } from "@/components/brand/whu-motifs";
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="t-page-title font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
              我的组队
            </h1>
            <WhuSeal label="组队台账" />
          </div>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-[#54635d]">
            <WhuTitleRule />
            <span>管理发布的招募、处理收到的入队申请，并跟踪本人发出的组队意向。</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            asChild
            variant="outline"
            className="h-10 rounded-full border-[#7f9384] px-5 text-[#1c2e26] hover:border-[#115740] hover:bg-[#f2f8f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
          >
            <Link href="/teams">组队广场</Link>
          </Button>
          <Button
            asChild
            className="h-10 rounded-full bg-[#115740] px-5 text-white hover:bg-[#0d4633] active:bg-[#093426] focus-visible:ring-[#115740]/30"
          >
            <Link href="/teams/new">发布组队帖</Link>
          </Button>
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
