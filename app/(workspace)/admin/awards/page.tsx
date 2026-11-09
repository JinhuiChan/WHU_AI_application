import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AwardWorkbench } from "@/components/admin/award-workbench";
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
    return (
      <section className="rounded-lg border border-red-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-red-600">403 无权限</h1>
        <p className="mt-2 text-sm text-slate-500">仅管理员可以录入和调整奖项。</p>
      </section>
    );
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">奖项录入</h1>
          <p className="mt-1 text-sm text-slate-500">为终审通过项目录入或调整奖项，每次新增和改级均保留历史与审计记录。</p>
        </div>
        <div className="text-right">
          <a
            href={exportHref}
            className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700"
          >
            导出获奖名单
          </a>
          <p className="mt-1 text-xs text-slate-500">按当前筛选导出，仅含已录奖项的项目</p>
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
