# 提示词（V3）：让 AI 一次性生成可运行的 MVP

> 用法：把「=== 提示词开始 ===」到「=== 提示词结束 ===」之间全部内容粘贴给具备代码执行能力的 AI（Kimi CLI / Claude Code / Cursor 等）。
> 若目标 AI 支持读文件，可直接让它读本文件并说："读取本文档，按『阶段 0』执行，完成后停下等我确认。"
> 版本：V3.0（新增停止条件与输出纪律、锁定依赖版本、补 Windows 环境与常见坑）｜配套主文档：《PRD-高校科创赛事综合管理服务平台.md》

---

=== 提示词开始 ===

# 角色

你是一名资深全栈工程师。你的任务是为「高校科创赛事综合管理服务平台」构建一个**可本地运行、可当场演示的 MVP**。你要交付的是能跑起来的代码，不是设计文档，也不是代码片段。

# 项目来源（榜题原文，需求以此为准）

> **题目：高校科创赛事综合管理服务平台**
> 赛题方向：AI + 管理｜发榜单位：机关与直属单位｜负责老师：刘老师｜联系方式：027-68775751
>
> **目前的做法**：科创赛事（如中国国际大学生创新大赛、"挑战杯"、"百珈争创"等）通知与时间节点、团队在校赛/省赛/国赛的人员变更与获奖台账、各类统计表单、赛事数据看板、作品提交前的规范性检查与打磨反馈——都还没有平台支撑，仍靠群通知、Excel 表格和人工比对；而且报名、评审、招募的数据分落在另外两套系统和线下表格里，缺少一个能统一聚合并用 AI 赋能的平台。
>
> **最费时费力或最容易出错的环节**：一是数据分散，报名在第二课堂平台、招募在青创珈X 平台、获奖与统计在 Excel，想看清一个项目从报名到获奖的全貌要跨系统比来比去；二是获奖统计最容易出错——同一个项目在校赛、省赛、国赛的团队成员和指导老师常有调整，人工比对常常对不上；三是赛事规则、评分细则、商业计划书和路演 PPT 要点被反复询问，老师和学长姐要一遍遍回答；四是作品提交前的格式与内容一致性核验全靠人工，耗时长、口径还不一致。
>
> **希望 AI 帮助做什么**：一个 AI 智能综合聚合平台——在不重复建设的前提下，对接学校已有的第二课堂综合平台（报名、网评）和青创珈X 平台（组队招募），把跨平台的赛事数据统一聚合起来，并补齐目前没有平台支撑的环节（赛事通知与时间节点聚合、获奖统计与人员变更追溯、自定义表单管理与一键导出、赛事数据可视化看板）；同时以 AI 作为中枢，提供站内咨询（赛事规则、各比赛评分细则、商业计划书撰写要点、路演 PPT 内容要点）、作品一键内容一致性与格式审查、以及对照评分细则的薄弱得分点与缺失板块诊断。
>
> **做成后能产生什么价值**：已有平台的能力尽量继续用、不重复投入，新增能力补齐空白；分散在两套平台和线下表格里的数据被统一聚合，一个项目从报名到获奖的全貌一屏可见；获奖台账自动汇总、人员变更可追溯；重复性咨询由 AI 承接，把老师和学长的时间释放出来；作品在提交前就拿到规范性与得分点反馈，参赛材料整体质量提升。
>
> **希望揭榜团队交付什么**：智能体、工作台、数据看板。可提供：数据、系统接口、技术指导。

# 本次 MVP 的边界（重要）

榜题要求里有一部分**本版不做**，做了就是浪费：

| 榜题要求 | 本版处理 |
|---|---|
| 获奖统计与人员变更追溯 | ✅ 做（核心） |
| 赛事数据可视化看板 | ✅ 做（核心） |
| AI 站内咨询、作品格式审查与薄弱点诊断 | ✅ 做（核心，且必须有出处） |
| 赛事通知与时间节点聚合 | ⏸ 不做（二期） |
| 自定义表单管理与一键导出 | ⏸ 只做获奖汇总 Excel 导出 |
| 对接第二课堂 / 青创珈X 真实接口 | ⏸ 用"导入 Excel + 模拟数据"替代，接口留适配层 |
| 报名、网评、评审打分、评委分配 | ⛔ 一律不做 |

# 工作目录约定

- **当前工作目录就是项目根目录**，代码直接写在这里，不要新建 `<项目名>/` 子目录。
- 如果目录非空，先列出已有文件再决定，不要覆盖用户已有文档。
- 包管理器**统一用 pnpm**，不得混用 npm / yarn。
- Node 版本要求 `>=20`，写入 `package.json` 的 `engines` 字段。

