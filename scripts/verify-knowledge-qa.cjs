// Run after npm run build, from the repository root:
// node --env-file=.env scripts/verify-knowledge-qa.cjs
// Uses an isolated copy of the local demo DB and a local model stub.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const { spawn, execFileSync } = require("node:child_process");
const { createRequire } = require("node:module");
const { DatabaseSync } = require("node:sqlite");
const root = process.cwd();
const requireRepo = createRequire(path.join(root, "package.json"));
const { PrismaClient } = requireRepo("@prisma/client");
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "whu-qa-"));
const testFile = path.join(scratch, "qa.db");
const sourceDb = new DatabaseSync(path.join(root, "prisma/dev.db"), { readOnly: true });
sourceDb.prepare("VACUUM INTO ?").run(testFile);
sourceDb.close();
const databaseUrl = "file:" + testFile.replaceAll("\\", "/");
const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let base;
let child;
let provider;
let calls = 0;
let transientAttempts = 0;
let providerError;
let admin;
const attachments = [];

async function req(url, { cookie, body, status = 200, method } = {}) {
  const headers = cookie ? { Cookie: cookie } : {};
  if (body && !(body instanceof FormData)) { headers["Content-Type"] = "application/json"; body = JSON.stringify(body); }
  const response = await fetch(base + url, { headers, body, method: method ?? (body ? "POST" : "GET"), redirect: "manual" });
  const output = response.headers.get("content-type")?.includes("application/json") ? await response.json() : await response.text();
  assert.equal(response.status, status, url + ": " + (output.message ?? String(output).slice(0, 100)));
  return { data: output.data ?? output, cookie: response.headers.get("set-cookie")?.split(";")[0] };
}

