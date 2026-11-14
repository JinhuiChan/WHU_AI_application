#!/usr/bin/env node
// 用途：把 PayeeBank 里以 DEV_ 开头的占位字符串（不是合法密文）替换成用当前
// FIELD_ENCRYPTION_KEY 加密的真实密文，使报名表 / 数据表导出能正常解密显示。
//
// 背景：prisma/seed.ts 早期版本写死了 `DEV_ID_CIPHERTEXT_n` 这类占位值，
// decryptField() 无法解析（格式不是 v1:iv:tag:data），会让整份导出失败。
// seed.ts 已修复（改为 encryptField），但已存在的库需要本脚本回填。
//
// 用法（在服务器上执行，必须带 --env-file 让 FIELD_ENCRYPTION_KEY 生效）：
//   Dry-run（只打印将执行的 SQL，不改数据）：
//     node --env-file=/srv/kesai/shared/app.env scripts/fix-payee-ciphertexts.mjs --db /srv/kesai/shared/data/app.db
//   执行（先自动备份数据库，再写入）：
//     node --env-file=/srv/kesai/shared/app.env scripts/fix-payee-ciphertexts.mjs --db /srv/kesai/shared/data/app.db --apply
//   验证：
//     sqlite3 /srv/kesai/shared/data/app.db "select count(*) from PayeeBank where idCardEncrypted like 'DEV!_%' escape '!';"
//
// 前置：sqlite3 命令行可用；以 root 运行时可写 /srv/kesai/backup。

import { createCipheriv, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, statSync } from "node:fs";

const args = process.argv.slice(2);
function option(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
const db = option("--db");
const apply = args.includes("--apply");

if (!db) {
  console.error("必须指定 --db；用法见脚本头部注释");
  process.exit(2);
}

const keyHex = (process.env.FIELD_ENCRYPTION_KEY ?? "").trim();
if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
  console.error("FIELD_ENCRYPTION_KEY 缺失或不是 64 位 hex，请用 --env-file 指定 app.env");
  process.exit(1);
}
const key = Buffer.from(keyHex, "hex");

function encrypt(plain) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${data.toString("base64")}`;
}

function sql(query) {
  return execFileSync("sqlite3", ["-readonly", db, query], { encoding: "utf8" }).trim();
}

// 1) 找出需要修的记录（rowid + 现有占位值）
const rows = sql(
  "select rowid || '|' || coalesce(idCardEncrypted,'') || '|' || coalesce(bankCardEncrypted,'') " +
    "from PayeeBank where idCardEncrypted like 'DEV!_%' escape '!' or bankCardEncrypted like 'DEV!_%' escape '!'",
)
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [rowid, idCard, bankCard] = line.split("|");
    return { rowid, idCard, bankCard };
  });

if (!rows.length) {
  console.log("没有需要修复的记录，已是真实密文或为空。");
  process.exit(0);
}

// 2) 生成 SQL（幂等：只改仍然是 DEV_ 占位值的字段）
const statements = [];
for (const row of rows) {
  if (row.idCard.startsWith("DEV_")) {
    const plain = `420106${1990 + (Number(row.rowid) % 10)}0101${String(1000 + (Number(row.rowid) % 9000))}`;
    statements.push(`UPDATE PayeeBank SET idCardEncrypted='${encrypt(plain)}' WHERE rowid=${row.rowid} AND idCardEncrypted LIKE 'DEV!_%' ESCAPE '!';`);
  }
  if (row.bankCard.startsWith("DEV_")) {
    const plain = `622848${String(1000000000000 + Number(row.rowid))}`;
    statements.push(`UPDATE PayeeBank SET bankCardEncrypted='${encrypt(plain)}' WHERE rowid=${row.rowid} AND bankCardEncrypted LIKE 'DEV!_%' ESCAPE '!';`);
  }
}

console.log(`待修复记录数：${rows.length}，将执行 ${statements.length} 条 UPDATE`);

if (!apply) {
  console.log("--- dry-run，以下 SQL 不会执行 ---");
  statements.forEach((s) => console.log(s));
  console.log("确认无误后加 --apply 执行（会先自动备份数据库）");
  process.exit(0);
}

// 3) 先备份，再一次性写入
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const backupDir = "/srv/kesai/backup";
const backupPath = `${backupDir}/app-before-fix-payee-${stamp}.db`;
mkdirSync(backupDir, { recursive: true });
copyFileSync(db, backupPath);
if (statSync(db).size !== statSync(backupPath).size) {
  console.error(`备份大小不一致，已中止：${backupPath}`);
  process.exit(1);
}
console.log(`数据库备份已校验：${backupPath}`);

execFileSync("sqlite3", [db], { input: `.bail on\nBEGIN IMMEDIATE;\n${statements.join("\n")}\nCOMMIT;\n`, encoding: "utf8" });

const remain = sql("select count(*) from PayeeBank where idCardEncrypted like 'DEV!_%' escape '!' or bankCardEncrypted like 'DEV!_%' escape '!'");
console.log(`完成。剩余占位值记录数：${remain}（应为 0）`);
console.log(`回滚：cp -a ${backupPath} ${db} && systemctl restart kesai`);
