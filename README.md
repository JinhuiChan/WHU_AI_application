# 高校科创赛事综合管理服务平台

> 面向校级赛事管理部门的**全流程台账系统**：从赛事配置、组队、报名、两级审核、材料盖章，到奖项、导出、看板、AI 问答，全部收在同一条数据链上，替代"多版本 Excel 到处传"的现状。

**几份关键文档**

| 文档 | 内容 |
|---|---|
| [docs/服务器上线步骤.md](docs/服务器上线步骤.md) | **一步步把系统部署到服务器**（照着敲即可，含备份与回滚） |
| [docs/deploy.md](docs/deploy.md) | 部署参考（目录拓扑、软链、Nginx、systemd 的原理与完整配置） |
| [docs/演示账号与测试用例.md](docs/演示账号与测试用例.md) | 测试同学先看：演示账号 + 测试用例 |
| [PROGRESS.md](PROGRESS.md) | 开发交接记录：每阶段改了什么、怎么验、踩过哪些坑 |

---

## 一、这个系统解决什么

| 现在的痛点 | 系统里的对应能力 |
|---|---|
| 报名靠发 Excel，学院反复退 | 在线报名表单 + 两级串行审核（学院初审 → 学校终审），驳回必填理由 |
| 找不到合适的队友，只能私下拉群 | **组队广场**：发布招募帖 / 申请加入 / 审批 / 关闭招募；成团后**一键预填报名成员** |
| 改了人、改了名，事后查不清 | 报名后关键信息变更走**申请-审批**，不直接改库；每次变更留痕（谁、何时、旧值、新值） |
| 报名表要签字盖章，纸质表容易丢 | 导出可打印正式表 → 线下签章 → 扫描件回传归档（版本化）→ 全队可下载最终版 |
| 上级要数据，靠人工汇总 | 27 字段数据表可勾选字段与顺序导出；统计看板按学院/赛道/阶段/奖项聚合 |
| 赛事规则年年改 | 赛道 / 组别 / 类别 / 命题走字典配置，改配置不改代码 |
| 学生老问"我项目到哪一步了" | **三阶段进度条**：提交 → 学院初审 → 学校终审（驳回会标出是哪一级驳回的） |
| 审核人逐条点、看不出明显问题 | **审核规则预检**：缺老师确认、缺盖章件、学号重复、负责人手机号缺失、学院不一致，一次性列出来（只提示，不阻断） |
| 规则类问题反复被问 | **赛事 AI 问答**：读赛事配置与通知/规程附件作答，并实时注入在招队伍（**不输出任何联系方式**） |
| 学生想展示自己 | **个人中心 + 公开主页**：简介、技能、参赛与指导记录、获奖，可见性自己控制 |

---

## 二、技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 14.2（App Router，服务端组件优先） |
| 语言 | TypeScript（strict） |
| 样式 | TailwindCSS 3 + 统一设计令牌（`surface / ink / brand / line`） |
| 数据 | Prisma 6 + SQLite（开发与单机部署；可平滑换 PostgreSQL） |
| 认证 | jose（JWT，HttpOnly Cookie）+ bcryptjs + 中间件路由级拦截 |
| 导入导出 | xlsx；文档解析 mammoth（docx）、pdf-parse（pdf） |
| 图表 | recharts |
| 敏感字段 | AES-256-GCM 应用层加密，页面默认只显示后四位 |

规模：**32 张表 / 59 个接口 / 32 个页面**，全站服务端渲染（60 处 `force-dynamic`）。

---

## 三、快速开始（本地）

> 所有命令都在**仓库根目录**执行（`package.json`、`prisma/` 与 `app/` 同级）；`app/` 只是 Next.js 源码目录，**不要 `cd app`**。

### 第一次打开（整套只做一次）

```powershell
# 一键初始化：npm install → 生成 .env → Prisma Client → 建表 → 灌演示数据
npm.cmd run setup

# 启动
npm.cmd run dev                              # 浏览器打开 http://localhost:3000
```

> `npm run setup` 可重复执行：`node_modules` 已存在就不重装，库里有数据就不 seed（不清库）。需要 Node.js ≥ 20.6。
> 手动初始化（等价）：`npm.cmd install` → `Copy-Item .env.example .env` → `npm.cmd run db:generate` → `npm.cmd run db:push` → `npm.cmd run db:seed`。
> ⚠️ `FIELD_ENCRYPTION_KEY` 一旦录入真实身份证/银行卡就**不要再换**，否则历史密文永久解不开。

### 以后每次打开

```powershell
cd "<仓库根目录>"
npm.cmd run dev
```

### 提交前自检（每次改完必跑）

```powershell
.\node_modules\.bin\tsc.cmd --noEmit    # 类型检查，必须 0 错误
npm.cmd run lint                        # 代码规范，必须 0 错误 0 警告
```

