import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AnomalyManagement } from "@/components/admin/anomaly-management";
import { WhuSeal, WhuTitleRule } from "@/components/brand/whu-motifs";
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
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="t-page-title font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
            异常核实
          </h1>
          <WhuSeal label="一致性稽核" />
        </div>
        <p className="mt-1.5 flex items-center gap-2 text-sm text-[#54635d]">
          <WhuTitleRule />
          <span>按稽核规则 R1 至 R6 汇总待核实异常，管理员处置结论将实时写入审计台账。</span>
        </p>
      </div>
      <AnomalyManagement initialData={data} isAdmin={user.role === "ADMIN"} />
    </div>
  );
}
