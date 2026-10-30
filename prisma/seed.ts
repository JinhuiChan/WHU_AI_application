import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const baseDate = new Date("2026-03-10T08:00:00.000Z");

const competitionSpecs: Array<{
  key: string;
  name: string;
  shortName: string;
  level: "NATIONAL" | "PROVINCE" | "SCHOOL";
  organizer: string;
}> = [
  {
    key: "china-innovation",
    name: "中国国际大学生创新大赛",
    shortName: "国创赛",
    level: "NATIONAL",
    organizer: "创新创业学院",
  },
  {
    key: "challenge-cup",
    name: "挑战杯",
    shortName: "挑战杯",
    level: "PROVINCE",
    organizer: "校团委",
  },
  {
    key: "baijia-striving",
    name: "百珈争创",
    shortName: "百珈争创",
    level: "SCHOOL",
    organizer: "校团委",
  },
];

const projectNames = [
  "基于多模态感知的智能巡检系统",
  "高精度北斗协同定位平台",
  "低碳校园能源优化系统",
  "柔性传感与智能康复设备",
  "复杂流域监测预警平台",
  "农业无人机精准作业平台",
];
const colleges = ["计算机学院", "电子信息学院", "机械与动力学院", "经济与管理学院", "法学院", "遥感信息工程学院"];
const leaderNames = ["陈宇轩", "李雨桐", "王子涵", "周浩然", "吴欣怡", "郑明远"];
const memberNames = ["孙思远", "林嘉禾", "黄若琳", "赵文博", "刘清扬", "张知行"];
const teacherNames = ["王建国", "李文华", "张明理"];

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function expectCount(label: string, actual: number, expected: number) {
  if (actual !== expected) throw new Error(`${label} 应为 ${expected}，实际为 ${actual}`);
}

