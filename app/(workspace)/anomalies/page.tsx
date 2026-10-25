import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AnomalyManagement } from "@/components/admin/anomaly-management";
import { getAnomalyData } from "@/lib/anomalies";
import { getActiveUser } from "@/lib/auth.server";

export const metadata: Metadata = { title: "异常核实" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function AnomaliesPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  const value = searchParams?.status;
  const status = Array.isArray(value) ? value[0] : value;
  const ruleValue = searchParams?.ruleId;
  const ruleId = Array.isArray(ruleValue) ? ruleValue[0] : ruleValue;
  const data = await getAnomalyData(
    status === "PENDING" || status === "RESOLVED" ? status : undefined,
    ruleId && /^R[1-6]$/.test(ruleId) ? ruleId : undefined,
  );
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">待核实池</h1>
        <p className="mt-1 text-sm text-slate-500">按 R1–R6 规则分组核验异常，查看涉及项目并记录处置结论。</p>
      </div>
      <AnomalyManagement initialData={data} isAdmin={user.role === "ADMIN"} />
    </div>
  );
}
