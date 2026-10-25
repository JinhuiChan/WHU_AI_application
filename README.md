# 高校科创赛事综合管理服务平台

面向高校科创赛事的本地 MVP，包含项目与获奖台账、成员版本回放、Excel 导入、异常核实、数据看板、学院排行、获奖导出、知识库咨询、材料检查和审计日志。

技术栈：Next.js 14.2、React 18、TypeScript strict、Prisma 6、SQLite、Tailwind CSS。包管理器使用 npm。

## 1. 环境要求

- Windows 10/11，推荐使用 Windows 11 + PowerShell。
- Node.js **>= 20**，npm 10。
- 本机执行策略会拦截 `npm.ps1`，因此 npm/npx 命令必须写成 **`npm.cmd` / `npx.cmd`**，不要直接写 `npm` / `npx`。
- 不需要 Docker、Redis、向量数据库或外部字体 CDN。
- 默认保留空 `LLM_BASE_URL`，离线也能使用知识库检索式回答。

检查版本：

```powershell
node --version
npm.cmd --version
```

## 2. 从零启动：三步

> 第一步至第三步均在项目根目录执行。下面的数据库初始化命令只用于**首次空库**；已有 `prisma/dev.db` 的演示环境不要重复执行 seed，否则会清空并重建演示数据。

### 第一步：安装依赖

```powershell
npm.cmd ci
```

### 第二步：配置环境并初始化空库

```powershell
Copy-Item .env.example .env
npx.cmd prisma generate
npm.cmd run db:push
npm.cmd run db:seed
```

打开新建的 `.env`，至少确认：

```dotenv
DATABASE_URL="file:./dev.db"
JWT_SECRET="请替换为本地随机长字符串"
LLM_BASE_URL=""
LLM_API_KEY=""
LLM_MODEL=""
```

`npm.cmd run db:seed` 会清空并重建数据，**仅限首次空库或明确需要重置时执行**。如果只是启动现有项目，完成 `Copy-Item .env.example .env`（已有则跳过）和 `npx.cmd prisma generate` 即可，不要执行 `db:push` / `db:seed`。

### 第三步：构建并启动

```powershell
npm.cmd run build
npm.cmd run start
```

浏览器打开 <http://localhost:3000>。生产服务需要持续运行时请另开终端；停止服务使用 `Ctrl+C`。

本地开发也可使用 `npm.cmd run dev`，但验收优先执行生产构建和 `npm.cmd run start`，避免把开发服务器状态误当作构建结果。

## 3. 测试账号

| 角色 | 手机号 | 密码 | 权限要点 |
|---|---|---|---|
| 管理员 ADMIN | `13800000001` | `123456` | 用户管理、导入、异常处置、审计日志、全部有效获奖 |
| 普通用户 USER | `13800000002` | `123456` | 查询、AI 咨询、材料检查；其他写接口和管理页面受限 |

普通用户只能查看 `PUBLISHED` 获奖。`/api/assistant/ask` 与 `/api/check/material` 是精确白名单，不表示普通用户获得了其他写权限。

## 4. 常用命令

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
npm.cmd run start
```

端口被占用时，例如改用 3001：

```powershell
npm.cmd run start -- --port 3001
```

然后访问 <http://localhost:3001>。

## 5. 目录结构

```text
app/
  (workspace)/       登录后的页面：看板、排行、项目、导入、异常、AI、检查、管理页
  api/               Route Handler 接口，统一返回 { code, message, data }（文件下载除外）
  login/             登录页
components/
  layout/            侧栏、面包屑、用户菜单、风险提示
  data/              看板、排行、AI 与材料检查等交互组件
  projects/          项目成员版本时间线
  admin/             用户、导入、异常管理组件
lib/
  auth*.ts           JWT 与服务端角色校验
  prisma.ts          Prisma Client
  dashboard.ts       KPI、排行、导出查询
  projects.ts        项目列表、详情、版本快照
  import.ts          Excel 校验与事务导入
  anomaly-rules.ts   R1–R6 规则重算
  assistant.ts       知识库检索、赛年降级、可选模型调用
  material-check.ts  PDF/DOCX 内存解析与确定性规则
  audit*.ts          审计写入、查询与分页
