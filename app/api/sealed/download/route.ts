import { readFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth.server";
import { attachmentDisposition } from "@/lib/download";
import { writeExportRecord } from "@/lib/export-record";
import { getSealedFileForDownload, resolveSealedFilePath, SealedError } from "@/lib/sealed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await requireApiUser();
  if (!authorization.ok) return authorization.response;
  try {
    const fileId = request.nextUrl.searchParams.get("fileId")?.trim() ?? "";
    if (!fileId) return apiError(422, "文件 ID 不能为空");
    const file = await getSealedFileForDownload(fileId, authorization.user);
    if (!file) return apiError(404, "盖章件不存在或无权访问");
    const output = await readFile(resolveSealedFilePath(file.filePath));
    await writeExportRecord({
      exporterId: authorization.user.id,
      type: "FORM",
      fields: ["盖章件", "版本号"],
      rowCount: 1,
      fileName: file.fileName,
      filters: { projectId: file.projectId, sealedFileId: file.id, versionNo: file.versionNo },
    });
    return new NextResponse(new Uint8Array(output), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": attachmentDisposition(file.fileName, `sealed-v${file.versionNo}`),
        "Content-Length": String(output.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof SealedError) return apiError(error.status, error.message);
    console.error("下载盖章件失败：", error instanceof Error ? error.message : error);
    return apiError(500, "下载盖章件失败");
  }
}
