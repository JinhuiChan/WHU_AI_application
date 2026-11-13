# 部署与增量更新

目标环境：Ubuntu 24.04、Node.js 22、Next.js 14、Prisma 6、SQLite、systemd、Nginx。以下示例以应用目录 `/srv/kesai/app`、持久化目录 `/srv/kesai/shared`、运行用户 `kesai` 和域名 `example.com` 为例，执行时替换为实际值。

## 1. 部署拓扑与目录

Nginx 终止 HTTPS 并反向代理到 `127.0.0.1:3000`，Next.js 由 systemd 运行。代码可以随 Git 更新，`.env`、SQLite、普通上传文件和盖章件必须放在代码目录之外，通过软链接入，避免更新或回滚覆盖数据。

```text
/srv/kesai/app                  # Git 工作区
/srv/kesai/shared/app.env       # 生产环境变量
/srv/kesai/shared/db/dev.db     # SQLite 数据
/srv/kesai/shared/public-uploads/
/srv/kesai/shared/sealed/       # 盖章件，不能暴露为静态公开目录
```

## 2. 首次部署（Ubuntu 24.04 + Node 22）

安装 Node.js 22、Git 和 Nginx，创建运行用户与目录，并设置时区：

```bash
node --version
sudo apt update
sudo apt install -y git nginx
sudo adduser --system --group kesai
sudo timedatectl set-timezone Asia/Shanghai
sudo mkdir -p /srv/kesai/shared/db /srv/kesai/shared/public-uploads /srv/kesai/shared/sealed
sudo touch /srv/kesai/shared/db/dev.db
```

将生产环境变量安全地放到 `/srv/kesai/shared/app.env`，不要写入仓库或公开文档。授权后克隆代码：

```bash
sudo chown -R kesai:kesai /srv/kesai/shared
sudo chmod 600 /srv/kesai/shared/app.env
sudo -u kesai git clone <仓库地址> /srv/kesai/app
cd /srv/kesai/app
```

首次克隆后建立软链；若目标已经存在，先确认其内容，不要直接覆盖：

```bash
ln -s /srv/kesai/shared/app.env .env
ln -s /srv/kesai/shared/db/dev.db prisma/dev.db
ln -s /srv/kesai/shared/public-uploads public/uploads
mkdir -p storage/imports
ln -s /srv/kesai/shared/sealed storage/sealed
```

依赖安装、Prisma 引擎生成、首次数据库初始化和构建都在 Linux 服务器上执行：

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
```

`npm ci` 与 `prisma generate` 必须在 Linux 上运行；Windows 生成的 Prisma 引擎不能搬来使用。首次搭环境使用 `prisma migrate deploy` 应用仓库基线，不要用 `db push` 或 `migrate reset` 代替。

## 3. 数据隔离、软链与盖章件搬迁

每次交付后确认以下链接仍指向持久化目录：

```bash
readlink -f .env
readlink -f prisma/dev.db
readlink -f public/uploads
readlink -f storage/sealed
```

从 S1 之前的版本升级时，盖章件必须只在同一维护批次内完成代码更新和文件搬迁。以下操作仅执行一次，且假定 `/srv/kesai/shared/sealed` 尚不存在：

```bash
cd /srv/kesai/app
git pull
mkdir -p storage
test ! -e /srv/kesai/shared/sealed
mv public/uploads/sealed /srv/kesai/shared/sealed
ln -s /srv/kesai/shared/sealed storage/sealed
```

随后才能继续安装依赖、构建并重启。数据库中的 `/uploads/sealed/...` 是逻辑路径，不做数据迁移。

**盖章件的 `mv` 必须与 `git pull` 同一批做：只上代码，旧文件会 404；只搬文件，旧代码的新上传仍写入 `public/uploads/sealed`，公开下载漏洞照旧。** 已完成搬迁的环境不要重复执行上述 `mv`；若目标已存在，停止并人工核对，避免把目录嵌套搬错。

## 4. HTTPS、Nginx 与安全响应头

不要在 `http://` 上验证登录。`next start` 使用 `NODE_ENV=production`，S2 后会话 Cookie 的 `secure` 会为 `true`；浏览器在明文 HTTP 下拒收它，表现为“登录返回 200 但没登进去”。必须先打通有效 HTTPS，再验证登录。

