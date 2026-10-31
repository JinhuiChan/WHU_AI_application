import mammoth from "mammoth";
import { openZip } from "mammoth/lib/unzip";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import type { MaterialCheck, MaterialCheckResult } from "@/types/material";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const PAGE_BASIS =
  "《2026-科创赛事常见问题.pdf》“商业计划书页数”（第1页，2026赛年）：商业计划书正文不超过30页，封面、目录与附录不计入正文页数。";
const SECTION_BASIS =
  "《2026-参赛材料模板说明.docx》“必备章节”（第1页，2026赛年）：商业计划书应包含项目概述、需求分析、产品或服务方案、创新点、实施计划、团队介绍、风险分析与附件说明。";
const FIGURE_BASIS =
  "《2026-参赛材料模板说明.docx》“图表编号”（第3页，2026赛年）：图与表应分别连续编号，并在正文中提供可对应的引用，避免跳号、重号或只有编号而没有说明。";

const MATERIAL_RULES: {
  maxBodyPages: number;
  wordCount: { min: number; max: number; basis: string } | null;
  requiredSections: Array<{ name: string; aliases: string[] }>;
} = {
  maxBodyPages: 30,
  wordCount: null,
  requiredSections: [
    { name: "项目概述", aliases: ["项目概述"] },
    { name: "需求分析", aliases: ["需求分析"] },
    { name: "产品或服务方案", aliases: ["产品或服务方案", "产品方案", "服务方案"] },
    { name: "创新点", aliases: ["创新点"] },
    { name: "实施计划", aliases: ["实施计划"] },
    { name: "团队介绍", aliases: ["团队介绍"] },
    { name: "风险分析", aliases: ["风险分析"] },
    { name: "附件说明", aliases: ["附件说明"] },
  ],
};

export class MaterialCheckError extends Error {}

type MaterialKind = "PDF" | "DOCX";

type ParsedMaterial = {
  kind: MaterialKind;
  text: string;
  pageCount: number | null;
};

export type MaterialInspection = {
  result: MaterialCheckResult;
  fileType: MaterialKind;
  fileSize: number;
};

function materialKind(fileName: string): MaterialKind {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "pdf") return "PDF";
  if (extension === "docx") return "DOCX";
  throw new MaterialCheckError("仅支持 PDF 或 DOCX 文件");
}

function validateSignature(kind: MaterialKind, buffer: Buffer) {
  if (kind === "PDF" && buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new MaterialCheckError("文件内容与 PDF 格式不符");
  }
  if (kind === "DOCX" && !(buffer[0] === 0x50 && buffer[1] === 0x4b)) {
    throw new MaterialCheckError("文件内容与 DOCX 格式不符");
  }
}

async function docxPageCount(buffer: Buffer) {
  const archive = await openZip({ buffer });
  if (!archive.exists("docProps/app.xml")) return null;
  const xml = await archive.read("docProps/app.xml", "utf8");
  const match = xml.match(/<Pages>(\d+)<\/Pages>/);
  if (!match) return null;
  const pages = Number(match[1]);
  return Number.isInteger(pages) && pages > 0 ? pages : null;
}

async function parseMaterial(kind: MaterialKind, buffer: Buffer): Promise<ParsedMaterial> {
  try {
    if (kind === "PDF") {
      const parsed = await pdfParse(buffer);
      return { kind, text: parsed.text, pageCount: parsed.numpages };
    }
    const [parsed, pageCount] = await Promise.all([
      mammoth.extractRawText({ buffer }),
      docxPageCount(buffer),
    ]);
    return { kind, text: parsed.value, pageCount };
  } catch {
    throw new MaterialCheckError(`无法解析该 ${kind} 文件，请确认文件未损坏且未加密`);
  }
}

function pageCheck(material: ParsedMaterial): MaterialCheck {
  const { kind, pageCount } = material;
  if (kind === "DOCX" && pageCount === null) {
    return {
      item: "页数上限（需人工复核）",
      pass: false,
      basis: PAGE_BASIS,
      suggestion: "未读取到可靠的 DOCX 页数，请在 Word/WPS 中核对正文页数，或导出为 PDF 后重新检查。",
    };
  }

  const pages = pageCount ?? 0;
  const pass = pages > 0 && pages <= MATERIAL_RULES.maxBodyPages;
  return {
    item: kind === "PDF" ? "页数上限（PDF 总页数初检）" : "页数上限（DOCX 元数据初检）",
    pass,
    basis: PAGE_BASIS,
    suggestion: pass
      ? `检测到文件共 ${pages} 页；提交前仍请按正文口径复核，封面、目录与附录不计入正文页数。DOCX 页数会随排版环境变化。`
      : `检测到文件共 ${pages} 页，已超过 ${MATERIAL_RULES.maxBodyPages} 页；请先区分正文与不计页部分，再压缩超出的正文内容。`,
  };
}