async function main() {
  provider = http.createServer(async (request, response) => {
    try {
    let raw = "";
    for await (const part of request) raw += part;
    const input = JSON.parse(raw);
    assert.equal(request.headers.authorization, "Bearer verification-key");
    assert.equal(input.model, "deepseek-flash");
    assert.equal(input.response_format.type, "json_object");
    const { question, evidence } = JSON.parse(input.messages[1].content);
    assert.ok(evidence.length >= 1 && evidence.length <= 6);
    calls++;
    if (question.includes("临时重试") && transientAttempts++ === 0) {
      response.writeHead(500); response.end("{}"); return;
    }
    if (question.includes("服务错误")) { response.writeHead(429); response.end("{}"); return; }
    const source = evidence.find(item => item.quote.includes("截止")) ?? evidence[0];
    if (question.includes("故障时下架")) {
      await db.kbDocument.update({ where: { id: source.documentId }, data: { isActive: false } });
      response.writeHead(500); response.end("{}"); return;
    }
    let result = {
      found: true, answer: "报名应在 11 月 20 日 17:00 前完成[" + source.id + "]。",
      citations: [{ id: source.id, quote: source.quote.slice(0, 200) }],
    };
    if (question.includes("伪造编号")) result.citations[0].id = 999;
    if (question.includes("伪造原文")) result.citations[0].quote = "这段原文实际上不存在于资料之中。";
    if (question.includes("重复引用")) result.citations.push({ id: source.id, quote: source.quote.slice(2, 100) });
    if (question.includes("编号错位")) {
      const other = evidence.find(item => item.id !== source.id);
      assert.ok(other);
      result = { found: true, answer: "报名截止为 11 月 20 日 17:00[" + other.id + "][" + source.id + "]。", citations: [{ id: other.id, quote: source.quote }] };
    }
    if (question.includes("短句")) result = { found: true, answer: "本次报名免费[" + source.id + "]。", citations: [{ id: source.id, quote: source.quote }] };
    if (question.includes("报名之后")) result = { found: false, answer: "未说明", citations: [] };
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(result) } }] }));
    } catch (error) {
      providerError = error;
      response.writeHead(500); response.end("{}");
    }
  });
  await new Promise(resolve => provider.listen(0, "127.0.0.1", resolve));
  const port = 3021;
  base = "http://127.0.0.1:" + port;
  child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: root, stdio: "ignore", env: {
      ...process.env, DATABASE_URL: databaseUrl, LLM_BASE_URL: "http://127.0.0.1:" + provider.address().port,
      LLM_API_KEY: "verification-key", LLM_MODEL: "deepseek-flash", NEXT_TELEMETRY_DISABLED: "1",
    },
  });
  for (let i = 0; i < 40; i++) {
    try { await req("/login"); break; } catch (error) { if (i === 39) throw error; await wait(250); }
  }
  const login = async phone => (await req("/api/auth/login", { body: { phone, password: "123456" } })).cookie;
  admin = await login("13800000001");
  const student = await login("13800010001");
  const [a, b] = await db.competition.findMany({ where: { publishStatus: "PUBLISHED" }, orderBy: { name: "asc" } });
  assert.ok(a && b);
  // Clear only the isolated copy, so pre-existing demo notices cannot select different sources.
  await db.kbDocument.deleteMany({ where: { competitionId: { in: [a.id, b.id] } } });
  const endpoint = id => "/api/admin/knowledge/" + id;
  const publish = async (id, values) => (await req(endpoint(id), { cookie: admin, body: { action: "publish", ...values }, status: 201 })).data.id;
  const ask = async (id, question = "报名最晚什么时候提交？") => (await req("/api/assistant/ask", { cookie: student, body: { competitionId: id, question } })).data;
  await req("/api/assistant/ask", { body: { question: "截止时间？", competitionId: a.id }, status: 401 });
  await req(endpoint(a.id), { cookie: student, body: { action: "publish" }, status: 403 });
  await req("/api/assistant/ask", { cookie: student, body: { question: "截止时间？" }, status: 422 });
  assert.match((await req("/assistant?competitionId=" + a.id, { cookie: admin })).data, /管理本场赛事的问答资料/);
  assert.ok(!(await req("/assistant?competitionId=" + a.id, { cookie: student })).data.includes("管理本场赛事的问答资料"));
  console.log("PASS 页面、登录和管理员权限");
  const adminHtml = (await req("/assistant?competitionId=" + a.id, { cookie: admin })).data;
  assert.ok(adminHtml.indexOf('id="knowledge"') < adminHtml.indexOf("测试问答"));
  assert.ok(!adminHtml.includes('<details id="knowledge"'));
  assert.ok(!adminHtml.includes("DeepSeek Flash"));
  const otherHtml = (await req("/assistant?competitionId=" + b.id, { cookie: admin })).data;
  assert.match(otherHtml, new RegExp("当前赛事：.*" + b.name));
  await req("/assistant?competitionId=missing-competition", { cookie: admin, status: 404 });
  await req(endpoint(a.id), { cookie: student, body: { action: "view", documentId: "missing" }, status: 403 });
  await req(endpoint(a.id), { cookie: student, body: { action: "restore", documentId: "missing" }, status: 403 });
  const sample = await db.competitionAttachment.findFirst({ where: { competitionId: a.id, filePath: "/samples/赛事报名通知.txt" } });
  assert.ok(sample);
  const samplePreview = (await req(endpoint(a.id), { cookie: admin, body: { action: "preview", title: "演示附件", attachmentId: sample.id } })).data;
  assert.ok(samplePreview.chunks.length > 0);
  const unsafeAttachment = await db.competitionAttachment.create({ data: {
    competitionId: a.id, title: "无效路径", fileName: "test.txt", filePath: "/samples/../package.json", uploadedBy: (await db.user.findFirst({ where: { phone: "13800000001" } })).id,
  } });
  await req(endpoint(a.id), { cookie: admin, body: { action: "preview", title: "无效路径", attachmentId: unsafeAttachment.id }, status: 422 });
  await db.competitionAttachment.delete({ where: { id: unsafeAttachment.id } });
  console.log("PASS 管理布局、赛事范围、演示附件白名单及新操作权限");


  const form = new FormData();
  form.set("title", "接口验收通知");
  form.set("kind", "NOTICE");
  form.set("file", new Blob(["# 报名时间\n报名截止时间为 11 月 20 日 17:00。\n# 组队要求\n允许跨学院组队，团队人数为 3 至 8 人。"], { type: "text/plain" }), "接口验收通知.txt");
  const attachment = (await req("/api/admin/competitions/" + a.id + "/attachments", { cookie: admin, body: form, status: 201 })).data;
  attachments.push({ competitionId: a.id, id: attachment.id });
  const draft = { title: "接口验收通知", attachmentId: attachment.id };
  const preview = (await req(endpoint(a.id), { cookie: admin, body: { action: "preview", ...draft } })).data;
  assert.equal(preview.chunks.length, 2);
  assert.ok(preview.chunks[0].content.includes("11 月 20 日"));
  await req(endpoint(b.id), { cookie: admin, body: { action: "preview", ...draft }, status: 422 });
  await req(endpoint(a.id), { cookie: admin, body: { action: "preview", ...draft, text: "不能混用正文" }, status: 422 });
  const old = await publish(a.id, draft);
  const savedBody = (await req(endpoint(a.id), { cookie: admin, body: { action: "view", documentId: old } })).data;
  assert.equal(savedBody.chunks.length, 2);
  await req(endpoint(b.id), { cookie: admin, body: { action: "view", documentId: old }, status: 404 });
  await req(endpoint(a.id), { cookie: admin, body: { action: "withdraw", documentId: old } });
  assert.equal((await ask(a.id)).mode, "no_evidence");
  await req(endpoint(b.id), { cookie: admin, body: { action: "restore", documentId: old }, status: 422 });
  await req(endpoint(a.id), { cookie: admin, body: { action: "restore", documentId: old } });
  assert.equal((await ask(a.id)).mode, "generated");
  assert.ok(await db.auditLog.count({ where: { action: "KNOWLEDGE_RESTORED", targetId: old } }));
  console.log("PASS 查看、下架、恢复与审计，跨赛事操作被拒绝");

  await req(endpoint(a.id), { cookie: admin, body: { action: "publish", ...draft }, status: 409 });
  const answered = await ask(a.id);
  assert.equal(answered.mode, "generated");
  assert.ok(answered.sources[0].quote.includes("11 月 20 日"));
  assert.ok(answered.sources[0].fileUrl.includes(encodeURIComponent("接口验收通知.txt")));
  assert.equal((await ask(b.id)).mode, "no_evidence");
  assert.equal((await ask(a.id, "2025 年报名截止时间？")).mode, "no_evidence");
  assert.equal((await ask(a.id, "报名费多少钱？")).mode, "no_evidence");
  console.log("PASS TXT上传、解析、引用、重复发布和赛事年份隔离");

  assert.equal((await ask(a.id, "报名截止服务错误")).mode, "unavailable");
  assert.equal((await ask(a.id, "报名截止临时重试")).mode, "generated");
  assert.equal(transientAttempts, 2);
  assert.equal((await ask(a.id, "报名截止伪造编号")).mode, "unavailable");
  assert.equal((await ask(a.id, "报名截止伪造原文")).mode, "unavailable");
  assert.match((await ask(a.id, "报名截止伪造原文")).answer, /出处未能通过核对/);
  const repeated = await ask(a.id, "报名截止重复引用");
  assert.equal(repeated.mode, "generated");
  assert.equal(repeated.sources.length, 1);
  assert.equal(repeated.sources[0].quotes.length, 2);
  const extraSource = await publish(a.id, {
    title: "截止补充说明", text: "# 报名截止补充\n本赛事报名截止时间为 11 月 20 日 17:00，请提前提交材料。",
  });
  const corrected = await ask(a.id, "报名截止编号错位");
  assert.equal(corrected.mode, "generated");
  assert.ok(corrected.sources[0].quote.includes("截止"));
  assert.ok(corrected.answer.includes("[" + corrected.sources[0].id + "]"));
  await req(endpoint(a.id), { cookie: admin, body: { action: "withdraw", documentId: extraSource } });
  assert.equal((await ask(a.id, "报名之后的截止规则是否允许住宿？")).mode, "no_evidence");
  console.log("PASS 上游故障、伪造引用和资料无依据处理");
  await publish(a.id, { title: "报名费", text: "免费。" });
  const shortQuote = await ask(a.id, "报名费短句");
  assert.equal(shortQuote.mode, "generated");
  assert.equal(shortQuote.sources[0].quote, "免费。");
  console.log("PASS 同一出处的多段引用和简短原文");
  await publish(a.id, {
    title: "资格规则",
    text: "# 年龄要求\n参赛人员年龄不超过35岁，1990年3月1日及以后出生。\n# 毕业年限\n毕业5年以内的学生可以参赛。\n# 本科生创意组\n项目在通知下发前尚未完成工商登记注册。",
  });
  for (const question of ["我2000年出生，符合年龄要求吗？", "我2021年毕业，符合毕业年限吗？", "公司2024年注册，可以报本科生创意组吗？"]) {
    const result = await ask(a.id, question);
    assert.equal(result.mode, "generated", question);
    assert.ok(result.sources.length, question);
  }
  console.log("PASS 出生、毕业和注册年份不作为赛年");

  const nextDraft = { title: "更新验收通知", text: "# 报名时间\n报名截止时间为 11 月 25 日 17:00。", replacesId: old };
  const scheduled = await publish(a.id, { ...nextDraft, effectiveAt: new Date(Date.now() + 60000).toISOString() });
  await req(endpoint(a.id), { cookie: admin, body: { action: "withdraw", documentId: scheduled } });
  assert.equal((await db.kbDocument.findUnique({ where: { id: old } })).expiresAt, null);
  const switchAt = Date.now() + 2300;
  const next = await publish(a.id, { ...nextDraft, effectiveAt: new Date(switchAt).toISOString() });
  assert.equal((await ask(a.id)).sources[0].documentId, old);
  await wait(Math.max(0, switchAt - Date.now() + 100));
  assert.equal((await ask(a.id)).sources[0].documentId, next);
  await req(endpoint(a.id), { cookie: admin, body: { action: "withdraw", documentId: next } });
  assert.equal((await ask(a.id)).mode, "no_evidence");
  await req(endpoint(a.id), { cookie: admin, body: { action: "restore", documentId: next }, status: 422 });
  await req(endpoint(a.id), { cookie: admin, body: { action: "withdraw", documentId: old } });
  await req(endpoint(a.id), { cookie: admin, body: { action: "restore", documentId: old }, status: 422 });
  console.log("PASS 定时换版、取消未来替换、下架");

  await db.kbDocument.update({ where: { id: old }, data: { isActive: true, expiresAt: null } });
  await req("/api/admin/competitions/" + a.id + "/attachments/" + attachment.id, { cookie: admin, method: "DELETE" });
  attachments.length = 0;
  assert.equal((await db.kbDocument.findUnique({ where: { id: old } })).isActive, false);
  assert.equal((await ask(a.id)).mode, "no_evidence");
  await req(endpoint(a.id), { cookie: admin, body: { action: "restore", documentId: old }, status: 422 });
  console.log("PASS 删除源附件后停止引用");
  await publish(a.id, { title: "并发下架测试", text: "# 报名时间\n报名截止时间为 11 月 30 日 17:00。" });
  const withdrawnDuringFailure = await ask(a.id, "报名截止故障时下架");
  assert.equal(withdrawnDuringFailure.mode, "no_evidence");
  assert.equal(withdrawnDuringFailure.sources.length, 0);
  console.log("PASS 模型失败期间资料下架后不返回失效原文");
  console.log("模型协议请求次数:", calls);
  if (providerError) throw providerError;
}

main().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(async () => {
  for (const item of attachments) {
    if (admin && child) {
      await req("/api/admin/competitions/" + item.competitionId + "/attachments/" + item.id,
        { cookie: admin, method: "DELETE" }).catch(() => {});
    }
  }
  if (child) { child.kill(); await wait(200); }
  if (provider) await new Promise(resolve => provider.close(resolve));
  await db.$disconnect();
  console.log("隔离验证目录:", scratch);
});
