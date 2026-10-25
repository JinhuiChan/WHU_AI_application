import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ImportWizard } from "@/components/admin/import-wizard";
import { getActiveUser } from "@/lib/auth.server";

export const metadata: Metadata = { title: "数据导入" };

export default async function ImportPage() {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") {
    return (
      <section className="rounded-lg border border-red-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-red-600">403 无权限</h1>
        <p className="mt-2 text-sm text-slate-500">仅管理员可以校验并导入获奖公示。</p>
      </section>
    );
  }
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">获奖公示导入</h1>
        <p className="mt-1 text-sm text-slate-500">下载模板、逐行校验后确认入库；错误行可单独跳过，成功数据保留完整来源。</p>
      </div>
      <ImportWizard />
    </div>
  );
}
