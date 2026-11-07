import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AnomalyManagement } from "@/components/admin/anomaly-management";
import { getAnomalyData } from "@/lib/anomalies";
import { getActiveUser } from "@/lib/auth.server";

export const metadata: Metadata = { title: "异常核实" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AnomaliesPage() {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  const data = await getAnomalyData();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">异常核实</h1>
        <p className="mt-1 text-sm text-slate-500">按规则 R1–R6 汇总待核实异常；处置结论会写入审计日志。</p>
      </div>
      <AnomalyManagement initialData={data} isAdmin={user.role === "ADMIN"} />
    </div>
  );
}
