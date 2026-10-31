import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AssistantResult } from "@/types/assistant";

export const HANDOFF_ANSWER = "该问题暂无权威口径，建议联系赛事办（027-68775751）。";

const MAX_SEARCH_TERMS = 72;
const questionStopWords = new Set([
  "请问",
  "什么",
  "是谁",
  "多少",
  "几个",
  "哪位",
  "怎么",
  "怎样",
  "如何",
  "是否",
  "能否",
  "可以",
  "需要",
  "知道",
  "一下",
  "我想",
  "帮我",
  "我们",
  "你们",
  "以及",
  "还是",
  "或者",
]);

type RetrievedChunk = Prisma.KbChunkGetPayload<{
  include: { document: true };
}>;

type ScoredChunk = {
  chunk: RetrievedChunk;
  score: number;
};

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, "");
}

function requestedYear(question: string) {
  const match = question.match(/20\d{2}/);
  if (!match) return null;
  const year = Number(match[0]);
  return year >= 2000 && year <= 2100 ? year : null;
}

function searchTerms(question: string) {
  const normalized = normalizeSearchText(question.replace(/20\d{2}/g, ""));
  const segments = normalized.match(/[a-z0-9]+|[\u4e00-\u9fff]+/g) ?? [];
  const terms = new Set<string>();

  for (const segment of segments) {
    if (/^[a-z0-9]+$/.test(segment)) {
      if (segment.length >= 2) terms.add(segment);
      continue;
    }
    for (let length = Math.min(6, segment.length); length >= 2; length -= 1) {
      for (let index = 0; index + length <= segment.length; index += 1) {
        const term = segment.slice(index, index + length);
        if (!questionStopWords.has(term)) terms.add(term);
      }
    }
  }

  return [...terms].sort((left, right) => right.length - left.length).slice(0, MAX_SEARCH_TERMS);
}

function scoreChunk(chunk: RetrievedChunk, terms: string[]) {
  const section = normalizeSearchText(chunk.section);
  const keywords = normalizeSearchText(chunk.keywords);
  const content = normalizeSearchText(chunk.content);
  let score = 0;

  for (const term of terms) {
    const weight = term.length >= 5 ? 12 : term.length === 4 ? 8 : term.length === 3 ? 4 : 2;
    if (section.includes(term)) score += weight * 6;
    if (keywords.includes(term)) score += weight * 4;
    if (content.includes(term)) score += weight * 2;
  }
  return score;
}

async function searchChunks(terms: string[], year: number | null) {
  const rows = await prisma.kbChunk.findMany({
    where: {
      ...(year ? { document: { year } } : {}),
      OR: terms.flatMap((term) => [
        { keywords: { contains: term } },
        { content: { contains: term } },
        { section: { contains: term } },
      ]),
    },
    include: { document: true },
    orderBy: [{ document: { year: "desc" } }, { document: { createdAt: "desc" } }, { page: "asc" }],
    take: 60,
  });
  return rows
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, terms) }))
    .filter((item) => item.score >= 16)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      const createdAtDifference = right.chunk.document.createdAt.getTime() - left.chunk.document.createdAt.getTime();
      if (createdAtDifference !== 0) return createdAtDifference;
      return (left.chunk.page ?? Number.MAX_SAFE_INTEGER) - (right.chunk.page ?? Number.MAX_SAFE_INTEGER);
    });
}

function bestChunksByYear(scored: ScoredChunk[]) {
  const bestByYear = new Map<number, ScoredChunk>();
  for (const item of scored) {
    const year = item.chunk.document.year;
    if (!bestByYear.has(year)) bestByYear.set(year, item);
  }
  return bestByYear;
}