# 技术栈（固定，不得自行更换）

- 全栈：Next.js 14+（App Router）+ TypeScript（strict）
- 样式：TailwindCSS + shadcn/ui 风格组件（可手写，不必强装 CLI）
- 图表：`recharts`
- ORM / 库：Prisma + SQLite（`file:./dev.db`）
- 认证：自建账号，JWT 存 HttpOnly Cookie，角色仅 `ADMIN` / `USER`
- Excel：`xlsx`；PDF 解析：`pdf-parse`；DOCX 解析：`mammoth`
- 图标：`lucide-react`（**本地依赖，禁止 CDN / 外链字体**，保证断网可用）
- **不要引入 Docker、Redis、消息队列、向量数据库**等额外基础设施

**依赖版本锁定与环境（这是最容易"卡住"的地方）**

- Next.js 锁 **`14.2.x`**，不要用 15（React 19 会连带出兼容问题）；React 18.3。
- 密码哈希用 **`bcryptjs`**（纯 JS）；**不要用 `bcrypt`**（原生模块，Windows 上编译失败会让安装卡死）。
- JWT 用 **`jose`**；不要用 `jsonwebtoken`（Edge Runtime 里会直接报错）。
- PDF 解析用 `pdf-parse@1.1.1`；若安装或运行报错，立刻改 **`unpdf`**，不要原样重试超过 2 次。
- 运行环境是 **Windows 11 + PowerShell**：不要用 `rm -rf`、`cp` 等 GNU 命令；删文件用 `Remove-Item` 或 Node 脚本。
- 默认端口 3000，被占用就换 3001 并写入 README。

# 硬性约束（不可违反）

1. **中文界面**：所有用户可见文案为简体中文；代码注释中文；变量名英文。
2. **数据持久化**：重启服务、刷新页面后数据不丢；seed 脚本可重复执行（先清表再写）。
3. **AI 回答必须带出处**：格式 `【出处：文件名 · 章节 · 适用赛年】`。检索未命中时，固定回答："该问题暂无权威口径，建议联系赛事办（027-68775751）。" **严禁编造规则、日期、页数。**
4. **禁止出现分数、名次、通过率预测**。材料检查结论统一标注"仅供参考，非评审结论"。
5. **权限必须在服务端校验**，不得只在前端隐藏入口。
6. **禁止整表拉取到内存再计算统计**，聚合查询用 Prisma `groupBy` 或原生 SQL。
7. **禁止使用 `any` 逃逸类型检查**（确实需要时写 `unknown` 并做收窄）。

# 数据模型（Prisma Schema 必须包含以下字段与约束）

```
User            id, phone @unique, passwordHash, name, role(ADMIN|USER), externalId?, createdAt, deletedAt?
Competition     id, name, level(SCHOOL|PROVINCE|NATIONAL), seriesId, year Int, organizer?, createdAt
                @@unique([name, year])
Project         id, name, college, year Int, status(ACTIVE|WITHDRAWN), createdAt, deletedAt?
                @@index([year, college])
ProjectAlias    id, projectId, aliasType(NAME|REG_NO|TEAM_NO), aliasValue
                @@unique([aliasType, aliasValue])
TeamMember      id, projectId, personNo(学号), name, role(LEADER|MEMBER|TEACHER), joinedAt, leftAt?
                @@index([personNo])
AwardRecord     id, projectId, competitionId, awardLevel(S|A|B|C|EXCELLENT),
                evidenceType(URL|FILE), evidenceRef, verifiedBy, verifiedAt,
                status(DRAFT|VERIFIED|PUBLISHED|VOIDED), voidReason?, createdAt
                @@unique([projectId, competitionId])          // 同项目同赛事只能一条
MemberSnapshot  id, projectId, versionNo Int, membersJson, changedBy, changedAt, reason?
                @@unique([projectId, versionNo])
Anomaly         id, ruleId, projectId, description, status(PENDING|RESOLVED),
                resolution(CONFIRMED|FIXED|UNTRACEABLE)?, resolvedBy?, resolvedAt?
ImportBatch     id, fileName, sourceType(IMPORT|MANUAL), totalRows, successRows,
                failureRows, importedBy, createdAt
DataSource      id, recordType, recordId, sourceType(API|IMPORT|MANUAL), sourceRef, batchId, syncedAt
AuditLog        id, actorId, action, targetType, targetId, detail(JSON string), createdAt
KbDocument      id, title, fileName, year Int, uploadedBy, createdAt
KbChunk         id, documentId, section, page Int?, content, keywords
```

# 异常规则（必须实现，命中写入 Anomaly，同一 ruleId+projectId 不重复插入）

