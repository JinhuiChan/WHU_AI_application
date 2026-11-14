import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FormPrintLayout } from "@/components/export/form-print-layout";
import { getActiveUser } from "@/lib/auth.server";
import { newExportWatermarkNo } from "@/lib/export-record";
import { buildFormRows, loadRegistrationFormProject } from "@/lib/form-export";
import { firstParam } from "@/lib/list-query";
import { canAccessProject, canExportFullForm } from "@/lib/sealed";
import { logSensitiveAccess } from "@/lib/sensitive-access";

export const metadata: Metadata = { title: "打印报名表" };
export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function RegistrationFormPrintPage({ params, searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  const fullValue = firstParam(searchParams?.full) ?? "0";
  if (fullValue !== "0" && fullValue !== "1") notFound();
  const full = fullValue === "1";
  const canPrint = await canExportFullForm(params.id, user);
  if (!canPrint) {
    if (await canAccessProject(params.id, user)) redirect(`/forbidden?reason=${encodeURIComponent("仅项目负责人、第二/第三负责人或管理员可打印报名表")}`);
    notFound();
  }
  const watermarkNo = newExportWatermarkNo();
  const project = await loadRegistrationFormProject(params.id, watermarkNo, {
    full,
    exporterName: user.name,
    exportedAt: new Date(),
  });
  if (!project) notFound();
  if (full) {
    await logSensitiveAccess({
      userId: user.id,
      projectId: params.id,
      resourceType: "REGISTRATION_FORM",
      resourceId: watermarkNo,
      fieldNames: ["idCard", "bankCard"],
      reason: "导出完整报名表（交学院核验）",
    });
  }
  return <FormPrintLayout projectId={params.id} full={full} form={buildFormRows(project)} />;
}