prisma/
  schema.prisma      数据模型，禁止在演示验收时临时修改
  dev.db             本地 SQLite 数据库，已被 .gitignore 排除
  seed.ts            初始化脚本，会清库重建，不能随意重复执行
public/samples/      获奖公示示例 Excel
types/               API、项目、看板、导入、AI、材料检查等类型
middleware.ts        登录、管理路径与普通用户写权限控制
DEMO.md              12 步答辩演示脚本
```

## 6. 核心表说明

以 `prisma/schema.prisma` 为准，当前核心模型如下：

| 表 | 用途 |
|---|---|
| `User` | 本地账号、角色、软删除状态 |
| `Competition` | 赛事名称、赛年、等级、系列与主办方 |
| `Project` | 项目名称、学院、赛年、状态与软删除状态 |
| `ProjectAlias` | 项目名称别名、报名编号、团队编号 |
| `TeamMember` | 当前成员、学号、角色、加入与离队时间 |
| `MemberSnapshot` | 成员历史版本 JSON、版本号、变更人与原因 |
| `AwardRecord` | 奖项、状态、证据、核验人与核验时间；同项目同赛事唯一 |
| `Anomaly` | R1–R6 命中、待核实/已处置状态与处置结论 |
| `ImportBatch` | 导入文件、总行数、成功/失败行数与操作人 |
| `DataSource` | 项目、成员、获奖等记录的来源与导入批次 |
| `AuditLog` | 操作人、动作、对象、JSON 详情与时间，只读查询 |
| `KbDocument` | 知识库文件元数据，包括文件名与适用赛年 |
| `KbChunk` | 章节、页码、正文与检索关键词 |

关键约束：

- 项目列表默认过滤 `deletedAt != null` 的记录。
- `AwardRecord` 对 `(projectId, competitionId)` 有唯一约束，防止重复入账。
- `MemberSnapshot` 对 `(projectId, versionNo)` 有唯一约束。
- `Anomaly` 对 `(ruleId, projectId)` 有唯一约束，重算不会重复插入同一命中。
- 写操作使用 `writeAuditLog`；导入写库、批次来源和审计在同一事务中完成。

## 7. 统计口径与折算公式

**得分 = 赛事等级权重 × 奖项权重。**

- 赛事等级：国赛 `10`、省赛 `5`、校赛 `2`。
- 奖项：`S 1.5`、`A 1.2`、`B 1.0`、`C 0.8`、`EXCELLENT（EX）0.5`。
- 示例：国赛 S = `10 × 1.5 = 15`；省赛 A = `5 × 1.2 = 6`。

管理员的看板、学院排行和获奖导出只统计 **`VERIFIED` / `PUBLISHED`**，排除 **`DRAFT` / `VOIDED`**。普通用户仅统计和查看 `PUBLISHED`。

`/api/dashboard/summary`、`/api/dashboard/rankings`、`/api/export/awards.xlsx` 均必须提供有效 `year`。2024 年管理员口径用于验证排除规则：20 条获奖中计入 15 条，排除 3 条 DRAFT 和 2 条 VOIDED。

## 8. AI 咨询与材料检查

- 先检索 `KbChunk.keywords / content / section`，默认直接返回命中段落，不依赖网络或模型。
- 文件名、章节、页码、赛年取自数据库记录，不由模型生成。
- 未指定赛年时优先使用最新赛年的相关命中；指定赛年无命中时，降级到距离最近赛年的最佳命中，并追加：`注：知识库暂无 {请求赛年} 版材料，以上为 {实际赛年} 口径。`
- 所有赛年均无命中时返回赛事办人工咨询话术，`handoff: true`。
- 配置 `LLM_BASE_URL` 和 `LLM_MODEL` 后可使用 OpenAI 兼容接口；接口失败会回退到检索式回答。
- 材料检查仅支持含文本层的 PDF / DOCX，单文件不超过 10MB。原文只在内存中解析，不入库、不落盘，也不发送给模型；审计只记录文件名、大小、类型等元数据。

## 9. 异常规则口径

- R1：同一学号同年出现在至少 3 个 ACTIVE 项目。
- R2：项目当前 LEADER + MEMBER 超过 10 人。
- R3：项目当前 TEACHER 超过 3 人。
- R4：同项目内相同姓名对应不同学号。
- R5：成员加入时间晚于对应获奖记录时间。
- R6：同年、同名项目由不同学院上报，并且当前成员存在相同学号交集。演示数据位于 `/anomalies` 的 R6 分组。

## 10. 常见问题

### `.env` 缺失或配置未生效

现象包括 Prisma 找不到 `DATABASE_URL`、登录时提示未配置 `JWT_SECRET`。执行：

```powershell
Copy-Item .env.example .env
```

检查 `DATABASE_URL` 和 `JWT_SECRET` 后重启服务。`.env` 不提交到 Git；不要把它复制到公开目录。`LLM_BASE_URL` 留空是合法的离线配置。

### 提示 Prisma Client 未生成或初始化失败

安装依赖后、以及主动更新 Prisma 依赖后执行：

```powershell
npx.cmd prisma generate
```

然后重新构建。不要为了修复 Client 问题而随意执行 `db:push` 或 seed。

### 3000 端口被占用

直接换端口，不必终止不明进程：

```powershell
npm.cmd run start -- --port 3001
```

访问地址也要改成 `http://localhost:3001`。