| ruleId | 名称 | 判定条件 |
|---|---|---|
| R1 | 一人多队 | 同一 `personNo` 在同一 `year` 出现在 ≥3 个 ACTIVE 项目中 |
| R2 | 成员数超限 | 单项目 LEADER+MEMBER 人数 > 10 |
| R3 | 指导老师超编 | 单项目 TEACHER 人数 > 3 |
| R4 | 同名不同号 | 同一 projectId 内 name 相同但 personNo 不同 |
| R5 | 获奖后换人 | 项目出现 `joinedAt` 晚于对应 `award_record.createdAt` 的成员 |
| R6 | 跨院冲突 | 同 name + 同 year 出现在两个不同 college |

# 页面清单（10 个，全部实现）

| # | 路由 | 要点 |
|---|---|---|
| 1 | `/login` | 手机号+密码；页面提示测试账号 |
| 2 | `/dashboard` | 4 张 KPI 卡（本年参赛项目数/参与人数/获奖数/覆盖学院数，**均可点击下钻**）；近 5 年获奖趋势折线；学院排行前 10 柱状 |
| 3 | `/rankings` | 排行表：学院、折算分、国赛数、省赛数、校赛数；**每行可展开明细**（项目/赛事/奖项/加分） |
| 4 | `/competitions` | 列表：赛年、等级、关键词筛选 |
| 5 | `/competitions/[id]` | 详情 + 获奖名单（含来源、核验人、核验时间列） |
| 6 | `/projects` | 列表：赛年、学院、获奖等级筛选 |
| 7 | `/projects/[id]` | 全貌：基本信息、获奖、当前成员、**版本时间线可展开回放** |
| 8 | `/import` | 三步向导：上传 → 逐行校验（不落库）→ 确认入库（事务） |
| 9 | `/anomalies` | 待核实池：按规则分组，填处置结论，顶部显示处置率 |
| 10 | `/assistant` + `/check` | AI 咨询（回答下方渲染出处卡片）；材料检查（上传 PDF/DOCX → ✓/✗ 清单 + 依据 + 建议） |

另需 `/admin/users`（用户列表、审核、改角色）与 `/admin/logs`（审计日志，可按操作人筛选）。全局左侧 240px 导航、面包屑、用户菜单与退出。

# 接口清单（统一响应 `{ code, message, data }`）

```
POST   /api/auth/login          POST /api/auth/logout      GET /api/auth/me
GET    /api/dashboard/summary?year=      GET /api/dashboard/rankings?year=
GET    /api/competitions?year=&level=&q=  GET /api/competitions/[id]
GET    /api/projects?year=&college=&level=&q=   GET /api/projects/[id]
POST   /api/import/validate     POST /api/import/commit
GET    /api/anomalies?status=   PATCH /api/anomalies/[id]
GET    /api/export/awards.xlsx?year=
POST   /api/assistant/ask       { question } -> { answer, evidence|null, handoff }
POST   /api/check/material      (multipart) -> { checks:[{item,pass,basis,suggestion}], summary }
GET    /api/admin/users         PATCH /api/admin/users/[id]     GET /api/admin/logs
```

规则：错误码 401 未登录 / 403 无权限 / 422 校验失败 / 409 冲突 / 500 服务端；`USER` 角色对全部写接口返回 403；每个写操作写一条 `AuditLog`。

# 关键业务规则（写错就会被打问号）

1. **获奖记录不可变**：状态变为 `VERIFIED` 后禁止 UPDATE，只能作废（`VOIDED` + 原因）。
2. **结果发布开关**：默认仅 `ADMIN` 可见，`PUBLISHED` 后普通用户可见。
3. **统计口径**：排行与看板只统计 `status IN (VERIFIED, PUBLISHED)`，不含 `DRAFT` / `VOIDED`；必须带 `year` 参数，缺省返回 422。
4. **折算公式**（写入 README，并在排行页 hover 说明）：
   `得分 = 赛事等级权重 × 奖项权重`，其中国赛 10 / 省赛 5 / 校赛 2；S 1.5 / A 1.2 / B 1.0 / C 0.8 / EXCELLENT 0.5。
5. **软删**：所有删除为 `deletedAt` 置值，列表查询默认过滤。

# 种子数据（`prisma/seed.ts`，可重复执行）

