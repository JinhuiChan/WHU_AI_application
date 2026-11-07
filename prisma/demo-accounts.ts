/**
 * 演示账号与演示数据的统一生成规则（纯数据模块，不依赖 Prisma / Next）。
 *
 * 规模：800 名学生 + 50 名教师，密码统一 123456。
 * 该模块被两个脚本共用，保证「账号」与「导入数据」严格对应：
 *   - prisma/seed-demo-accounts.ts   把账号写入数据库（幂等）
 *   - scripts/generate-demo-data.ts  生成仓库外 ../demo数据/ 下的账号清单与可导入 xlsx
 *
 * 只要不修改本文件，重复执行得到的学号 / 工号 / 姓名 / 手机号完全一致。
 */

export const DEMO_PASSWORD = "123456";
export const DEMO_STUDENT_COUNT = 800;
export const DEMO_TEACHER_COUNT = 50;
export const SCHOOL_NAME = "武汉大学";

export type DemoCollege = {
  /** 学号中的 2 位学院代码 */
  code: string;
  name: string;
  majors: string[];
};

/** 10 个学院 × 80 名学生 = 800；教师 10 个学院 × 5 名 = 50 */
export const DEMO_COLLEGES: DemoCollege[] = [
  { code: "01", name: "计算机学院", majors: ["计算机科学与技术", "软件工程", "人工智能", "信息安全"] },
  { code: "02", name: "电子信息学院", majors: ["电子信息工程", "通信工程", "微电子科学与工程"] },
  { code: "03", name: "机械与动力学院", majors: ["机械设计制造及其自动化", "能源与动力工程", "机器人工程"] },
  { code: "04", name: "经济与管理学院", majors: ["金融学", "工商管理", "会计学", "经济学"] },
  { code: "05", name: "法学院", majors: ["法学", "知识产权"] },
  { code: "06", name: "遥感信息工程学院", majors: ["遥感科学与技术", "地理信息科学", "测绘工程"] },
  { code: "07", name: "生命科学学院", majors: ["生物科学", "生物技术", "生物医学工程"] },
  { code: "08", name: "数学与统计学院", majors: ["数学与应用数学", "统计学", "信息与计算科学"] },
  { code: "09", name: "化学与分子科学学院", majors: ["化学", "应用化学", "材料化学"] },
  { code: "10", name: "新闻与传播学院", majors: ["新闻学", "传播学", "广告学", "网络与新媒体"] },
];

export type DemoStudent = {
  index: number;
  studentNo: string;
  name: string;
  phone: string;
  gender: "男" | "女";
  ethnicity: string;
  educationStage: "本科" | "硕士" | "博士";
  college: string;
  major: string;
  grade: string;
  enrollmentYear: number;
  graduationYear: number;
  email: string;
  boundFinancePlatform: boolean;
};

export type DemoTeacher = {
  index: number;
  staffNo: string;
  name: string;
  phone: string;
  gender: "男" | "女";
  college: string;
  title: string;
  email: string;
};

type Rng = () => number;

