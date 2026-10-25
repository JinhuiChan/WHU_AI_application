import { randomUUID } from "node:crypto";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import type {
  Anomaly,
  AwardRecord,
  Competition,
  KbChunk,
  KbDocument,
  MemberSnapshot,
  Project,
  ProjectAlias,
  TeamMember,
  User,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();

const colleges = [
  "计算机学院",
  "电子信息学院",
  "机械与动力学院",
  "经济与管理学院",
  "法学院",
  "新闻与传播学院",
  "化学与分子科学学院",
  "遥感信息工程学院",
];

const years = [2024, 2025, 2026];

const competitionSeries = [
  {
    seriesId: "china-international-innovation",
    name: "中国国际大学生创新大赛",
    level: "NATIONAL",
    organizer: "创新创业学院",
  },
  {
    seriesId: "challenge-cup",
    name: "挑战杯",
    level: "PROVINCE",
    organizer: "校团委",
  },
  {
    seriesId: "baijia-striving",
    name: "百珈争创",
    level: "SCHOOL",
    organizer: "校团委",
  },
] as const;

const technologies = [
  "基于多模态感知的智能巡检系统",
  "面向科创团队的智能协作助手",
  "高精度北斗协同定位平台",
  "低碳校园能源优化系统",
  "柔性传感与智能康复设备",
  "复杂流域监测预警平台",
  "工业视觉缺陷检测系统",
  "农业无人机精准作业平台",
  "城市地下管网数字孪生平台",
  "基于边缘计算的智慧交通系统",
];

const scenarios = ["校园安全", "绿色生产", "乡村振兴", "公共服务"];
const surnames = ["陈", "李", "王", "周", "吴", "郑", "孙", "林", "黄", "赵", "刘", "张"];
const givenNames = ["宇轩", "雨桐", "子涵", "浩然", "欣怡", "明远", "思远", "嘉禾", "若琳", "文博", "清扬", "知行"];
const teacherNames = ["王建国", "李文华", "张明理", "陈志远", "刘慧敏", "赵启明"];

type KbChapterSeed = {
  section: string;
  content: string;
  keywords: string;
};

type KbDocumentSeed = {
  title: string;
  fileName: string;
  year: number;
  chapters: KbChapterSeed[];
};

const knowledgeBase: KbDocumentSeed[] = [
  {
    title: "高校科创赛事参赛手册",
    fileName: "2026-高校科创赛事参赛手册.pdf",
    year: 2026,
    chapters: [
      {
        section: "报名与组队",
        content: "参赛项目须明确一名负责人。2026 赛年校赛示例口径中，负责人和成员合计不超过 10 人，成员信息须与报名记录保持一致。",
        keywords: "报名,组队,负责人,团队人数上限",
      },
      {
        section: "指导教师",
        content: "每个项目的指导教师不超过 3 人。指导教师发生变更时，应保留变更时间、原因与操作人。",
        keywords: "指导教师,教师人数上限,人员变更",
      },
      {
        section: "材料提交",
        content: "提交材料前应核对项目名称、团队成员、指导教师与赛事信息，确保不同文件中的表述一致。",
        keywords: "材料提交,一致性,项目名称,成员信息",
      },
      {
        section: "咨询渠道",
        content: "对赛事口径存在疑问时，应通过赛事办正式渠道确认，联系电话为 027-68775751。",
        keywords: "咨询,赛事办,联系电话",
      },
    ],
  },
  {
    title: "高校科创赛事评分细则",
    fileName: "2026-高校科创赛事评分细则.pdf",
    year: 2026,
    chapters: [
      {
        section: "创新性与可行性",
        content: "材料应说明拟解决的问题、核心创新点、技术路径与验证依据，避免只有概念而缺少可执行方案。",
        keywords: "评分细则,创新性,可行性,技术路径",
      },
      {
        section: "团队与实施",
        content: "材料应呈现团队分工、已有基础、实施计划和资源保障，并说明关键任务的完成条件。",
        keywords: "评分细则,团队分工,实施计划,资源保障",
      },
      {
        section: "社会价值与表达",
        content: "材料应说明项目面向的实际需求与应用价值，路演表达应围绕证据展开，不作出未经证实的结论。",
        keywords: "评分细则,社会价值,路演表达,证据",
      },
    ],
  },
  {
    title: "科创赛事获奖与成员管理办法",
    fileName: "2026-科创赛事获奖与成员管理办法.pdf",
    year: 2026,
    chapters: [
      {
        section: "获奖记录核验",
        content: "获奖记录应具备可追溯来源。记录进入 VERIFIED 状态后不得直接修改，需要更正时应作废并填写原因。",
        keywords: "获奖记录,核验,VERIFIED,作废",
      },
      {
        section: "结果发布",
        content: "普通用户仅可查看 PUBLISHED 状态的获奖结果，DRAFT 与 VOIDED 记录不纳入看板和排行统计。",
        keywords: "结果发布,PUBLISHED,统计口径",
      },
      {
        section: "成员变更",
        content: "项目成员变更须留存版本快照，记录变更人、变更时间与原因，以便核查获奖前后的人员差异。",
        keywords: "成员变更,版本快照,获奖后换人",
      },
      {
        section: "异常处置",
        content: "异常核实的处置结论分为确认、已修复和无法追溯，处置过程应保留操作人与处理时间。",
        keywords: "异常处置,确认,已修复,无法追溯",
      },
    ],
  },
  {
    title: "科创赛事常见问题",
    fileName: "2026-科创赛事常见问题.pdf",
    year: 2026,
    chapters: [
      {
        section: "商业计划书页数",
        content: "2026 赛年校赛材料示例口径：商业计划书正文不超过 30 页，封面、目录与附录不计入正文页数。",
        keywords: "商业计划书,页数,30页,材料要求",
      },
      {
        section: "团队人数上限",
        content: "2026 赛年校赛示例口径：单个项目的 LEADER 与 MEMBER 合计不超过 10 人，其中负责人为 1 人。",
        keywords: "团队人数上限,10人,负责人,成员",
      },
      {
        section: "指导教师人数上限",
        content: "2026 赛年校赛示例口径：单个项目的 TEACHER 不超过 3 人。",
        keywords: "指导教师人数上限,3人,TEACHER",
      },
      {
        section: "数据来源",
        content: "项目、成员和获奖信息应保留来源类型与来源标识，导入数据须先校验，再确认入库。",
        keywords: "数据来源,导入校验,来源标识",
      },
    ],
  },
  {
    title: "参赛材料模板说明",
    fileName: "2026-参赛材料模板说明.docx",
    year: 2026,
    chapters: [
      {
        section: "必备章节",
        content: "商业计划书应包含项目概述、需求分析、产品或服务方案、创新点、实施计划、团队介绍、风险分析与附件说明。",
        keywords: "材料模板,必备章节,商业计划书,风险分析",
      },
      {
        section: "格式与命名",
        content: "文件名称应包含项目名称与材料类型，正文使用统一标题层级，页面尺寸、字体和行距应保持前后一致。",
        keywords: "材料模板,格式,文件命名,标题层级",
      },
      {
        section: "图表编号",
        content: "图与表应分别连续编号，并在正文中提供可对应的引用，避免跳号、重号或只有编号而没有说明。",
        keywords: "材料模板,图表编号,连续编号,正文引用",
      },
      {
        section: "一致性检查",
        content: "提交前应核对项目名称、赛年、团队名单与联系方式，确保商业计划书、路演 PPT 和报名表中的信息一致。",
        keywords: "材料模板,一致性检查,团队名单,赛年",
      },
    ],
  },
  {
    title: "科创赛事路演要点",
    fileName: "2026-科创赛事路演要点.pdf",
    year: 2026,
    chapters: [
      {
        section: "路演 PPT 时长",
        content: "2026 赛年校赛示例口径：路演 PPT 陈述时长为 8 分钟，答辩安排以当年正式通知为准。",
        keywords: "路演PPT,时长,8分钟,答辩",
      },
      {
        section: "内容结构",
        content: "路演内容应围绕需求、方案、创新、验证、实施与团队展开，各页应服务于核心论点并避免堆砌文字。",
        keywords: "路演PPT,内容结构,创新,验证",
      },
      {
        section: "表达与答辩",
        content: "陈述应清晰说明问题与证据，答辩时先理解问题，再依据已有材料作答，不编造数据或赛事口径。",
        keywords: "路演,表达,答辩,证据",
      },
      {
        section: "提交前检查",
        content: "提交前应检查页数、必备章节、图表编号和项目名称一致性。材料检查结论仅供参考，非评审结论。",
        keywords: "路演,提交前检查,材料检查,非评审结论",
      },
    ],
  },
];

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function awardLevelFor(index: number): AwardRecord["awardLevel"] {
  if (index < 3) return "S";
  if (index < 15) return "A";
  if (index < 39) return "B";
  if (index < 54) return "C";
  return "EXCELLENT";
}

function awardStatusFor(index: number): AwardRecord["status"] {
  if (index < 3) return "DRAFT";
  if (index < 5) return "VOIDED";
  return index % 2 === 0 ? "PUBLISHED" : "VERIFIED";
}

function serializeMembers(members: TeamMember[]): string {
  return JSON.stringify(
    members.map((member) => ({
      personNo: member.personNo,
      name: member.name,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
      leftAt: member.leftAt?.toISOString() ?? null,
    })),
  );
}

async function main() {
  await prisma.$transaction([
    prisma.dataSource.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.kbChunk.deleteMany(),
    prisma.kbDocument.deleteMany(),
    prisma.anomaly.deleteMany(),
    prisma.memberSnapshot.deleteMany(),
    prisma.awardRecord.deleteMany(),
    prisma.teamMember.deleteMany(),
    prisma.projectAlias.deleteMany(),
    prisma.importBatch.deleteMany(),
    prisma.project.deleteMany(),
    prisma.competition.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const adminId = randomUUID();
  const userId = randomUUID();
  const passwordHash = await bcrypt.hash("123456", 10);

  if (!(await bcrypt.compare("123456", passwordHash))) {
    throw new Error("测试账号密码哈希校验失败");
  }

  const users: User[] = [
    {
      id: adminId,
      phone: "13800000001",
      passwordHash,
      name: "赛事管理员",
      role: "ADMIN",
      externalId: "SEED-ADMIN",
      createdAt: utcDate(2024, 1, 1),
      deletedAt: null,
    },
    {
      id: userId,
      phone: "13800000002",
      passwordHash,
      name: "普通用户",
      role: "USER",
      externalId: "SEED-USER",
      createdAt: utcDate(2024, 1, 1),
      deletedAt: null,
    },
  ];

  await prisma.user.createMany({ data: users });

  const competitions: Competition[] = [];
  for (const year of years) {
    for (const series of competitionSeries) {
      competitions.push({
        id: randomUUID(),
        name: series.name,
        level: series.level,
        seriesId: series.seriesId,
        year,
        organizer: series.organizer,
        createdAt: utcDate(year, 1, 15),
      });
    }
  }
  await prisma.competition.createMany({ data: competitions });

  const projects: Project[] = [];
  const aliases: ProjectAlias[] = [];
  for (const [yearIndex, year] of years.entries()) {
    for (let localIndex = 0; localIndex < 40; localIndex += 1) {
      const technology = required(technologies[localIndex % technologies.length], "项目技术主题缺失");
      const scenario = required(scenarios[Math.floor(localIndex / technologies.length)], "项目应用场景缺失");
      const project: Project = {
        id: randomUUID(),
        name: `${technology}·${scenario}场景`,
        college: required(colleges[(localIndex * 3 + yearIndex) % colleges.length], "项目学院缺失"),
        year,
        status: "ACTIVE",
        createdAt: utcDate(year, 1, 20),
        deletedAt: null,
      };
      projects.push(project);
      aliases.push({
        id: randomUUID(),
        projectId: project.id,
        aliasType: "REG_NO",
        aliasValue: `REG-${year}-${String(localIndex + 1).padStart(3, "0")}`,
      });
    }
  }
  await prisma.project.createMany({ data: projects });
  await prisma.projectAlias.createMany({ data: aliases });

  const teamMembers: TeamMember[] = [];
  const baseMembersByProject = new Map<string, TeamMember[]>();
  let personSequence = 1;

  for (const [projectIndex, project] of projects.entries()) {
    const projectMembers: TeamMember[] = [];
    const memberCount = 3 + (projectIndex % 6);
    const teacherCount = projectIndex % 3;
    const studentCount = memberCount - teacherCount;

    for (let memberIndex = 0; memberIndex < memberCount; memberIndex += 1) {
      let role: TeamMember["role"];
      if (memberIndex === 0) {
        role = "LEADER";
      } else if (memberIndex < studentCount) {
        role = "MEMBER";
      } else {
        role = "TEACHER";
      }

      const name =
        role === "TEACHER"
          ? required(teacherNames[(projectIndex + memberIndex) % teacherNames.length], "教师姓名缺失")
          : `${required(surnames[(projectIndex + memberIndex) % surnames.length], "成员姓氏缺失")}${required(
              givenNames[(projectIndex * 3 + memberIndex) % givenNames.length],
              "成员名字缺失",
            )}`;

      const member: TeamMember = {
        id: randomUUID(),
        projectId: project.id,
        personNo: `2023${String(personSequence).padStart(6, "0")}`,
        name,
        role,
        joinedAt: utcDate(project.year, 2 + (memberIndex % 2), 1 + ((projectIndex + memberIndex) % 25)),
        leftAt: null,
      };
      personSequence += 1;
      projectMembers.push(member);
      teamMembers.push(member);
    }
    baseMembersByProject.set(project.id, projectMembers);
  }

  function projectAt(index: number): Project {
    return required(projects[index], `项目索引 ${index} 不存在`);
  }

  function membersOf(projectId: string): TeamMember[] {
    return required(baseMembersByProject.get(projectId), `项目 ${projectId} 没有成员`);
  }

  function leaderOf(projectId: string): TeamMember {
    return required(membersOf(projectId).find((member) => member.role === "LEADER"), `项目 ${projectId} 没有负责人`);
  }

  for (const projectIndex of [0, 1, 2]) {
    const leader = leaderOf(projectAt(projectIndex).id);
    leader.personNo = "2023000001";
    leader.name = "陈同队";
  }

  for (const projectIndex of [6, 7]) {
    const projectId = projectAt(projectIndex).id;
    const leader = leaderOf(projectId);
    const member = required(
      membersOf(projectId).find((item) => item.role === "MEMBER"),
      `项目 ${projectId} 缺少同名异常所需成员`,
    );
    member.name = leader.name;
  }

  const crossCollegeLeader = leaderOf(projectAt(10).id);
  leaderOf(projectAt(11).id).name = crossCollegeLeader.name;

  await prisma.teamMember.createMany({ data: teamMembers });

  const awards: AwardRecord[] = [];
  let awardIndex = 0;
  for (const year of years) {
    const yearProjects = projects.filter((project) => project.year === year).slice(0, 20);
    const yearCompetitions = competitions.filter((competition) => competition.year === year);

    for (const [localIndex, project] of yearProjects.entries()) {
      const competition = required(yearCompetitions[localIndex % yearCompetitions.length], "获奖赛事不存在");
      const createdAt = utcDate(year, 9, localIndex + 1);
      const status = awardStatusFor(awardIndex);
      const evidenceType: AwardRecord["evidenceType"] = awardIndex % 2 === 0 ? "URL" : "FILE";
      const evidenceNumber = String(awardIndex + 1).padStart(3, "0");

      awards.push({
        id: randomUUID(),
        projectId: project.id,
        competitionId: competition.id,
        awardLevel: awardLevelFor(awardIndex),
        evidenceType,
        evidenceRef:
          evidenceType === "URL"
            ? `https://example.edu.cn/awards/${year}/${evidenceNumber}`
            : `samples/award-evidence-${year}-${evidenceNumber}.pdf`,
        verifiedBy: adminId,
        verifiedAt: addDays(createdAt, 2),
        status,
        voidReason: status === "VOIDED" ? "示例获奖信息有误，本条作废" : null,
        createdAt,
      });
      awardIndex += 1;
    }
  }
  await prisma.awardRecord.createMany({ data: awards });

  const postAwardMembers: TeamMember[] = [];
  for (const [offset, projectIndex] of [8, 9].entries()) {
    const project = projectAt(projectIndex);
    const award = required(
      awards.find((item) => item.projectId === project.id),
      `项目 ${project.id} 缺少获奖后变更所需获奖记录`,
    );
    const joinedAt = addDays(award.createdAt, 5);
    postAwardMembers.push({
      id: randomUUID(),
      projectId: project.id,
      personNo: `2023${String(personSequence).padStart(6, "0")}`,
      name: offset === 0 ? "获奖后增补成员甲" : "获奖后增补成员乙",
      role: "MEMBER",
      joinedAt,
      leftAt: null,
    });
    personSequence += 1;
  }
  await prisma.teamMember.createMany({ data: postAwardMembers });

  const snapshots: MemberSnapshot[] = [];
  for (const [offset, projectIndex] of [0, 1, 2, 3, 8, 9, 10, 11].entries()) {
    const project = projectAt(projectIndex);
    snapshots.push({
      id: randomUUID(),
      projectId: project.id,
      versionNo: 1,
      membersJson: serializeMembers(membersOf(project.id)),
      changedBy: adminId,
      changedAt: utcDate(project.year, 4, offset + 1),
      reason: "初始成员备案",
    });
  }

  for (const projectIndex of [8, 9]) {
    const project = projectAt(projectIndex);
    const award = required(
      awards.find((item) => item.projectId === project.id),
      `项目 ${project.id} 缺少获奖后快照对应记录`,
    );
    const postAwardMember = required(
      postAwardMembers.find((member) => member.projectId === project.id),
      `项目 ${project.id} 缺少获奖后新增成员`,
    );
    snapshots.push({
      id: randomUUID(),
      projectId: project.id,
      versionNo: 2,
      membersJson: serializeMembers([...membersOf(project.id), postAwardMember]),
      changedBy: adminId,
      changedAt: postAwardMember.joinedAt,
      reason: "获奖后新增成员",
    });
  }
  await prisma.memberSnapshot.createMany({ data: snapshots });

  const ruleIds = ["R1", "R2", "R3", "R4", "R5", "R6"] as const;
  type RuleId = (typeof ruleIds)[number];

  const anomalyProjectIndexes: Record<RuleId, [number, number]> = {
    R1: [0, 1],
    R2: [2, 3],
    R3: [4, 5],
    R4: [6, 7],
    R5: [8, 9],
    R6: [10, 11],
  };

  const ruleDescriptions: Record<RuleId, string> = {
    R1: "学号 2023000001 在 2024 年出现在至少 3 个 ACTIVE 项目中",
    R2: "历史导入版本显示 LEADER 与 MEMBER 合计超过 10 人，需核验原始记录",
    R3: "历史导入版本显示 TEACHER 超过 3 人，需核验原始记录",
    R4: "项目内存在姓名相同但学号不同的成员，需核验身份",
    R5: "存在 joinedAt 晚于获奖记录 createdAt 的成员，需核验变更原因",
    R6: "同名人员在同赛年出现在不同学院，需核验人员归属",
  };

  const anomalies: Anomaly[] = [];
  for (const [ruleIndex, ruleId] of ruleIds.entries()) {
    for (const [pairIndex, projectIndex] of anomalyProjectIndexes[ruleId].entries()) {
      const project = projectAt(projectIndex);
      const resolved = pairIndex === 1;
      anomalies.push({
        id: randomUUID(),
        ruleId,
        projectId: project.id,
        description: `${ruleDescriptions[ruleId]}。项目：${project.name}`,
        status: resolved ? "RESOLVED" : "PENDING",
        resolution: resolved ? (["CONFIRMED", "FIXED", "UNTRACEABLE"][ruleIndex % 3] as Anomaly["resolution"]) : null,
        resolvedBy: resolved ? adminId : null,
        resolvedAt: resolved ? utcDate(2026, 11, ruleIndex * 2 + pairIndex + 1) : null,
      });
    }
  }
  await prisma.anomaly.createMany({ data: anomalies });

  const kbDocuments: KbDocument[] = [];
  const kbChunks: KbChunk[] = [];
  for (const [documentIndex, document] of knowledgeBase.entries()) {
    const documentId = randomUUID();
    kbDocuments.push({
      id: documentId,
      title: document.title,
      fileName: document.fileName,
      year: document.year,
      uploadedBy: adminId,
      createdAt: utcDate(document.year, 1, documentIndex + 10),
    });
    for (const [chapterIndex, chapter] of document.chapters.entries()) {
      kbChunks.push({
        id: randomUUID(),
        documentId,
        section: chapter.section,
        page: chapterIndex + 1,
        content: chapter.content,
        keywords: chapter.keywords,
      });
    }
  }
  await prisma.kbDocument.createMany({ data: kbDocuments });
  await prisma.kbChunk.createMany({ data: kbChunks });

  const expectedAwardLevels: Record<AwardRecord["awardLevel"], number> = {
    S: 3,
    A: 12,
    B: 24,
    C: 15,
    EXCELLENT: 6,
  };
  for (const [level, expected] of Object.entries(expectedAwardLevels)) {
    const actual = awards.filter((award) => award.awardLevel === level).length;
    if (actual !== expected) {
      throw new Error(`奖项 ${level} 数量应为 ${expected}，实际为 ${actual}`);
    }
  }

  if (awards.filter((award) => award.status === "DRAFT").length !== 3) {
    throw new Error("DRAFT 获奖记录必须为 3 条");
  }
  if (awards.filter((award) => award.status === "VOIDED").length !== 2) {
    throw new Error("VOIDED 获奖记录必须为 2 条");
  }

  const postAwardSnapshotCount = snapshots.filter((snapshot) => {
    const award = awards.find((item) => item.projectId === snapshot.projectId);
    return award !== undefined && snapshot.changedAt > award.createdAt;
  }).length;
  if (postAwardSnapshotCount !== 2) {
    throw new Error(`获奖后快照必须为 2 条，实际为 ${postAwardSnapshotCount}`);
  }

  for (const project of projects) {
    const currentMembers = [
      ...membersOf(project.id),
      ...postAwardMembers.filter((member) => member.projectId === project.id),
    ];
    if (currentMembers.length < 3 || currentMembers.length > 8) {
      throw new Error(`项目 ${project.name} 的成员人数不在 3–8 人范围内`);
    }
    const teacherCount = currentMembers.filter((member) => member.role === "TEACHER").length;
    if (teacherCount > 2) {
      throw new Error(`项目 ${project.name} 的指导教师超过 2 人`);
    }
  }

  if (
    users.length !== 2 ||
    competitions.length !== 9 ||
    projects.length !== 120 ||
    awards.length !== 60 ||
    snapshots.length < 6 ||
    anomalies.length < 8 ||
    !ruleIds.every((ruleId) => anomalies.some((anomaly) => anomaly.ruleId === ruleId)) ||
    knowledgeBase.length !== 6 ||
    !knowledgeBase.every((document) => document.chapters.length >= 3 && document.chapters.length <= 5)
  ) {
    throw new Error("种子数据数量或规则覆盖校验失败");
  }

  const projects2026 = projects.filter((project) => project.year === 2026);
  const competition2026 = required(
    competitions.find((competition) => competition.year === 2026 && competition.name === "中国国际大学生创新大赛"),
    "缺少 2026 年示例赛事",
  );
  const sampleProjects = [0, 1, 2, 3].map((index) => required(projects2026[index], `2026 年示例项目 ${index} 缺失`));
  const sampleLeaders = sampleProjects.map((project) => leaderOf(project.id));
  const sampleRows: (string | number)[][] = [
    ["项目名称", "赛年", "学院", "赛事名称", "奖项等级", "证据类型", "证据地址", "负责人学号", "负责人姓名"],
    [
      sampleProjects[0].name,
      sampleProjects[0].year,
      sampleProjects[0].college,
      competition2026.name,
      "A",
      "URL",
      "https://example.edu.cn/awards/sample/valid",
      sampleLeaders[0].personNo,
      sampleLeaders[0].name,
    ],
    [
      "",
      sampleProjects[1].year,
      sampleProjects[1].college,
      competition2026.name,
      "B",
      "URL",
      "https://example.edu.cn/awards/sample/error-1",
      sampleLeaders[1].personNo,
      sampleLeaders[1].name,
    ],
    [
      sampleProjects[2].name,
      "二〇二六",
      sampleProjects[2].college,
      competition2026.name,
      "C",
      "URL",
      "https://example.edu.cn/awards/sample/error-2",
      sampleLeaders[2].personNo,
      sampleLeaders[2].name,
    ],
    [
      sampleProjects[3].name,
      sampleProjects[3].year,
      sampleProjects[3].college,
      competition2026.name,
      "特等奖",
      "URL",
      "https://example.edu.cn/awards/sample/error-3",
      sampleLeaders[3].personNo,
      sampleLeaders[3].name,
    ],
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(sampleRows);
  worksheet["!cols"] = [42, 10, 24, 32, 12, 12, 52, 16, 16].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(workbook, worksheet, "获奖公示");
  const sampleDirectory = path.join(process.cwd(), "public", "samples");
  const samplePath = path.join(sampleDirectory, "获奖公示模板.xlsx");
  await mkdir(sampleDirectory, { recursive: true });
  XLSX.writeFile(workbook, samplePath);
  if ((await stat(samplePath)).size === 0) {
    throw new Error("示例 Excel 生成失败");
  }

  const counts = {
    User: await prisma.user.count(),
    Competition: await prisma.competition.count(),
    Project: await prisma.project.count(),
    ProjectAlias: await prisma.projectAlias.count(),
    TeamMember: await prisma.teamMember.count(),
    AwardRecord: await prisma.awardRecord.count(),
    MemberSnapshot: await prisma.memberSnapshot.count(),
    Anomaly: await prisma.anomaly.count(),
    ImportBatch: await prisma.importBatch.count(),
    DataSource: await prisma.dataSource.count(),
    AuditLog: await prisma.auditLog.count(),
    KbDocument: await prisma.kbDocument.count(),
    KbChunk: await prisma.kbChunk.count(),
  };

  const expectedCounts = {
    User: 2,
    Competition: 9,
    Project: 120,
    ProjectAlias: 120,
    TeamMember: teamMembers.length + postAwardMembers.length,
    AwardRecord: 60,
    MemberSnapshot: 10,
    Anomaly: 12,
    ImportBatch: 0,
    DataSource: 0,
    AuditLog: 0,
    KbDocument: 6,
    KbChunk: knowledgeBase.reduce((total, document) => total + document.chapters.length, 0),
  };

  for (const [table, expected] of Object.entries(expectedCounts)) {
    const actual = counts[table as keyof typeof counts];
    if (actual !== expected) {
      throw new Error(`${table} 记录数应为 ${expected}，实际为 ${actual}`);
    }
  }

  console.log("种子数据写入完成，示例 Excel 已生成。");
  console.log(JSON.stringify(counts, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error("seed 执行失败：", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