- 8 个学院：计算机学院、电子信息学院、机械与动力学院、经济与管理学院、法学院、新闻与传播学院、化学与分子科学学院、遥感信息工程学院
- 3 个赛事系列 × 3 个赛年（2024/2025/2026）= 9 条赛事；系列名用"中国国际大学生创新大赛""挑战杯""百珈争创"
- 120 个项目（每年 40），中文科创风项目名
- 每项目 3–8 名成员（1 名 LEADER、0–2 名 TEACHER），学号 `2023xxxxxx`
- 60 条获奖记录（S 5% / A 20% / B 40% / C 25% / EXCELLENT 10%），其中 3 条 DRAFT、2 条 VOIDED
- ≥6 条人员变更快照（**2 条发生在获奖之后**，用于触发 R5）
- ≥8 条异常（覆盖 R1–R6，状态混合）
- 2 个账号：`13800000001 / 123456`（ADMIN）、`13800000002 / 123456`（USER）
- 6 篇知识库文档（参赛手册、评分细则、管理办法、常见问题、材料模板说明、路演要点），每篇 3–5 章节，**必须覆盖**："商业计划书页数""路演 PPT 时长""团队人数上限""指导教师人数上限"
- 生成示例导入文件 `public/samples/获奖公示模板.xlsx`（含 3 行故意错误）

# AI 模块实现要求

1. **检索优先**：先按关键词在 `KbChunk`（section/keywords/content）中检索，命中后把命中段落 + 元数据交给模型（若配置了 `LLM_BASE_URL`）；未配置模型时，直接用命中段落拼接成"检索式回答"，**仍然带出处**——断网演示必须可用。
2. **出处只能来自元数据**：答案中的文件名、章节、赛年必须取自命中 chunk 的字段，不得由模型生成。
3. **赛年优先**：同问题多赛年命中时，取最大 `year`，并在答案末尾标注"如适用其他赛年请说明"。
4. **材料检查双引擎**：页数、字数、必备章节、图表编号连续性等用规则引擎判定；模型只负责解释与建议。标准章节以知识库文档为准，写死在规则配置里。
5. **风险提示条**：`/assistant` 与 `/check` 页面顶部固定一条："AI 输出仅供参考；材料检查结论不代表任何评分或名次。"

# 界面风格

现代 SaaS：白底、卡片布局、左侧 240px 侧栏、顶部面包屑；主色 `#2563EB`，成功 `#16A34A`，警告 `#F59E0B`，危险 `#DC2626`；圆角 8px；表格支持首列冻结与密度切换（紧凑/舒适）；375px 宽度下侧栏折叠为底部标签，`/projects/[id]`、`/assistant`、`/check` 三页移动端优先适配。

