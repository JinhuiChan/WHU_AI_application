import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AwardWorkbench } from "@/components/admin/award-workbench";
import { WhuSeal, WhuTitleRule } from "@/components/brand/whu-motifs";
import { WorkspaceForbidden } from "@/components/ui/workspace-forbidden";
import { getAdminAwardPage, parseAdminAwardLevel } from "@/lib/admin-awards";
import { getActiveUser } from "@/lib/auth.server";
import { firstParam, pageParams } from "@/lib/list-query";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "奖项录入" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function AdminAwardsPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") {
    return <WorkspaceForbidden message="仅管理员可以录入和调整奖项。" />;
  }

  const filters = {
    competitionId: firstParam(searchParams?.competitionId),
    college: firstParam(searchParams?.college),
    level: firstParam(searchParams?.level),
  };
  const { page, pageSize } = pageParams(firstParam(searchParams?.page), firstParam(searchParams?.pageSize));
  const [data, competitions, collegeRows] = await Promise.all([
    getAdminAwardPage({
      competitionId: filters.competitionId || undefined,
      college: filters.college || undefined,
      level: parseAdminAwardLevel(filters.level) ?? undefined,
      page,
      pageSize,
    }),
    prisma.competition.findMany({
      select: { id: true, name: true, year: true },
      orderBy: [{ year: "desc" }, { name: "asc" }],
    }),
    prisma.project.findMany({
      where: { deletedAt: null },
      distinct: ["college"],
      select: { college: true },
      orderBy: { college: "asc" },
    }),
  ]);

  const exportParams = new URLSearchParams();
  if (filters.competitionId) exportParams.set("competitionId", filters.competitionId);
  if (filters.college) exportParams.set("college", filters.college);
  if (filters.level) exportParams.set("level", filters.level);
  const exportQuery = exportParams.toString();
  const exportHref = `/api/export/awards-list${exportQuery ? `?${exportQuery}` : ""}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="t-page-title font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
              奖项录入
            </h1>
            <WhuSeal label="奖项台账" />
          </div>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-[#54635d]">
            <WhuTitleRule />
            <span>为校级终审通过项目核定或调整奖项等级，每次新增与改级均保留变更记录与审计留痕。</span>
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 lg:items-end">
          <a
            href={exportHref}
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#115740] px-5 text-sm font-medium text-white transition duration-150 hover:bg-[#0d4633] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:active:scale-100"
          >
            导出获奖名单
          </a>
          <p className="text-xs text-[#6c7e76]">按当前筛选导出，仅含已录奖项项目</p>
        </div>
      </div>
      <AwardWorkbench
        data={data}
        competitions={competitions}
        colleges={collegeRows.map((row) => row.college)}
        filters={filters}
      />
    </div>
  );
}