async function retrieve(
  question: string,
): Promise<{ best: ScoredChunk; multipleYears: boolean; usedYearFallback: boolean } | null> {
  const terms = searchTerms(question);
  if (!terms.length) return null;
  const year = requestedYear(question);
  const scored = await searchChunks(terms, year);

  if (year && scored.length) {
    return { best: scored[0], multipleYears: false, usedYearFallback: false };
  }
  if (year) {
    const fallbackChunks = await searchChunks(terms, null);
    const bestByYear = bestChunksByYear(fallbackChunks);
    const nearestYear = [...bestByYear.keys()].sort(
      (left, right) => Math.abs(left - year) - Math.abs(right - year) || right - left,
    )[0];
    const best = bestByYear.get(nearestYear);
    return best ? { best, multipleYears: false, usedYearFallback: true } : null;
  }

  if (!scored.length) return null;
  const bestByYear = bestChunksByYear(scored);
  const highestScore = scored[0].score;
  const eligibleYears = [...bestByYear.entries()]
    .filter(([, item]) => item.score >= highestScore * 0.55)
    .map(([chunkYear]) => chunkYear);
  const best = bestByYear.get(Math.max(...eligibleYears));
  return best ? { best, multipleYears: eligibleYears.length > 1, usedYearFallback: false } : null;
}

function citation(chunk: RetrievedChunk) {
  return `【出处：${chunk.document.fileName} · ${chunk.section} · ${chunk.document.year}】`;
}

function offlineAnswer(chunk: RetrievedChunk, multipleYears: boolean) {
  return `${chunk.content.trim()}\n\n${citation(chunk)}${multipleYears ? "\n如需其他赛年请说明。" : ""}`;
}

function completionText(body: unknown) {
  if (typeof body !== "object" || body === null || !("choices" in body) || !Array.isArray(body.choices)) {
    return null;
  }
  const first: unknown = body.choices[0];
  if (typeof first !== "object" || first === null || !("message" in first)) return null;
  const message: unknown = first.message;
  if (typeof message !== "object" || message === null || !("content" in message)) return null;
  return typeof message.content === "string" ? message.content : null;
}

async function modelAnswer(question: string, chunk: RetrievedChunk) {
  const baseUrl = process.env.LLM_BASE_URL?.trim();
  const model = process.env.LLM_MODEL?.trim();
  if (!baseUrl || !model) return null;

  const endpoint = baseUrl.endsWith("/chat/completions")
    ? baseUrl
    : `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const material = [
    `文件名：${chunk.document.fileName}`,
    `章节：${chunk.section}`,
    `页码：${chunk.page ?? "未标注"}`,
    `适用赛年：${chunk.document.year}`,
    `段落：${chunk.content}`,
  ].join("\n");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.LLM_API_KEY?.trim()
          ? { Authorization: `Bearer ${process.env.LLM_API_KEY.trim()}` }
          : {}),
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content:
              "只基于给定材料回答，不得引入外部知识。材料未说明时直接说给定材料未说明。不要输出出处、文件名、章节、页码或赛年，出处由系统统一添加。",
          },
          {
            role: "user",
            content: `问题：${question}\n\n请只依据以下给定材料回答：\n${material}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`模型接口返回 ${response.status}`);
    const text = completionText(await response.json());
    const cleaned = text
      ?.replace(/【\s*出处\s*[:：][\s\S]*?】/g, "")
      .replace(/(?:^|\n)\s*(?:出处|来源)\s*[:：].*(?=\n|$)/g, "")
      .trim();
    return cleaned || null;
  } catch (error) {
    console.error("模型调用失败，已使用检索式回答：", error instanceof Error ? error.message : "未知错误");
    return null;
  }
}

export async function answerQuestion(question: string): Promise<AssistantResult> {
  const retrieved = await retrieve(question);
  if (!retrieved) {
    return { answer: HANDOFF_ANSWER, evidence: null, handoff: true };
  }

  const { chunk } = retrieved.best;
  const year = requestedYear(question);
  const fallbackNote = retrieved.usedYearFallback && year !== null
    ? `\n注：知识库暂无 ${year} 版材料，以上为 ${chunk.document.year} 口径。`
    : "";
  const modelQuestion = retrieved.usedYearFallback && year !== null
    ? question.replace(/20\d{2}/g, String(chunk.document.year))
    : question;
  const generated = await modelAnswer(modelQuestion, chunk);
  const answer = generated
    ? `${generated}\n\n${citation(chunk)}${retrieved.multipleYears ? "\n如需其他赛年请说明。" : ""}${fallbackNote}`
    : `${offlineAnswer(chunk, retrieved.multipleYears)}${fallbackNote}`;
  return {
    answer,
    evidence: {
      chunkId: chunk.id,
      fileName: chunk.document.fileName,
      section: chunk.section,
      page: chunk.page,
      year: chunk.document.year,
    },
    handoff: false,
  };
}
