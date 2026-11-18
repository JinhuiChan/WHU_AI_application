import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ImportWizard } from "@/components/admin/import-wizard";
import { WorkspaceForbidden } from "@/components/ui/workspace-forbidden";
import { getActiveUser } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "数据导入" };
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") {
    return <WorkspaceForbidden message="仅管理员可以上传并映射赛事报名数据。" />;
  }

  const competitions = await prisma.competition.findMany({
    select: { id: true, name: true, year: true },
    orderBy: [{ year: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="t-page-title text-xl font-semibold text-slate-900">赛事报名数据导入</h1>
        <p className="mt-1 text-sm text-slate-500">选择赛事与阶段；Word/PDF 自动识别后可逐页核对、修改和补行，确认后入库并查看失败报告。</p>
      </div>
      <ImportWizard competitions={competitions} />
    </div>
  );
}
