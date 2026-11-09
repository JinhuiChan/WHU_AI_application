// npm run build && node --env-file=.env scripts/verify-platform-assistant.cjs
// Uses an isolated database copy and a local model stub; never contacts DeepSeek.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');
const { PrismaClient } = require('@prisma/client');
const root = process.cwd();
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'whu-platform-'));
const testFile = path.join(scratch, 'qa.db');
const source = new DatabaseSync(path.join(root, 'prisma/dev.db'), { readOnly: true });
source.prepare('VACUUM INTO ?').run(testFile); source.close();
const databaseUrl = 'file:' + testFile.replaceAll('\\', '/');
const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const base = 'http://127.0.0.1:3021';
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let child, provider, admin, student, providerError, calls = 0, attempts = 0;
const createdFiles = [];
async function req(url, { cookie, body, method, status = 200 } = {}) {
  const headers = cookie ? { Cookie: cookie } : {};
  if (body && !(body instanceof FormData)) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
  const response = await fetch(base + url, { method: method || (body ? 'POST' : 'GET'), headers, body, redirect: 'manual' });
  const output = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text();
  assert.equal(response.status, status, url + ': ' + (output.message || String(output).slice(0, 100)));
  return { data: output.data ?? output, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
async function main() {
  provider = http.createServer(async (request, response) => {
    try {
      let raw = ''; for await (const part of request) raw += part;
      const payload = JSON.parse(raw);
      assert.equal(request.headers.authorization, 'Bearer verification-key');
      assert.equal(payload.model, 'deepseek-flash');
      const { question, evidence } = JSON.parse(payload.messages[1].content);
      calls++;
      assert.ok(evidence.length && evidence.length <= 12);
      if (question.includes('临时重试') && attempts++ === 0) { response.writeHead(500); response.end('{}'); return; }
      if (question.includes('服务错误')) { response.writeHead(429); response.end('{}'); return; }
      const attached = evidence.filter(item => item.kind === 'attachment');
      if (question.includes('故障时下架')) {
        await db.competition.update({ where: { id: evidence[0].competitionId }, data: { publishStatus: 'WITHDRAWN' } });
        response.writeHead(500); response.end('{}'); return;
      }
      const chosen = question.includes('和挑战杯')
        ? [...new Map(attached.map(item => [item.competitionId, item])).values()]
        : [attached[0] || evidence[0]];
      let result = { found: true, answer: chosen.map(item => `${item.year}年${item.competitionName}：${item.quote.slice(0, 120)}[${item.id}]。`).join('\n'), citations: chosen.map(item => ({ id: item.id, quote: item.quote.slice(0, 200) })) };
      if (question.includes('伪造编号')) result.citations[0].id = 999;
      if (question.includes('伪造原文')) result.citations[0].quote = '资料中根本没有的原文';
      if (question.includes('未说明的报销')) result = { found: false, answer: '未说明', citations: [] };
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(result) } }] }));
    } catch (error) { providerError = error; response.writeHead(500); response.end('{}'); }
  });
  await new Promise(resolve => provider.listen(0, '127.0.0.1', resolve));
  child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', '3021'], {
    cwd: root, stdio: 'ignore', env: { ...process.env, DATABASE_URL: databaseUrl, LLM_BASE_URL: 'http://127.0.0.1:' + provider.address().port, LLM_API_KEY: 'verification-key', LLM_MODEL: 'deepseek-flash' },
  });
  for (let i = 0; i < 40; i++) { try { await req('/login'); break; } catch (error) { if (i === 39) throw error; await wait(250); } }
  const login = async (phone, identity) => (await req('/api/auth/login', { body: { phone, password: '123456', identity } })).cookie;
  admin = await login('13800000001', 'ADMIN'); student = await login('13800010001', 'STUDENT');
  const owner = await db.user.findFirst({ where: { phone: '13800000001' } });
  const a = await db.competition.findFirst({ where: { seriesId: 'china-innovation' } });
  const b = await db.competition.findFirst({ where: { seriesId: 'challenge-cup' } });
  assert.ok(a && b);
  await db.competition.updateMany({ data: { publishStatus: 'DRAFT' } });
  await db.competition.updateMany({ where: { id: { in: [a.id, b.id] } }, data: { publishStatus: 'PUBLISHED', description: '', organizer: '测试主办方' } });
  await db.kbDocument.deleteMany({ where: { competitionId: { in: [a.id, b.id] } } });
  await db.competitionAttachment.deleteMany({ where: { competitionId: { in: [a.id, b.id] } } });
  const startAt = new Date(Date.now() - 86400000), endAt = new Date(Date.now() + 86400000);
  for (const [competitionId, enabled] of [[a.id, true], [b.id, false]]) {
    await db.timeWindow.upsert({ where: { competitionId_stage: { competitionId, stage: 'SCHOOL' } }, create: { competitionId, stage: 'SCHOOL', startAt, endAt, enabled, configuredBy: owner.id }, update: { startAt, endAt, enabled } });
  }
  const ask = async (question, competitionId) => (await req('/api/assistant/ask', { cookie: student, body: { question, ...(competitionId ? { competitionId } : {}) } })).data;
  await req('/api/assistant/ask', { body: { question: '有哪些比赛？' }, status: 401 });
  await req('/api/assistant/ask', { cookie: student, body: { question: '' }, status: 422 });
  await req('/assistant?competitionId=missing', { cookie: student, status: 404 });
  for (const cookie of [admin, student]) {
    const html = (await req('/assistant', { cookie })).data;
    assert.ok(html.includes('全部已发布赛事'));
    assert.ok(!html.includes('管理本场赛事的问答资料'));
    assert.ok(!html.includes('上传新文件'));
  }
  const candidates = await ask('报名截止是什么时候？');
  assert.equal(candidates.mode, 'clarify'); assert.equal(candidates.candidates.length, 2);
  const overview = await ask('现在有哪些比赛还能报名？');
  assert.equal(overview.mode, 'configuration'); assert.ok(overview.sources.some(item => item.competitionId === a.id));
  assert.ok(!overview.sources.some(item => item.competitionId === b.id));
  const comparison = await ask('国创赛和挑战杯报名时间有什么不同？');
  assert.equal(comparison.mode, 'configuration'); assert.equal(comparison.sources.length, 2);
  assert.equal(calls, 0, '配置问题不应调用模型');
  const newEnd = new Date(Date.now() + 5 * 86400000);
  await req('/api/admin/competitions/' + a.id + '/window', { cookie: admin, method: 'PUT', body: { startAt: startAt.toISOString(), endAt: newEnd.toISOString(), enabled: false } });
  const changed = await ask('国创赛现在还能报名吗？');
  assert.match(changed.answer, /报名未开放/);
  assert.ok(changed.sources[0].quote.includes('开放开关关闭'));
  console.log('PASS 全局默认范围、澄清、跨赛事配置、实时报名更新及无需模型调用');
  const hiddenParent = await db.track.create({ data: { competitionId: a.id, name: '不可见父赛道', enabled: false } });
  await db.track.create({ data: { competitionId: a.id, parentId: hiddenParent.id, name: '隐藏子赛道验收', enabled: true } });
  assert.ok(!(await ask('国创赛有哪些赛道和组别？')).answer.includes('隐藏子赛道验收'));
  await db.kbDocument.create({ data: { competitionId: a.id, title: '旧手工知识', year: a.year, fileName: '旧手工知识', uploadedBy: owner.id, chunks: { create: { section: '资格', content: '旧手工知识特别资格为秘密规则', keywords: '' } } } });
  assert.equal((await ask('国创赛通知里秘密规则是什么？')).mode, 'no_evidence');
  await req('/api/admin/knowledge/' + a.id, { cookie: admin, body: { action: 'publish' }, status: 410 });
  await req('/api/admin/knowledge/' + a.id, { cookie: student, body: { action: 'publish' }, status: 403 });
  const studentUser = await db.user.findFirst({ where: { phone: '13800010001' } });
  const extraAdmin = await db.userRoleLink.findUnique({ where: { userId_role: { userId: studentUser.id, role: 'ADMIN' } } });
  if (!extraAdmin) await db.userRoleLink.create({ data: { userId: studentUser.id, role: 'ADMIN' } });
  const multiStudent = await login('13800010001', 'STUDENT');
  assert.equal((await req('/api/auth/me', { cookie: multiStudent })).data.user.role, 'STUDENT');
  await req('/api/admin/competitions/' + a.id + '/attachments', { cookie: multiStudent, body: { title: 'blocked' }, status: 403 });
  await req('/api/admin/competitions/' + a.id + '/attachments/missing', { cookie: multiStudent, method: 'POST', status: 403 });
  await req('/api/admin/competitions/' + a.id + '/attachments/missing', { cookie: multiStudent, method: 'DELETE', status: 403 });
  if (!extraAdmin) await db.userRoleLink.delete({ where: { userId_role: { userId: studentUser.id, role: 'ADMIN' } } });
  const upload = async (competitionId, text, { kind = 'NOTICE', replaces, name = '验收通知.txt', type = 'text/plain' } = {}) => {
    const form = new FormData(); form.set('title', name); form.set('kind', kind); form.set('file', new Blob([text], { type }), name);
    if (replaces) form.set('replacesAttachmentId', replaces);
    const attachment = (await req('/api/admin/competitions/' + competitionId + '/attachments', { cookie: admin, body: form, status: 201 })).data;
    createdFiles.push({ competitionId, id: attachment.id, filePath: attachment.filePath });
    return attachment;
  };
  const old = await upload(a.id, '# 报名材料\n报名材料为项目计划书和学生名单。\n# 组队要求\n允许跨学院组队，学生团队为3至8人。\n# 报名时间\n本通知报名截止时间为2026年11月20日17:00。');
  assert.equal(old.knowledgeStatus, 'READY');
  const oldDocument = await db.kbDocument.findUnique({ where: { sourceAttachmentId: old.id } });
  assert.ok(oldDocument);
  const answered = await ask('国创赛通知报名需要哪些材料？');
  assert.equal(answered.mode, 'generated'); assert.ok(answered.sources.every(item => item.competitionId === a.id));
  assert.match(answered.sources[0].quote, /项目计划书/);
  const sample = await db.competitionAttachment.create({ data: { competitionId: a.id, title: '演示文件', kind: 'NOTICE', fileName: '赛事报名通知.txt', filePath: '/samples/赛事报名通知.txt', uploadedBy: owner.id } });
  await ask('国创赛通知组队有什么要求？');
  assert.equal((await db.competitionAttachment.findUnique({ where: { id: sample.id } })).knowledgeStatus, 'SKIPPED');
  const template = await upload(a.id, '# 模板\n这个模板写着验收秘密人数100人。', { kind: 'TEMPLATE' });
  assert.equal(template.knowledgeStatus, 'SKIPPED');
  const legacy = await db.competitionAttachment.create({ data: { competitionId: b.id, title: '待补索引通知', kind: 'RULE', fileName: old.fileName, filePath: old.filePath.replace(a.id, b.id), uploadedBy: owner.id } });
  // Missing source files are reported, not silently used or invented.
  await ask('挑战杯通知材料是什么？');
  assert.equal((await db.competitionAttachment.findUnique({ where: { id: legacy.id } })).knowledgeStatus, 'ERROR');
  const bFile = await upload(b.id, '# 报名材料\n挑战杯报名材料为调研报告和作品说明。');
  const cross = await ask('国创赛和挑战杯通知报名需要哪些材料？');
  assert.equal(cross.mode, 'generated'); assert.equal(new Set(cross.sources.map(item => item.competitionId)).size, 2);
  assert.ok((await ask('国创赛通知报名需要哪些材料？', b.id)).sources.every(item => item.competitionId === a.id));
  console.log('PASS 赛事附件自动解析、模板及演示排除、历史文件补索引、缺失文件报错、跨赛事原文及明确名称优先');
  for (const marker of ['伪造编号', '伪造原文']) assert.equal((await ask('国创赛通知材料' + marker)).mode, 'unavailable');
  assert.equal((await ask('国创赛通知材料临时重试')).mode, 'generated'); assert.equal(attempts, 2);
  assert.equal((await ask('国创赛通知材料服务错误')).mode, 'unavailable');
  assert.equal((await ask('国创赛通知未说明的报销')).mode, 'no_evidence');
  const older = await db.competition.create({ data: { name: a.name, year: 2025, seriesId: a.seriesId, level: a.level, publishStatus: 'PUBLISHED', organizer: '历史主办方' } });
  assert.equal((await ask('国创赛报名时间？')).mode, 'clarify');
  const clarified = await ask('国创赛报名时间？', a.id);
  assert.equal(clarified.mode, 'configuration'); assert.equal(clarified.sources.length, 1); assert.equal(clarified.sources[0].year, a.year);
  assert.ok((await ask('今年国创赛报名时间？')).sources.every(item => item.year === new Date().getFullYear()));
  assert.equal((await ask('2025年国创赛报名时间？')).sources[0].year, 2025);
  const twoYears = await ask('对比2025年和2026年国创赛报名时间');
  assert.equal(twoYears.sources.length, 2);
  assert.equal((await ask('2020年国创赛报名时间')).mode, 'no_evidence');
  await db.competition.update({ where: { id: older.id }, data: { publishStatus: 'DRAFT' } });
  console.log('PASS 引用核对、失败重试、年份澄清、跨年查询及隐藏赛事隔离');
  const bad = await upload(a.id, '%PDF-1.4\ninvalid content', { name: '损坏通知.pdf', type: 'application/pdf', replaces: old.id });
  assert.equal(bad.knowledgeStatus, 'ERROR');
  assert.equal((await db.competitionAttachment.findUnique({ where: { id: old.id } })).knowledgeStatus, 'READY');
  await req('/api/admin/competitions/' + a.id + '/attachments/' + bad.id, { cookie: admin, method: 'DELETE' });
  const next = await upload(a.id, '# 组队要求\n跨学院学生团队为3至12人。', { replaces: old.id, name: '新版通知.txt' });
  assert.equal(next.knowledgeStatus, 'READY');
  assert.equal((await db.competitionAttachment.findUnique({ where: { id: old.id } })).knowledgeStatus, 'REPLACED');
  const updated = await ask('国创赛通知跨学院团队人数？');
  assert.equal(updated.mode, 'generated'); assert.ok(updated.sources.some(item => item.quote.includes('12人')));
  assert.ok(!updated.sources.some(item => item.documentId === oldDocument.id));
  await req('/api/admin/competitions/' + a.id + '/attachments/' + next.id, { cookie: student, method: 'POST', status: 403 });
  await req('/api/admin/competitions/' + a.id + '/attachments/' + next.id, { cookie: student, method: 'DELETE', status: 403 });
  await req('/api/admin/competitions/' + a.id + '/attachments', { cookie: student, body: { title: 'blocked' }, status: 403 });
  await req('/api/admin/competitions/' + a.id + '/attachments/' + next.id, { cookie: admin, method: 'DELETE' });
  assert.equal((await ask('国创赛通知跨学院团队人数？')).mode, 'no_evidence');
  assert.equal((await db.competitionAttachment.findUnique({ where: { id: old.id } })).knowledgeStatus, 'REPLACED');
  console.log('PASS 解析失败保留旧版、成功替换、删除新版不复活旧版、学生写接口403');
  assert.equal((await ask('挑战杯通知报名材料故障时下架')).mode, 'no_evidence');
  console.log('PASS 模型调用期间赛事下架后不再返回资料');
  if (providerError) throw providerError;
  console.log('模型协议调用次数:', calls);
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(async () => {
  if (child) { child.kill(); await wait(250); }
  if (provider) await new Promise(resolve => provider.close(resolve));
  await db.$disconnect();
  for (const file of createdFiles) {
    const target = path.resolve(root, 'public', '.' + file.filePath);
    const allowed = path.resolve(root, 'public/uploads/competitions', file.competitionId) + path.sep;
    if (!target.startsWith(allowed)) throw new Error('Unexpected cleanup target');
    fs.rmSync(target, { force: true });
  }
  console.log('隔离验证目录:', scratch);
});
