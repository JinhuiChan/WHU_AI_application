// Opt-in live-model verification against the separately imported 2025 historical event.
const fs = require('node:fs');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const args = process.argv.slice(2);
const base = 'http://127.0.0.1:3013';
const cases = [
  ['报名到参赛流程', '2025年国创赛从报名到参赛的流程是什么？请区分学生、学校和省级单位。', ['报名', '初赛', '复赛', '总决赛']],
  ['团队人数', '2025年国创赛高教主赛道一个团队能有几人，负责人算不算？', ['3', '15', '负责人']],
  ['跨校组队', '2025年国创赛高教主赛道允许跨校组队吗？', ['跨校']],
  ['实际核心成员', '2025年国创赛高教主赛道能借用别人的项目参赛吗？', ['不得|不能|不允许', '项目']],
  ['本科创意公司条件', '2025年国创赛本科生创意组能用已经注册的公司参赛吗？', ['尚未|不能|不符合|不得|未完成', '注册']],
  ['本科创意成员', '2025年国创赛本科生创意组的负责人和成员需要什么学籍？', ['全日制', '在校', '本专科']],
  ['成果转化例外', '2025年国创赛本科生创意组能参加学校科技成果转化项目吗？有没有例外？', ['不能|不得|不允许|不可', '第一|首位', '除外|例外']],
  ['本科创业法人', '2025年国创赛本科生创业组对项目负责人和公司法人有什么要求？', ['负责人', '法定代表人', '毕业|在校']],
  ['创业组股权', '2025年国创赛本科生创业组对法人和参赛成员股权比例有什么要求？', ['10%', '1/3|三分之一|33']],
  ['研究生创意成员', '2025年国创赛研究生创意组能有本科生成员吗，负责人呢？', ['研究生', '本专科|本科', '全日制']],
  ['研究生创业毕业', '2025年国创赛研究生创业组允许毕业生参加吗，有什么限制？', ['5|五', '研究生', '法定代表人']],
  ['一项目一赛道', '2025年国创赛同一个项目能同时报多个赛道吗？', ['一个|唯一|不能|不得']],
  ['往年获奖限制', '2025年国创赛往年全国总决赛金奖和银奖项目还能报名吗？', ['金奖', '银奖', '不可|不能|不得|不允许']],
  ['年龄及例外', '2025年国创赛参赛年龄上限是多少，产业赛道教师成员是否例外？', ['35', '教师', '不含|例外|不受|不适用']],
  ['通知赛程', '2025年国创赛通知中的报名、初赛复赛、总决赛各是什么时间？', ['2025', '5|五', '8|八', '9|九']],
  ['路演答辩', '2025年国创赛校级初赛和省级复赛应设置哪些比赛环节？', ['路演', '答辩']],
  ['推荐盖章主体', '2025年国创赛推荐到省赛和国赛的项目，分别由谁盖章？', ['院校|学校', '省级教育行政部门']],
  ['材料外包限制', '2025年国创赛的PPT和项目书可以商业外包吗？', ['外包', '杜绝|不能|不得|不允许|禁止']],
  ['未说明资料', '2025年国创赛参赛学生的报销额度具体是多少元？', ['没有|未说明|未找到|未提供|未明确|不足']],
  ['年份隔离', '对比2025年和2026年国创赛通知中的团队人数要求。', ['2025', '2026', '15', '8']],
];

async function main() {
  if (!args.includes('--run-live')) throw new Error('Requires --run-live; this invokes the configured model and consumes its quota. Optional: --report <path> --limit <count>.');
  const historical = await db.competition.findUniqueOrThrow({ where: { name_year: { name: '中国国际大学生创新大赛（历史资料测试）', year: 2025 } } });
  const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: process.env.LOCAL_STUDENT_PHONE || '13800010001', password: process.env.LOCAL_STUDENT_PASSWORD || '123456', identity: 'STUDENT' }) });
  if (login.status !== 200) throw new Error('Student login failed');
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const output = [];
  const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : cases.length;
  for (const [name, question, patterns] of cases.slice(0, limit)) {
    const started = Date.now();
    let item;
    try {
      const response = await fetch(base + '/api/assistant/ask', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ question, ...(name !== '年份隔离' ? { competitionId: historical.id } : {}) }), signal: AbortSignal.timeout(45000) });
      const body = await response.json(); const result = body.data || body;
      const missing = patterns.filter((pattern) => !new RegExp(pattern).test(result.answer || ''));
      const errors = [];
      if (response.status !== 200) errors.push('HTTP_' + response.status);
      if (!['generated', ...(name === '未说明资料' ? ['no_evidence'] : [])].includes(result.mode)) errors.push('mode:' + result.mode);
      if (missing.length) errors.push('missing:' + missing.join(','));
      if (name !== '年份隔离' && result.sources?.some((source) => source.year !== 2025 || source.competitionId !== historical.id)) errors.push('wrong-year-or-event');
      if (result.mode === 'generated' && !result.sources?.length) errors.push('missing-citations');
      if (name === '年份隔离' && new Set(result.sources.map((source) => source.year)).size !== 2) errors.push('missing-year-source');
      item = { name, question, status: errors.length ? 'FAIL' : 'PASS', errors, mode: result.mode, elapsedMs: Date.now() - started, answer: result.answer, sources: result.sources };
    } catch (error) { item = { name, question, status: 'FAIL', errors: [error.message], elapsedMs: Date.now() - started }; }
    output.push(item); console.log(item.status + ' ' + name + ' ' + item.elapsedMs + 'ms ' + item.errors.join('; '));
    if (args.includes('--report')) fs.writeFileSync(args[args.indexOf('--report') + 1], JSON.stringify(output, null, 2));
  }
  console.log(`Live model results: ${output.filter((item) => item.status === 'PASS').length}/${output.length}`);
  if (output.some((item) => item.status === 'FAIL')) process.exitCode = 1;
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
