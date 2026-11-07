// 阶段 5 验收脚本：六条问题 + 出处回查数据库
// 仓库根目录运行：npx.cmd tsx --env-file=.env scripts/verify-assistant.ts [赛事编号]
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
  const competition = await prisma.competition.findFirst({
    where: {
      publishStatus: "PUBLISHED",
      ...(process.argv[2] ? { id: process.argv[2] } : { knowledgeDocuments: { some: { isActive: true } } }),
    },
    select: { id: true, name: true },
  });
  if (!competition) {
    console.log("请先为已发布赛事添加知识资料");
    return;
  }
  console.log("赛事:", competition.name);
  for (const q of questions) {
    const r = await answerQuestion(q, competition.id);
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
        chunk.document.competitionId === competition.id &&
        chunk.document.fileName === r.evidence.fileName;
      console.log("evidence:", JSON.stringify(r.evidence));
      console.log("DB 回查一致:", ok ? "OK" : "MISMATCH");
    } else {
      console.log("evidence: none");
    }
  }
})().finally(() => prisma.$disconnect());
