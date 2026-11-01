import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth.server";
import { getImportFile, ImportFileError, parseImportFile } from "@/lib/import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authorization = await requireApiAdmin();
    if (!authorization.ok) return authorization.response;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return apiError(422, "请以 multipart/form-data 上传文件");
    }
    const result = await parseImportFile(getImportFile(formData));
    return apiSuccess(result, `识别出 ${result.columns.length} 列，自动匹配 ${Object.keys(result.suggestedMapping).length} 个系统字段`);
  } catch (error) {
    if (error instanceof ImportFileError) {
      return apiError(422, error.message);
    }
    console.error("导入解析接口错误：", error);
    return apiError(500, "解析导入文件失败");
  }
}
