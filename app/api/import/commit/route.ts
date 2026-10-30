import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth.server";
import { ImportFileError } from "@/lib/import";
import { commitImportBatch, ImportCommitError } from "@/lib/import-commit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authorization = await requireApiAdmin();
    if (!authorization.ok) return authorization.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError(422, "请提交 JSON 格式的批次号");
    }
    const batchId = typeof body === "object" && body !== null && "batchId" in body && typeof body.batchId === "string"
      ? body.batchId
      : "";
    const result = await commitImportBatch(batchId, authorization.user.id);
    return apiSuccess(result, `识别到 ${result.projectCount} 个项目（含 ${result.continuationCount} 条续行），成功 ${result.success}、失败 ${result.failed}`);
  } catch (error) {
    if (error instanceof ImportCommitError || error instanceof ImportFileError) {
      return apiError(error instanceof ImportCommitError ? error.status : 422, error.message);
    }
    console.error("导入入库接口错误：", error);
    return apiError(500, "导入入库失败");
  }
}