先让域名 DNS 指向服务器，并通过受信任 CA（例如 Certbot/Let's Encrypt）安装有效证书，再开放域名访问。**HSTS 对 IP 字面量会被浏览器忽略；域名一旦使用自签证书并叠加 HSTS，浏览器可能直接拒绝访问，连“继续前往”入口都没有。** 不要把自签证书或 IP 访问当作生产验收方案。

Nginx 站点配置至少包含：

```nginx
server {
    listen 443 ssl;
    server_name example.com;
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`proxy_set_header X-Forwarded-Proto $scheme;` 必须保留，否则应用无法正确判断 HTTPS 并设置安全 Cookie。证书有效后再配置 HTTP 跳转 HTTPS，并执行：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

生产环境会返回 HSTS；不要在证书无效时通过浏览器绕过继续验收。CSP 本期明确不启用，避免 Next.js 内联脚本被阻断。

## 5. systemd 与健康检查

创建 `/etc/systemd/system/kesai.service`：

```ini
[Unit]
Description=Kesai Next.js service
After=network.target

[Service]
Type=simple
User=kesai
Group=kesai
WorkingDirectory=/srv/kesai/app
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

如果 Node.js 不是安装到 `/usr/bin`，将 `ExecStart` 改成服务器上实际的 npm 绝对路径。启动并检查：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now kesai
sudo systemctl restart kesai
systemctl status kesai
curl -fsS https://example.com/api/health
```

健康检查应返回 `status: "ok"` 和 `db: "ok"`。它无需登录，失败时返回 503，不应把异常堆栈、环境变量或路径发给客户端。

## 6. 增量更新与 build 失败回滚

先备份 SQLite 和上传文件，再在同一维护窗口更新代码、依赖和构建产物：

```bash
cd /srv/kesai/app
git pull
npm ci
npx prisma generate
npm run build
sudo systemctl restart kesai
curl -fsS https://example.com/api/health
```

如果更新包含数据库迁移，在构建前审查迁移并执行 `npx prisma migrate deploy`；不要直接对生产库使用 `migrate reset`。如果包含 S1 盖章件搬迁，必须按第 3 节把 `git pull` 和 `mv` 放在同一批操作中。

**只有 `npm run build` 成功后才允许 restart。** 若本次 `git pull` 后 build 失败，立即回到拉取前提交，不要重启失败版本：

```bash
cd /srv/kesai/app
git reset --hard ORIG_HEAD
npm ci
npx prisma generate
npm run build
# 确认旧版本构建成功后再恢复服务
sudo systemctl restart kesai
```

## 7. 版本回滚与数据注意事项

常规代码回滚使用经过验证的旧提交，并重新安装匹配依赖、生成 Linux Prisma 引擎、构建成功后重启：

```bash
cd /srv/kesai/app
git reset --hard <已验证的旧提交>
npm ci
npx prisma generate
npm run build
sudo systemctl restart kesai
```

数据库迁移不会因代码回滚自动逆向执行；需要数据回滚时，停止服务并恢复更新前备份，禁止用 `migrate reset` 清空生产数据。跨 S1 边界回滚时，代码与盖章件目录布局也必须成对恢复，不能只回滚其中一边。

## 8. 冒烟验收

在有效 HTTPS 上使用学生演示账号运行纯 HTTP 冒烟脚本；脚本不会启动服务或直接写数据库：

```bash
node scripts/smoke.cjs --base https://example.com --phone <学生手机号> --password '<学生密码>'
```

第 8 项账号锁定检查默认 SKIP。只有允许该账号被锁定 15 分钟时才显式执行：

```bash
node scripts/smoke.cjs --base https://example.com --phone <学生手机号> --password '<学生密码>' --include-lockout
```

执行前会打印锁定警告，执行后需要重启 Node 进程才能立即清空内存限流。没有自己帖子的账号，第 9 项会 SKIP，不应为了通过检查而制造帖子。最终任何 FAIL 都会让脚本退出码为 1。
