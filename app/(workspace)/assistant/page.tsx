import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { WhuSeal, WhuTitleRule } from "@/components/brand/whu-motifs";
import { AssistantChat } from "@/components/data/assistant-chat";
import { AssistantWorkspace } from "@/components/data/assistant-workspace";
import { getActiveUser } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "赛事 AI 问答" };
export const dynamic = "force-dynamic";

type PageProps = { searchParams: { competitionId?: string } };

export default async function AssistantPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");

  const competitions = await prisma.competition.findMany({
    where: { publishStatus: "PUBLISHED" },
    select: { id: true, name: true, year: true },
    orderBy: [{ year: "desc" }, { name: "asc" }],
  });

  const competition = searchParams.competitionId
    ? competitions.find(({ id }) => id === searchParams.competitionId)
    : undefined;
  if (searchParams.competitionId && !competition) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="t-page-title font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
              赛事规程问答
            </h1>
            <WhuSeal label="规程研读" />
          </div>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-[#54635d]">
            <WhuTitleRule />
            <span>检索全平台已发布赛事配置与官方通知，逐条附原文依据供师生核验。</span>
          </p>
        </div>

        {user.role === "ADMIN" ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#54635d]">
            <span>问答资料统一在赛事详情维护，此处无需单独上传</span>
            <Link
              href="/competitions"
              className="inline-flex h-8 items-center gap-1 rounded-full border border-[#7f9384] bg-white px-3.5 text-xs font-medium text-[#162620] transition-colors hover:border-[#115740] hover:bg-[#f7faf8]"
            >
              前往赛事
              <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
        ) : null}
      </div>

      <AssistantWorkspace
        key={competition?.id ?? "all"}
        competitionId={competition?.id}
        competitions={competitions}
        viewer={{ id: user.id, role: user.role }}
      >
        <AssistantChat
          competitionId={competition?.id}
          competitionLabel={competition ? `${competition.year} · ${competition.name}` : undefined}
        />
      </AssistantWorkspace>
    </div>
  );
}
