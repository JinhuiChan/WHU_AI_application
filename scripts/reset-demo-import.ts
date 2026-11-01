import { prisma } from "../lib/prisma";

async function resetDemoImport() {
  return prisma.$transaction(async (transaction) => {
    const importedAwardSources = await transaction.dataSource.findMany({
      where: { sourceType: "IMPORT", recordType: "AwardRecord" },
      select: { recordId: true },
    });
    const manualAwardSources = await transaction.dataSource.findMany({
      where: { sourceType: "MANUAL", recordType: "AwardRecord" },
      select: { recordId: true },
    });
    const manualAwardIds = new Set(manualAwardSources.map((source) => source.recordId));
    if (importedAwardSources.some((source) => manualAwardIds.has(source.recordId))) {
      throw new Error("发现同时具有 IMPORT 与 MANUAL 来源的获奖记录，已中止重置");
    }

    const importBatches = await transaction.importBatch.findMany({
      where: { sourceType: "IMPORT" },
      select: { id: true },
    });
    const batchIds = importBatches.map((batch) => batch.id);
    if (batchIds.length) {
      const nonImportSource = await transaction.dataSource.findFirst({
        where: { batchId: { in: batchIds }, sourceType: { not: "IMPORT" } },
        select: { id: true },
      });
      if (nonImportSource) {
        throw new Error("导入批次中存在非 IMPORT 来源记录，已中止重置");
      }
    }

    const awardIds = [...new Set(importedAwardSources.map((source) => source.recordId))];
    const datasource = await transaction.dataSource.deleteMany({
      where: { sourceType: "IMPORT" },
    });
    const award = awardIds.length
      ? await transaction.awardRecord.deleteMany({ where: { id: { in: awardIds } } })
      : { count: 0 };
    const batch = await transaction.importBatch.deleteMany({
      where: { sourceType: "IMPORT" },
    });

    return {
      award: award.count,
      batch: batch.count,
      datasource: datasource.count,
    };
  });
}

async function main() {
  try {
    const result = await resetDemoImport();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("重置导入演示数据失败：", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
