import { parseFragment, type DefaultTreeAdapterTypes } from "parse5";

export type DocumentBlock = { text: string; page: number | null; level?: number; table?: boolean };
type HtmlNode = DefaultTreeAdapterTypes.Node;

export function headingLevel(text: string): number | undefined {
  if (text.length > 110) return;
  const markdown = text.match(/^(#{1,6})\s+/);
  if (markdown) return markdown[1].length;
  if (/^第[一二三四五六七八九十百\d]+章|^[一二三四五六七八九十]+[、．]/.test(text)) return 1;
  if (/^第[一二三四五六七八九十百\d]+节|^[（(][一二三四五六七八九十]+[）)]/.test(text)) return 2;
  if (/^第[一二三四五六七八九十百\d]+条|^\d+[.．、]\s*[^\d]/.test(text)) return 3;
  if (/^[（(]\d+[）)]/.test(text)) return 4;
}

function children(node: HtmlNode): HtmlNode[] { return "childNodes" in node ? node.childNodes : []; }
function tag(node: HtmlNode) { return "tagName" in node ? node.tagName : ""; }
function textOf(node: HtmlNode): string {
  if ("value" in node) return node.value;
  if (tag(node) === "br") return "\n";
  return children(node).map(textOf).join("").trim();
}
function cellText(node: HtmlNode): string {
  return children(node).map((child) => textOf(child) + (["p", "li"].includes(tag(child)) ? "；" : "")).join("").replace(/；$/, "").trim();
}
function span(node: HtmlNode, name: string) {
  const value = "attrs" in node ? Number(node.attrs.find((attr) => attr.name === name)?.value || 1) : 1;
  return Math.min(100, Math.max(1, Number.isFinite(value) ? value : 1));
}

// Only the table's own rows, so nested tables do not become unrelated extra rows.
function tableRows(node: HtmlNode): HtmlNode[] {
  return children(node).flatMap((child) => tag(child) === "tr" ? [child] : ["thead", "tbody", "tfoot"].includes(tag(child)) ? tableRows(child) : []);
}

export function docxHtmlBlocks(html: string): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  let tableNumber = 0;
  function visit(node: HtmlNode, listDepth = 0) {
    const name = tag(node);
    if (["script", "style", "img"].includes(name)) return;
    if (name === "table") {
      tableNumber++;
      const grid: string[][] = [];
      for (const [rowIndex, row] of tableRows(node).entries()) {
        grid[rowIndex] ??= [];
        let col = 0;
        for (const cell of children(row).filter((child) => ["td", "th"].includes(tag(child)))) {
          while (grid[rowIndex][col] !== undefined) col++;
          const value = cellText(cell);
          const width = span(cell, "colspan"), height = span(cell, "rowspan");
          for (let dy = 0; dy < height; dy++) {
            grid[rowIndex + dy] ??= [];
            for (let dx = 0; dx < width; dx++) grid[rowIndex + dy][col + dx] = value;
          }
          col += width;
        }
      }
      const header = grid[0] ?? [];
      if (header.length) blocks.push({ text: `表格${tableNumber} · 第1行（表头或首行原文）\n${header.map((value, index) => `第${index + 1}列：${value || "（空白）"}`).join("；")}`, page: null, table: true });
      for (const [index, row] of grid.entries()) {
        if (index === 0) continue;
        blocks.push({ text: `表格${tableNumber} · 第${index + 1}行\n${row.map((value, col) => `${header[col] || `第${col + 1}列`}：${value || "（空白）"}`).join("；")}`, page: null, table: true });
      }
      return;
    }
    if (/^h[1-6]$/.test(name)) {
      const text = textOf(node); if (text) blocks.push({ text, level: Number(name[1]), page: null });
      return;
    }
    if (["ol", "ul"].includes(name)) {
      children(node).filter((child) => tag(child) === "li").forEach((child, index) => {
        const direct = children(child).filter((part) => !["ol", "ul"].includes(tag(part))).map(textOf).join(" ").trim();
        if (direct) blocks.push({ text: `${name === "ol" ? `${index + 1}.` : "•"} ${direct}`, page: null, level: headingLevel(direct) });
        children(child).filter((part) => ["ol", "ul"].includes(tag(part))).forEach((part) => visit(part, listDepth + 1));
      });
      return;
    }
    if (name === "p") {
      const text = textOf(node); if (text) blocks.push({ text, level: headingLevel(text), page: null });
      return;
    }
    children(node).forEach((child) => visit(child, listDepth));
  }
  visit(parseFragment(html));
  return blocks;
}

export type PdfTextItem = { str: string; transform?: number[]; width?: number; height?: number };

export function pdfPageBlocks(items: PdfTextItem[], page: number): DocumentBlock[] {
  const lines: { y: number; height: number; items: PdfTextItem[] }[] = [];
  for (const item of items.filter((entry) => entry.str.trim())) {
    const y = item.transform?.[5] ?? 0;
    let line = lines.find((candidate) => Math.abs(candidate.y - y) < 2);
    if (!line) { line = { y, height: item.height || Math.abs(item.transform?.[3] || 12), items: [] }; lines.push(line); }
    line.items.push(item);
  }
  lines.sort((a, b) => b.y - a.y);
  const blocks: DocumentBlock[] = [];
  let paragraph = "";
  const flush = () => { if (paragraph) blocks.push({ text: paragraph, page }); paragraph = ""; };
  lines.forEach((line, index) => {
    line.items.sort((a, b) => (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0));
    let text = "";
    line.items.forEach((item, itemIndex) => {
      const previous = line.items[itemIndex - 1];
      const gap = previous ? (item.transform?.[4] ?? 0) - ((previous.transform?.[4] ?? 0) + (previous.width ?? 0)) : 0;
      text += (gap > Math.max(24, line.height * 2) ? " | " : gap > 2 && /[a-z0-9]$/i.test(text) && /^[a-z0-9]/i.test(item.str) ? " " : "") + item.str;
    });
    text = text.trim();
    // Repeated page numbers are layout furniture, not rules or dates.
    if (/^[—–－-]?\s*\d{1,4}\s*[—–－-]?$/.test(text) && (index === 0 || index === lines.length - 1)) return;
    const level = headingLevel(text);
    if (level || text.includes(" | ")) {
      flush(); blocks.push({ text, page, level, table: text.includes(" | ") }); return;
    }
    const gapAbove = index ? lines[index - 1].y - line.y : 0;
    if (/^[①②③④⑤⑥⑦⑧⑨⑩]|^[（(][一二三四五六七八九十\d]+[）)]/.test(text) || gapAbove > line.height * 2.2) flush();
    paragraph += paragraph && /[a-z0-9]$/i.test(paragraph) && /^[a-z0-9]/i.test(text) ? ` ${text}` : text;
    if (/[。！？；]$/.test(text)) flush();
  });
  flush();
  return blocks;
}
