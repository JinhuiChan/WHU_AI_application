/**
 * 可选步骤：把「导入中心」入库后的报名数据绑定到已创建的演示账号。
 *
 * 平台的数据导入只按学号 / 工号保存文本，不会自动关联 User 账号；
 * 执行本脚本后：
 *   - 项目负责人 ownerId  ← 负责人学号对应的学生账号
 *   - 团队成员 userId     ← 成员学号对应的学生账号
 *   - 指导老师 userId     ← 工号对应的教师账号
 * 这样学生端「我的项目 / 赛事报名状态」、教师端「指导项目」就能直接看到导入数据。
 *
 * 运行：npm.cmd run demo:link
 * 前置：已通过 /import 导入仓库外 ../demo数据/ 下的报名数据文件。
 *
 * 只更新 userId / ownerId 为空的记录，已有绑定不会被覆盖，可重复执行。
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function countLinkedRecords() {
  const [members, teachers, projects] = await Promise.all([
    prisma.teamMember.count({ where: { userId: { not: null } } }),
    prisma.teacher.count({ where: { userId: { not: null } } }),
    prisma.project.count({ where: { ownerId: { not: null }, deletedAt: null } }),
  ]);
  return { members, teachers, projects };
}

async function main() {
  const before = await countLinkedRecords();

  const memberRows = await prisma.$executeRawUnsafe(`
    UPDATE "TeamMember"
    SET "userId" = (
      SELECT "User"."id" FROM "User"
      WHERE "User"."studentNo" = "TeamMember"."personNo" AND "User"."deletedAt" IS NULL
      LIMIT 1
    )
    WHERE "userId" IS NULL AND "personNo" IS NOT NULL
  `);
  const teacherRows = await prisma.$executeRawUnsafe(`
    UPDATE "Teacher"
    SET "userId" = (
      SELECT "User"."id" FROM "User"
      WHERE "User"."staffNo" = "Teacher"."staffNo" AND "User"."deletedAt" IS NULL
      LIMIT 1
    )
    WHERE "userId" IS NULL AND "staffNo" IS NOT NULL
  `);
  const projectRows = await prisma.$executeRawUnsafe(`
    UPDATE "Project"
    SET "ownerId" = (
      SELECT "TeamMember"."userId" FROM "TeamMember"
      WHERE "TeamMember"."projectId" = "Project"."id"
        AND "TeamMember"."role" = 'LEADER'
        AND "TeamMember"."userId" IS NOT NULL
      LIMIT 1
    )
    WHERE "ownerId" IS NULL
  `);

  const after = await countLinkedRecords();
  console.log("演示数据账号绑定完成（只填充空值，可重复执行）：");
  console.log(JSON.stringify({
    updatedRows: { teamMembers: memberRows, teachers: teacherRows, projects: projectRows },
    linkedBefore: before,
    linkedAfter: after,
    note: "学生登录后可在「我的项目 / 赛事」看到负责人或成员为本人的项目；教师登录后可在「指导项目」看到待确认的指导关系。",
  }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error("演示数据账号绑定失败：", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
