// Local test setup; supply original documents plus sources.json, never a model key.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const args = process.argv.slice(2);
const option = (name) => args[args.indexOf(name) + 1];
const base = 'http://127.0.0.1:3013';
const db = new PrismaClient();
const eventName = '中国国际大学生创新大赛（历史资料测试）';
let cookie;

async function request(route, body, method) {
  const headers = cookie ? { Cookie: cookie } : {};
  if (body && !(body instanceof FormData)) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
  const response = await fetch(base + route, { method: method || (body ? 'POST' : 'GET'), headers, body, signal: AbortSignal.timeout(45000) });
  const result = await response.json();
  if (!response.ok || result.code !== 0) throw new Error(route + ': ' + result.message);
  return { data: result.data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

async function main() {
  if (!args.includes('--source-dir') || !option('--source-dir')) throw new Error('Usage: node --env-file=.env scripts/import-historical-knowledge.cjs --source-dir <directory with sources.json>');
  const dir = path.resolve(option('--source-dir'));
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'sources.json'), 'utf8'));
  if (!Array.isArray(manifest) || !manifest.length) throw new Error('Missing source manifest');
  const files = manifest.map((item) => {
    if (!item.file || item.file !== path.basename(item.file) || !/\.(docx|pdf)$/i.test(item.file)) throw new Error('Unexpected source filename');
    if (item.error || !item.url || !item.sha256 || !item.title) throw new Error('Incomplete provenance: ' + item.file);
    const bytes = fs.readFileSync(path.join(dir, item.file));
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== item.sha256) throw new Error('Source checksum changed: ' + item.file);
    return { ...item, bytes };
  });
  cookie = (await request('/api/auth/login', { phone: process.env.LOCAL_ADMIN_PHONE || '13800000001', password: process.env.LOCAL_ADMIN_PASSWORD || '123456', identity: 'ADMIN' })).cookie;
  let event = await db.competition.findUnique({ where: { name_year: { name: eventName, year: 2025 } } });
  if (!event) {
    const created = await request('/api/admin/competitions', { name: eventName, seriesId: 'china-innovation', year: 2025, level: 'NATIONAL', organizer: '教育部等（2025年官方通知）',
      description: '历史资料测试，仅用于2025届次文件问答，不开放报名，不代表当前届次或武汉大学校内完整安排。原始附件来自教育部及石河子大学教务处官方存档。来源：' + [...new Set(files.flatMap((item) => [item.page, item.url]).filter(Boolean))].join('；') });
    event = await db.competition.findUniqueOrThrow({ where: { id: created.data.id } });
  }
  await request('/api/admin/competitions/' + event.id + '/window', { startAt: '2025-05-09T00:00:00+08:00', endAt: '2025-07-01T00:00:00+08:00', enabled: false }, 'PUT');
  if (!await db.track.findFirst({ where: { competitionId: event.id, enabled: true } })) await request('/api/admin/competitions/' + event.id + '/tracks', { name: '高教主赛道（历史测试）', kind: 'TRACK' });
  for (const item of files) {
    const existing = await db.competitionAttachment.findFirst({ where: { competitionId: event.id, fileName: item.file }, orderBy: { createdAt: 'desc' } });
    if (existing) {
      const storedPath = path.resolve(process.cwd(), 'public', '.' + existing.filePath);
      const allowed = path.resolve(process.cwd(), 'public/uploads/competitions', event.id) + path.sep;
      if (!storedPath.startsWith(allowed) || !fs.existsSync(storedPath) || crypto.createHash('sha256').update(fs.readFileSync(storedPath)).digest('hex') !== item.sha256) throw new Error('Existing source differs; use the administrator replacement workflow: ' + item.file);
      if (existing.knowledgeStatus !== 'READY') throw new Error('Existing source needs a manual parse retry: ' + item.file);
      console.log('Already imported: ' + item.file); continue;
    }
    const pdf = item.file.endsWith('.pdf');
    const form = new FormData(); form.set('title', item.title); form.set('kind', pdf ? 'NOTICE' : 'RULE');
    form.set('file', new Blob([item.bytes], { type: pdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), item.file);
    const attachment = (await request('/api/admin/competitions/' + event.id + '/attachments', form)).data;
    if (attachment.knowledgeStatus !== 'READY') throw new Error('Parse failed: ' + item.file + ': ' + attachment.knowledgeError);
    console.log('Imported original source: ' + item.file);
  }
  if (event.publishStatus !== 'PUBLISHED') await request('/api/admin/competitions/' + event.id + '/publish', { action: 'PUBLISH' });
  console.log(JSON.stringify({ competitionId: event.id, name: eventName, year: 2025, registrationEnabled: false, assistantUrl: base + '/assistant?competitionId=' + event.id }));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
