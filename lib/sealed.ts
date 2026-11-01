import path from "node:path";
import type { Prisma } from "@prisma/client";
import type { AuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SealedFileView } from "@/types/sealed";

export const sealedDirectory = path.join(process.cwd(), "public", "uploads", "sealed");

export class SealedError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "SealedError";
  }
}

type SealedFileWithUploader = Prisma.SealedFileGetPayload<{
  include: { uploader: { select: { name: true } } };
}>;

function mapSealedFile(file: SealedFileWithUploader): SealedFileView {
  return {
    id: file.id,
    fileName: file.fileName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    versionNo: file.versionNo,
    uploadedAt: file.uploadedAt.toISOString(),
    isFinal: file.isFinal,
    reviewResult: file.reviewResult,
    reviewNote: file.reviewNote,
    uploaderName: file.uploader.name,
  };
}

export async function listSealedFiles(projectId: string): Promise<SealedFileView[]> {
  const files = await prisma.sealedFile.findMany({
    where: { projectId },
    include: { uploader: { select: { name: true } } },
    orderBy: { versionNo: "desc" },
  });
  return files.map(mapSealedFile);
}

export function currentSealedFileId(files: { id: string; reviewResult: string }[]) {
  return files.find((file) => file.reviewResult !== "REJECTED")?.id ?? null;
}

export async function canAccessProject(projectId: string, user: AuthUser) {
  if (user.role !== "ADMIN" && user.role !== "STUDENT" && user.role !== "TEACHER") return false;
  const where: Prisma.ProjectWhereInput = { id: projectId, deletedAt: null };
  if (user.role === "STUDENT") {
    where.OR = [
      { ownerId: user.id },
      { teamMembers: { some: { userId: user.id, leftAt: null } } },
    ];
  } else if (user.role === "TEACHER") {
    where.teachers = { some: { userId: user.id } };
  }
  return Boolean(await prisma.project.findFirst({ where, select: { id: true } }));
}

export async function canExportFullForm(projectId: string, user: AuthUser) {
  if (user.role !== "ADMIN" && user.role !== "STUDENT") return false;
  const where: Prisma.ProjectWhereInput = { id: projectId, deletedAt: null };
  if (user.role === "STUDENT") {
    where.OR = [
      { ownerId: user.id },
      { teamMembers: { some: { userId: user.id, leftAt: null, role: { in: ["LEADER", "SECOND_LEADER", "THIRD_LEADER"] } } } },
    ];
  }
  return Boolean(await prisma.project.findFirst({ where, select: { id: true } }));
}

export async function getSealedFileForDownload(fileId: string, user: AuthUser) {
  const file = await prisma.sealedFile.findUnique({ where: { id: fileId } });
  if (!file || !(await canAccessProject(file.projectId, user))) return null;
  return file;
}

export function resolveSealedFilePath(filePath: string) {
  let normalized = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.startsWith("public/")) normalized = normalized.slice("public/".length);
  if (!normalized.startsWith("uploads/sealed/")) throw new SealedError(404, "盖章件路径不正确");
  const relative = normalized.slice("uploads/sealed/".length);
  const resolved = path.resolve(sealedDirectory, relative);
  if (resolved === sealedDirectory || !resolved.startsWith(`${sealedDirectory}${path.sep}`)) {
    throw new SealedError(404, "盖章件路径不正确");
  }
  return resolved;
}

export function safeOriginalFileName(value: string) {
  const base = (value.split(/[\\/]/).pop() ?? "sealed-file").replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim() || "sealed-file";
  if (base.length <= 120) return base;
  const extension = path.extname(base);
  return `${base.slice(0, Math.max(1, 120 - extension.length))}${extension}`;
}
