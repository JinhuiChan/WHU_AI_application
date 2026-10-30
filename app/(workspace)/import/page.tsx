import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ImportWizard } from "@/components/admin/import-wizard";
import { getActiveUser } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "数据导入" };
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") {
    return (
      <section className="rounded-lg border border-red-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-red-600">403 无权限</h1>
        <p className="mt-2 text-sm text-slate-500">仅管理员可以上传并映射赛事报名数据。</p>
      </section>
    );
  }

  const competitions = await prisma.competition.findMany({
    select: { id: true, name: true, year: true },
    orderBy: [{ year: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">赛事报名数据导入</h1>
        <p className="mt-1 text-sm text-slate-500">选择赛事与阶段，确认字段映射和前 20 行预览后入库，并查看逐行失败报告。</p>
      </div>
      <ImportWizard competitions={competitions} />
    </div>
  );
}
