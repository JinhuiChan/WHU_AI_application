/**
 * 生成仓库外 ../demo数据/ 目录下的演示数据（可重复执行，输出覆盖同名文件）。
 *
 * 运行：npm.cmd run demo:generate
 * 输出目录：<仓库根目录>/../demo数据（即 mvp 上一级的 demo数据 文件夹，不在 Git 仓库内）
 * 前置：
 *   1) npm.cmd run setup              → 建库 + 基础演示数据（3 个赛事、赛道字典）
 *   2) npm.cmd run db:seed:accounts   → 写入 800 学生 + 50 教师账号
 *
 * 产物（全部报名数据都归属「中国国际大学生创新大赛」一个赛事）：
 *   ../demo数据/01-学生账号清单-800人.xlsx
 *   ../demo数据/02-教师账号清单-50人.xlsx
 *   ../demo数据/03-导入-中国国际大学生创新大赛-2026校赛-240项.xlsx
 *
 * 导入文件表头与平台「导入中心」的 24 个系统字段标签完全一致（除「状态」外全部映射），
 * 因此上传后自动匹配即可直接保存映射并入库；成员/指导老师采用平台约定的逗号分隔多行格式。
 */
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import {
  DEMO_PASSWORD,
  DEMO_STUDENT_COUNT,
  DEMO_TEACHER_COUNT,
  SCHOOL_NAME,
  createRng,
  generateDemoStudents,
  generateDemoTeachers,
  type DemoStudent,
  type DemoTeacher,
} from "../prisma/demo-accounts";
import { importSystemFields } from "../types/import";

const prisma = new PrismaClient();
/** 输出到仓库外：mvp 的上一级 demo数据 目录；可用 DEMO_DATA_DIR 覆盖（测试/特殊场景） */
const OUTPUT_DIR = path.resolve(process.env.DEMO_DATA_DIR ?? path.join(process.cwd(), "..", "demo数据"));

const PLAN_LIST = [
  {
    competitionName: "中国国际大学生创新大赛",
    projectCount: 240,
    fileName: "03-导入-中国国际大学生创新大赛-2026校赛-240项.xlsx",
  },
] as const;

const TOTAL_PROJECTS = PLAN_LIST.reduce((sum, plan) => sum + plan.projectCount, 0); // 240
const MEMBER_COUNT_TWO = 160; // 前 160 个项目各 2 名成员，其余各 3 名：160*2 + 80*3 = 560
const PAYEE_PROJECT_COUNT = 108; // 约 45% 的项目由负责人兼任奖金领款人
const WORK_FORMS = ["软件", "实物", "报告", "视频", "其他"] as const;

/** 与平台导入系统字段一致的表头（不包含「状态」：导入入库后一律为待审核，写状态会造成误解） */
const IMPORT_HEADERS = [
  "项目名称",
  "负责人学号",
  "负责人姓名",
  "学院",
  "赛道",
  "组别",
  "类别",
  "成员",
  "指导老师",
  "领款人",
  "申报单位",
  "培养单位",
  "年级",
  "入学年份",
  "毕业年份",
  "培养阶段",
  "性别",
  "民族",
  "手机号",
  "邮箱",
  "作品形式",
  "作品类别",
  "作品组别",
] as const;

type Rng = () => number;

type TrackPool = { name: string; groups: string[]; categories: string[]; weight: number };

type ProjectSpec = {
  index: number;
  planIndex: number;
  competitionName: string;
  name: string;
  track: string;
  group: string;
  category: string;
  leader: DemoStudent;
  members: DemoStudent[];
  teachers: DemoTeacher[];
  payee: boolean;
  workForm: string;
};

function required<T>(value: T | undefined | null, message: string): T {
  if (value === undefined || value === null) throw new Error(message);
  return value;
}

function pick<T>(rng: Rng, list: readonly T[]): T {
  const item = list[Math.floor(rng() * list.length)];
  if (item === undefined) throw new Error("候选列表为空");
  return item;
}

function weightedPick<T>(rng: Rng, list: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let ticket = rng() * total;
  for (let index = 0; index < list.length; index += 1) {
    ticket -= weights[index] ?? 0;
    if (ticket <= 0) {
      const item = list[index];
      if (item !== undefined) return item;
    }
  }
  return required(list[list.length - 1], "候选列表为空");
}

function shuffle<T>(rng: Rng, list: readonly T[]): T[] {
  const result = [...list];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(rng() * (index + 1));
    const current = required(result[index], "洗牌失败");
    result[index] = required(result[target], "洗牌失败");
    result[target] = current;
  }
  return result;
}