function wordCountCheck(characterCount: number): MaterialCheck {
  const range = MATERIAL_RULES.wordCount;
  if (!range) {
    return {
      item: "字数区间（待确认口径）",
      pass: false,
      basis: "现有知识库未载明商业计划书的字数上下限，系统不自行设定数值口径。",
      suggestion: `本次按去除空白后的字符数统计为 ${characterCount}。请向赛事办确认字数区间后人工核对，此项不表示材料不合规。`,
    };
  }

  const pass = characterCount >= range.min && characterCount <= range.max;
  return {
    item: "字数区间",
    pass,
    basis: range.basis,
    suggestion: pass
      ? `当前统计为 ${characterCount} 字，处于 ${range.min}–${range.max} 字区间内。`
      : `当前统计为 ${characterCount} 字，请调整至 ${range.min}–${range.max} 字区间。`,
  };
}

function requiredSectionCheck(text: string): MaterialCheck {
  const normalized = text.replace(/\s+/g, "");
  const missing = MATERIAL_RULES.requiredSections.filter(
    (section) => !section.aliases.some((alias) => normalized.includes(alias)),
  );
  const pass = missing.length === 0;
  return {
    item: "必备章节",
    pass,
    basis: SECTION_BASIS,
    suggestion: pass
      ? `已识别全部 ${MATERIAL_RULES.requiredSections.length} 个必备章节，请保持标题层级清晰，并复核章节内容是否完整。`
      : `未识别到：${missing.map((section) => section.name).join("、")}；请按模板补充对应章节，并核对章节标题。`,
  };
}

type FigureEntry = {
  kind: "图" | "表";
  chapter: number;
  order: number | null;
  label: string;
};

function figureNumberIssues(entries: FigureEntry[]) {
  const issues: string[] = [];
  for (const kind of ["图", "表"] as const) {
    const items = entries.filter((entry) => entry.kind === kind);
    if (!items.length) continue;
    const plain = items.filter((entry) => entry.order === null);
    const chaptered = items.filter((entry) => entry.order !== null);
    if (plain.length && chaptered.length) {
      issues.push(`${kind}编号混用了普通编号与章节编号`);
    }

    plain.forEach((entry, index) => {
      if (entry.chapter !== index + 1) {
        issues.push(`${entry.label} 在此处应为 ${kind}${index + 1}`);
      }
    });

    const chapters = new Map<number, FigureEntry[]>();
    for (const entry of chaptered) {
      const group = chapters.get(entry.chapter) ?? [];
      group.push(entry);
      chapters.set(entry.chapter, group);
    }
    for (const [chapter, group] of chapters) {
      group.forEach((entry, index) => {
        if (entry.order !== index + 1) {
          issues.push(`${entry.label} 在此处应为 ${kind}${chapter}-${index + 1}`);
        }
      });
    }
  }
  return issues;
}

function figureCheck(text: string): MaterialCheck {
  const entries: FigureEntry[] = [];
  const captionPattern = /^[\t \f]*(图|表)\s*(\d+)(?:\s*[-–—.．]\s*(\d+))?/gm;
  for (const match of text.matchAll(captionPattern)) {
    const chapter = Number(match[2]);
    const order = match[3] ? Number(match[3]) : null;
    entries.push({
      kind: match[1] as "图" | "表",
      chapter,
      order,
      label: `${match[1]}${chapter}${order === null ? "" : `-${order}`}`,
    });
  }

  const hasNumberMention = /[图表]\s*\d/.test(text);
  const issues = figureNumberIssues(entries);
  if (!entries.length && hasNumberMention) {
    issues.push("检测到图表编号，但未识别到位于独立行行首的图表标题");
  }
  const pass = issues.length === 0;
  return {
    item: "图表编号连续性",
    pass,
    basis: FIGURE_BASIS,
    suggestion: pass
      ? entries.length
        ? `已识别 ${entries.map((entry) => entry.label).join("、")}；编号连续，请继续核对正文引用与图表说明。`
        : "未检测到图表编号；如材料包含图表，请将“图1 …”“表1 …”等标题置于独立行并连续编号。"
      : `${issues.join("；")}。请按出现顺序分别调整图、表编号，避免跳号、重号，并补充对应说明。`,
  };
}

function runRules(material: ParsedMaterial): MaterialCheckResult {
  const characterCount = material.text.replace(/\s/g, "").length;
  const checks = [
    pageCheck(material),
    wordCountCheck(characterCount),
    requiredSectionCheck(material.text),
    figureCheck(material.text),
  ];
  const reviewCount = checks.filter(
    (check) => check.item.includes("待确认") || check.item.includes("人工复核"),
  ).length;
  const reviewNote = reviewCount ? `其中 ${reviewCount} 项需人工确认口径或复核。` : "";
  return {
    checks,
    summary: `${material.kind} 解析完成，共 ${checks.length} 项检查；${reviewNote}原文未入库、未落盘。仅供参考，非评审结论。`,
  };
}

export async function inspectMaterial(file: File): Promise<MaterialInspection> {
  if (file.size === 0) throw new MaterialCheckError("上传文件不能为空");
  if (file.size > MAX_FILE_SIZE) throw new MaterialCheckError("文件大小不能超过 10MB");
  const kind = materialKind(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  validateSignature(kind, buffer);
  const material = await parseMaterial(kind, buffer);
  if (!material.text.trim()) {
    throw new MaterialCheckError("未能提取可检索文本，请使用含文本层的 PDF 或 DOCX 文件");
  }
  return {
    result: runRules(material),
    fileType: kind,
    fileSize: file.size,
  };
}