async function clearDatabase() {
  await prisma.$transaction([
    prisma.sensitiveAccessLog.deleteMany(),
    prisma.exportRecord.deleteMany(),
    prisma.awardHistory.deleteMany(),
    prisma.award.deleteMany(),
    prisma.changeLog.deleteMany(),
    prisma.changeRequest.deleteMany(),
    prisma.review.deleteMany(),
    prisma.sealedFile.deleteMany(),
    prisma.work.deleteMany(),
    prisma.payeeBank.deleteMany(),
    prisma.teacher.deleteMany(),
    prisma.dataSource.deleteMany(),
    prisma.importBatch.deleteMany(),
    prisma.timeWindow.deleteMany(),
    prisma.anomaly.deleteMany(),
    prisma.memberSnapshot.deleteMany(),
    prisma.awardRecord.deleteMany(),
    prisma.teamMember.deleteMany(),
    prisma.projectAlias.deleteMany(),
    prisma.project.deleteMany(),
    prisma.dictOption.deleteMany(),
    prisma.track.deleteMany(),
    prisma.formTemplate.deleteMany(),
    prisma.competition.deleteMany(),
    prisma.kbChunk.deleteMany(),
    prisma.kbDocument.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function main() {
  await clearDatabase();
  const passwordHash = await bcrypt.hash("123456", 10);
  if (!(await bcrypt.compare("123456", passwordHash))) throw new Error("演示密码哈希校验失败");

  const admin = await prisma.user.create({
    data: {
      phone: "13800000001",
      passwordHash,
      name: "赛事管理员",
      role: "ADMIN",
      externalId: "SEED-ADMIN",
    },
  });
  const teacherUsers = [];
  for (let index = 0; index < teacherNames.length; index += 1) {
    teacherUsers.push(await prisma.user.create({
      data: {
        staffNo: `T202600${index + 1}`,
        phone: `1380000020${index + 1}`,
        passwordHash,
        name: required(teacherNames[index], "教师姓名缺失"),
        role: "TEACHER",
        college: required(colleges[index], "教师学院缺失"),
        email: `teacher${index + 1}@example.edu.cn`,
      },
    }));
  }

  const projects: Array<{
    id: string;
    competitionId: string;
    ownerId: string;
    leaderMemberId: string;
  }> = [];
  const competitionTemplates: Array<{ competitionId: string; templateId: string }> = [];

  for (const [competitionIndex, spec] of competitionSpecs.entries()) {
    const competition = await prisma.competition.create({
      data: {
        name: spec.name,
        level: spec.level,
        seriesId: spec.key,
        year: 2026,
        organizer: spec.organizer,
      },
    });
    const mainTrack = await prisma.track.create({
      data: { competitionId: competition.id, name: "高教主赛道", kind: "TRACK", sortOrder: 1 },
    });
    const domesticTrack = await prisma.track.create({
      data: { competitionId: competition.id, parentId: mainTrack.id, name: "国内项目", kind: "BRANCH", sortOrder: 1 },
    });
    const overseasTrack = await prisma.track.create({
      data: { competitionId: competition.id, parentId: mainTrack.id, name: "海外项目", kind: "BRANCH", sortOrder: 2 },
    });
    const redTrack = await prisma.track.create({
      data: { competitionId: competition.id, name: "青年红色筑梦之旅赛道", kind: "TRACK", sortOrder: 2 },
    });
    const industryTrack = await prisma.track.create({
      data: { competitionId: competition.id, name: "产业赛道", kind: "TRACK", sortOrder: 3 },
    });

    // 按样表补全各赛道的组别与类别（按赛道挂载，避免不同赛道互相串选项）
    const trackDictionaries = [
      {
        trackId: domesticTrack.id,
        groups: ["本科生创意组", "本科生创业组", "研究生创意组", "研究生创业组"],
        categories: ["新工科", "新医科", "新农科", "新文科", "人工智能+"],
      },
      {
        trackId: overseasTrack.id,
        groups: ["本科生创意组", "本科生创业组", "研究生创意组", "研究生创业组"],
        categories: ["新工科", "新医科", "新农科", "新文科", "人工智能+"],
      },
      {
        trackId: redTrack.id,
        groups: ["公益组", "创意组", "创业组"],
        categories: ["现代农业", "制造业", "信息技术服务", "文化创意服务", "社会服务"],
      },
      {
        trackId: industryTrack.id,
        groups: ["企业命题组", "成果转化组"],
        categories: ["产教协同创新组", "区域特色产业组", "国产操作系统软件组", "新工科", "新医科", "新农科", "新文科"],
      },
    ];
    await prisma.dictOption.createMany({
      data: trackDictionaries.flatMap((entry) => [
        ...entry.groups.map((label, index) => ({
          type: "GROUP",
          value: `G${index + 1}`,
          label,
          trackId: entry.trackId,
          sortOrder: index + 1,
        })),
        ...entry.categories.map((label, index) => ({
          type: "CATEGORY",
          value: `C${index + 1}`,
          label,
          trackId: entry.trackId,
          sortOrder: index + 1,
        })),
      ]),
    });

    const trackIds = [domesticTrack.id, overseasTrack.id, redTrack.id, industryTrack.id, domesticTrack.id, redTrack.id];
    const template = await prisma.formTemplate.create({
      data: {
        competitionId: competition.id,
        stage: "SCHOOL",
        name: `${spec.shortName}校赛报名模板`,
        fieldsJson: JSON.stringify(["项目名称", "负责人学号", "赛道", "团队成员", "指导老师", "作品", "奖金领款人"]),
        createdBy: admin.id,
      },
    });
    competitionTemplates.push({ competitionId: competition.id, templateId: template.id });
    await prisma.timeWindow.create({
      data: {
        competitionId: competition.id,
        stage: "SCHOOL",
        startAt: new Date("2026-03-01T00:00:00.000Z"),
        endAt: new Date("2026-04-30T23:59:59.000Z"),
        configuredBy: admin.id,
      },
    });

    for (let localIndex = 0; localIndex < 6; localIndex += 1) {
      const globalIndex = competitionIndex * 6 + localIndex;
      const college = required(colleges[globalIndex % colleges.length], "项目学院缺失");
      const studentNo = `202620${String(globalIndex + 1).padStart(4, "0")}`;
      const owner = await prisma.user.create({
        data: {
          studentNo,
          phone: `1380001${String(globalIndex + 1).padStart(4, "0")}`,
          passwordHash,
          name: required(leaderNames[localIndex], "负责人姓名缺失"),
          role: "STUDENT",
          gender: localIndex % 2 === 0 ? "男" : "女",
          ethnicity: "汉族",
          educationStage: "本科",
          trainingUnit: college,
          college,
          major: "计算机科学与技术",
          grade: "2022",
          enrollmentYear: 2022,
          graduationYear: 2026,
          email: `student${globalIndex + 1}@example.edu.cn`,
          boundFinancePlatform: globalIndex % 2 === 0,
        },
      });
      const status = globalIndex < 2
        ? "REJECTED"
        : (["PENDING", "COLLEGE_REVIEW", "SCHOOL_FINAL", "PROVINCE_ADVANCED"] as const)[globalIndex % 4];
      const project = await prisma.project.create({
        data: {
          name: `${required(projectNames[localIndex], "项目名称缺失")}·${spec.shortName}`,
          college,
          year: 2026,
          competitionId: competition.id,
          trackId: required(trackIds[localIndex], "项目赛道缺失"),
          ownerId: owner.id,
          applicationUnit: college,
          trainingUnit: college,
          groupName: localIndex === 3 ? "企业命题组" : "创意组",
          categoryName: localIndex === 3 ? "智能制造创新组" : "科技创新",
          batchName: `${spec.shortName}2026报名批次`,
          propositionName: localIndex === 3 ? "智能制造关键技术命题" : null,
          propositionCompany: localIndex === 3 ? "示例智造企业" : null,
          stage: status === "PROVINCE_ADVANCED" ? "PROVINCE" : "SCHOOL",
          status,
          reviewStatus: status,
          createdAt: baseDate,
          submittedAt: baseDate,
        },
      });
      const leader = await prisma.teamMember.create({
        data: {
          projectId: project.id,
          userId: owner.id,
          personNo: studentNo,
          name: owner.name,
          role: "LEADER",
          school: "武汉大学",
          educationStage: "本科",
          trainingUnit: college,
          major: "计算机科学与技术",
          gender: owner.gender ?? "",
          enrollmentYear: 2022,
          graduationYear: 2026,
          phone: owner.phone,
          email: owner.email,
          sortOrder: 0,
          isPayee: true,
          joinedAt: baseDate,
        },
      });
      await prisma.project.update({ where: { id: project.id }, data: { payeeMemberId: leader.id } });
      await prisma.payeeBank.create({
        data: {
          memberId: leader.id,
          boundFinancePlatform: globalIndex % 2 === 0,
          organization: college,
          phone: owner.phone,
          idCardEncrypted: globalIndex % 2 === 0 ? null : `DEV_ID_CIPHERTEXT_${globalIndex + 1}`,
          bankCardEncrypted: globalIndex % 2 === 0 ? null : `DEV_CARD_CIPHERTEXT_${globalIndex + 1}`,
          bankName: globalIndex % 2 === 0 ? null : "示例银行武汉大学支行",
          accountName: globalIndex % 2 === 0 ? null : owner.name,
        },
      });
      for (let memberIndex = 0; memberIndex < 2; memberIndex += 1) {
        const isInternal = !(memberIndex === 1 && globalIndex % 3 === 0);
        const memberNumber = globalIndex * 2 + memberIndex + 1;
        await prisma.teamMember.create({
          data: {
            projectId: project.id,
            personNo: isInternal ? `202621${String(memberNumber).padStart(4, "0")}` : null,
            name: required(memberNames[(globalIndex + memberIndex) % memberNames.length], "成员姓名缺失"),
            role: "MEMBER",
            isInternal,
            school: isInternal ? "武汉大学" : "校外合作院校",
            educationStage: "本科",
            trainingUnit: isInternal ? college : "校外合作单位",
            major: "电子信息工程",
            gender: memberIndex === 0 ? "女" : "男",
            enrollmentYear: 2022,
            graduationYear: 2026,
            phone: `1390002${String(memberNumber).padStart(4, "0")}`,
            email: `member${memberNumber}@example.edu.cn`,
            sortOrder: memberIndex + 1,
            joinedAt: baseDate,
          },
        });
      }
      const teacherUser = required(teacherUsers[globalIndex % teacherUsers.length], "教师账号缺失");
      const teacherPending = globalIndex === 0;
      await prisma.teacher.create({
        data: {
          projectId: project.id,
          userId: teacherUser.id,
          staffNo: teacherUser.staffNo,
          name: teacherUser.name,
          gender: "男",
          phone: teacherUser.phone,
          school: "武汉大学",
          unit: college,
          title: "副教授",
          email: teacherUser.email,
          confirmStatus: teacherPending ? "PENDING" : "CONFIRMED",
          confirmedAt: teacherPending ? null : baseDate,
        },
      });
      await prisma.work.create({
        data: {
          projectId: project.id,
          fileName: `${project.name}-作品.pdf`,
          fileUrl: `/seed-files/${project.id}/work.pdf`,
          form: (["软件", "报告", "实物", "视频"] as const)[globalIndex % 4],
          category: localIndex === 3 ? "智能制造创新组" : "科技创新",
          groupName: localIndex === 3 ? "企业命题组" : "创意组",
          pptFileName: `${project.name}-路演.pptx`,
          pptFileUrl: `/seed-files/${project.id}/slides.pptx`,
        },
      });
      if (globalIndex === 1) {
        await prisma.sealedFile.create({
          data: {
            projectId: project.id,
            fileName: "盖章件-第一版.pdf",
            filePath: `/seed-files/${project.id}/sealed-v1.pdf`,
            mimeType: "application/pdf",
            sizeBytes: 120000,
            versionNo: 1,
            uploadedBy: owner.id,
            isFinal: false,
            reviewResult: "REJECTED",
            reviewNote: "印章不清晰",
          },
        });
      }
      if (globalIndex !== 0) {
        await prisma.sealedFile.create({
          data: {
            projectId: project.id,
            fileName: `盖章件-第${globalIndex === 1 ? 2 : 1}版.pdf`,
            filePath: `/seed-files/${project.id}/sealed-final.pdf`,
            mimeType: "application/pdf",
            sizeBytes: 128000,
            versionNo: globalIndex === 1 ? 2 : 1,
            uploadedBy: owner.id,
            isFinal: true,
            reviewResult: "APPROVED",
          },
        });
      }
      if (globalIndex < 2) {
        await prisma.review.create({
          data: {
            projectId: project.id,
            level: "COLLEGE",
            result: "REJECTED",
            reason: globalIndex === 0 ? "成员信息不完整，请补充后重新提交" : "作品类别与赛道不匹配，请修正",
            reviewerId: admin.id,
          },
        });
      } else {
        await prisma.review.create({
          data: { projectId: project.id, level: "COLLEGE", result: "APPROVED", reviewerId: admin.id },
        });
        if (globalIndex % 3 === 0) {
          await prisma.review.create({
            data: { projectId: project.id, level: "SCHOOL", result: "APPROVED", reviewerId: admin.id },
          });
        }
      }
      await prisma.projectAlias.create({
        data: { projectId: project.id, aliasType: "REG_NO", aliasValue: `REG-2026-${String(globalIndex + 1).padStart(3, "0")}` },
      });
      projects.push({ id: project.id, competitionId: competition.id, ownerId: owner.id, leaderMemberId: leader.id });
    }
  }

  const awardLevels = ["GOLD", "SILVER"] as const;
  for (let index = 0; index < 2; index += 1) {
    const project = required(projects[index + 2], "奖项项目缺失");
    const award = await prisma.award.create({
      data: {
        projectId: project.id,
        competitionId: project.competitionId,
        stage: "SCHOOL",
        awardLevel: required(awardLevels[index], "奖项等级缺失"),
        createdBy: admin.id,
      },
    });
    await prisma.awardHistory.create({
      data: {
        awardId: award.id,
        field: "awardLevel",
        oldValue: null,
        newValue: award.awardLevel,
        reason: "阶段 0 演示奖项录入",
        changedBy: admin.id,
      },
    });
  }

  const dictionarySeeds: Prisma.DictOptionCreateManyInput[] = [
    { type: "ETHNICITY", value: "han", label: "汉族", sortOrder: 1 },
    { type: "ETHNICITY", value: "other", label: "其他民族", sortOrder: 2 },
    { type: "EDUCATION_STAGE", value: "bachelor", label: "本科", sortOrder: 1 },
    { type: "EDUCATION_STAGE", value: "master", label: "硕士", sortOrder: 2 },
    { type: "EDUCATION_STAGE", value: "doctor", label: "博士", sortOrder: 3 },
    { type: "WORK_FORM", value: "physical", label: "实物", sortOrder: 1 },
    { type: "WORK_FORM", value: "software", label: "软件", sortOrder: 2 },
    { type: "WORK_FORM", value: "report", label: "报告", sortOrder: 3 },
    { type: "WORK_FORM", value: "video", label: "视频", sortOrder: 4 },
    { type: "WORK_FORM", value: "other", label: "其他", sortOrder: 5 },
    { type: "GROUP", value: "creative", label: "创意组", sortOrder: 1 },
    { type: "GROUP", value: "enterprise", label: "企业命题组", sortOrder: 2 },
    { type: "CATEGORY", value: "technology", label: "科技创新", sortOrder: 1 },
    { type: "CATEGORY", value: "manufacturing", label: "智能制造创新组", sortOrder: 2 },
  ];
  await prisma.dictOption.createMany({ data: dictionarySeeds });

  // 按赛道挂载的组别/类别数量（3 个赛事 × 每赛事 35 条）
  const trackDictionaryCount = await prisma.dictOption.count({ where: { NOT: { trackId: null } } });
  expectCount("按赛道的组别/类别", trackDictionaryCount, 105);

  const firstProject = required(projects[0], "首个项目缺失");
  const secondProject = required(projects[1], "第二个项目缺失");
  await prisma.changeLog.create({
    data: {
      projectId: firstProject.id,
      field: "项目名称",
      oldValue: "智能巡检系统",
      newValue: "基于多模态感知的智能巡检系统",
      changedBy: admin.id,
      source: "DIRECT",
    },
  });
  await prisma.changeRequest.create({
    data: {
      projectId: secondProject.id,
      applicantId: secondProject.ownerId,
      type: "PROJECT_NAME",
      fieldDiffJson: JSON.stringify({ field: "项目名称", oldValue: "北斗定位平台", newValue: "高精度北斗协同定位平台" }),
      reason: "根据学院审核意见规范项目名称",
      cooldownUntil: new Date("2026-03-20T00:00:00.000Z"),
    },
  });
  const firstTemplate = required(competitionTemplates[0], "首个赛事模板缺失");
  const importBatch = await prisma.importBatch.create({
    data: {
      competitionId: firstTemplate.competitionId,
      templateId: firstTemplate.templateId,
      stage: "SCHOOL",
      fileName: "阶段0演示导入.xlsx",
      fileType: "xlsx",
      sourceType: "IMPORT",
      totalRows: 18,
      successRows: 18,
      failureRows: 0,
      mappingJson: JSON.stringify({ 项目名称: "项目名称", 负责人学号: "负责人学号" }),
      importedBy: admin.id,
    },
  });
  await prisma.dataSource.create({
    data: {
      recordType: "Project",
      recordId: firstProject.id,
      sourceType: "IMPORT",
      sourceRef: "阶段0演示导入.xlsx · 第1行",
      batchId: importBatch.id,
      syncedAt: baseDate,
    },
  });
  await prisma.exportRecord.create({
    data: {
      exporterId: admin.id,
      type: "DATASET",
      fieldsJson: JSON.stringify(["项目名称", "学院", "赛道", "负责人", "状态"]),
      rowCount: 18,
      watermarkNo: "SEED-2026-001",
      fileName: "阶段0演示数据表.xlsx",
    },
  });
  await prisma.sensitiveAccessLog.create({
    data: {
      userId: admin.id,
      projectId: firstProject.id,
      memberId: firstProject.leaderMemberId,
      resourceType: "BANK_ACCOUNT",
      resourceId: firstProject.leaderMemberId,
      fieldNames: "bankCardEncrypted",
      reason: "演示敏感读取留痕",
    },
  });
  const kbDocument = await prisma.kbDocument.create({
    data: {
      title: "2026年科创赛事报名指南",
      fileName: "2026-报名指南.pdf",
      filePath: "/seed-files/2026-guide.pdf",
      year: 2026,
      effectiveAt: baseDate,
      uploadedBy: admin.id,
    },
  });
  await prisma.kbChunk.createMany({
    data: [
      {
        documentId: kbDocument.id,
        section: "报名与组队",
        content: "参赛项目须明确一名负责人，团队成员信息须与报名记录保持一致。",
        keywords: "报名,组队,负责人,团队成员",
      },
      {
        documentId: kbDocument.id,
        section: "指导教师",
        content: "指导教师确认不进入审批链，未确认项目仍可提交和审核。",
        keywords: "指导教师,确认,审批",
      },
    ],
  });
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "SEED_INITIALIZED",
      targetType: "Database",
      targetId: "stage-0",
      detail: JSON.stringify({ competitions: 3, projectsPerCompetition: 6 }),
    },
  });

  const counts = {
    User: await prisma.user.count(),
    Competition: await prisma.competition.count(),
    Track: await prisma.track.count(),
    Project: await prisma.project.count(),
    ProjectAlias: await prisma.projectAlias.count(),
    TeamMember: await prisma.teamMember.count(),
    Teacher: await prisma.teacher.count(),
    PayeeBank: await prisma.payeeBank.count(),
    Work: await prisma.work.count(),
    SealedFile: await prisma.sealedFile.count(),
    Review: await prisma.review.count(),
    ChangeLog: await prisma.changeLog.count(),
    ChangeRequest: await prisma.changeRequest.count(),
    TimeWindow: await prisma.timeWindow.count(),
    ImportBatch: await prisma.importBatch.count(),
    ExportRecord: await prisma.exportRecord.count(),
    SensitiveAccessLog: await prisma.sensitiveAccessLog.count(),
    Award: await prisma.award.count(),
    AwardHistory: await prisma.awardHistory.count(),
    DictOption: await prisma.dictOption.count(),
    FormTemplate: await prisma.formTemplate.count(),
    AuditLog: await prisma.auditLog.count(),
    DataSource: await prisma.dataSource.count(),
    KbDocument: await prisma.kbDocument.count(),
    KbChunk: await prisma.kbChunk.count(),
    AwardRecord: await prisma.awardRecord.count(),
    MemberSnapshot: await prisma.memberSnapshot.count(),
    Anomaly: await prisma.anomaly.count(),
  };
  const expected = {
    User: 22, Competition: 3, Track: 15, Project: 18, ProjectAlias: 18,
    TeamMember: 54, Teacher: 18, PayeeBank: 18, Work: 18, SealedFile: 18,
    Review: 23, ChangeLog: 1, ChangeRequest: 1, TimeWindow: 3, ImportBatch: 1,
    ExportRecord: 1, SensitiveAccessLog: 1, Award: 2, AwardHistory: 2,
    DictOption: dictionarySeeds.length + trackDictionaryCount, FormTemplate: 3, AuditLog: 1, DataSource: 1,
    KbDocument: 1, KbChunk: 2, AwardRecord: 0, MemberSnapshot: 0, Anomaly: 0,
  };
  for (const [label, expectedCount] of Object.entries(expected)) {
    expectCount(label, counts[label as keyof typeof counts], expectedCount);
  }
  expectCount("被驳回项目", await prisma.project.count({ where: { reviewStatus: "REJECTED" } }), 2);
  expectCount("待确认老师", await prisma.teacher.count({ where: { confirmStatus: "PENDING" } }), 1);
  expectCount("未上传盖章件项目", await prisma.project.count({ where: { sealedFiles: { none: {} } } }), 1);
  expectCount("国内/海外项目层级", await prisma.track.count({ where: { name: { in: ["国内项目", "海外项目"] } } }), 6);
  const projectsByCompetition = await prisma.project.groupBy({ by: ["competitionId"], _count: { _all: true } });
  expectCount("赛事项目分组数", projectsByCompetition.length, 3);
  for (const group of projectsByCompetition) expectCount("单赛事项目数", group._count._all, 6);

  console.log("阶段 0 种子数据写入完成。");
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
