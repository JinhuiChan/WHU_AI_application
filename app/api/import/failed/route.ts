import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth.server";
import { attachmentDisposition } from "@/lib/download";
import { newExportWatermarkNo, writeExportRecord } from "@/lib/export-record";
import { createImportFailedExport, ImportCommitError } from "@/lib/import-commit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authorization = await requireApiAdmin();
    if (!authorization.ok) return authorization.response;
    const batchId = request.nextUrl.searchParams.get("batchId")?.trim() ?? "";
    if (!batchId) return apiError(422, "请提供批次号 batchId");

    const watermarkNo = newExportWatermarkNo();
    const result = await createImportFailedExport(batchId, watermarkNo);
    await writeExportRecord({
      exporterId: authorization.user.id,
      type: "DATASET",
      fields: ["原始数据", "错误列", "错误原因"],
      rowCount: result.rowCount,
      fileName: result.fileName,
      filters: { batchId, kind: "IMPORT_FAILED" },
      watermarkNo,
    });
    return new NextResponse(new Uint8Array(result.output), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": attachmentDisposition(result.fileName, "import-failed.xlsx"),
        "Content-Length": String(result.output.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ImportCommitError) return apiError(error.status, error.message);
    console.error("导出导入失败行错误：", error);
    return apiError(500, "导出失败行失败");
  }
}
