import { prisma } from "@/lib/prisma";
import { readKnowledgeAttachment, KnowledgeError } from "@/lib/knowledge";

const tasks = new Map<string, Promise<void>>();
export async function syncAttachment(id: string, retry = false) {
  if (tasks.has(id)) return tasks.get(id)!;
  const task = indexAttachment(id, retry).finally(() => tasks.delete(id));
  tasks.set(id, task);
  return task;
}
async function indexAttachment(id: string, retry: boolean) {
  const source = await prisma.competitionAttachment.findUnique({ where: { id }, include: { competition: { select: { year: true } } } });
  if (!source || source.knowledgeStatus === "REPLACED" || (!retry && source.knowledgeStatus !== "PENDING")) return;
  if (!["NOTICE", "RULE"].includes(source.kind) || source.filePath.startsWith("/samples/")) {
    await prisma.$transaction([
      prisma.competitionAttachment.update({ where: { id }, data: { knowledgeStatus: "SKIPPED", knowledgeError: source.kind === "VIDEO" ? "宣传片不参与问答解析" : source.filePath.startsWith("/samples/") ? "内置演示附件不作为正式问答依据" : "模板文件仅供下载，不作为规则依据" } }),
      prisma.kbDocument.updateMany({ where: { sourceAttachmentId: id }, data: { isActive: false } }),
    ]);
    return;
  }
  try {
    const chunks = await readKnowledgeAttachment(source);
    await prisma.$transaction(async (tx) => {
      const current = await tx.competitionAttachment.findFirst({ where: { id, knowledgeStatus: { not: "REPLACED" } } });
      if (!current) return;
      const previous = source.replacesAttachmentId ? await tx.competitionAttachment.findFirst({ where: { id: source.replacesAttachmentId, competitionId: source.competitionId } }) : null;
      const oldDocument = previous ? await tx.kbDocument.findUnique({ where: { sourceAttachmentId: previous.id } }) : null;
      const data = { title: source.title, fileName: source.fileName, filePath: source.filePath, competitionId: source.competitionId,
        year: source.competition.year, uploadedBy: source.uploadedBy, isActive: true, effectiveAt: new Date(), expiresAt: null, replacesId: oldDocument?.id ?? null };
      const document = await tx.kbDocument.upsert({ where: { sourceAttachmentId: id }, create: { ...data, sourceAttachmentId: id }, update: data });
      await tx.kbChunk.deleteMany({ where: { documentId: document.id } });
      await tx.kbChunk.createMany({ data: chunks.map((chunk) => ({ ...chunk, documentId: document.id })) });
      if (previous) {
        await tx.competitionAttachment.update({ where: { id: previous.id }, data: { knowledgeStatus: "REPLACED", knowledgeError: "已被新版附件替换" } });
        await tx.kbDocument.updateMany({ where: { sourceAttachmentId: previous.id }, data: { isActive: false, expiresAt: new Date() } });
      }
      await tx.competitionAttachment.update({ where: { id }, data: { knowledgeStatus: "READY", knowledgeError: null, knowledgeIndexedAt: new Date() } });
    });
  } catch (error) {
    await prisma.$transaction([
      prisma.competitionAttachment.updateMany({ where: { id, knowledgeStatus: { not: "REPLACED" } }, data: { knowledgeStatus: "ERROR", knowledgeError: error instanceof KnowledgeError ? error.message : "解析失败，请重试或更换有效文件" } }),
      prisma.kbDocument.updateMany({ where: { sourceAttachmentId: id }, data: { isActive: false } }),
    ]);
  }
}
export async function syncPendingAttachments(competitionIds: string[]) {
  const pending = await prisma.competitionAttachment.findMany({ where: { competitionId: { in: competitionIds }, knowledgeStatus: "PENDING" }, select: { id: true } });
  for (const item of pending) await syncAttachment(item.id);
}
