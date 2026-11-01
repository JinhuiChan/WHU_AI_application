// 阶段 5 验收脚本：六条问题 + 出处回查数据库
// 运行： cd app && npx.cmd tsx scripts\verify-assistant.ts
import { answerQuestion } from "../lib/assistant";
import { prisma } from "../lib/prisma";

const questions = [
  "商业计划书要写几页",
  "路演 PPT 多长时间",
  "团队人数上限是多少",
  "指导教师最多几个",
  "校长是谁",
  "2025 年的商业计划书页数要求",
];

(async () => {
  for (const q of questions) {
    const r = await answerQuestion(q);
    console.log("=".repeat(72));
    console.log("Q:", q);
    console.log("handoff :", r.handoff);
    console.log("answer  :", r.answer.replace(/\n/g, " / ").slice(0, 240));
    if (r.evidence) {
      const chunk = await prisma.kbChunk.findUnique({
        where: { id: r.evidence.chunkId },
        include: { document: true },
      });
      const ok =
        !!chunk &&
        chunk.section === r.evidence.section &&
        chunk.page === r.evidence.page &&
        chunk.document.year === r.evidence.year &&
        chunk.document.fileName === r.evidence.fileName;
      console.log("evidence:", JSON.stringify(r.evidence));
      console.log("DB 回查一致:", ok ? "OK" : "MISMATCH");
    } else {
      console.log("evidence: none");
    }
  }
  await prisma.$disconnect();
})();
