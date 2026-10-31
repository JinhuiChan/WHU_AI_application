import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireApiUser } from "@/lib/auth.server";
import { inspectMaterial, MaterialCheckError } from "@/lib/material-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authorization = await requireApiUser();
  if (!authorization.ok) return authorization.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError(422, "请以 multipart/form-data 上传文件");
  }
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return apiError(422, "请选择要检查的 PDF 或 DOCX 文件");
  }

  try {
    const inspection = await inspectMaterial(file);
    await writeAuditLog({
      actorId: authorization.user.id,
      action: "MATERIAL_CHECKED",
      targetType: "MaterialCheck",
      targetId: randomUUID(),
      detail: {
        fileName: file.name.slice(0, 200),
        fileSize: inspection.fileSize,
        fileType: inspection.fileType,
        localOnly: formData.get("localOnly") !== "false",
        originalPersisted: false,
      },
    });
    return apiSuccess(inspection.result, "材料检查完成");
  } catch (error) {
    if (error instanceof MaterialCheckError) {
      return apiError(422, error.message);
    }
    console.error("材料检查接口错误：", error);
    return apiError(500, "材料检查失败，请稍后重试");
  }
}
