import { readFile } from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import type { Prisma } from "@prisma/client";
import { docxHtmlBlocks, headingLevel, pdfPageBlocks, type DocumentBlock } from "@/lib/document-structure";
import { intentTopics } from "@/lib/document-intent";

export const MAX_KNOWLEDGE_TEXT = 120_000;
export const MAX_KNOWLEDGE_CHUNKS = 200;
const CHUNK_SIZE = 1_200;
export const DOCUMENT_PARSER_VERSION = 3;

export class KnowledgeError extends Error {}
export type KnowledgeChunk = { section: string; page: number | null; content: string; keywords: string };

export function effectiveKnowledge(competitionId: string, now = new Date()): Prisma.KbDocumentWhereInput {
  return {
    competitionId,
    competition: { publishStatus: "PUBLISHED" },
    isActive: true,
    AND: [
      { OR: [{ effectiveAt: null }, { effectiveAt: { lte: now } }] },
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    ],
  };
}

export function structureChunks(blocks: DocumentBlock[], title: string): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];
  const headings: string[] = [];
  let section = title;
  let pending = "";
  let page: number | null = null;
  let table = false;
  function flush() {
    if (pending.trim()) {
      const topics = Object.entries(intentTopics).filter(([, words]) => words.some((word) => `${section}\n${pending}`.includes(word))).map(([topic]) => topic);
      chunks.push({ section, page, content: pending.trim(), keywords: JSON.stringify({ parserVersion: DOCUMENT_PARSER_VERSION, order: chunks.length, table, topics }) });
    }
    pending = "";
  }
  for (const block of blocks) {
    const line = block.text.trim();
    if (!line) continue;
    const level = block.level;
    if (level !== undefined) {
      flush();
      headings.length = level - 1;
      headings[level - 1] = line.replace(/^#{1,6}\s+/, "").slice(0, 120);
      section = headings.filter(Boolean).join(" / ").slice(0, 160);
    }
    if (block.page !== page || !!block.table !== table || block.table) flush();
    page = block.page; table = !!block.table;
    // Prefer complete clauses; retain the heading on every continuation chunk.
    for (const piece of line.match(/[^。！？]+[。！？]?/gu) ?? []) {
      for (const segment of piece.match(/[\s\S]{1,1200}/gu) ?? []) {
        if (pending.length + segment.length + 1 > CHUNK_SIZE) flush();
        pending = pending ? `${pending}\n${segment}` : segment;
      }
    }
    if (table) flush();
  }
  flush();
  return chunks;
}

export function chunksFromText(text: string, title: string): KnowledgeChunk[] {
  if (!text.trim()) throw new KnowledgeError("请填写正文");
  if (text.length > MAX_KNOWLEDGE_TEXT) throw new KnowledgeError("正文最多 12 万字，请分开整理资料");
  const chunks = structureChunks(text.replace(/\r\n?/g, "\n").split("\n").map((text) => ({ text: text.trim(), level: headingLevel(text.trim()), page: null })), title);
  if (chunks.length > MAX_KNOWLEDGE_CHUNKS) throw new KnowledgeError("段落过多，请拆分文件");
  return chunks;
}

const samplePaths = new Set(["/samples/赛事报名通知.txt", "/samples/参赛规程与组别说明.txt"]);
export function knowledgeAttachmentIssue(attachment: { competitionId: string; fileName: string; filePath: string }) {
  if (![".txt", ".docx", ".pdf"].includes(path.extname(attachment.fileName).toLowerCase())) return "不支持解析此格式";
  const root = path.resolve(process.cwd(), "public", "uploads", "competitions", attachment.competitionId);
  const file = path.resolve(process.cwd(), "public", `.${attachment.filePath}`);
  if (!file.startsWith(root + path.sep) && !samplePaths.has(attachment.filePath)) return "附件路径无效，请重新上传";
  return null;
}
export async function readKnowledgeAttachment(attachment: { competitionId: string; fileName: string; filePath: string }) {
  const issue = knowledgeAttachmentIssue(attachment);
  if (issue) throw new KnowledgeError(issue);
  const file = path.resolve(process.cwd(), "public", `.${attachment.filePath}`);
  const extension = path.extname(attachment.fileName).toLowerCase();
  if (![".txt", ".docx", ".pdf"].includes(extension)) throw new KnowledgeError("支持 TXT、DOCX 和含文字的 PDF");
  let buffer: Buffer;
  try { buffer = await readFile(file); } catch { throw new KnowledgeError("附件文件不存在，请重新上传"); }
  return parseKnowledgeBuffer(buffer, attachment.fileName);
}

