/**
 * 把仓库外 ../demo数据 下的演示数据同步（复制）到仓库内 demo数据/。
 *
 * 运行：npm.cmd run demo:sync
 * 说明：生成脚本 `npm run demo:generate` 输出到仓库外（避免未确认的数据直接进 Git），
 *       需要把文件随提交分发时执行本命令，再一起提交。
 */
import { copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const SOURCE_DIR = path.resolve(process.env.DEMO_DATA_DIR ?? path.join(process.cwd(), "..", "demo数据"));
const TARGET_DIR = path.resolve(process.cwd(), "demo数据");
/** Excel/WPS 打开文件时产生的临时锁文件，不复制 */
const SKIP_PREFIXES = ["~$"];

async function main() {
  const entries = await readdir(SOURCE_DIR, { withFileTypes: true }).catch((error: unknown) => {
    throw new Error(`读取仓库外演示数据目录失败（${SOURCE_DIR}）：${error instanceof Error ? error.message : error}`);
  });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => !SKIP_PREFIXES.some((prefix) => name.startsWith(prefix)))
    .sort();
  if (!files.length) {
    throw new Error(`仓库外目录没有可同步的文件：${SOURCE_DIR}；请先运行 npm.cmd run demo:generate`);
  }

  await mkdir(TARGET_DIR, { recursive: true });
  const copied: string[] = [];
  for (const name of files) {
    await copyFile(path.join(SOURCE_DIR, name), path.join(TARGET_DIR, name));
    copied.push(name);
  }

  console.log("演示数据已同步到仓库内目录（可随 Git 提交）：");
  console.log(JSON.stringify({ source: SOURCE_DIR, target: TARGET_DIR, copied }, null, 2));
}

main().catch((error: unknown) => {
  console.error("演示数据同步失败：", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
