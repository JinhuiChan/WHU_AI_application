import { unlink } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireApiAdmin } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

type Context = { params: { id: string; attachmentId: string } };

export async function DELETE(_request: NextRequest, { params }: Context) {
  const authorization = await requireApiAdmin();
  if (!authorization.ok) return authorization.response;
  try {
    const attachment = await prisma.competitionAttachment.findFirst({
      where: { id: params.attachmentId, competitionId: params.id },
    });
    if (!attachment) return apiError(404, "赛事文件不存在");
    const base = path.resolve(process.cwd(), "public", "uploads", "competitions", params.id);
    const diskPath = path.resolve(process.cwd(), "public", `.${attachment.filePath}`);
    if (!diskPath.startsWith(`${base}${path.sep}`)) return apiError(500, "文件路径不安全");
    await prisma.$transaction(async (transaction) => {
      await transaction.competitionAttachment.delete({ where: { id: attachment.id } });
      await writeAuditLog({
        actorId: authorization.user.id,
        action: "COMPETITION_ATTACHMENT_DELETED",
        targetType: "CompetitionAttachment",
        targetId: attachment.id,
        detail: { competitionId: params.id, title: attachment.title, fileName: attachment.fileName, filePath: attachment.filePath },
      }, transaction);
    });
    await unlink(diskPath).catch((error: unknown) => {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    });
    return apiSuccess({ id: attachment.id }, "文件已删除");
  } catch (error) {
    console.error("删除赛事文件失败：", error instanceof Error ? error.message : error);
    return apiError(500, "删除赛事文件失败");
  }
}