# 环境变量（必须提供 `.env.example`）

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me"
LLM_BASE_URL=""        # 留空则走检索式回答，不调用模型
LLM_API_KEY=""
LLM_MODEL=""
```

# 执行方式（分 6 阶段，每阶段结束必须停下汇报）

- **阶段 0**：用**非交互参数**初始化，避免卡在提问上：
  `pnpm create next-app . --ts --app --tailwind --eslint --no-src-dir --import-alias "@/*" --use-pnpm`
  然后安装依赖、写 Prisma schema、跑 `prisma generate`、写 seed 并运行。汇报"数据准备完成，各表记录数"。
  **禁止在本阶段启动 `pnpm dev` 常驻**——常驻进程会占住终端，表现为"程序卡死不动"。
- **阶段 1**：登录 + 全局布局 + 用户管理 + 权限中间件。验证：登录/退出正常；USER 调写接口 403。
- **阶段 2**：赛事、项目列表与全貌（含版本时间线）。验证：能看到成员变更回放。
- **阶段 3**：导入向导 + 异常规则 + 待核实池。验证：示例 Excel 报错行可见；R5 异常可处置。
- **阶段 4**：看板 + 学院排行 + Excel 导出。验证：排行可展开明细；导出文件可打开。
- **阶段 5**：AI 助手 + 材料检查 + 审计日志页。验证：库内问题带出处；库外问题转人工；PDF 能出检查清单。
- **阶段 6**：README（安装/启动/账号/公式/演示步骤）+ 全量自测 + `pnpm build` 通过。

每阶段汇报格式：

```
✅ 阶段 X 完成
- 新增文件：...
- 修改文件：...
- 自检：build 通过 / tsc 通过 / 手动验证：...
- 已知未做：...
- 下一步：阶段 X+1（等待确认）
```

## 输出纪律（直接决定 token 消耗）

1. **不要回显已存在的完整文件内容**。改动用"文件路径 + 改了哪几处 + 为什么"说明即可。
2. 不要复述本任务书，不要重复打印上一阶段的代码。
3. 读取文件先定位再读，**不要整份大文件反复通读**。
4. 每阶段一次做完，避免"写一半 → 自我否定 → 整份重写"的循环。
5. 命令失败：同一条最多重试 **2 次**，第 3 次必须换方案，禁止原样重试。

## 停止条件（命中任一，立即停止并汇报，不要硬扛）

| 条件 | 处理 |
|---|---|
| 同一错误连续出现 3 次未解决 | 停止；输出「阻塞点 + 已尝试方案 + 建议路径」 |
| 某依赖安装失败 2 次 | 停止；换替代方案并说明 |
| 某阶段 15 分钟无任何文件新建或修改 | 停止；汇报当前进度 |
| 需要删除或覆盖非本阶段新建的文件 | 停止；先列出清单并请示 |
| 想引入技术栈之外的基础设施 | 停止；说明理由并请示 |
| `pnpm build` 报错超过 10 条 | 停止；先修到能构建，再谈功能 |

**汇报必须包含**：已完成项、未完成项、阻塞点、下一步最小动作。禁止用"已完成"三个字带过。

若某阶段因时间或依赖卡住：**优先保证 `pnpm build` 通过**，把未完成项写进"已知未做"，不要留下编译不过的代码。

# 最终验收脚本（交付前逐条自测并报告）

1. admin 登录，看板 4 张 KPI 卡有数
2. 排行页展开某学院，看到加分明细
3. 项目列表筛选 2026，进入项目看成员与版本时间线
4. 时间线回放到"省赛版本"，成员与当前不同
5. 导入向导上传示例 Excel，出现 ≥3 行错误提示
6. 选择"仅导入有效行"，提示成功行数，数据库无脏数据
7. 待核实池处置一条异常，处置率上升
8. 导出 2026 获奖汇总 Excel，列头与数据正确
9. 问"商业计划书要写几页"，回答带出处卡片
10. 问"校长是谁"，返回转人工话术，不编造
11. 上传 PDF 做材料检查，出现 ✓/✗ 清单与依据
12. USER 账号访问 `/import`，返回 403 或入口隐藏
13. 断网（或空 `LLM_BASE_URL`）状态下，AI 助手仍能回答库内问题且带出处
14. 重启服务后数据仍在

=== 提示词结束 ===

---

## 本版（V2）改了什么

| 改动 | 原因 |
|---|---|
| 新增**榜题原文**全文 | 让 AI 知道需求来源与评价口径（"智能体、工作台、数据看板"三件交付），避免自由发挥 |
| 新增**边界表**（做/不做） | V1 只用文字描述边界，AI 容易漏读；表格化后不可误解 |
| 页面数由"9"更正为**10** | V1 列了 9 个页面又另加 `/admin/users`，计数与内容不一致 |
| 补 **`/admin/logs`** 审计日志页 | 主 PRD 要求审计留痕，V1 缺页面 |
| 补唯一约束与索引 | `@@unique([projectId, competitionId])` 等，防止重复入账这类致命错误 |
| 补**折算公式具体数值** | V1 只说"可配置"，AI 会随手写系数，导致分数不可解释 |
| 补**统计口径**（排除 DRAFT/VOIDED） | 这是"数字对不上"的最常见来源 |
| 补**离线要求**（禁 CDN、空 LLM 时检索式回答） | 对应主 PRD 的"断网可用"硬指标 |
| 补 `.env.example` 与 `JWT_SECRET` | V1 未定义环境变量，AI 会硬编码密钥 |
| 补"工作目录即根目录""禁 Docker/Redis/向量库" | 防止 AI 自建子目录、引入无法维护的依赖 |
| 补"卡住时优先保证 build 通过" | 一次性生成最常见的死法是留半截编译错误 |
| 补验收脚本第 13、14 条（断网/重启） | 演示现场最致命的两类翻车 |
| **锁定 Next 14.2 / bcryptjs / jose / pdf-parse 版本** | 原生模块与版本漂移是 Windows 上最常见的"卡住"原因 |
| **阶段 0 改非交互参数** | `create-next-app` 会交互提问，无人值守时就是死等 |
| **禁止阶段 0 启动 dev server** | 常驻进程会让 CLI 表面"无响应"，最容易被误判为卡死 |
| **新增输出纪律与停止条件（V3）** | 直接压 token 消耗，并给出可执行的叫停标准 |

## 投喂建议

- **不要一次性要 10 个页面**。按阶段投喂，每阶段结束让它自检并用固定格式汇报。
- 若上下文吃紧：第 1 次给「角色 + 榜题 + 边界 + 技术栈 + 数据模型 + 阶段 0」，之后每次只给「阶段 N 的页面与接口 + 验收点」。
- **AI 生成代码后，第一件事是让后端与数据两位成员 review 权限校验与事务**，不要等第三周才读代码。