> 必须用 `npm.cmd`（不是 `npm`），否则会被 PowerShell 执行策略拦住。
> 必须用全路径 `.\node_modules\.bin\tsc.cmd`，`npx tsc` 会去网上抓包导致 EPERM。

### 服务跑起来后的冒烟自测（10 条）

```powershell
npm.cmd run smoke -- --phone 13800010001 --password 123456
```

覆盖：健康检查、登录、未登录 401、页面 200、接口 200、错误密码 401、组队边界 422、学生导出 403。
第 8 条限流测试**默认跳过**（跑了会把该手机号锁 15 分钟，需要 `--include-lockout` 显式开启）。

### 常用操作速查

| 场景 | 命令 |
|---|---|
| 端口 3000 被占用 | `npm.cmd run dev -- -p 3001` |
| 拉队友的新代码 | `git pull`；`package.json` 变了补 `npm.cmd install`；`schema.prisma` 变了补 `npm.cmd run db:generate` + `npm.cmd run db:push` |
| 演示数据想重置 | `npm.cmd run db:push --force-reset`，再 `npm.cmd run db:seed`（**会清空数据**） |
| 改完代码页面没变化 | `Ctrl+C` 停服务 → `Remove-Item -Recurse -Force .next` → 重新 `npm.cmd run dev` |
| Prisma 报 `EPERM rename query_engine` | dev 进程占着 DLL：**先停 dev**，再 `db:generate` |

---

## 四、演示账号（密码统一 `123456`）

> ⚠️ **这些是弱口令演示账号，仅限内部演示。** 本仓库若公开，任何人都能看到这批账号与密码，
> 并直接登录已上线的站点。**正式对外使用前必须改密码**（见「七、安全设计要点」末尾的公开仓库注意事项）。

| 角色 | 手机号 | 说明 |
|---|---|---|
| 管理员 | `13800000001` | 赛事管理、审核、变更审批、奖项、用户、导出、看板 |
| 学生 | `13800010001` | 陈宇轩：报名、我的项目、上传盖章件、发起变更、组队 |
| 学生 | `13800010002` | 李雨桐：用于双人配合演示（申请加入队伍等） |
| 教师 | `13600000001` | 黄荣喜（工号 T20260001）：确认指导关系 |
| 教师 | `13800000201` | 王建国 |

学生也可在 `/register` 自助注册；教师注册需填工号；管理员注册后**需管理员审核通过**才能登录。

---

## 五、演示数据

- 3 个赛事：中国国际大学生创新大赛、挑战杯、百珈争创
- 18 个项目，覆盖 5 种审核状态，含 **2 个已驳回**、**1 条待确认指导关系**、**1 个未上传盖章件**
- 报名窗口：国创赛**开放中**（当场可报名）；挑战杯 / 百珈争创**已关闭**（演示变更申请与窗口锁定）

### 大规模演示数据（800 学生 / 50 教师 / 240 个项目）

```powershell
npm.cmd run setup        # 首次：依赖、.env、建表、基础演示数据
npm.cmd run demo:all     # 800 学生 + 50 教师 + 240 个国创赛项目 + 全量绑定
npm.cmd run dev
```

- 账号统一密码 `123456`；学生 `13700000001~13700000800`，教师 `13600000001~13600000050`
- 关联规则：学生注册/登录时按学号自动关联历史报名，教师按工号关联

---

## 六、主要路由

| 路由 | 角色 | 作用 |
|---|---|---|
| `/apply` | 学生 | 报名表单（含 `?teamPostId=` 成团预填） |
| `/my`、`/my/[id]` | 学生 | 我的项目列表（含三阶段进度条）、项目详情与变更申请 |
| `/teams`、`/teams/new`、`/teams/[id]` | 学生 | 组队广场、发布招募、队伍详情与申请 |
| `/my/teams` | 学生 | 我发布的 / 我加入的 / 我收到的申请 |
| `/profile`、`/u/[id]` | 全部 | 我的资料、公开主页（可见性可控） |
| `/teacher` | 教师 | 我指导的项目、确认/拒绝指导关系 |
| `/review`、`/review/[id]`、`/review/changes` | 管理员 | 审核工作台（含规则预检）、项目详情、变更审批 |
| `/competitions`、`/competitions/[id]` | 全部 | 赛事列表与赛事主页 |
| `/intro`、`/intro/[id]` | 全部 | 赛事简介（只展示已发布赛事） |
| `/dashboard`、`/rankings` | 全部 | 统计看板（学生只见本人数据）、排名 |
| `/assistant` | 全部 | 赛事 AI 问答 |
| `/projects`、`/projects/[id]` | 全部 | 项目列表与详情 |
| `/admin/awards`、`/admin/users`、`/admin/logs` | 管理员 | 奖项录入、用户管理、审计日志 |
| `/import`、`/check`、`/anomalies` | 管理员 | 数据导入、材料检查、异常核实 |
| `/forbidden` | 全部 | 无权限友好页（中间件页面级拒绝统一 rewrite 到这里） |

