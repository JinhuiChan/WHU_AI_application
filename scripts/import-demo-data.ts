/**
 * 一键把 demo数据/ 下的报名数据通过平台导入管线写入数据库。
 *
 * 运行：npm.cmd run demo:import
 * 前置：
 *   1) npm.cmd run setup              → 建库 + 基础演示数据（含管理员账号）
 *   2) npm.cmd run db:seed:accounts   → 800 学生 + 50 教师账号（用于学生端可见性 / 后续绑定）
 *
 * 说明：
 *   - 复用平台「数据导入」的同一套后端逻辑（parseImportFile → saveImportMapping → commitImportBatch），
 *     不复制业务规则；效果与在页面上传 xlsx 完全一致。
 *   - 已成功导入过的同名文件会自动跳过，避免重复导入产生"项目名重复"失败。
 *   - 导入后的项目为「待学院审核」、指导关系「待确认」；学生/老师登录时会自动按学号/工号关联，
 *     也可执行 npm.cmd run demo:link 一次性全量绑定。
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { parseImportFile, saveImportMapping } from "../lib/import";
import { commitImportBatch } from "../lib/import-commit";

const prisma = new PrismaClient();
const DATA_DIR = path.resolve(process.cwd(), "demo数据");
const IMPORT_FILE_PATTERN = /^\d{2}-导入-.*\.xlsx$/;

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", approvalStatus: "APPROVED", deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  if (!admin) {
    throw new Error("数据库中缺少管理员账号，请先运行 npm.cmd run setup（内置演示数据包含管理员）");
  }

  const entries = await readdir(DATA_DIR, { withFileTypes: true }).catch(() => {
    throw new Error(`找不到演示数据目录：${DATA_DIR}；请先运行 npm.cmd run demo:sync（或 demo:generate）`);
  });
  const files = entries
    .filter((entry) => entry.isFile() && IMPORT_FILE_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  if (!files.length) {
    throw new Error(`演示数据目录中没有可导入的 xlsx：${DATA_DIR}；请先运行 npm.cmd run demo:sync`);
  }

  const competitions = await prisma.competition.findMany({
    select: { id: true, name: true, year: true },
    orderBy: [{ year: "desc" }, { name: "asc" }],
  });

  const results: Array<Record<string, unknown>> = [];
  for (const fileName of files) {
    const competition = competitions.find((item) => fileName.includes(item.name));
    if (!competition) {
      throw new Error(`无法从文件名判断赛事：${fileName}（文件名需包含赛事名称，如「中国国际大学生创新大赛」）`);
    }

    const existing = await prisma.importBatch.findFirst({
      where: { fileName, successRows: { gt: 0 } },
      select: { id: true, successRows: true, createdAt: true },
    });
    if (existing) {
      results.push({
        fileName,
        competition: `${competition.year}·${competition.name}`,
        skipped: true,
        reason: `已导入过（批次 ${existing.id}，成功 ${existing.successRows} 个项目）`,
      });
      continue;
    }

    const buffer = await readFile(path.join(DATA_DIR, fileName));
    const file = new File([new Uint8Array(buffer)], fileName);
    const parsed = await parseImportFile(file);
    const missingRequired = ["projectName", "leaderPersonNo", "leaderName", "college"].filter(
      (key) => !parsed.suggestedMapping[key as keyof typeof parsed.suggestedMapping],
    );
    if (missingRequired.length) {
      throw new Error(`${fileName} 自动映射缺少必填字段（${missingRequired.join("、")}），请检查表头`);
    }

    const mapping = await saveImportMapping(admin.id, {
      competitionId: competition.id,
      stage: "SCHOOL",
      fileName: parsed.fileName,
      totalRows: parsed.totalRows,
      mapping: parsed.suggestedMapping,
      sourceKey: parsed.sourceKey,
      confirmed: true,
    });
    const report = await commitImportBatch(mapping.batchId, admin.id);

    results.push({
      fileName,
      competition: `${competition.year}·${competition.name}`,
      totalRows: parsed.totalRows,
      mappedFields: Object.keys(parsed.suggestedMapping).length,
      projectCount: report.projectCount,
      continuationCount: report.continuationCount,
      success: report.success,
      failed: report.failed,
      failures: report.failures.slice(0, 20),
      batchId: mapping.batchId,
    });

    if (report.failed > 0) {
      console.error(`【警告】${fileName} 有 ${report.failed} 个失败行，可在平台「数据导入」报告页下载失败行`);
    }
  }

  const imported = results.filter((item) => !item.skipped);
  const totalProjects = imported.reduce((sum, item) => sum + Number(item.success ?? 0), 0);
  console.log("演示报名数据导入完成：");
  console.log(JSON.stringify({ dataDirectory: DATA_DIR, totalProjects, results }, null, 2));
  if (imported.some((item) => Number(item.failed ?? 0) > 0)) {
    process.exitCode = 1;
  }
  if (totalProjects > 0) {
    console.log("下一步：学生/老师登录时会自动按学号/工号关联历史报名；如需一次性全量绑定，运行 npm.cmd run demo:link");
  }
}

main()
  .catch((error: unknown) => {
    console.error("演示报名数据导入失败：", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
