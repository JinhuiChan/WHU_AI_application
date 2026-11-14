'use strict';

const args = process.argv.slice(2);

function option(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const base = (option('--base') || 'http://localhost:3000').replace(/\/+$/, '');
const phone = option('--phone');
const password = option('--password');
const includeLockout = args.includes('--include-lockout');
const results = [];

function finish(status, index, name, detail = '') {
  results.push(status);
  console.log(`${status} ${index}. ${name}${detail ? ` — ${detail}` : ''}`);
}

function errorDetail(error) {
  return error instanceof Error ? error.message : String(error);
}

async function request(path, { method = 'GET', cookie, body } = {}) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return {
    status: response.status,
    data,
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
}

function login(secret) {
  return request('/api/auth/login', {
    method: 'POST',
    body: { phone, password: secret, identity: 'STUDENT' },
  });
}

async function statusCheck(index, name, expected, operation) {
  try {
    const response = await operation();
    finish(response.status === expected ? 'PASS' : 'FAIL', index, name, `HTTP ${response.status}，预期 ${expected}`);
    return response;
  } catch (error) {
    finish('FAIL', index, name, errorDetail(error));
    return null;
  }
}

async function main() {
  if (!phone || !password) {
    console.error('用法：node scripts/smoke.cjs --base <URL> --phone <学生手机号> --password <密码> [--include-lockout]');
    process.exitCode = 1;
    return;
  }

  await statusCheck(1, '健康检查', 200, () => request('/api/health'));
  const loginResponse = await statusCheck(2, '正确密码登录', 200, () => login(password));
  let sessionCookie = loginResponse?.cookie || '';
  await statusCheck(3, '未登录访问组队接口', 401, () => request('/api/teams'));
  await statusCheck(4, '组队广场页面', 200, () => request('/teams', { cookie: sessionCookie }));
  await statusCheck(5, '个人中心页面', 200, () => request('/my', { cookie: sessionCookie }));
  await statusCheck(6, '组队列表接口', 200, () => request('/api/teams', { cookie: sessionCookie }));
  await statusCheck(7, '错误密码登录', 401, () => login(`${password}__smoke_wrong__`));

  if (includeLockout) {
    try {
      const resetLogin = await login(password);
      if (resetLogin.status !== 200) {
        finish('FAIL', 8, '连续错 6 次后限流', `重置限流登录返回 HTTP ${resetLogin.status}`);
      } else {
        sessionCookie = resetLogin.cookie || sessionCookie;
        console.log(`即将锁定 ${phone} 15 分钟，需重启服务才能立即恢复`);
        let lastResponse = null;
        for (let attempt = 1; attempt <= 6; attempt += 1) {
          lastResponse = await login(`${password}__smoke_wrong__`);
        }
        finish(lastResponse.status === 429 ? 'PASS' : 'FAIL', 8, '连续错 6 次后限流', `第 6 次 HTTP ${lastResponse.status}，预期 429`);
        console.log('该手机号已锁定；限流是内存态，重启 Node 进程即可清空');
      }
    } catch (error) {
      finish('FAIL', 8, '连续错 6 次后限流', errorDetail(error));
    }
  } else {
    finish('SKIP', 8, '连续错 6 次后限流', '默认跳过；显式加 --include-lockout 才执行');
  }

  try {
    const mine = await request('/api/teams/mine', { cookie: sessionCookie });
    if (mine.status !== 200) {
      finish('FAIL', 9, '申请自己的帖子', `获取我的帖子返回 HTTP ${mine.status}`);
    } else {
      const posts = mine.data?.data?.posts;
      const ownPost = Array.isArray(posts)
        ? posts.find((post) => post && !post.removedBy && typeof post.id === 'string')
        : null;
      if (!ownPost) {
        finish('SKIP', 9, '申请自己的帖子', '该账号没有自己的帖子，不创建测试数据');
      } else {
        const join = await request(`/api/teams/${encodeURIComponent(ownPost.id)}/join`, {
          method: 'POST',
          cookie: sessionCookie,
          body: { message: '' },
        });
        finish(join.status === 422 ? 'PASS' : 'FAIL', 9, '申请自己的帖子', `HTTP ${join.status}，预期 422`);
      }
    }
  } catch (error) {
    finish('FAIL', 9, '申请自己的帖子', errorDetail(error));
  }

  await statusCheck(10, '学生访问导出接口', 403, () => request('/api/export/awards-list', { cookie: sessionCookie }));

  const passed = results.filter((status) => status === 'PASS').length;
  const failed = results.filter((status) => status === 'FAIL').length;
  const skipped = results.filter((status) => status === 'SKIP').length;
  console.log(`汇总：PASS ${passed}，FAIL ${failed}，SKIP ${skipped}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`FAIL 冒烟脚本异常：${errorDetail(error)}`);
  process.exitCode = 1;
});
