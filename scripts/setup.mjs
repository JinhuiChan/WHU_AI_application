/**
 * 一键初始化：npm run setup
 * 做的事情（全部可重复执行、不清库）：
 *   1. 缺依赖时自动 npm install（首次运行）
 *   2. 缺 .env 时从 .env.example 复制，并检查三个必填变量
 *   3. 生成 Prisma Client、按 schema 建表
 *   4. 数据库为空时灌演示数据；已有数据则跳过
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

function fail(message) {
  console.error(`[setup] ${message}`);
  process.exit(1);
}

function runNpm(args, label, required = true) {
  const npmCli = process.env.npm_execpath;
  const command = npmCli ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
  const finalArgs = npmCli ? [npmCli, ...args] : args;
  log(`${label} …`);
  const result = spawnSync(command, finalArgs, { cwd: root, stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    if (required) fail(`${label} 失败`);
    return false;
  }
  return true;
}

// 0) Node 版本：tsx 的 --env-file 需要 20.6+
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 6)) {
  fail(`需要 Node.js >= 20.6，当前是 ${process.versions.node}，请升级 Node 后重试`);
}

// 1) 依赖
if (!existsSync(path.join(root, "node_modules", "@prisma", "client"))) {
  log("首次运行，正在安装依赖（可能需要 1~2 分钟）");
  runNpm(["install"], "安装依赖");
}

// 2) .env
if (!existsSync(envPath)) {
  if (!existsSync(examplePath)) fail("缺少 .env.example，无法自动生成 .env");
  copyFileSync(examplePath, envPath);
  log("已从 .env.example 生成 .env（本地演示用占位密钥）");
} else {
  log(".env 已存在，保持不动");
}
const envText = readFileSync(envPath, "utf8");
const missingKeys = ["DATABASE_URL", "JWT_SECRET", "FIELD_ENCRYPTION_KEY"].filter(
  (key) => !new RegExp(`^\\s*${key}\\s*=`, "m").test(envText),
);
if (missingKeys.length) {
  fail(`.env 缺少 ${missingKeys.join("、")}，请对照 .env.example 补齐后重试`);
}
// 把 .env 读进 process.env（Prisma Client 需要 DATABASE_URL）
for (const line of envText.split(/\r?\n/)) {
  const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
  if (!match) continue;
  const [, key, raw] = match;
  const value = raw.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  if (!process.env[key]) process.env[key] = value;
}

// 3) Prisma Client + 建表
runNpm(["run", "db:generate"], "生成 Prisma Client");
runNpm(["run", "db:push"], "建表（prisma db push）");

// 4) 空库才灌演示数据
let userCount = 0;
try {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  userCount = await prisma.user.count();
  await prisma.$disconnect();
} catch (error) {
  fail(`无法连接数据库：${error instanceof Error ? error.message : error}`);
}
if (userCount === 0) {
  log("数据库为空，正在写入演示数据（npm run db:seed）");
  const seeded = runNpm(["run", "db:seed"], "写入演示数据", false);
  if (!seeded) {
    fail("写入演示数据失败：如果提示 esbuild/prisma 找不到程序，先执行 npm run rebuild 再重新运行 npm run setup");
  }
} else {
  log(`数据库已有 ${userCount} 个用户，跳过 seed（不会清库）`);
}

log("初始化完成！");
log(`项目目录：${root}`);
log("数据库文件：prisma/dev.db；上传文件目录：public/uploads/");
log("下一步：npm run dev（Windows 用 npm.cmd run dev），浏览器打开终端提示的地址");
