import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth.server";
import { writeAuditLog } from "@/lib/audit";
import { chunksFromText, KnowledgeError, readKnowledgeAttachment } from "@/lib/knowledge";
import { prisma } from "@/lib/prisma";

type Context = { params: { competitionId: string } };

export async function POST(request: NextRequest, { params }: Context) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;
  const { competitionId } = params;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return apiError(422, "请求格式不正确");
    const input = body as Record<string, unknown>;
    const competition = await prisma.competition.findUnique({ where: { id: competitionId }, select: { year: true } });
    if (!competition) return apiError(404, "赛事不存在");
    const actorId = auth.user.id;
    if (input.action === "withdraw") {
      if (typeof input.documentId !== "string") return apiError(422, "请选择资料");
      const documentId = input.documentId;
      await prisma.$transaction(async (tx) => {
        const document = await tx.kbDocument.findFirst({ where: { id: documentId, competitionId, isActive: true } });
        if (!document) throw new KnowledgeError("资料不存在或已经下架");
        await tx.kbDocument.update({ where: { id: documentId }, data: { isActive: false } });
        if (document.replacesId && document.effectiveAt && document.effectiveAt > new Date()) {
          await tx.kbDocument.updateMany({
            where: { id: document.replacesId, competitionId, expiresAt: document.effectiveAt },
            data: { expiresAt: null },
          });
        }
        await writeAuditLog({ actorId, action: "KNOWLEDGE_WITHDRAWN", targetType: "KbDocument", targetId: documentId, detail: { competitionId } }, tx);
      });
      return apiSuccess(null, "资料已下架");
    }
    if (input.action !== "preview" && input.action !== "publish") return apiError(422, "操作类型不正确");
    const attachmentId = typeof input.attachmentId === "string" ? input.attachmentId : "";
    const attachment = attachmentId
      ? await prisma.competitionAttachment.findFirst({ where: { id: attachmentId, competitionId } })
      : null;
    if (attachmentId && !attachment) return apiError(422, "附件不属于这场赛事");
    const title = typeof input.title === "string" ? input.title.trim() : "";
    if (!title || title.length > 120) return apiError(422, "标题须为 1 至 120 字");
    const chunks = attachment
      ? await readKnowledgeAttachment(attachment)
      : chunksFromText(typeof input.text === "string" ? input.text : "", title);
    if (!chunks.length) return apiError(422, "没有可发布的正文");
    if (input.action === "preview") return apiSuccess({ chunks, fileName: attachment?.fileName ?? title });

    const now = new Date();
    if (input.effectiveAt !== undefined && typeof input.effectiveAt !== "string") return apiError(422, "生效时间格式不正确");
    const effectiveAt = input.effectiveAt ? new Date(input.effectiveAt as string) : now;
    if (!Number.isFinite(effectiveAt.getTime())) return apiError(422, "生效时间无效");
    const replacesId = typeof input.replacesId === "string" && input.replacesId ? input.replacesId : null;
    const saved = await prisma.$transaction(async (tx) => {
      if (attachment && !(await tx.competitionAttachment.findFirst({
        where: { id: attachment.id, competitionId },
        select: { id: true },
      }))) {
        throw new KnowledgeError("来源附件已被删除，请重新选择资料");
      }
      if (replacesId) {
        const updated = await tx.kbDocument.updateMany({
          where: {
            id: replacesId, competitionId, isActive: true, expiresAt: null,
            OR: [{ effectiveAt: null }, { effectiveAt: { lte: new Date(Math.min(now.getTime(), effectiveAt.getTime())) } }],
          },
          data: { expiresAt: effectiveAt },
        });
        if (updated.count !== 1) throw new KnowledgeError("旧版已下架、尚未生效或已安排替换，请刷新后重试");
      }
      const document = await tx.kbDocument.create({
        data: {
          title, competitionId, year: competition.year, effectiveAt, replacesId,
          fileName: attachment?.fileName ?? title, filePath: attachment?.filePath ?? null,
          sourceAttachmentId: attachment?.id ?? null,
          uploadedBy: actorId, chunks: { createMany: { data: chunks } },
        },
        select: { id: true },
      });
      await writeAuditLog({
        actorId, action: "KNOWLEDGE_PUBLISHED", targetType: "KbDocument", targetId: document.id,
        detail: { competitionId, attachmentId, effectiveAt: effectiveAt.toISOString(), replacesId, chunks: chunks.length },
      }, tx);
      return document;
    });
    return apiSuccess(saved, "资料已发布", 201);
  } catch (error) {
    if (error instanceof SyntaxError) return apiError(422, "请求格式不正确");
    if (error instanceof KnowledgeError) return apiError(422, error.message);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError(409, "这份附件已经加入知识库，请上传新版本文件");
    }
    console.error("知识资料维护失败", error instanceof Error ? error.name : "UNKNOWN");
    return apiError(500, "资料操作失败，请稍后重试");
  }
}
