import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth.server";
import { commitImportFile, getImportFile, ImportFileError } from "@/lib/import";

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
    const onlyValid = formData.get("onlyValid") === "true";
    const response = await commitImportFile(file, authorization.user.id, onlyValid);
    if (!response.ok) {
      return apiError(422, response.message, response.report);
    }
    return apiSuccess(response.result, `成功导入 ${response.result.successRows} 行`);
  } catch (error) {
    if (error instanceof ImportFileError) {
      return apiError(422, error.message);
    }
    console.error("导入确认接口错误：", error);
    return apiError(500, "确认导入失败，事务已回滚");
  }
}
