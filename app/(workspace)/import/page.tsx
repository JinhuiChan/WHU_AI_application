import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ImportWizard } from "@/components/admin/import-wizard";
import { WhuSeal, WhuTitleRule } from "@/components/brand/whu-motifs";
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
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="t-page-title font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
            赛事报名数据导入
          </h1>
          <WhuSeal label="批量入库" />
        </div>
        <p className="mt-1.5 flex items-center gap-2 text-sm text-[#54635d]">
          <WhuTitleRule />
          <span>选择目标赛事与赛段，文档识别后可逐页核对、修改与补行，确认无误后统一入库。</span>
        </p>
      </div>
      <ImportWizard competitions={competitions} />
    </div>
  );
}