function trackWeight(name: string) {
  if (name === "国内项目") return 50;
  if (name === "海外项目") return 10;
  if (name === "青年红色筑梦之旅赛道") return 20;
  if (name === "产业赛道") return 20;
  return 5;
}

const NAME_PREFIXES = [
  "基于多模态感知的", "面向复杂场景的", "融合大模型的", "低功耗自组网的", "高精度北斗的",
  "数字孪生驱动的", "边缘智能的", "知识图谱增强的", "柔性传感的", "仿生结构的",
  "区块链赋能的", "端云协同的", "光声成像的", "强化学习驱动的", "多源数据融合的", "轻量化部署的",
] as const;

const NAME_DOMAINS = [
  "城市复杂环境多源感知", "乡村农业精准作业", "流域洪涝监测预警", "工业产线缺陷检测",
  "山区电网低功耗通信", "老年康复训练", "校园低碳能源调度", "北斗高精度协同定位",
  "医学影像智能诊断", "文化遗产数字化保护", "食品安全快速检测", "新能源电池健康管理",
  "无障碍人机交互", "水资源智慧调配", "地下管网隐患排查", "森林火灾早期识别",
  "物流仓库自动分拣", "中小学教育大模型", "跨境电商智能客服", "慢性病居家监测",
  "微流控芯片快速检测", "卫星遥感影像解译", "城市交通信号优化", "工业机器人集群控制",
  "可信数据存证与追溯", "生物信息分析加速", "碳排核算与交易", "应急物资调度指挥",
  "智慧灌溉与节水", "高层建筑结构监测", "口腔种植数字化设计", "冷链运输温控",
  "公共舆情风险研判", "装备制造预测性维护", "化工园区安全巡检", "光储充一体微电网",
  "虚拟现实实验教学", "中药材质量溯源", "无人机集群协同巡检", "城市内涝实时预警",
] as const;

const NAME_PRODUCTS = [
  "智能巡检系统", "协同定位平台", "能源优化系统", "智能康复设备", "监测预警平台",
  "精准作业机器人", "质量溯源平台", "边缘智能终端", "微流控检测芯片", "遥感解译平台",
  "交通调度系统", "无障碍交互终端", "数字孪生平台", "知识图谱引擎", "快速检测仪",
  "教学智能助手", "工业质检系统", "集群控制平台", "空间信息服务", "可信存证系统",
  "生物信息分析平台", "碳核算平台", "健康监测设备", "应急指挥平台", "智慧灌溉系统",
  "城市计算平台", "虚拟仿真实验平台", "预测性维护系统", "能源管理终端", "结构监测系统",
] as const;

function buildProjectNames(rng: Rng, count: number): string[] {
  const used = new Set<string>();
  const names: string[] = [];
  let guard = 0;
  while (names.length < count && guard < count * 200) {
    guard += 1;
    const domain = pick(rng, NAME_DOMAINS);
    const product = pick(rng, NAME_PRODUCTS);
    const name = rng() < 0.5
      ? `${pick(rng, NAME_PREFIXES)}${domain}${product}`
      : `${domain}的${product}`;
    if (used.has(name)) continue;
    used.add(name);
    names.push(name);
  }
  if (names.length < count) throw new Error(`项目名称池不足，仅生成 ${names.length}/${count} 个`);
  return names;
}

function memberLine(member: DemoStudent): string {
  return [
    "是",
    member.name,
    member.studentNo,
    member.educationStage,
    member.college,
    member.major,
    member.gender,
    member.ethnicity,
    String(member.enrollmentYear),
    String(member.graduationYear),
    member.phone,
    member.email,
  ].join(",");
}

function teacherLine(teacher: DemoTeacher): string {
  return [
    "是",
    teacher.name,
    teacher.staffNo,
    teacher.gender,
    teacher.phone,
    SCHOOL_NAME,
    teacher.college,
    teacher.title,
    teacher.email,
  ].join(",");
}

function setColumnWidths(worksheet: XLSX.WorkSheet, widths: number[]) {
  worksheet["!cols"] = widths.map((width) => ({ wch: width }));
}

/** 清理上一版生成、但本次不再生成的导入文件（只动「NN-导入-*.xlsx」，不碰账号清单） */
async function removeStaleImportFiles(keepFileNames: string[]) {
  const keep = new Set(keepFileNames);
  const existing = await readdir(OUTPUT_DIR);
  const stale = existing.filter((name) => /^\d{2}-导入-.*\.xlsx$/.test(name) && !keep.has(name));
  for (const name of stale) await unlink(path.join(OUTPUT_DIR, name));
  return stale;
}

