/**
 * 一键初始化：npm run setup
 * 1) 没有 .env 时从 .env.example 复制一份（本地演示用占位密钥）
 * 2) 按 schema 建表（prisma db push）
 * 3) 空库自动灌演示数据（prisma db seed）；已有数据则跳过，避免清库
 */
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");

function log(message) {
  console.log(`[setup] ${message}`);
}

function runNpm(script) {
  const npmCli = process.env.npm_execpath;
  const command = npmCli ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
  const args = npmCli ? [npmCli, "run", script] : ["run", script];
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    log(`执行 npm run ${script} 失败`);
    process.exit(result.status ?? 1);
  }
}

// 1) .env
if (!existsSync(envPath)) {
  if (!existsSync(examplePath)) {
    log("缺少 .env.example，无法自动生成 .env");
    process.exit(1);
  }
  copyFileSync(examplePath, envPath);
  log("已从 .env.example 生成 .env（本地演示用占位密钥）");
} else {
  log(".env 已存在，保持不动");
}

// 2) 读取 .env 到 process.env（Prisma Client 需要 DATABASE_URL）
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
  if (!match) continue;
  const [, key, raw] = match;
  const value = raw.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  if (!process.env[key]) process.env[key] = value;
}

// 3) 建表
log("正在建表（prisma db push）…");
runNpm("db:push");

// 4) 空库才灌演示数据
let userCount = 0;
try {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  userCount = await prisma.user.count();
  await prisma.$disconnect();
} catch (error) {
  log(`无法连接数据库：${error instanceof Error ? error.message : error}`);
  log("如果提示 Prisma Client 未生成，先执行 npm run db:generate");
  process.exit(1);
}

if (userCount === 0) {
  log("数据库为空，正在写入演示数据（npm run db:seed）…");
  runNpm("db:seed");
} else {
  log(`数据库已有 ${userCount} 个用户，跳过 db:seed（不会清库）`);
}

log("初始化完成，执行 npm run dev 启动：http://localhost:3000");
