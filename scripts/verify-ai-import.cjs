// node --env-file=.env scripts/verify-ai-import.cjs [--live]
// Every database write uses an isolated copy. Only fictional fixtures reach the live model.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const root = process.cwd(), live = process.argv.includes('--live');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'whu-ai-import-'));
const database = path.join(scratch, 'import.db');
const original = new DatabaseSync(path.join(root, 'prisma/dev.db'), { readOnly: true });
original.prepare('VACUUM INTO ?').run(database); original.close();
const db = new PrismaClient({ datasources: { db: { url: 'file:' + database.replaceAll('\\', '/') } } });
const base = 'http://127.0.0.1:' + (live ? 3027 : 3025);
const artifacts = new Set();
let child, provider, calls = 0, mode = 'valid', sequence = 0, providerError;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function req(route, { cookie, body, method, status = 200, binary = false } = {}) {
  const headers = cookie ? { Cookie: cookie } : {};
  if (body && !(body instanceof FormData)) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
  const response = await fetch(base + route, { method: method || (body ? 'POST' : 'GET'), headers, body, redirect: 'manual', signal: AbortSignal.timeout(190000) });
  if (binary) { assert.equal(response.status, status); return Buffer.from(await response.arrayBuffer()); }
  const result = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text();
  assert.equal(response.status, status, route + ': ' + (result.message || String(result).slice(0, 120)));
  return { data: result.data ?? result, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

function fakeRecords(blocks) {
  return blocks.flatMap((block) => {
    const fields = {};
    for (const [key, label] of [['projectName', '项目名称'], ['leaderName', '负责人姓名'], ['leaderPersonNo', '负责人学号'], ['college', '学院']]) {
      const match = block.text.match(new RegExp(label + '[：:]([^；。\\n]+)')); if (match) fields[key] = match[1].trim();
    }
    const members = [], teachers = [];
    for (const [name, personNo] of [['测试乙', '0012345679'], ['测试丁', '0012345681']]) if (block.text.includes(name) && block.text.includes(personNo)) members.push({ isInternal: '是', name, personNo });
    for (const [name, staffNo] of [['测试导师甲', 'T900001'], ['测试导师乙', 'T900002']]) if (block.text.includes(name) && block.text.includes(staffNo)) teachers.push({ isInternal: '是', name, staffNo });
    return Object.keys(fields).length || members.length || teachers.length ? [{ sourceIds: [block.id], fields, members, teachers }] : [];
  });
}

async function main() {
  if (live && (!process.env.LLM_API_KEY || process.env.LLM_BASE_URL !== 'https://maas.whu.edu.cn/v1')) throw new Error('Live verification requires the configured WHU platform');
  provider = http.createServer(async (request, response) => {
    try {
      let raw = ''; for await (const piece of request) raw += piece;
      const payload = JSON.parse(raw); const data = JSON.parse(payload.messages[1].content);
      assert.equal(request.headers.authorization, 'Bearer verification-key');
      assert.equal(data.operation, 'extract_import_records'); calls++; sequence++;
      if (mode === 'error') { response.writeHead(503); response.end('{}'); return; }
      if (mode === 'split' && sequence === 1) { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: '' } }] })); return; }
      if (live && mode === 'valid') {
        const upstream = await fetch('https://maas.whu.edu.cn/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.LLM_API_KEY }, body: JSON.stringify({ ...payload, reasoning_effort: 'none' }), signal: AbortSignal.timeout(45000) });
        response.writeHead(upstream.status, { 'Content-Type': 'application/json' }); response.end(await upstream.text()); return;
      }
      const records = mode === 'empty' ? [] : fakeRecords(data.blocks);
      if (mode === 'invented' && records.length) records[0].fields.leaderName = '原文不存在的姓名';
      if (mode === 'repair' && sequence === 1 && records.length) records[0].sourceIds = ['B999999'];
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ records, warnings: [] }) } }] }));
    } catch (error) { providerError = error; response.writeHead(500); response.end('{}'); }
  });
  await new Promise((resolve) => provider.listen(0, '127.0.0.1', resolve));
  child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', live ? '3027' : '3025'], { cwd: root, stdio: 'ignore', env: { ...process.env, DATABASE_URL: 'file:' + database.replaceAll('\\', '/'), LLM_BASE_URL: 'http://127.0.0.1:' + provider.address().port, LLM_API_KEY: 'verification-key', LLM_MODEL: 'deepseek-flash' } });
  for (let i = 0; i < 50; i++) { try { await req('/login'); break; } catch (error) { if (i === 49) throw error; await pause(200); } }
  const login = async (phone, identity) => (await req('/api/auth/login', { body: { phone, password: '123456', identity } })).cookie;
  const admin = await login('13800000001', 'ADMIN'), student = await login('13800010001', 'STUDENT');
  const owner = await db.user.findUniqueOrThrow({ where: { phone: '13800000001' } });
  const event = await db.competition.create({ data: { name: '隔离AI导入验收', seriesId: 'ai-import-verification', year: 2026, level: 'SCHOOL', publishStatus: 'DRAFT' } });
  const upload = async (name, cookie = admin, expected = 200, bytes) => {
    const form = new FormData(); form.set('file', new Blob([bytes || fs.readFileSync(path.join(root, 'scripts/fixtures', name))]), name);
    const result = await req('/api/import/parse', { cookie, body: form, status: expected });
    if (result.data.sourceKey) { artifacts.add(result.data.sourceKey); artifacts.add(result.data.sourceKey + '.parsed.json'); }
    return result.data;
  };
  const mapping = (parsed, extra = {}) => ({ competitionId: event.id, stage: 'SCHOOL', fileName: parsed.fileName, totalRows: parsed.totalRows, mapping: parsed.suggestedMapping, sourceKey: parsed.sourceKey, confirmed: true, ...extra });
  const save = async (parsed, extra = {}, cookie = admin, expected = 200) => {
    const result = (await req('/api/import/mapping', { cookie, body: mapping(parsed, extra), status: expected })).data;
    if (result.batchId) { const batch = await db.importBatch.findUniqueOrThrow({ where: { id: result.batchId } }); const meta = JSON.parse(batch.mappingJson); if (meta.preparedKey) artifacts.add(meta.preparedKey); }
    return result;
  };
  await req('/api/import/parse', { body: {}, status: 401 });
  for (const route of ['/api/import/parse', '/api/import/mapping', '/api/import/commit']) await req(route, { cookie: student, body: {}, status: 403 });
  await req('/api/import/failed?batchId=missing', { cookie: student, status: 403 });
  const denied = await req('/import', { cookie: student });
  assert.ok(denied.data.includes('无权限访问')); assert.ok(!denied.data.includes('赛事报名数据导入'));
  const studentRow = await db.user.findUniqueOrThrow({ where: { phone: '13800010001' } });
  await db.userRoleLink.upsert({ where: { userId_role: { userId: studentRow.id, role: 'ADMIN' } }, create: { userId: studentRow.id, role: 'ADMIN' }, update: {} });
  const multiStudent = await login('13800010001', 'STUDENT');
  for (const route of ['/api/import/parse', '/api/import/mapping', '/api/import/commit']) await req(route, { cookie: multiStudent, body: {}, status: 403 });
  console.log('PASS 普通学生与多身份学生禁止导入接口');

  const projectCount = await db.project.count();
  const parsed = await upload('import-table.docx');
  assert.equal(parsed.recognition.mode, 'ai'); assert.ok(parsed.draftRows.length >= 2);
  const field = (row, key) => row.values[parsed.columns.indexOf(parsed.suggestedMapping[key])];
  const mains = parsed.draftRows.filter((row) => field(row, 'projectName'));
  assert.equal(mains.length, 2); assert.equal(field(mains[0], 'leaderPersonNo'), '0012345678');
  assert.equal(await db.project.count(), projectCount, '上传识别不能创建项目');
  await save(parsed, { confirmed: false }, admin, 422);
  await save(parsed, { totalRows: parsed.totalRows + 1 }, admin, 422);
  await save(parsed, { reviewedRows: [{ rowNo: 1, values: [] }] }, admin, 422);
  const other = await db.user.create({ data: { phone: '13811111111', name: '隔离管理员二', role: 'ADMIN', passwordHash: owner.passwordHash } });
  await save(parsed, {}, await login(other.phone, 'ADMIN'), 403);
  console.log('PASS Word字段与前导零、来源、只预览不入库、确认闸门和上传者约束');

  const secondStart = parsed.draftRows.findIndex((row) => row.rowNo === mains[1].rowNo);
  const reviewed = structuredClone(parsed.draftRows.slice(0, secondStart));
  reviewed[0].values[parsed.columns.indexOf(parsed.suggestedMapping.projectName)] = '管理员修订项目';
  const make = (rowNo, project, no) => ({ rowNo, values: parsed.columns.map((column) => ({ '项目名称': project, '负责人学号': no, '负责人姓名': '测试补录', '学院': '计算机学院' })[column] || '') });
  const next = Math.max(...parsed.draftRows.map((row) => row.rowNo)) + 1;
  reviewed.push(make(next, '人工补充项目', '0012345689'), make(next + 1, '格式错误项目', 'bad-id'));
  const batch = await save(parsed, { reviewedRows: reviewed });
  const fixed = await db.importBatch.findUniqueOrThrow({ where: { id: batch.batchId } }); assert.equal(fixed.totalRows, reviewed.length); assert.equal(JSON.parse(fixed.mappingJson).version, 3);
  const before = calls; mode = 'error';
  const committed = (await req('/api/import/commit', { cookie: admin, body: { batchId: batch.batchId } })).data;
  assert.equal(committed.success, 2); assert.equal(committed.failed, 1); assert.equal(calls, before, '确认入库不得重新调用AI');
  const projects = await db.project.findMany({ where: { competitionId: event.id }, include: { teamMembers: true, teachers: true } });
  assert.deepEqual(projects.map((p) => p.name).sort(), ['人工补充项目', '管理员修订项目'].sort());
  const first = projects.find((p) => p.name === '管理员修订项目');
  assert.ok(first.teamMembers.some((p) => p.personNo === '0012345678'));
  assert.ok(first.teamMembers.some((p) => p.personNo === '0012345679'));
  assert.ok(first.teachers.some((p) => p.staffNo === 'T900001'));
  await req('/api/import/commit', { cookie: admin, body: { batchId: batch.batchId }, status: 409 });
  const failed = await req('/api/import/failed?batchId=' + batch.batchId, { cookie: admin, binary: true });
  const book = XLSX.read(failed, { type: 'buffer' }); assert.ok(JSON.stringify(XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]])).includes('格式错误项目')); assert.equal(calls, before);
  console.log('PASS 修改、删行、补行固定入库；成员老师、部分失败、失败导出和重复提交，不再次调用AI');

  mode = 'valid';
  for (const name of ['import-narrative.docx', 'import-projects.pdf', 'import-many.docx']) {
    const result = await upload(name); const at = result.columns.indexOf('项目名称');
    assert.equal(result.draftRows.filter((row) => row.values[at]).length, name === 'import-many.docx' ? 25 : 2);
    if (name.endsWith('.pdf')) assert.ok(result.recognition.blocks.some((b) => b.page === 1));
    console.log('PASS 全量识别 ' + name + '，' + result.draftRows.length + '行');
  }
  mode = 'invented'; sequence = 0; await upload('import-table.docx', admin, 422); assert.equal(sequence, 2);
  mode = 'repair'; sequence = 0; await upload('import-table.docx'); assert.equal(sequence, 2);
  mode = 'split'; sequence = 0; await upload('import-table.docx'); assert.ok(sequence >= 3);
  mode = 'empty'; await upload('document-rules.docx', admin, 422);
  mode = 'error'; await upload('import-table.docx', admin, 422);
  const beforeScan = calls; await upload('document-scanned.pdf', admin, 422); await upload('broken.docx', admin, 422, Buffer.from('broken')); assert.equal(calls, beforeScan);
  console.log('PASS 编造值拒绝、一次修复、截断拆批、无记录、服务错误、扫描和损坏文件');

  mode = 'valid';
  const sheet = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(sheet, XLSX.utils.aoa_to_sheet([['项目名称', '负责人学号', '负责人姓名', '学院'], ['Excel兼容项目', '0012345999', 'Excel测试', '计算机学院']]), '项目');
  const atExcel = calls; const excel = await upload('legacy.xlsx', admin, 200, XLSX.write(sheet, { type: 'buffer', bookType: 'xlsx' })); assert.equal(calls, atExcel); assert.equal(excel.requiresConfirm, false);
  const legacy = await save(excel, { confirmed: false }); const legacyBatch = await db.importBatch.findUniqueOrThrow({ where: { id: legacy.batchId } }); const legacyMeta = JSON.parse(legacyBatch.mappingJson); legacyMeta.version = 2; delete legacyMeta.preparedKey; delete legacyMeta.preparedDigest; await db.importBatch.update({ where: { id: legacy.batchId }, data: { mappingJson: JSON.stringify(legacyMeta) } });
  assert.equal((await req('/api/import/commit', { cookie: admin, body: { batchId: legacy.batchId } })).data.success, 1); assert.equal(calls, atExcel);
  const protectedDraft = await upload('import-table.docx'); const protectedBatch = await save(protectedDraft); const protectedMeta = JSON.parse((await db.importBatch.findUniqueOrThrow({ where: { id: protectedBatch.batchId } })).mappingJson);
  fs.appendFileSync(path.join(root, 'storage/imports', protectedMeta.preparedKey), ' ');
  const atProtected = calls; await req('/api/import/commit', { cookie: admin, body: { batchId: protectedBatch.batchId }, status: 422 }); assert.equal(calls, atProtected);
  console.log('PASS Excel无AI调用、旧批次兼容、确认快照变更检测');
  if (providerError) throw providerError;
  console.log((live ? 'LIVE' : 'MOCK') + ' AI import verification passed; model requests=' + calls);
}
main().catch((error) => { console.error(error.stack); process.exitCode = 1; }).finally(async () => {
  if (child) { child.kill(); await pause(300); }
  if (provider) await new Promise((resolve) => provider.close(resolve));
  await db.$disconnect();
  const allowed = path.resolve(root, 'storage/imports') + path.sep;
  for (const key of artifacts) { const target = path.resolve(root, 'storage/imports', key); if (!target.startsWith(allowed)) throw new Error('Invalid cleanup path'); fs.rmSync(target, { force: true }); }
  console.log('Isolated database retained at: ' + database);
});