/** mulberry32：确定性伪随机数，保证每次生成相同数据 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: Rng, list: readonly T[]): T {
  const item = list[Math.floor(rng() * list.length)];
  if (item === undefined) throw new Error("候选列表为空，无法生成演示数据");
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
  const last = list[list.length - 1];
  if (last === undefined) throw new Error("候选列表为空，无法生成演示数据");
  return last;
}

const SURNAMES = [
  "王", "李", "张", "刘", "陈", "杨", "黄", "赵", "吴", "周", "徐", "孙", "马", "朱", "胡", "郭",
  "何", "高", "林", "罗", "郑", "梁", "谢", "宋", "唐", "许", "韩", "冯", "邓", "曹", "彭", "曾",
  "肖", "田", "董", "袁", "潘", "于", "蒋", "蔡", "余", "杜", "叶", "程", "苏", "魏", "吕", "丁",
  "任", "沈", "姚", "卢", "姜", "崔", "钟", "谭", "陆", "汪", "范", "金", "石", "廖", "贾", "夏",
  "韦", "付", "方", "白", "邹", "孟", "熊", "秦", "邱", "江", "尹", "薛", "闫", "段", "雷", "侯",
  "龙", "史", "陶", "黎", "贺", "顾", "毛", "郝", "龚", "邵", "万", "钱", "严", "覃", "武", "戴",
  "莫", "孔", "向", "汤", "常", "温", "康", "施", "文", "牛", "樊", "葛", "邢", "安", "齐", "易",
] as const;

const GIVEN_FIRST = [
  "子", "雨", "思", "欣", "嘉", "文", "浩", "明", "晨", "俊", "佳", "泽", "梓", "一", "若", "书",
  "天", "心", "安", "博", "成", "德", "东", "方", "飞", "光", "海", "宏", "华", "慧", "建", "金",
  "进", "京", "凯", "坤", "兰", "乐", "林", "灵", "龙", "梦", "敏", "楠", "宁", "鹏", "平", "奇",
  "琪", "倩", "琴", "清", "然", "荣", "瑞", "睿", "山", "诗", "石", "世", "双", "顺", "硕", "松",
  "涛", "婷", "彤", "婉", "薇", "伟", "卫", "雯", "希", "贤", "祥", "晓", "新", "鑫", "星", "秀",
  "旭", "轩", "雪", "雅", "亚", "妍", "岩", "阳", "洋", "瑶", "耀", "怡", "义", "逸", "毅", "颖",
  "影", "勇", "优", "瑜", "玉", "元", "园", "源", "远", "月", "岳", "云", "芸", "哲", "知", "志",
] as const;

const GIVEN_SECOND = [
  "轩", "宇", "涵", "桐", "远", "然", "琪", "欣", "怡", "阳", "博", "文", "杰", "豪", "磊", "航",
  "晨", "曦", "泽", "瑞", "霖", "峰", "宁", "静", "雅", "慧", "娇", "丽", "娜", "倩", "颖", "洁",
  "琳", "雪", "梅", "兰", "菊", "竹", "林", "森", "川", "海", "涛", "山", "石", "岩", "松", "柏",
  "楠", "梓", "炎", "炜", "灿", "辉", "耀", "亮", "光", "星", "辰", "月", "云", "霞", "虹", "露",
  "霜", "冬", "夏", "秋", "春", "风", "雨", "雷", "天", "地", "元", "亨", "祥", "福", "禄", "寿",
  "喜", "康", "安", "平", "和", "顺", "兴", "旺", "发", "达", "通", "学", "问", "思", "行", "知",
] as const;

const ETHNICITIES = ["汉族", "汉族", "汉族", "汉族", "汉族", "汉族", "汉族", "汉族", "回族", "满族", "壮族", "土家族", "苗族", "蒙古族"] as const;

/** 850 个不重复的中文姓名：前 800 给学生，后 50 给教师 */
function buildUniqueNames(rng: Rng, count: number): string[] {
  const used = new Set<string>();
  const names: string[] = [];
  let guard = 0;
  while (names.length < count && guard < count * 500) {
    guard += 1;
    const surname = pick(rng, SURNAMES);
    const given = rng() < 0.08
      ? pick(rng, GIVEN_FIRST)
      : `${pick(rng, GIVEN_FIRST)}${pick(rng, GIVEN_SECOND)}`;
    const name = `${surname}${given}`;
    if (used.has(name)) continue;
    used.add(name);
    names.push(name);
  }
  if (names.length < count) throw new Error(`姓名池不足，仅生成 ${names.length}/${count} 个不重复姓名`);
  return names;
}