export async function parseKnowledgeBuffer(buffer: Buffer, fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  if (![".txt", ".docx", ".pdf"].includes(extension)) throw new KnowledgeError("支持 TXT、DOCX 和含文字的 PDF");
  if (!buffer.length || buffer.length > 20 * 1024 * 1024) throw new KnowledgeError("文件须大于 0 且不超过 20MB");
  const blocks: DocumentBlock[] = [];
  const unreadablePages: number[] = [];
  try {
    if (extension === ".pdf") {
      const completedPages = new Set<number>();
      // PDF.js assumes TypedArray.slice copies; Node Buffer.slice returns a shared view.
      const parsed = await pdfParse(Uint8Array.from(buffer), {
        pagerender: async (page) => {
          const content = await page.getTextContent({ normalizeWhitespace: true });
          const extracted = pdfPageBlocks(content.items, page.pageNumber);
          const text = extracted.map((block) => block.text).join("\n");
          if (text.replace(/\s/g, "").length < 10) {
            const operators = await page.getOperatorList();
            // PDF.js OPS: image masks, inline images and image XObjects.
            if (operators.fnArray.some((op) => [82, 83, 84, 85, 86, 87, 88, 89, 90].includes(op))) unreadablePages.push(page.pageNumber);
          }
          blocks.push(...extracted);
          completedPages.add(page.pageNumber);
          return text;
        },
      });
      if (completedPages.size !== parsed.numpages) throw new KnowledgeError("部分 PDF 页面解析失败，未将不完整文档用于问答，请重新导出后上传");
    } else if (extension === ".docx") {
      const result = await mammoth.convertToHtml({ buffer }, { includeDefaultStyleMap: true });
      blocks.push(...docxHtmlBlocks(result.value));
    } else {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      blocks.push(...text.replace(/\r\n?/g, "\n").split("\n").map((text) => ({ text: text.trim(), level: headingLevel(text.trim()), page: null })));
    }
  } catch (error) {
    if (error instanceof KnowledgeError) throw error;
    throw new KnowledgeError("无法解析附件，请在赛事栏重新上传有效的 DOCX、含文字的 PDF 或 TXT");
  }
  if (unreadablePages.length) throw new KnowledgeError(`第 ${unreadablePages.slice(0, 12).join("、")} 页为扫描图片或文字不足，需先完成 OCR 识别再上传；未将不完整文档用于问答`);
  if (!blocks.some(({ text }) => text.trim())) throw new KnowledgeError("没有提取到文字。扫描件需先完成 OCR 识别，再从赛事栏重新上传");
  const text = blocks.map((block) => block.text).join("\n");
  if ((text.match(/\uFFFD/g)?.length ?? 0) > Math.max(5, text.length * 0.01)) throw new KnowledgeError("提取文字存在较多乱码，请更换可复制文字的文件");
  if (text.length > MAX_KNOWLEDGE_TEXT) throw new KnowledgeError("正文最多 12 万字，请拆分文件");
  const chunks = structureChunks(blocks, fileName);
  if (chunks.length > MAX_KNOWLEDGE_CHUNKS) throw new KnowledgeError("段落过多，请拆分文件");
  return chunks;
}
