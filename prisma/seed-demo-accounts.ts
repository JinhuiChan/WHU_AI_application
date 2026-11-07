/**
 * 创建 800 名学生 + 50 名教师演示账号（幂等，重复执行不会重复插入）。
 *
 * 运行：npm.cmd run db:seed:accounts
 * 前置：已执行 npm.cmd run setup（.env / Prisma Client / 建表 / 演示数据）
 *
 * 账号规则见 prisma/demo-accounts.ts：
 *   - 学生：学号 2022~2026 + 学院代码 + 4 位序号，手机号 13700000001~13700000800
 *   - 教师：工号 T20260001~T20260050，手机号 13600000001~13600000050
 *   - 密码统一 123456，approvalStatus = APPROVED（可直接登录）
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  DEMO_ACCOUNT_RULES,
  DEMO_PASSWORD,
  DEMO_STUDENT_COUNT,
  DEMO_TEACHER_COUNT,
  SCHOOL_NAME,
  generateDemoStudents,
  generateDemoTeachers,
} from "./demo-accounts";

const prisma = new PrismaClient();
const CHUNK_SIZE = 200;

type NewUser = {
  studentNo?: string;
  staffNo?: string;
  phone: string;
  passwordHash: string;
  name: string;
  role: "STUDENT" | "TEACHER";
  approvalStatus: "APPROVED";
  approvedAt: Date;
  approvedBy: string;
  gender: string;
  ethnicity?: string;
  educationStage?: string;
  trainingUnit?: string;
  college: string;
  major?: string;
  grade?: string;
  enrollmentYear?: number;
  graduationYear?: number;
  email: string;
  boundFinancePlatform?: boolean;
};

function chunks<T>(list: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < list.length; index += size) {
    result.push(list.slice(index, index + size));
  }
  return result;
}

async function main() {
  const students = generateDemoStudents();
  const teachers = generateDemoTeachers();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  if (!(await bcrypt.compare(DEMO_PASSWORD, passwordHash))) {
    throw new Error("演示密码哈希校验失败");
  }

  const existingUsers = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { studentNo: true, staffNo: true, phone: true, role: true },
  });
  const usedStudentNos = new Set(existingUsers.map((user) => user.studentNo).filter((value): value is string => Boolean(value)));
  const usedStaffNos = new Set(existingUsers.map((user) => user.staffNo).filter((value): value is string => Boolean(value)));
  const usedPhones = new Set(existingUsers.map((user) => user.phone));

  const approvedAt = new Date();
  const newStudents: NewUser[] = students
    .filter((student) => !usedStudentNos.has(student.studentNo) && !usedPhones.has(student.phone))
    .map((student) => ({
      studentNo: student.studentNo,
      phone: student.phone,
      passwordHash,
      name: student.name,
      role: "STUDENT",
      approvalStatus: "APPROVED",
      approvedAt,
      approvedBy: "DEMO_SEED",
      gender: student.gender,
      ethnicity: student.ethnicity,
      educationStage: student.educationStage,
      trainingUnit: student.college,
      college: student.college,
      major: student.major,
      grade: student.grade,
      enrollmentYear: student.enrollmentYear,
      graduationYear: student.graduationYear,
      email: student.email,
      boundFinancePlatform: student.boundFinancePlatform,
    }));

  const newTeachers: NewUser[] = teachers
    .filter((teacher) => !usedStaffNos.has(teacher.staffNo) && !usedPhones.has(teacher.phone))
    .map((teacher) => ({
      staffNo: teacher.staffNo,
      phone: teacher.phone,
      passwordHash,
      name: teacher.name,
      role: "TEACHER",
      approvalStatus: "APPROVED",
      approvedAt,
      approvedBy: "DEMO_SEED",
      gender: teacher.gender,
      trainingUnit: teacher.college,
      college: teacher.college,
      email: teacher.email,
    }));

  const skippedStudents = students.length - newStudents.length;
  const skippedTeachers = teachers.length - newTeachers.length;

  for (const chunk of chunks(newStudents, CHUNK_SIZE)) {
    await prisma.user.createMany({ data: chunk });
  }
  for (const chunk of chunks(newTeachers, CHUNK_SIZE)) {
    await prisma.user.createMany({ data: chunk });
  }

  // 入库后核对：这批学号 / 工号必须全部存在，且都能用 123456 登录
  const studentNos = students.map((student) => student.studentNo);
  const staffNos = teachers.map((teacher) => teacher.staffNo);
  const [createdStudents, createdTeachers] = await Promise.all([
    prisma.user.count({ where: { studentNo: { in: studentNos }, role: "STUDENT", deletedAt: null } }),
    prisma.user.count({ where: { staffNo: { in: staffNos }, role: "TEACHER", deletedAt: null } }),
  ]);
  if (createdStudents !== DEMO_STUDENT_COUNT) {
    throw new Error(`学生账号核对失败：应为 ${DEMO_STUDENT_COUNT}，实际 ${createdStudents}`);
  }
  if (createdTeachers !== DEMO_TEACHER_COUNT) {
    throw new Error(`教师账号核对失败：应为 ${DEMO_TEACHER_COUNT}，实际 ${createdTeachers}`);
  }
  const sampleStudent = await prisma.user.findFirst({
    where: { studentNo: students[0]?.studentNo },
    select: { phone: true, passwordHash: true, role: true },
  });
  if (!sampleStudent || !(await bcrypt.compare(DEMO_PASSWORD, sampleStudent.passwordHash))) {
    throw new Error("学生账号密码校验失败");
  }

  const totalUsers = await prisma.user.count({ where: { deletedAt: null } });
  console.log("演示账号写入完成。");
  console.log(JSON.stringify({
    studentCreated: newStudents.length,
    teacherCreated: newTeachers.length,
    studentSkipped: skippedStudents,
    teacherSkipped: skippedTeachers,
    demoStudentTotal: createdStudents,
    demoTeacherTotal: createdTeachers,
    usersInDatabase: totalUsers,
    rules: DEMO_ACCOUNT_RULES,
    sample: {
      firstStudent: `${students[0]?.studentNo} ${students[0]?.name} ${students[0]?.phone}`,
      lastStudent: `${students[students.length - 1]?.studentNo} ${students[students.length - 1]?.name} ${students[students.length - 1]?.phone}`,
      firstTeacher: `${teachers[0]?.staffNo} ${teachers[0]?.name} ${teachers[0]?.phone}`,
      lastTeacher: `${teachers[teachers.length - 1]?.staffNo} ${teachers[teachers.length - 1]?.name} ${teachers[teachers.length - 1]?.phone}`,
    },
    school: SCHOOL_NAME,
  }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error("演示账号写入失败：", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