/** 生成 800 名学生：学院均衡（每院 80 人）、学号含入学年份与学院代码 */
export function generateDemoStudents(): DemoStudent[] {
  const names = buildUniqueNames(createRng(20261107), DEMO_STUDENT_COUNT + DEMO_TEACHER_COUNT);
  const rng = createRng(20261108);
  const students: DemoStudent[] = [];
  const sequenceByCollegeYear = new Map<string, number>();

  for (let index = 0; index < DEMO_STUDENT_COUNT; index += 1) {
    const college = DEMO_COLLEGES[Math.min(Math.floor(index / 80), DEMO_COLLEGES.length - 1)];
    if (!college) throw new Error("学院配置为空");
    const roll = rng();
    const educationStage: DemoStudent["educationStage"] = roll < 0.7 ? "本科" : roll < 0.92 ? "硕士" : "博士";
    const enrollmentYear = educationStage === "本科"
      ? weightedPick(rng, [2022, 2023, 2024, 2025, 2026], [28, 28, 20, 16, 8])
      : educationStage === "硕士"
        ? weightedPick(rng, [2024, 2025, 2026], [35, 35, 30])
        : weightedPick(rng, [2022, 2023, 2024, 2025, 2026], [20, 20, 20, 20, 20]);
    const graduationYear = enrollmentYear + (educationStage === "硕士" ? 3 : 4);
    const sequenceKey = `${college.code}-${enrollmentYear}`;
    const sequence = (sequenceByCollegeYear.get(sequenceKey) ?? 0) + 1;
    sequenceByCollegeYear.set(sequenceKey, sequence);
    const studentNo = `${enrollmentYear}${college.code}${String(sequence).padStart(4, "0")}`;
    const name = names[index];
    if (!name) throw new Error("学生姓名缺失");

    students.push({
      index,
      studentNo,
      name,
      phone: `137${String(index + 1).padStart(8, "0")}`,
      gender: rng() < 0.55 ? "男" : "女",
      ethnicity: pick(rng, ETHNICITIES),
      educationStage,
      college: college.name,
      major: pick(rng, college.majors),
      grade: String(enrollmentYear),
      enrollmentYear,
      graduationYear,
      email: `${studentNo}@example.edu.cn`,
      boundFinancePlatform: rng() < 0.3,
    });
  }
  return students;
}

const TEACHER_TITLES = [
  { title: "教授", weight: 18 },
  { title: "副教授", weight: 34 },
  { title: "讲师", weight: 30 },
  { title: "研究员", weight: 6 },
  { title: "副研究员", weight: 6 },
  { title: "高级实验师", weight: 6 },
] as const;

/** 生成 50 名教师：每个学院 5 名，工号 T2026xxxx，手机号 136xxxxxxxx */
export function generateDemoTeachers(): DemoTeacher[] {
  const names = buildUniqueNames(createRng(20261107), DEMO_STUDENT_COUNT + DEMO_TEACHER_COUNT);
  const rng = createRng(20261109);
  const teachers: DemoTeacher[] = [];
  for (let index = 0; index < DEMO_TEACHER_COUNT; index += 1) {
    const college = DEMO_COLLEGES[Math.min(Math.floor(index / 5), DEMO_COLLEGES.length - 1)];
    if (!college) throw new Error("学院配置为空");
    const title = weightedPick(rng, TEACHER_TITLES.map((item) => item.title), TEACHER_TITLES.map((item) => item.weight));
    const name = names[DEMO_STUDENT_COUNT + index];
    if (!name) throw new Error("教师姓名缺失");
    teachers.push({
      index,
      staffNo: `T2026${String(index + 1).padStart(4, "0")}`,
      name,
      phone: `136${String(index + 1).padStart(8, "0")}`,
      gender: rng() < 0.6 ? "男" : "女",
      college: college.name,
      title,
      email: `T2026${String(index + 1).padStart(4, "0")}@example.edu.cn`,
    });
  }
  return teachers;
}

/** 供说明文档引用的账号规则 */
export const DEMO_ACCOUNT_RULES = {
  password: DEMO_PASSWORD,
  studentCount: DEMO_STUDENT_COUNT,
  teacherCount: DEMO_TEACHER_COUNT,
  studentNoRange: "2022/2023/2024/2025/2026 + 学院代码(2位) + 4位序号（共10位数字）",
  studentPhoneRange: "13700000001 ~ 13700000800",
  teacherStaffNoRange: "T20260001 ~ T20260050",
  teacherPhoneRange: "13600000001 ~ 13600000050",
  login: "手机号 + 密码 123456，登录页选择对应身份",
} as const;
