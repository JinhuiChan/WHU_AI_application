import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WhuSeal, WhuTitleRule } from "@/components/brand/whu-motifs";
import { BackLink } from "@/components/data/list-link";
import { TeamForm } from "@/components/teams/team-form";
import { getActiveUser } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "发布组队帖" };
export const dynamic = "force-dynamic";

export default async function NewTeamPage() {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/teams");

  const competitions = await prisma.competition.findMany({
    where: { publishStatus: "PUBLISHED" },
    select: {
      id: true,
      name: true,
      year: true,
      tracks: {
        where: { enabled: true },
        select: { id: true, name: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: [{ year: "desc" }, { name: "asc" }],
  });

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <BackLink fallback="/teams" label="返回组队广场" />
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <h1 className="t-page-title font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
            发布组队帖
          </h1>
          <WhuSeal label="招募立项" />
        </div>
        <p className="mt-1.5 flex items-center gap-2 text-sm text-[#54635d]">
          <WhuTitleRule />
          <span>填写参赛方向、课题进展与所需专长，发布后可在详情页统一管理入队申请。</span>
        </p>
      </div>
      <TeamForm competitions={competitions} />
    </div>
  );
}
