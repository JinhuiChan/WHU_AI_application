import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <BackLink fallback="/teams" label="返回组队广场" />
        <h1 className="mt-3 text-xl font-semibold text-slate-900">发布组队帖</h1>
        <p className="mt-1 text-sm text-slate-500">介绍项目和需要的队友，发布后可在详情页管理入队申请。</p>
      </div>
      <TeamForm competitions={competitions} />
    </div>
  );
}
