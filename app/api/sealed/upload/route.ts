import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireApiStudent } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";
import { canAccessProject, safeOriginalFileName, sealedDirectory } from "@/lib/sealed";

export const runtime = "nodejs";

const maxFileSize = 20 * 1024 * 1024;
const mimeTypes = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" } as const;
type Extension = keyof typeof mimeTypes;

function startsWith(buffer: Buffer, values: number[]) {
  return values.every((value, index) => buffer[index] === value);
}

function validHeader(extension: Extension, buffer: Buffer) {
  if (extension === "pdf") return startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (extension === "png") return startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return startsWith(buffer, [0xff, 0xd8, 0xff]);
}

export async function POST(request: NextRequest) {
  const authorization = await requireApiStudent();
  if (!authorization.ok) return authorization.response;
  let diskPath = "";
  try {
    const form = await request.formData();
    const projectIdValue = form.get("projectId");
    const file = form.get("file");
    const projectId = typeof projectIdValue === "string" ? projectIdValue.trim() : "";
    if (!projectId) return apiError(422, "项目 ID 不能为空");
    if (authorization.user.role !== "STUDENT" || !(await canAccessProject(projectId, authorization.user))) {
      return apiError(404, "项目不存在或无权访问");
    }
    if (!(file instanceof File)) return apiError(422, "请选择上传文件");
    if (file.size === 0 || file.size > maxFileSize) return apiError(422, "文件必须大于 0 且不超过 20MB");
    const extension = (file.name.split(".").pop() ?? "").toLowerCase() as Extension;
    if (!Object.hasOwn(mimeTypes, extension)) return apiError(422, "仅支持 PDF/JPG/PNG 文件");
    if (file.type !== mimeTypes[extension]) return apiError(422, "文件 MIME 与扩展名不匹配");
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0 || buffer.length > maxFileSize) return apiError(422, "文件大小不符合要求");
    if (!validHeader(extension, buffer)) return apiError(422, "文件头与扩展名不匹配");

    const directory = path.join(sealedDirectory, projectId);
    await mkdir(directory, { recursive: true });
    const storedName = `${randomUUID()}.${extension}`;
    diskPath = path.join(directory, storedName);
    await writeFile(diskPath, buffer, { flag: "wx" });
    const filePath = `/uploads/sealed/${projectId}/${storedName}`;
    const originalName = safeOriginalFileName(file.name);
    const sealedFile = await prisma.$transaction(async (transaction) => {
      const latest = await transaction.sealedFile.aggregate({ where: { projectId }, _max: { versionNo: true } });
      await transaction.sealedFile.updateMany({ where: { projectId, isFinal: true }, data: { isFinal: false } });
      const created = await transaction.sealedFile.create({
        data: {
          projectId,
          fileName: originalName,
          filePath,
          mimeType: mimeTypes[extension],
          sizeBytes: buffer.length,
          versionNo: (latest._max.versionNo ?? 0) + 1,
          uploadedBy: authorization.user.id,
          isFinal: true,
          reviewResult: "PENDING",
        },
      });
      await writeAuditLog({
        actorId: authorization.user.id,
        action: "SEALED_FILE_UPLOADED",
        targetType: "SealedFile",
        targetId: created.id,
        detail: { projectId, versionNo: created.versionNo, fileName: originalName, sizeBytes: created.sizeBytes },
      }, transaction);
      return created;
    });
    return apiSuccess(sealedFile, `第 ${sealedFile.versionNo} 版上传成功`, 201);
  } catch (error) {
    if (diskPath) await unlink(diskPath).catch(() => {});
    console.error("上传盖章件失败：", error instanceof Error ? error.message : error);
    return apiError(500, "上传盖章件失败");
  }
}
