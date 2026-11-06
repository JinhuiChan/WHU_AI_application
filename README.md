# 高校科创赛事报名与审核平台

> 面向校级赛事管理部门：把科创赛事的**报名、审核、变更、盖章归档、导出、统计**收在一个系统里，替代第二课堂的赛事报名环节。

> **测试同学先看**：[演示账号与测试用例](docs/演示账号与测试用例.md)（31 个演示账号 + 21 条测试用例；运行步骤见下方快速开始）。

## 一、这个系统解决什么

| 现在的痛点 | 系统里的对应能力 |
|---|---|
| 报名靠发 Excel，学院反复退 | 三赛道在线报名表单，提交前预检，学院可直接驳回并说明理由 |
| 改了人、改了名，事后查不清 | 每一次变更留痕（谁、何时、旧值、新值），支持版本回看 |
| 报名表要签字盖章，纸质表容易丢 | 导出可打印正式表 → 线下签章 → 扫描件回传归档 → 全队可下载最终版 |
| 上级要数据，靠人工汇总 | 27 字段数据表可勾选字段与顺序导出；统计看板按学院/赛道/阶段/奖项聚合 |
| 赛事规则年年改 | 赛道 / 组别 / 类别 / 命题走字典配置，改配置不改代码 |

二期预留：盖章件 OCR 一致性审查、赛事规则 AI 问答、国创平台字段映射、智慧珞珈统一认证。

## 二、技术栈

- Next.js 14.2（App Router）+ TypeScript strict + TailwindCSS
- Prisma 6 + SQLite（可平滑换 PostgreSQL）
- 认证：jose（JWT，HttpOnly Cookie）+ bcryptjs
- 表格 / 导入导出：xlsx；文档解析：mammoth（docx）、pdf-parse（pdf）
- 图表：recharts
- 敏感字段：AES-256-GCM 应用层加密

## 三、快速开始

> 所有命令都在**仓库根目录**执行（`package.json`、`prisma/` 与 `app/` 同级）；`app/` 只是 Next.js 的源码目录，**不要 `cd app`**。

### 第一次打开（初始化，整套只做一次）

```powershell
# 1) 一键初始化：首次自动 npm install → 生成 .env → 生成 Prisma Client → 建表 → 空库灌演示数据
npm.cmd run setup

# 2) 启动（以后每次打开都从这一步开始）
npm.cmd run dev                              # 浏览器打开 http://localhost:3000
```

> `npm run setup` 可重复执行：`node_modules` 已存在就不重装，数据库有数据就不 seed（不会清库）；需要 Node.js ≥ 20.6。
> 手动初始化（等价，可选）：`npm.cmd install` → `Copy-Item .env.example .env` → `npm.cmd run db:generate` → `npm.cmd run db:push` → `npm.cmd run db:seed`。
> `FIELD_ENCRYPTION_KEY` 一旦录入真实身份证/银行卡就不要再换，否则历史密文解不开。

### 以后每次打开（日常，只要两行）

```powershell
cd "<仓库根目录>"   # 例如 C:\Users\你\Desktop\WHU_AI_application
npm.cmd run dev                             # 浏览器打开 http://localhost:3000
```

- 改代码自动热更新，不用重启；`Ctrl+C` 或关掉终端即停止服务。
- `node_modules`、`.env`、`prisma/dev.db` 都在本地且不入库，**重启电脑/重启服务都不会丢**，不需要重跑上面的初始化命令。

### 常用操作速查

| 场景 | 命令 |
|---|---|
| 日常启动 | `cd <仓库根目录>` 后 `npm.cmd run dev` |
| 停止 / 重启服务 | `Ctrl+C` 停止；再执行 `npm.cmd run dev` |
| 端口 3000 被占用 | `npm.cmd run dev -- -p 3001` |
| 拉队友的新代码 | `git pull`；`package.json` / `package-lock.json` 有变化时补 `npm.cmd install`；`prisma/schema.prisma` 有变化时补 `npm.cmd run db:generate` + `npm.cmd run db:push` |
| 演示数据乱了想重置 | `npm.cmd run db:push --force-reset`，再 `npm.cmd run db:seed`（会清空数据） |
| 改完代码页面没变化 | `Remove-Item -Recurse -Force .next`，再 `npm.cmd run dev` |

> 踩坑提示：`npm install` 写成不带 `.cmd` 的 `npm` 会报“禁止运行脚本”；缺少 `.env` 时 `db:push` 会报 `Environment variable not found: DATABASE_URL`。
> 数据库文件为 `prisma/dev.db`，与 `.env` 一样已被 `.gitignore` 忽略，不入库。

## 四、测试账号

| 角色      | 手机号         | 密码     | 说明                   |
| ------- | ----------- | ------ | -------------------- |
| 管理员     | 13800000001 | 123456 | 赛事管理、报名审核、变更审批、导出、看板 |
| 学生（负责人） | 13800010001 | 123456 | 报名、我的项目、上传盖章件、发起变更   |
| 指导教师    | 13800000201 | 123456 | 确认指导关系               |

学生也可在 `/register` 自助注册（学号 + 手机号）。

## 五、演示数据说明

- 3 个赛事：中国国际大学生创新大赛、挑战杯、百珈争创
- 18 个项目，覆盖 5 种审核状态，其中含 **2 个已驳回**、**1 条待确认指导关系**、**1 个未上传盖章件**
- 报名窗口：国创赛 **开放中**（当场可报名）；挑战杯 / 百珈争创 **已关闭**（用于演示变更申请与窗口锁定）

## 六、主要路由

| 路由 | 角色 | 作用 |
|---|---|---|
| `/apply`、`/my`、`/my/[id]` | 学生 | 报名表单、我的项目、项目详情与变更申请 |
| `/teacher` | 老师 | 我指导的项目、确认指导关系 |
| `/review`、`/review/[id]`、`/review/changes` | 管理员 | 27 列审核工作台、项目详情、变更审批 |
| `/competitions`、`/competitions/[id]` | 全部 | 赛事列表与赛事主页（含通知、规程、报名入口） |
| `/dashboard` | 全部 | 统计看板（学生只见本人数据） |
| `/admin/awards`、`/import` | 管理员 | 奖项录入、数据导入 |
| `/admin/users`、`/admin/logs` | 管理员 | 用户管理、审计日志 |

## 七、安全设计要点

1. **敏感字段加密**：身份证、银行卡在入库前加密，页面默认只显示后四位。
2. **导出分级**：报名表默认脱敏；`full=1` 才含完整信息，且仅限负责人/二·三负责人/管理员，并写导出记录与水印。
3. **服务端校验**：报名窗口、"是否本人项目"、审核状态流转全部在接口层校验，前端隐藏按钮不作为安全手段。
4. **审计**：写操作与敏感读取均落 `AuditLog` / `SensitiveAccessLog`。

## 八、常见问题

**Q：改完代码页面没变化？**
清 `.next` 缓存后重启：`Remove-Item -Recurse -Force .next`。

**Q：数据库想重置？**
见上面「常用操作速查」：`npm.cmd run db:push --force-reset` 后 `npx.cmd tsx --env-file=.env prisma/seed.ts`（会清空所有数据）。

**Q：端口被占用？**
`npm.cmd run dev -- -p 3001`。

**Q：为什么学生看不到"编辑"按钮？**
报名窗口关闭后不允许自行修改，只能提交变更申请；窗口时间在赛事主页由管理员设置。