### PowerShell 提示禁止运行 npm.ps1

改用 `npm.cmd` / `npx.cmd`。这是本机执行策略问题，不需要关闭系统安全策略。

## 11. 已知限制

1. 这是单机 SQLite MVP，未实现多实例部署、数据库迁移发布流程或高并发写入保障。
2. 未对接第二课堂、青创珈X 的真实接口；跨平台汇聚以 Excel 导入和模拟数据代替。
3. 未实现报名、网评、评审打分、评委分配、赛事通知聚合、自定义表单和组队招募。
4. AI 检索是关键词 `LIKE` 匹配，不是向量语义检索；知识库当前只有 2026 年 6 篇文档，其他赛年可能只能降级回答或转人工。
5. 外部 OpenAI 兼容模型的可用性取决于网络与服务配置；离线演示只保证本地检索式回答。
6. 扫描图片型 PDF 没有 OCR；加密、损坏或无法提取文本的 PDF/DOCX 会返回校验错误。
7. PDF 页数是文件总页数初检，不能精确扣除封面、目录和附录；DOCX 页数依赖文档元数据，可能缺失或不是最新排版结果。
8. 知识库没有商业计划书字数上下限，字数项只统计并标记“待确认口径”，不会自行编造阈值或给出合规结论。
9. 图表编号检查依赖可提取文本及独立行行首的“图1 / 表1”等格式，复杂排版、图片内文字和正文引用仍需人工复核。
10. 材料原文和检查报告不持久化，刷新页面后本次检查结果不会保留；数据库中的业务数据、异常处置和审计日志会持久化。
11. 示例 Excel 在未重置的情况下重复用于已有数据库时，原本有效的行也会因“同项目同赛事唯一”被标为错误；这是重复入账防护。彩排前执行 `npx.cmd tsx scripts\reset-demo-import.ts` 可清理 IMPORT 产生的获奖、批次和来源记录，恢复为 1 行有效、3 行错误；该脚本不删除 seed 原始获奖、异常、审计、用户、项目或成员。
12. 自建 JWT 登录未接入学校统一身份认证，未提供短信找回、验证码或登录限流。
13. 审计日志当前提供只读列表、筛选和分页，没有归档、导出或保留周期管理。
14. 仓库未配置单元测试框架；目前依靠 TypeScript、ESLint、生产构建和真实页面/接口走查验证。
