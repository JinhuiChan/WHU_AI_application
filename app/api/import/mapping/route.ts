import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth.server";
import { ImportMappingError, saveImportMapping } from "@/lib/import";

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
      return apiError(422, "请提交 JSON 格式的映射方案");
    }
    const result = await saveImportMapping(authorization.user.id, body);
    return apiSuccess(result, "映射方案已保存，尚未写入报名数据");
  } catch (error) {
    if (error instanceof ImportMappingError) {
      return apiError(error.status, error.message);
    }
    console.error("保存导入映射接口错误：", error);
    return apiError(500, "保存映射方案失败");
  }
}
