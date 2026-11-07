import { readFile } from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import type { Prisma } from "@prisma/client";

export const MAX_KNOWLEDGE_TEXT = 120_000;
export const MAX_KNOWLEDGE_CHUNKS = 200;
const CHUNK_SIZE = 1_200;

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

function headingLevel(line: string) {
  const markdown = line.match(/^(#{1,6})\s+/);
  if (markdown) return markdown[1].length;
  if (/^第[一二三四五六七八九十百\d]+章/.test(line) || /^[一二三四五六七八九十]+[、．]/.test(line)) return 1;
  if (/^第[一二三四五六七八九十百\d]+节/.test(line) || /^[（(][一二三四五六七八九十]+[）)]/.test(line)) return 2;
  if (/^第[一二三四五六七八九十百\d]+条/.test(line) || /^\d+[.．、]\s*[^\d]/.test(line)) return 3;
  if (/^[（(]\d+[）)]/.test(line)) return 4;
  return null;
}

function splitPage(text: string, title: string, page: number | null, headings: string[] = []): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];
  let section = headings.filter(Boolean).join(" / ").slice(0, 160) || title;
  let pending = "";
  function flush() {
    if (pending.trim()) chunks.push({ section, page, content: pending.trim(), keywords: "" });
    pending = "";
  }
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    const level = headingLevel(line);
    if (level !== null) {
      flush();
      headings.length = level - 1;
      headings[level - 1] = line.replace(/^#{1,6}\s+/, "").slice(0, 120);
      section = headings.filter(Boolean).join(" / ").slice(0, 160);
    }
    for (const piece of line.match(/[^。！？]+[。！？]?/gu) ?? []) {
      for (const segment of piece.match(/[\s\S]{1,1200}/gu) ?? []) {
        if (pending.length + segment.length > CHUNK_SIZE) flush();
        pending = pending ? `${pending}\n${segment}` : segment;
      }
    }
  }
  flush();
  return chunks;
}

export function chunksFromText(text: string, title: string): KnowledgeChunk[] {
  if (!text.trim()) throw new KnowledgeError("请填写正文");
  if (text.length > MAX_KNOWLEDGE_TEXT) throw new KnowledgeError("正文最多 12 万字，请分开整理资料");
  const chunks = splitPage(text, title, null);
  if (chunks.length > MAX_KNOWLEDGE_CHUNKS) throw new KnowledgeError("段落过多，请拆分文件");
  return chunks;
}

export async function readKnowledgeAttachment(attachment: { competitionId: string; fileName: string; filePath: string }) {
  const root = path.resolve(process.cwd(), "public", "uploads", "competitions", attachment.competitionId);
  const file = path.resolve(process.cwd(), "public", `.${attachment.filePath}`);
  if (!file.startsWith(root + path.sep)) throw new KnowledgeError("附件路径无效，请重新上传文件");
  const extension = path.extname(attachment.fileName).toLowerCase();
  if (![".txt", ".docx", ".pdf"].includes(extension)) throw new KnowledgeError("支持 TXT、DOCX 和含文字的 PDF");
  let buffer: Buffer;
  try { buffer = await readFile(file); } catch { throw new KnowledgeError("附件文件不存在，请重新上传"); }
  if (!buffer.length || buffer.length > 20 * 1024 * 1024) throw new KnowledgeError("文件须大于 0 且不超过 20MB");
  const pages: { text: string; page: number | null }[] = [];
  try {
    if (extension === ".pdf") {
      await pdfParse(buffer, {
        pagerender: async (page) => {
          const content = await page.getTextContent({ normalizeWhitespace: true });
          let y: number | undefined;
          let text = "";
          for (const item of content.items) {
            const nextY = item.transform?.[5];
            text += `${y === nextY ? " " : "\n"}${item.str}`;
            y = nextY;
          }
          pages.push({ text, page: page.pageNumber });
          return text;
        },
      });
    } else {
      const text = extension === ".docx"
        ? (await mammoth.extractRawText({ buffer })).value
        : new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      pages.push({ text, page: null });
    }
  } catch { throw new KnowledgeError("无法解析附件，请上传有效文件或手工录入核对过的正文"); }
  if (!pages.some(({ text }) => text.trim())) throw new KnowledgeError("没有提取到文字。扫描件请先识别，或手工录入正文");
  if (pages.reduce((sum, item) => sum + item.text.length, 0) > MAX_KNOWLEDGE_TEXT) throw new KnowledgeError("正文最多 12 万字，请拆分文件");
  const headings: string[] = [];
  const chunks = pages.flatMap(({ text, page }) => splitPage(text, attachment.fileName, page, headings));
  if (chunks.length > MAX_KNOWLEDGE_CHUNKS) throw new KnowledgeError("段落过多，请拆分文件");
  return chunks;
}
