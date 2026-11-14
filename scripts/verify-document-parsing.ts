import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { chunksFromText, knowledgeAttachmentIssue, parseKnowledgeBuffer, structureChunks } from "../lib/knowledge";
import { docxHtmlBlocks, pdfPageBlocks } from "../lib/document-structure";
import { documentIntent } from "../lib/document-intent";
import { isTeamRecruitmentQuestion } from "../lib/team-context";

async function main() {
  const rows = structureChunks(docxHtmlBlocks(`<h1>报名要求</h1><h2>组别人数</h2><table><tr><th>组别</th><th>人数</th><th>材料</th></tr><tr><td rowspan="2">本科生组</td><td>3至5人</td><td>计划书</td></tr><tr><td>6至8人</td><td>补充说明</td></tr><tr><td>研究生组</td><td>4至9人</td><td>论文</td></tr></table>`), "fixture");
  assert.ok(rows.some((row) => row.content.includes("组别：本科生组；人数：6至8人；材料：补充说明")));
  assert.ok(rows.some((row) => row.content.includes("组别：研究生组；人数：4至9人；材料：论文")));
  assert.ok(rows.filter((row) => row.content.includes("表格")).every((row) => row.section.includes("组别人数")));
  console.log("PASS 表头、同行条件、纵向合并单元格与组别章节关系");

  const long = chunksFromText("# 创意组\n" + "只适用于尚未注册公司的本科生。".repeat(110) + "但负责人已毕业的除外。", "长条款");
  assert.ok(long.length > 1 && long.every((chunk) => chunk.section.includes("创意组")));
  assert.ok(long.some((chunk) => chunk.content.includes("负责人已毕业的除外")));
  assert.deepEqual(long.map((chunk) => JSON.parse(chunk.keywords).order), long.map((_, index) => index));
  const page = pdfPageBlocks([
    { str: "流程", transform: [12, 0, 0, 12, 30, 700] },
    { str: "报名后提交材料。", transform: [12, 0, 0, 12, 30, 660] },
    { str: "12", transform: [12, 0, 0, 12, 300, 20] },
  ], 12);
  assert.ok(page.every((block) => block.page === 12));
  assert.ok(!page.some((block) => block.text === "12"));
  const digits = pdfPageBlocks([...[..."2025"].map((str, index) => ({ str, transform: [12, 0, 0, 12, 30 + index * 8, 700], width: 7.3 })), { str: "年", transform: [12, 0, 0, 12, 64, 700] }], 1);
  assert.ok(digits.some((block) => block.text.includes("2025年")), "PDF 字间距不能将年份拆成 2 0 2 5");
  console.log("PASS 长条款限制保留、片段顺序、PDF 页码与页脚排除");

  const fixture = (name: string) => readFile(path.join(process.cwd(), "scripts/fixtures", name));
  const word = await parseKnowledgeBuffer(await fixture("document-rules.docx"), "表格规程.docx");
  assert.ok(word.some((chunk) => chunk.section.includes("本科生组")));
  assert.ok(word.some((chunk) => chunk.content.includes("人数：3至5人") && chunk.content.includes("材料：计划书")));
  assert.ok(word.some((chunk) => chunk.content.includes("组别：本科生组") && chunk.content.includes("人数：6至8人")));
  const pdf = await parseKnowledgeBuffer(await fixture("document-pages.pdf"), "分页规程.pdf");
  assert.ok(pdf.some((chunk) => chunk.page === 2 && chunk.content.includes("exception")));
  await assert.rejects(() => parseKnowledgeBuffer(Buffer.from("%PDF-1.4 broken"), "损坏.pdf"), /无法解析/);
  const scanned = await fixture("document-scanned.pdf");
  await assert.rejects(() => parseKnowledgeBuffer(scanned, "混合扫描.pdf"), /第 2 页.*OCR/);
  await assert.rejects(() => parseKnowledgeBuffer(Buffer.alloc(0), "空.docx"), /大于 0/);
  await assert.rejects(() => parseKnowledgeBuffer(Buffer.from("legacy"), "旧.doc"), /支持 TXT/);
  assert.ok(knowledgeAttachmentIssue({ competitionId: "a", fileName: "x.txt", filePath: "/uploads/competitions/b/x.txt" }));
  console.log("PASS 真实 DOCX 字节解析、跨页 PDF、混合扫描拒绝、损坏和越界文件");

  for (const question of ["国创赛怎么报名？", "国创赛如何参加？", "国创赛组队流程是什么？"]) {
    assert.equal(documentIntent(question), "process");
    assert.equal(isTeamRecruitmentQuestion(question), false);
  }
  assert.equal(documentIntent("国创赛什么时候开始报名？"), null);
  assert.equal(documentIntent("通知中的报名、初赛复赛、总决赛各是什么时间？"), "process");
  for (const question of ["高教主赛道一个团队能有几人？", "高教主赛道允许跨校组队吗？", "高教主赛道能借用别人的项目参赛吗？"]) assert.equal(documentIntent(question), "rules");
  assert.equal(isTeamRecruitmentQuestion("高教主赛道允许跨校组队吗？"), false);
  assert.equal(isTeamRecruitmentQuestion("国创赛有哪些队伍在招募队友？"), true);
  console.log("PASS 流程、平台时间与组队招募问题分流");

  const at = process.argv.indexOf("--official-dir");
  if (at >= 0) {
    const dir = process.argv[at + 1];
    assert.ok(dir, "--official-dir requires a directory");
    for (const name of (await readdir(dir)).filter((name) => /\.(docx|pdf)$/i.test(name))) {
      const chunks = await parseKnowledgeBuffer(await readFile(path.join(dir, name)), name);
      assert.ok(chunks.length);
      if (name.includes("主赛道")) assert.ok(chunks.some((chunk) => /不少于3人.*不多于15人/.test(chunk.content)));
      if (name.endsWith(".pdf")) assert.ok(chunks.some((chunk) => chunk.page && chunk.page > 1));
      console.log(`PASS 官方原始文件 ${name}：${chunks.length} 个片段`);
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