function writeWorkbook(sheets: Array<{ name: string; rows: (string | number)[][]; widths?: number[] }>) {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
    if (sheet.widths) setColumnWidths(worksheet, sheet.widths);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

async function readCompetitionData() {
  const competitions = await prisma.competition.findMany({
    where: { name: { in: PLAN_LIST.map((plan) => plan.competitionName) } },
    select: {
      id: true,
      name: true,
      year: true,
      tracks: {
        where: { enabled: true },
        select: { id: true, name: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (competitions.length !== PLAN_LIST.length) {
    const missing = PLAN_LIST
      .map((plan) => plan.competitionName)
      .filter((name) => !competitions.some((competition) => competition.name === name));
    throw new Error(`数据库中缺少赛事：${missing.join("、")}。请先运行 npm.cmd run setup（或 db:seed）初始化基础演示数据`);
  }

  const options = await prisma.dictOption.findMany({
    where: { trackId: { not: null }, enabled: true, type: { in: ["GROUP", "CATEGORY"] } },
    select: { trackId: true, type: true, label: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  return competitions.map((competition) => {
    const tracks: TrackPool[] = competition.tracks.flatMap((track) => {
      const groups = options
        .filter((option) => option.trackId === track.id && option.type === "GROUP")
        .map((option) => option.label);
      const categories = options
        .filter((option) => option.trackId === track.id && option.type === "CATEGORY")
        .map((option) => option.label);
      return groups.length && categories.length
        ? [{ name: track.name, groups, categories, weight: trackWeight(track.name) }]
        : [];
    });
    if (!tracks.length) throw new Error(`赛事「${competition.name}」没有可用的赛道/组别/类别字典，请先运行 db:seed`);
    return { ...competition, tracks };
  });
}

function buildProjectSpecs(
  competitions: Awaited<ReturnType<typeof readCompetitionData>>,
  students: DemoStudent[],
  teachers: DemoTeacher[],
): ProjectSpec[] {
  const rng = createRng(20261111);
  const shuffledStudents = shuffle(rng, students);
  const leaders = shuffledStudents.slice(0, TOTAL_PROJECTS);
  const memberPool = shuffledStudents.slice(TOTAL_PROJECTS);
  const names = buildProjectNames(rng, TOTAL_PROJECTS);

  const competitionByName = new Map(competitions.map((competition) => [competition.name, competition]));
  const teachersByCollege = new Map<string, DemoTeacher[]>();
  for (const teacher of teachers) {
    const list = teachersByCollege.get(teacher.college) ?? [];
    list.push(teacher);
    teachersByCollege.set(teacher.college, list);
  }

  const specs: ProjectSpec[] = [];
  let globalIndex = 0;
  let memberCursor = 0;

  for (const [planIndex, plan] of PLAN_LIST.entries()) {
    const competition = required(competitionByName.get(plan.competitionName), `缺少赛事 ${plan.competitionName}`);
    for (let localIndex = 0; localIndex < plan.projectCount; localIndex += 1) {
      const leader = required(leaders[globalIndex], `缺少第 ${globalIndex + 1} 个项目负责人`);
      const memberCount = globalIndex < MEMBER_COUNT_TWO ? 2 : 3;
      const members = memberPool.slice(memberCursor, memberCursor + memberCount);
      memberCursor += memberCount;
      const track = weightedPick(rng, competition.tracks, competition.tracks.map((item) => item.weight));
      const group = pick(rng, track.groups);
      const category = pick(rng, track.categories);
      const payee = rng() < PAYEE_PROJECT_COUNT / TOTAL_PROJECTS;
      const workForm = WORK_FORMS[globalIndex % WORK_FORMS.length] ?? "软件";

      // 指导老师：40% 概率优先选与负责人同学院的老师，保证学院对应关系可读
      const sameCollege = teachersByCollege.get(leader.college) ?? teachers;
      const firstTeacher = rng() < 0.4 ? pick(rng, sameCollege) : pick(rng, teachers);
      const projectTeachers = [firstTeacher];
      if (globalIndex % 3 === 1) {
        let secondTeacher = pick(rng, rng() < 0.4 ? sameCollege : teachers);
        let guard = 0;
        while (secondTeacher.staffNo === firstTeacher.staffNo && guard < 20) {
          secondTeacher = pick(rng, teachers);
          guard += 1;
        }
        if (secondTeacher.staffNo !== firstTeacher.staffNo) projectTeachers.push(secondTeacher);
      }

      specs.push({
        index: globalIndex,
        planIndex,
        competitionName: plan.competitionName,
        name: required(names[globalIndex], "项目名称缺失"),
        track: track.name,
        group,
        category,
        leader,
        members,
        teachers: projectTeachers,
        payee,
        workForm,
      });
      globalIndex += 1;
    }
  }

  // 20 名成员重复参与第二个项目：模拟"老队员带新项目"的真实情况
  const repeatProjectIndexes = Array.from({ length: 20 }, (_, index) => 5 + index * 12)
    .filter((index) => index < TOTAL_PROJECTS);
  const extraMemberNos = new Set<string>();
  for (const projectIndex of repeatProjectIndexes) {
    const spec = required(specs[projectIndex], "重复成员项目缺失");
    const candidates = memberPool.filter(
      (student) =>
        !extraMemberNos.has(student.studentNo) &&
        student.studentNo !== spec.leader.studentNo &&
        !spec.members.some((member) => member.studentNo === student.studentNo),
    );
    const extraMember = pick(rng, candidates);
    extraMemberNos.add(extraMember.studentNo);
    spec.members.push(extraMember);
  }

  // 保证 50 名教师每人都至少指导 1 个项目
  const teacherLoad = new Map<string, number>();
  for (const teacher of teachers) teacherLoad.set(teacher.staffNo, 0);
  for (const spec of specs) {
    for (const teacher of spec.teachers) {
      teacherLoad.set(teacher.staffNo, (teacherLoad.get(teacher.staffNo) ?? 0) + 1);
    }
  }
  for (const teacher of teachers) {
    if ((teacherLoad.get(teacher.staffNo) ?? 0) > 0) continue;
    for (let offset = 0; offset < TOTAL_PROJECTS; offset += 1) {
      const target = required(specs[(teacher.index * 37 + offset) % TOTAL_PROJECTS], "教师分配项目缺失");
      if (target.teachers.some((item) => item.staffNo === teacher.staffNo)) continue;
      if (target.teachers.length >= 3) continue;
      target.teachers.push(teacher);
      teacherLoad.set(teacher.staffNo, 1);
      break;
    }
  }

  return specs;
}

function buildImportRows(specs: ProjectSpec[]) {
  const memberContinuation = new Set(
    specs.filter((spec) => spec.index % 10 === 7 && spec.members.length >= 2).slice(0, 12).map((spec) => spec.index),
  );
  const teacherContinuation = new Set(
    specs.filter((spec) => spec.index % 9 === 4 && spec.teachers.length >= 2).slice(0, 12).map((spec) => spec.index),
  );

  const byCompetition = new Map<string, ProjectSpec[]>();
  for (const spec of specs) {
    const list = byCompetition.get(spec.competitionName) ?? [];
    list.push(spec);
    byCompetition.set(spec.competitionName, list);
  }

  return PLAN_LIST.map((plan) => {
    const planSpecs = byCompetition.get(plan.competitionName) ?? [];
    if (planSpecs.length !== plan.projectCount) {
      throw new Error(`赛事「${plan.competitionName}」项目数应为 ${plan.projectCount}，实际 ${planSpecs.length}`);
    }
    const rows: string[][] = [[...IMPORT_HEADERS]];
    let continuationCount = 0;

    for (const spec of planSpecs) {
      const members = [...spec.members];
      const teachers = [...spec.teachers];
      const movedMember = memberContinuation.has(spec.index) && members.length >= 2 ? members.pop() : undefined;
      const movedTeacher = teacherContinuation.has(spec.index) && teachers.length >= 2 ? teachers.pop() : undefined;

      rows.push([
        spec.name,
        spec.leader.studentNo,
        spec.leader.name,
        spec.leader.college,
        `${spec.track}/${spec.group}/${spec.category}`,
        spec.group,
        spec.category,
        members.map(memberLine).join("\n"),
        teachers.map(teacherLine).join("\n"),
        spec.payee ? "是" : "否",
        spec.leader.college,
        spec.leader.college,
        spec.leader.grade,
        String(spec.leader.enrollmentYear),
        String(spec.leader.graduationYear),
        spec.leader.educationStage,
        spec.leader.gender,
        spec.leader.ethnicity,
        spec.leader.phone,
        spec.leader.email,
        spec.workForm,
        spec.category,
        spec.group,
      ]);

      if (movedMember || movedTeacher) {
        const continuation = IMPORT_HEADERS.map(() => "");
        if (movedMember) continuation[7] = memberLine(movedMember);
        if (movedTeacher) continuation[8] = teacherLine(movedTeacher);
        rows.push(continuation);
        continuationCount += 1;
      }
    }

    return {
      fileName: plan.fileName,
      competitionName: plan.competitionName,
      projectCount: planSpecs.length,
      rowCount: rows.length - 1,
      continuationCount,
      rows,
    };
  });
}

async function writeAccountFiles(students: DemoStudent[], teachers: DemoTeacher[]) {
  const studentRows: (string | number)[][] = [
    ["序号", "学号", "姓名", "登录手机号", "密码", "学院", "专业", "培养阶段", "年级", "性别", "民族", "入学年份", "毕业年份", "邮箱", "已绑定财务平台"],
    ...students.map((student) => [
      student.index + 1,
      student.studentNo,
      student.name,
      student.phone,
      DEMO_PASSWORD,
      student.college,
      student.major,
      student.educationStage,
      student.grade,
      student.gender,
      student.ethnicity,
      student.enrollmentYear,
      student.graduationYear,
      student.email,
      student.boundFinancePlatform ? "是" : "否",
    ]),
  ];
  const teacherRows: (string | number)[][] = [
    ["序号", "工号", "姓名", "登录手机号", "密码", "学院", "职称", "性别", "邮箱"],
    ...teachers.map((teacher) => [
      teacher.index + 1,
      teacher.staffNo,
      teacher.name,
      teacher.phone,
      DEMO_PASSWORD,
      teacher.college,
      teacher.title,
      teacher.gender,
      teacher.email,
    ]),
  ];

  const studentNotes: (string | number)[][] = [
    ["学生账号清单说明"],
    [""],
    ["规模", `${DEMO_STUDENT_COUNT} 人（10 个学院 × 80 人）`],
    ["登录方式", `手机号 + 密码 ${DEMO_PASSWORD}，登录页身份选择「学生」`],
    ["学号规则", "入学年份(4位) + 学院代码(2位) + 序号(4位)，共 10 位数字"],
    ["手机号段", "13700000001 ~ 13700000800"],
    [""],
    ["学院代码", "01 计算机学院 / 02 电子信息学院 / 03 机械与动力学院 / 04 经济与管理学院 / 05 法学院"],
    ["", "06 遥感信息工程学院 / 07 生命科学学院 / 08 数学与统计学院 / 09 化学与分子科学学院 / 10 新闻与传播学院"],
    [""],
    ["说明", "本清单由 scripts/generate-demo-data.ts 按 prisma/demo-accounts.ts 规则生成，与导入文件中的负责人/成员学号一一对应。"],
  ];
  const teacherNotes: (string | number)[][] = [
    ["教师账号清单说明"],
    [""],
    ["规模", `${DEMO_TEACHER_COUNT} 人（10 个学院 × 5 人）`],
    ["登录方式", `手机号 + 密码 ${DEMO_PASSWORD}，登录页身份选择「指导老师」`],
    ["工号规则", "T20260001 ~ T20260050"],
    ["手机号段", "13600000001 ~ 13600000050"],
    [""],
    ["说明", "导入的报名数据中「指导老师」写的是教师工号，老师登录后可在「指导项目」按工号看到对应项目并确认指导关系。"],
  ];

  await writeFile(
    path.join(OUTPUT_DIR, "01-学生账号清单-800人.xlsx"),
    writeWorkbook([
      { name: "学生账号", rows: studentRows, widths: [6, 14, 10, 14, 8, 16, 24, 10, 8, 6, 8, 10, 10, 28, 14] },
      { name: "说明", rows: studentNotes, widths: [14, 100] },
    ]),
  );
  await writeFile(
    path.join(OUTPUT_DIR, "02-教师账号清单-50人.xlsx"),
    writeWorkbook([
      { name: "教师账号", rows: teacherRows, widths: [6, 12, 10, 14, 8, 16, 12, 6, 28] },
      { name: "说明", rows: teacherNotes, widths: [14, 100] },
    ]),
  );
}

async function writeImportFiles(importFiles: Array<{
  fileName: string;
  competitionName: string;
  projectCount: number;
  rowCount: number;
  continuationCount: number;
  rows: string[][];
}>) {
  const widths = [40, 14, 10, 16, 30, 14, 16, 70, 70, 8, 16, 16, 8, 10, 10, 10, 6, 8, 13, 28, 10, 16, 14];
  for (const file of importFiles) {
    const notes: (string | number)[][] = [
      ["导入说明"],
      [""],
      ["赛事", file.competitionName],
      ["赛年", "2026"],
      ["导入阶段", "校赛（SCHOOL）——在导入中心选择「校赛」"],
      ["项目数", file.projectCount],
      ["数据行数", `${file.rowCount} 行（其中 ${file.continuationCount} 行为成员/老师续行）`],
      [""],
      ["字段映射", "上传后平台会自动匹配「项目名称/负责人学号/负责人姓名/学院/赛道/组别/类别/成员/指导老师/领款人」等字段，无需手动调整，直接「保存映射方案」→「开始入库」。"],
      ["成员格式", "「成员」列每行一名成员，字段用英文逗号分隔、多人之间用换行分隔：是否校内,姓名,学号,培养阶段,培养单位,专业,性别,民族,入学年份,毕业年份,手机号,邮箱"],
      ["老师格式", "「指导老师」列每行一位老师：是否校内,姓名,工号,性别,手机号,学校,单位,职称,邮箱"],
      ["赛道格式", "「赛道」列写作「赛道/组别/类别」，如「国内项目/本科生创意组/新工科」"],
      ["续行说明", "续行 = 项目名称为空、只填空成员/指导老师列的行，平台会把它们合并到上一个项目。"],
      [""],
      ["注意", "同一赛事下项目名称必须唯一；如需重复导入，请先重置数据库（npm.cmd run db:push --force-reset + db:seed + db:seed:accounts）。"],
      ["注意", "导入入库后项目状态均为「待学院审核」，指导教师状态为「待确认」，需在平台内继续走审核/确认流程。"],
    ];
    await writeFile(
      path.join(OUTPUT_DIR, file.fileName),
      writeWorkbook([
        { name: "报名数据", rows: file.rows, widths },
        { name: "导入说明", rows: notes, widths: [14, 120] },
      ]),
    );
  }
}

async function main() {
  const students = generateDemoStudents();
  const teachers = generateDemoTeachers();
  if (students.length !== DEMO_STUDENT_COUNT) throw new Error(`学生账号应为 ${DEMO_STUDENT_COUNT}，实际 ${students.length}`);
  if (teachers.length !== DEMO_TEACHER_COUNT) throw new Error(`教师账号应为 ${DEMO_TEACHER_COUNT}，实际 ${teachers.length}`);

  const competitions = await readCompetitionData();
  const specs = buildProjectSpecs(competitions, students, teachers);
  if (specs.length !== TOTAL_PROJECTS) throw new Error(`项目数应为 ${TOTAL_PROJECTS}，实际 ${specs.length}`);
  const importFiles = buildImportRows(specs);

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeAccountFiles(students, teachers);
  await writeImportFiles(importFiles);
  const staleFiles = await removeStaleImportFiles(importFiles.map((file) => file.fileName));

  // 自检：表头必须覆盖导入系统字段（状态除外），否则自动映射会缺字段
  const expectedLabels = importSystemFields
    .filter((field) => field.key !== "status")
    .map((field) => field.label);
  const headerSet = new Set(IMPORT_HEADERS);
  const missing = expectedLabels.filter((label) => !headerSet.has(label));
  if (missing.length) throw new Error(`导入表头缺少系统字段：${missing.join("、")}`);

  const summary = importFiles.map((file) => ({
    file: file.fileName,
    competition: file.competitionName,
    projects: file.projectCount,
    rows: file.rowCount,
    continuationRows: file.continuationCount,
  }));
  console.log("演示数据生成完成：");
  console.log(JSON.stringify({
    outputDirectory: OUTPUT_DIR,
    removedStaleFiles: staleFiles,
    competitionFiles: summary,
    accountFiles: [
      { file: "01-学生账号清单-800人.xlsx", rows: students.length },
      { file: "02-教师账号清单-50人.xlsx", rows: teachers.length },
    ],
    totals: {
      studentAccounts: students.length,
      teacherAccounts: teachers.length,
      projects: specs.length,
      rows: importFiles.reduce((sum, file) => sum + file.rowCount, 0),
      continuationRows: importFiles.reduce((sum, file) => sum + file.continuationCount, 0),
      projectLeaders: specs.length,
      teamMembers: specs.reduce((sum, spec) => sum + spec.members.length, 0),
      teacherLinks: specs.reduce((sum, spec) => sum + spec.teachers.length, 0),
    },
  }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error("演示数据生成失败：", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
