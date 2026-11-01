import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth.server";
import { attachmentDisposition } from "@/lib/download";
import { newExportWatermarkNo, writeExportRecord } from "@/lib/export-record";
import { createRegistrationForm, formExportFields } from "@/lib/form-export";
import { canAccessProject, canExportFullForm } from "@/lib/sealed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await requireApiUser();
  if (!authorization.ok) return authorization.response;
  try {
    const projectId = request.nextUrl.searchParams.get("projectId")?.trim() ?? "";
    const fullValue = request.nextUrl.searchParams.get("full") ?? "0";
    if (!projectId) return apiError(422, "项目 ID 不能为空");
    if (fullValue !== "0" && fullValue !== "1") return apiError(422, "full 仅支持 0 或 1");
    const full = fullValue === "1";
    if (!(await canAccessProject(projectId, authorization.user))) return apiError(404, "项目不存在或无权访问");
    if (full && !(await canExportFullForm(projectId, authorization.user))) {
      return apiError(403, "仅项目负责人、第二/第三负责人或管理员可导出完整报名表");
    }
    const watermarkNo = newExportWatermarkNo();
    const form = await createRegistrationForm(projectId, watermarkNo, {
      full,
      exporterName: authorization.user.name,
      exportedAt: new Date(),
    });
    if (!form) return apiError(404, "项目不存在");
    await writeExportRecord({
      exporterId: authorization.user.id,
      type: "FORM",
      fields: formExportFields,
      rowCount: 1,
      fileName: form.fileName,
      includeSensitive: full,
      filters: { projectId, full },
      watermarkNo,
    });
    return new NextResponse(new Uint8Array(form.output), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": attachmentDisposition(form.fileName, `registration-${projectId}.xlsx`),
        "Content-Length": String(form.output.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("导出报名表失败：", error instanceof Error ? error.message : error);
    return apiError(500, "导出报名表失败");
  }
}