---

## 七、安全设计要点

1. **敏感字段加密**：身份证、银行卡入库前 AES-256-GCM 加密，页面默认只显示后四位。
2. **导出分级**：报名表默认脱敏；`full=1` 才含完整信息，仅限负责人/二·三负责人/管理员，并写 `ExportRecord` + 水印。
3. **敏感读取留痕**：完整件与含敏感字段的数据表导出写 `SensitiveAccessLog`。
4. **服务端校验**：报名窗口、"是否本人项目"、审核状态流转全部在接口层校验，前端隐藏按钮不作为安全手段。
5. **审计**：写操作与敏感读取均落 `AuditLog`。
6. **盖章件不外泄**：物理目录在 `storage/sealed`（`public/` 之外），**只能经鉴权接口下载**，静态直链不可达；组队成员手机号/邮箱仅帖子作者与已接受成员可见。
7. **登录限流**：同一手机号 5 次 / 同一 IP 20 次每 15 分钟（只计失败，成功登录清空），超限返回 429。
8. **安全响应头**：`X-Frame-Options` / `X-Content-Type-Options` / `Referrer-Policy` / `Permissions-Policy`；生产环境追加 HSTS。**未启用 CSP**（Next 内联脚本会被拦，需配套 nonce 才可开）。
9. **健康检查**：`GET /api/health` 返回 `{status, db, ts}`，数据库不可达时 503，供监控探活。

### 公开仓库注意事项（部署到公网前必读）

本项目仓库含演示数据与操作文档，**若仓库为 public，以下信息即公开**：

| 项 | 位置 | 缓解方式 |
|---|---|---|
| 演示账号统一弱口令 `123456` | `prisma/seed.ts`、`prisma/demo-accounts.ts`、`demo数据/*.xlsx` | 上线前重置密码，或先不对外开放站点 |
| 服务器公网 IP | 已脱敏为 `203.0.113.10` | 真实值只在项目外部文档中 |
| 数据库结构与业务规则 | 全仓库 | 如需保密请将仓库设为 private |

**推荐顺序**：仓库转 private → 重置演示账号密码 → 再对外开放访问。

---

## 八、上线部署

**照着 [docs/服务器上线步骤.md](docs/服务器上线步骤.md) 一步步做**，那份是操作手册；[docs/deploy.md](docs/deploy.md) 是原理与完整参考配置。

构建与切换不再手工粘贴 `/root/kesai-deploy.sh`，统一使用仓库内的 [`scripts/deploy-server.sh`](scripts/deploy-server.sh)。

四个最容易出事的点，务必先知道：

1. **数据必须放在仓库外并软链进来**：`.env`、`prisma/dev.db`、`public/uploads`、`storage/sealed`——否则一次部署就丢用户数据
2. **盖章件搬迁必须与 `git pull` 同批**：只上代码 → 老文件 404；只搬文件 → 新上传写回老目录（漏洞照旧）
3. **已有数据的旧库不能直接 `prisma migrate deploy`**：需先 `prisma migrate resolve --applied 20261113000000_init` 登记基线，否则基线会重放撞表
4. **先打通 HTTPS 再验登录**：`next start` 下 `NODE_ENV=production`，Cookie 带 `Secure`，明文 HTTP 会被浏览器拒收，表现为"登录成功但没登进去"

---

## 九、常见问题

**Q：改完代码页面没变化？**
清 `.next` 缓存后重启：`Remove-Item -Recurse -Force .next`。

**Q：数据库想重置？**
`npm.cmd run db:push --force-reset` 后 `npm.cmd run db:seed`（**会清空所有数据**）。

**Q：为什么学生看不到"编辑"按钮？**
报名窗口关闭后不允许自行修改，只能提交变更申请；窗口时间由管理员在赛事主页设置。

**Q：`prisma generate` 报 `EPERM rename query_engine-windows.dll.node`？**
dev 进程占着引擎 DLL，先 `Ctrl+C` 停 dev，再执行 generate。

**Q：弹窗位置错乱 / 遮罩只盖半屏？**
祖先元素上留了终态 `transform`（哪怕 `translateY(0)`）会给 `fixed` 造包含块。入场动画不要保留终态 transform。

**Q：为什么 `npm run build` 在沙箱里报 `spawn EPERM`？**
Next 需要 fork 子进程，受限环境跑不了，需在普通终端执行。
