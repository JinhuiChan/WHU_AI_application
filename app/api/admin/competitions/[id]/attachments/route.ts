import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireApiAdmin } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

type Context = { params: { id: string } };
type Extension = "pdf" | "docx" | "doc" | "xlsx" | "jpg" | "jpeg" | "png" | "txt";

const maxFileSize = 20 * 1024 * 1024;
const mimeTypes: Record<Extension, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  txt: "text/plain",
};

function startsWith(buffer: Buffer, values: number[]) {
  return values.every((value, index) => buffer[index] === value);
}

function validHeader(extension: Extension, buffer: Buffer) {
  if (extension === "pdf") return startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (extension === "png") return startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (extension === "jpg" || extension === "jpeg") return startsWith(buffer, [0xff, 0xd8, 0xff]);
  if (extension === "doc") return startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (extension === "docx" || extension === "xlsx") {
    return startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]) || startsWith(buffer, [0x50, 0x4b, 0x05, 0x06]) || startsWith(buffer, [0x50, 0x4b, 0x07, 0x08]);
  }
  if (buffer.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
}

function safeFileName(value: string) {
  const base = (value.split(/[\\/]/).pop() ?? "file").replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim() || "file";
  if (base.length <= 120) return base;
  const extension = path.extname(base);
  return `${base.slice(0, Math.max(1, 120 - extension.length))}${extension}`;
}

export async function POST(request: NextRequest, { params }: Context) {
  const authorization = await requireApiAdmin();
  if (!authorization.ok) return authorization.response;
  let diskPath = "";
  try {
    const competition = await prisma.competition.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!competition) return apiError(404, "赛事不存在");
    const form = await request.formData();
    const titleValue = form.get("title");
    const kind = form.get("kind");
    const file = form.get("file");
    const title = typeof titleValue === "string" ? titleValue.trim() : "";
    if (!title) return apiError(422, "请填写文件标题");
    if (kind !== "NOTICE" && kind !== "RULE" && kind !== "TEMPLATE") return apiError(422, "文件类型不正确");
    if (!(file instanceof File)) return apiError(422, "请选择上传文件");
    if (file.size === 0 || file.size > maxFileSize) return apiError(422, "文件必须大于 0 且不超过 20MB");
    const extension = (file.name.split(".").pop() ?? "").toLowerCase() as Extension;
    if (!Object.hasOwn(mimeTypes, extension)) return apiError(422, "仅支持 pdf/docx/doc/xlsx/jpg/jpeg/png/txt 文件");
    if (file.type !== mimeTypes[extension]) return apiError(422, "文件 MIME 与扩展名不匹配");
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0 || buffer.length > maxFileSize) return apiError(422, "文件大小不符合要求");
    if (!validHeader(extension, buffer)) return apiError(422, "文件头与扩展名不匹配");

    const directory = path.join(process.cwd(), "public", "uploads", "competitions", params.id);
    await mkdir(directory, { recursive: true });
    const storedName = `${randomUUID()}-${safeFileName(file.name)}`;
    diskPath = path.join(directory, storedName);
    await writeFile(diskPath, buffer, { flag: "wx" });
    const filePath = `/uploads/competitions/${params.id}/${storedName}`;
    const attachment = await prisma.$transaction(async (transaction) => {
      const max = await transaction.competitionAttachment.aggregate({ where: { competitionId: params.id }, _max: { sortOrder: true } });
      const created = await transaction.competitionAttachment.create({
        data: {
          competitionId: params.id,
          title,
          kind,
          fileName: safeFileName(file.name),
          filePath,
          fileSize: buffer.length,
          uploadedBy: authorization.user.id,
          sortOrder: (max._max.sortOrder ?? -1) + 1,
        },
      });
      await writeAuditLog({
        actorId: authorization.user.id,
        action: "COMPETITION_ATTACHMENT_UPLOADED",
        targetType: "CompetitionAttachment",
        targetId: created.id,
        detail: { competitionId: params.id, title, kind, fileName: created.fileName, filePath, fileSize: buffer.length },
      }, transaction);
      return created;
    });
    return apiSuccess(attachment, "文件上传成功", 201);
  } catch (error) {
    if (diskPath) await unlink(diskPath).catch(() => {});
    console.error("上传赛事文件失败：", error instanceof Error ? error.message : error);
    return apiError(500, "上传赛事文件失败");
  }
}
