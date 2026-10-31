import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";

const demoProjectId = "00000000-0000-4000-8000-000000000006";
const demoMemberIds = [
  "00000000-0000-4000-8000-000000000007",
  "00000000-0000-4000-8000-000000000008",
] as const;
const demoAwardId = "00000000-0000-4000-8000-000000000009";

export async function createR6DemoData(client: PrismaClient) {
  return client.$transaction(async (transaction) => {
    const existing = await transaction.project.findUnique({
      where: { id: demoProjectId },
      select: { id: true },
    });
    if (existing) {
      return { created: false, demoProjectId, message: "R6 构造演示数据已存在，跳过写入" };
    }

    const candidates = await transaction.project.findMany({
      where: { id: { not: demoProjectId }, year: 2026, status: "ACTIVE", deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        college: true,
        teamMembers: {
          where: { leftAt: null },
          select: { personNo: true, name: true, role: true, joinedAt: true },
        },
      },
    });
    let selected: {
      project: (typeof candidates)[number];
      members: (typeof candidates)[number]["teamMembers"];
    } | null = null;

    for (const project of candidates) {
      if (project.teamMembers.length < 2) continue;
      const sameNameProjects = await transaction.project.count({
        where: { name: project.name, year: 2026, deletedAt: null },
      });
      if (sameNameProjects !== 1) continue;

      for (let first = 0; first < project.teamMembers.length - 1 && !selected; first += 1) {
        for (let second = first + 1; second < project.teamMembers.length; second += 1) {
          const firstMember = project.teamMembers[first];
          const secondMember = project.teamMembers[second];
          if (firstMember.personNo === secondMember.personNo || firstMember.name === secondMember.name) continue;
          const [firstProjectCount, secondProjectCount] = await Promise.all([
            transaction.project.count({
              where: {
                year: 2026,
                status: "ACTIVE",
                deletedAt: null,
                teamMembers: { some: { personNo: firstMember.personNo, leftAt: null } },
              },
            }),
            transaction.project.count({
              where: {
                year: 2026,
                status: "ACTIVE",
                deletedAt: null,
                teamMembers: { some: { personNo: secondMember.personNo, leftAt: null } },
              },
            }),
          ]);
          if (firstProjectCount === 1 && secondProjectCount === 1) {
            selected = { project, members: [firstMember, secondMember] };
            break;
          }
        }
      }
      if (selected) break;
    }
    if (!selected) {
      throw new Error("未找到两名学号均只涉及一个 ACTIVE 项目的 2026 年演示来源项目");
    }

    const [admin, competition] = await Promise.all([
      transaction.user.findFirst({ where: { role: "ADMIN", deletedAt: null }, select: { id: true } }),
      transaction.competition.findFirst({
        where: { year: 2026, name: "中国国际大学生创新大赛" },
        select: { id: true },
      }),
    ]);
    if (!admin) throw new Error("缺少演示获奖记录所需的管理员");
    if (!competition) throw new Error("缺少 2026 年演示赛事");

    const source = selected.project;
    const college = source.college === "计算机学院" ? "电子信息学院" : "计算机学院";
    const awardCreatedAt = new Date(
      Math.max(Date.now(), ...selected.members.map((member) => member.joinedAt.getTime() + 1000)),
    );
    await transaction.project.create({
      data: {
        id: demoProjectId,
        name: source.name,
        college,
        year: 2026,
        status: "ACTIVE",
      },
    });
    await transaction.teamMember.createMany({
      data: selected.members.map((member, index) => ({
        id: demoMemberIds[index],
        projectId: demoProjectId,
        personNo: member.personNo,
        name: member.name,
        role: member.role,
        joinedAt: member.joinedAt,
      })),
    });
    await transaction.awardRecord.create({
      data: {
        id: demoAwardId,
        projectId: demoProjectId,
        competitionId: competition.id,
        awardLevel: "A",
        evidenceType: "URL",
        evidenceRef: "https://example.edu.cn/awards/demo-extra/r6-2026",
        verifiedBy: admin.id,
        verifiedAt: awardCreatedAt,
        status: "VERIFIED",
        createdAt: awardCreatedAt,
      },
    });

    return {
      created: true,
      demoProjectId,
      sourceProjectId: source.id,
      projectName: source.name,
      year: 2026,
      sourceCollege: source.college,
      demoCollege: college,
      sharedPersonNos: selected.members.map((member) => member.personNo),
      message: "R6 构造演示数据写入完成",
    };
  });
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await createR6DemoData(prisma);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error("R6 构造演示数据写入失败：", error);
    process.exitCode = 1;
  });
}
