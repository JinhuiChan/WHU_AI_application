import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth.server";
import { getImportFile, ImportFileError, validateImportFile } from "@/lib/import";

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
    const file = getImportFile(formData);
    const report = await validateImportFile(file);
    if (report.invalidRows) {
      return apiError(422, `校验完成：${report.invalidRows} 行存在错误`, report);
    }
    return apiSuccess(report, "全部行校验通过");
  } catch (error) {
    if (error instanceof ImportFileError) {
      return apiError(422, error.message);
    }
    console.error("导入校验接口错误：", error);
    return apiError(500, "校验导入文件失败");
  }
}
