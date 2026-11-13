# PROGRESS

> 交接凭据。**AI 恢复时只读本文件 + `git log --oneline | head -8`，禁止通读 schema.prisma / seed.ts。**

## 2026-11-13 C 阶段 S2 · 登录限流 + Cookie secure

- 新增内存滑动窗口：只计失败、不计尝试；手机号存在的失败按 `login:${phone}` 限 5 次/15 分钟，全部登录失败按 `login-ip:${ip}` 限 20 次/15 分钟；超限返回 429，成功登录清空两个桶。
- 已存在用户的密码错误、待审核、驳回登录写 `LOGIN_FAILED`，actor/target 均为该用户；手机号不存在不写审计，仅记录中间四位脱敏的 `console.warn`，不含密码、哈希或请求头原文。
- Cookie `secure` 按 `x-forwarded-proto` → `request.nextUrl.protocol` → `NODE_ENV` 回退，其余属性不变。
- 验证：`tsc.cmd --noEmit` 0 错误；`npm.cmd run lint` 0 错误 0 警告。未跑 build/dev，未 push。
- 限制：同一 IP 大量并发成功登录不会被误伤；多实例各自计数会分散限流，需改用 Redis 等共享存储。

## 2026-11-13 C 阶段 S1 · 盖章件 URL 收口

- `sealedDirectory` 从 `public/uploads/sealed` 迁至 `storage/sealed`；`.gitignore` 新增 `storage/sealed/`，保留 `storage/imports/`。
- 数据库 `SealedFile.filePath` 保持 `/uploads/sealed/...` 逻辑路径；`resolveSealedFilePath()` 继续剥离前缀并解析到 `sealedDirectory`，不做数据迁移。
- 全文搜索确认不再有 `public` + `uploads` + `sealed` 的物理路径拼接。
- 验证：`tsc.cmd --noEmit` 0 错误；`npm.cmd run lint` 0 错误 0 警告。未跑 build/dev，未 push。
- 部署时需人工将既有盖章件从 `public/uploads/sealed` 一次性搬到 `storage/sealed`。

## 2026-11-13 界面与权限收口（8 个提交，均为用户实测发现的问题）

- `d31162f` **弹窗错乱**：`.page-enter > * > *` 的入场动画用 `both` 保留终态 `transform`，给 `fixed` 弹窗造了包含块，弹窗被"关"进区块、遮罩只盖半屏（新建赛事/驳回/添加成员全中）。改为 `backwards` + `:has([role="dialog"])` 跳过动画。**以后加动画注意：不能给弹窗祖先留非 none 的 transform。**
- `14403d5` **赛事简介出现草稿**：`/intro` 原按身份放行（管理员看全部）。改为一律只展示 `PUBLISHED`，管理员预览走 `/competitions`；页内加说明。
- `ba3eb1c` **奖项录入列全量项目**：保存时校验 `eligibleStatuses`，列表查询却只有 `{deletedAt:null}`。列表改为同一口径（`OR: eligible 状态 / 已有奖项`），258 → 8 条。
- `6f03af8` **用户管理三类分组**：`listManagedUsers(scope)` 按"主角色或附加角色命中"过滤，学生 818 / 教师 53 / 管理员 1；多身份在两个分类重复出现；管理员注册申请（`approvalStatus=PENDING ∧ role=ADMIN`）在侧栏「用户管理」与页内 tab 出红点，有申请时默认落在管理员分类。
- `cad0fbb` **切 tab 列表不刷新**：客户端组件 `useState(initialUsers)` 初值只算一次，`?role=` 变化时实例被复用。加 `key={activeRole}` 强制重挂载。**同类隐患：凡是用 props 初始化 state 的组件都要考虑 key 或同步。**
- `ba2b0e5` **双身份**：后端 `UserRoleLink` 一直支持，但前端只有单主角色下拉。改为三个身份按钮多选 → `UPDATE_ROLES`（按集合同步：主角色保留、其余写附加角色、审计记录前后集合）。
- `732e907` **教师点项目名 403**：`/teacher` 把项目名链到了 `/review/{id}`（管理员审核页）。改链 `/projects/{id}`；教师页准入改按 `roles.includes("TEACHER")`；新增 `/forbidden` 友好页，中间件页面级拒绝统一 `rewrite` 到它。
- `6bc0949` **项目详情显示负责人联系方式**：`TeamMember.phone/email` 已在库（258/258 有手机号），只在教师/管理员视角渲染负责人那一行，学生视角不渲染。

**纪律提醒**：本轮全部改动 `tsc` + `lint` 均 0 错误；**未跑 build、未 push、未改 schema**。

## 2026-11-09 组队：待处理申请红点提醒

- commit `5eecff4`（3 文件 +37/−5）：学生导航新增「我的组队」→ `/my/teams`；`lib/pending.ts` 新增 `getTeamPendingRequests(userId)`（统计我发布的、未下架帖子中 `status=PENDING` 的申请）；`AppShell` 统一产出 `{review, changes, teamRequests}`；`Sidebar` 在「我的组队」右侧渲染红色数字 + 悬停提示「待处理入队申请 N 条」。
- 实测（用户真实数据）：其帖子「校园低碳调度系统…」收到 1 条 PENDING 申请 → 侧栏红点 1；婉拒后归 0。测试帖与申请已删除，仅保留用户自己的 1 帖 1 申请。
- 口径：红点只统计「我作为发帖人收到的待处理申请」，不含我发出的申请；下架帖不计。
- 顺带修（commit `ceb4917`）：获奖 xlsx 的「佐证类型/证据地址」两列不再伪造 `URL`，改为留白；老师时间线补 `{ id: asc }` 第三排序键消除并列不稳定。实测导出：3 行（表头+2 条）、12 列，佐证列为空。

## 2026-11-09 组队/个人中心 · S7 组队接入 AI 问答（S1–S7 全闭环）

- commit `f7745c7` + `73962f1`：新增 `lib/team-context.ts`（144 行）；`lib/assistant.ts` 只加 2 行分流。方案取 **C 混合**：招募规则继续走原知识库，在招队伍**实时查询注入**（静态入库会立刻过期）。
- 意图判定收窄：只认「组队/队友/队伍/招募/缺人/找队友/加队」，并排除「通知/规程/规则/资格/参赛条件/人数上限」等规则类问句。
- 查询条件：`status=RECRUITING` + `expiresAt>now` + `removedBy=null` + 赛事范围；`select` **不含 `contact`**（查询层就没有这个字段）；最多 8 条、摘要 ≤80 字、带「数据时间」；模型按 postIds 白名单二次筛选，失败回退全部，杜绝编造。
- 运行时验证（dev 3000，学生 13800010001）：
  - 「有哪些队伍在招人？」→ 列出测试队、**不含联系方式**、带「截至 2026-11-09」→ PASS
  - 「数学建模怎么报名？」→ 走原知识库澄清、**无队伍信息** → PASS
  - 「不存在的赛事有哪些队伍？」→ 组队专用兜底、未编造 → PASS
  - 测试帖与审计已清理（`TeamPost=0`、`TeamJoinRequest=0`）
- 顺手修：问答页是 `whitespace-pre-wrap` 纯文本，回答里的 markdown 链接会原样显示 → 改为「组队广场（/teams）」纯文本。
- **S1–S7 全部完成**。剩余建议（未做）：导出里「佐证类型/佐证」两列在 Award 口径下无常量值、`showContact` 开关、`Award` 与 `AwardRecord` 长期统一、prisma 补 migrations 基线。

## 2026-11-09 组队/个人中心 · 收尾三项（⑬ 获奖口径 / ⑭ 多角色主页 / ⑯ 时间线去重）

- ⑬ `listAwardExportRows` 单独改读 `Award`，函数签名与旧返回键保留，`status` 固定为 `PUBLISHED`；2026 年 ADMIN 直接调用实测 2 条。兼容风险：`Award` 无旧证据/核验字段，导出适配值为证据类型 `URL`、证据地址空、核验时间取 `updatedAt`、核验人取录奖人，不代表新增核验记录。
- ⑭ `/u/[id]` 合并主角色与 `extraRoles`，学生/老师记录及各自获奖段独立查询、独立受 `showRecords` / `showAwards` 控制，资料区也同时展示两类信息。风险：双角色按身份分别查询和展示，同一项目若同时关联两种身份会在各自区段出现，不做跨身份合并。
- ⑯ 老师记录沿用 `confirmedAt` / `createdAt` 降序，按 `projectId` 保留首条并以项目 ID 渲染 key；单位/职称仍从全部记录取最近非空值。风险：两级时间完全相同的重复行未额外定义第三排序键。
- 验证：`npm run typecheck`、`npm run lint` 通过；只改 `lib/dashboard.ts`、`app/(workspace)/u/[id]/page.tsx`、本文件，未动导出路由、statistics、schema、依赖或登录页。
- 数据验收边界：当前库无学生+老师双角色账号，也无同项目重复 `CONFIRMED` 指导关系，未造测试数据，因此这两类 UI 分支未做真实数据 HTTP 验收。
- 下一步：S7 组队接入 AI 问答。

## 2026-11-08 组队/个人中心 · S5 个人中心二期（简介/技能/可见性开关）

- commit `cc05bfa`（5 文件，+299/−12）：`User` 追加 `bio` / `avatarUrl` / `skills` / `showRecords` / `showAwards` 五个字段（`prisma validate` 通过、`db:push` 已同步）；新增 `PATCH /api/profile` 与 `components/profile/profile-form.tsx`；`/profile` 挂表单；`/u/[id]` 加简介与技能区块，并按开关**在查询层短路**。
- 设计取舍：**未加 `showContact`**。它与 S1 定下的「手机号/邮箱永不出现在公开主页」红线冲突，需单独决策；头像只存 URL，不做上传。
- 运行时验证（dev 3000，A=孙嘉禾 / B=周浩然）：简介与技能能存能显示；`showRecords` + `showAwards` 同时关闭后，他人主页的参赛记录段、获奖段、项目名**全部消失**（服务端未查询），重新开启后恢复；`AuditLog.detail` 只有 `{"changedFields":[...]}`，**无简介原文**；测试数据已重置（`dirty users = 0`）。
- 排障记录：Windows 上 `prisma generate` 报 `EPERM rename query_engine-windows.dll.node`，原因是 dev 进程占用 DLL —— 先停 dev 再 generate，然后重启 dev。
- 下一步：收尾三项（⑬ 获奖口径统一、⑭ 多角色主页、⑯ 老师时间线去重）→ 最后 S7 组队接入 AI 问答。

## 2026-11-08 组队/个人中心 · S6 成团 → 报名预填

- commit `2c9c530`（4 文件，+74/−3）：`lib/apply.ts` 新增 `getTeamAcceptedMembers(teamPostId, viewerId)`；`/apply` 读 `teamPostId` 并传 `initialMembers`；`apply-form` 加可选 prop（仅在无 `initialValue` 时生效，编辑已有项目不受影响）；`/teams/[id]` 对作者与已接受成员显示「去报名」。
- **Lead 发现并当场修复越权**：初版 helper 不校验访问者，任意登录学生可用别人的 `teamPostId` 把已接受成员姓名/手机号/邮箱读进报名表。已加守卫：仅帖子作者或 `ACCEPTED` 成员可读，否则返回空数组。
- 运行时验证（dev 3000）：作者能看到成员姓名+手机号；已接受成员可读；**无关学生两者都拿不到**；不带 `teamPostId` 的 `/apply` 行为与改动前一致。
- 未触碰：提交校验、必填规则、`submitProject`、schema、接口。测试数据已清理（`TeamPost=0`、`TeamJoinRequest=0`）。
- 下一步：S5 个人中心二期（`User` 加 6 个可空字段，**需用户批准**）→ 最后 S7 组队接入 AI 问答。

## 2026-11-08 组队/个人中心 · S4 组队前端 4 页

- commit `425f54f`（10 文件）：`/teams`（广场，筛选+卡片+空态+分页）、`/teams/new`（发布表单）、`/teams/[id]`（详情+角色化操作）、`/my/teams`（三个 tab）；组件 `components/teams/{team-form,team-actions,my-teams}.tsx`；改 `sidebar`（学生「组队广场」）、`breadcrumbs`（3 条路由映射）、`status-badge`（新增 `scope="team"`）。
- 分工：作者看「管理申请/关闭招募」，他人看「申请加入」，管理员看「下架」；配色仍走 `StatusBadge`，页面内无自写状态配色（只有错误/警示条用红/琥珀底）。
- Lead HTTP 验收（dev 3000）：`/teams`、`/teams/new`、`/teams/[id]`、`/my/teams` 均 200 且渲染出真实数据；角色化视图三态正确（B 学生看到「申请加入」、申请 201、管理员看到「下架」）。测试数据已清理（`TeamPost=0`、`TeamJoinRequest=0`）。
- 纪律偏差：本阶段 7 个文件共 **1231 行**，超行预算（700）约 76%；验收时按"能跑通"放行，但 S5/S6 必须收敛到预算内。
- 下一步：S5 个人中心二期（`User` 加 6 个可空字段，**需用户批准**）。

## 2026-11-08 组队/个人中心 · S2 schema + S3 后端接口

- S2（commit `31a7c09`）：新增 `TeamPost`、`TeamJoinRequest` + `TeamPostStatus`/`TeamJoinStatus` 两个枚举，`schema.prisma` **+66 行、0 删除**；`prisma validate` 通过；用户执行 `db:push` + `db:generate` 后库里 32 表、两新表 0 行，`User` 872 / `Project` 258 未变。改前已备份 `tmp/dev.db.before-s2.bak`。
- S3（commit `bffc5b6`）：6 个路由（列表/详情+编辑+关闭+下架/申请/申请列表/审批/我的组队）+ `lib/presentation.ts` 5 条审计中文，共 701 行。发布/申请限学生，关帖/审批限作者或管理员，全部走 `$transaction` + `AuditLog`。
- **Lead 独立 HTTP 补测**（dev 3000，学生 A/B + 管理员）全绿：
  - `403` 非学生发帖；`422` 申请自己的帖；`409` 重复申请；`403` 非作者审批；`403` 非作者看申请列表
  - `201` 建帖；`200` 详情；接受后 `currentCount=2`
  - `404` 下架不存在的 id；`200` 管理员下架；`409` 重复下架；`404` 下架后非管理员看详情；`200` 管理员仍可见
  - 测试数据已清理：`TeamPost=0`、`TeamJoinRequest=0`、测试审计已删
- 排障记录两条（避免重复踩）：
  1. `.next` 缓存损坏（`vendor-chunks/bcryptjs.js` ENOENT）会让**动态路由整个 500 且返回体为空**，`Remove-Item .next` 后重启即恢复；不是代码问题。
  2. PowerShell 里 `'{"a":1}' | ConvertTo-Json` 会二次转义成 JSON 字符串，服务端判 422；测试脚本必须直接把 JSON 文本写进请求体。
- 下一步：S4 组队前端 4 页（广场/发布/详情/我的组队）。

## 2026-11-08 组队/个人中心 · S1 个人中心只读页（Kimi 执行，Lead 验收）

- commit `9786b36`（5 文件，+386/−1）：新增 `/u/[id]` 公开主页、`/profile` 我的资料（只读）；改 `breadcrumbs.tsx`（补 `/profile`、`/u/` 映射）、`sidebar.tsx`（学生/老师导航加「个人中心」）、`user-menu.tsx`（加「个人中心」链接）。
- 复用：`StatusBadge` / `EmptyState` / `Button`+`ButtonArrow` / `BreadcrumbTitle` / `formatDate` / `awardWhereForRole`；无新依赖、未动 `prisma`/`lib`/`app/api`、无 mock 数据。
- 口径：学生记录排除 `DRAFT`/`REJECTED`/`WITHDRAWN`；老师仅 `CONFIRMED`；学号只显示后 4 位；手机/邮箱/身份证/银行卡不查询、不渲染；他人访问无编辑入口。
- 验收：Lead 独立复跑 `tsc --noEmit`、`next lint` 均 0 错误；`npm run build` 通过（用户终端，路由表含 `/profile`、`/u/[id]`），工作区干净。
- 遗留（已记入 Kimi 提示词第 4 节）：⑬ 获奖口径四处不同源；⑭ 主页按主角色判定，多身份账号信息不全；⑮ 获奖按查看者角色过滤；⑯ 老师时间线可能重复。
- 修正（同日）：`/u/[id]` 获奖查询由 `AwardRecord` 改为 `Award`（与 `lib/statistics.ts:86` 看板同源），移除状态徽章与 `awardWhereForRole` 过滤；`AwardRecord` 当前 0 行、`Award` 2 行，`lib/admin-awards.ts:110` 只 `award.upsert` 不写 `AwardRecord` → ⑬ 结论坐实，需另开 PR 统一四处口径。⑮ 随本次改口径自然消解。
- 下一步：S2 组队数据模型（`TeamPost` + `TeamJoinRequest`），**需用户批准 schema 变更**，在新会话执行。

## 2026-11-08 本地集成：feat/ui-polish + pr-4（统一数据源问答）

- 集成分支 `integration/ui-polish-qa`，基于 `jinhui/main c2116ef`：先合 `feat/ui-polish`（0 冲突），再合 `pr-4 / feat/knowledge-qa 2015398`。
- pr-4 带来的能力：问答不再单独维护资料，直接读赛事配置 + 通知/规程附件；全平台默认范围、候选澄清、配置类直答不调模型、附件自动解析/索引/替换、引用校验、学生禁止管理、旧知识接口 410。
- 冲突解决（5 个文件）：
  - `assistant/page.tsx`、`assistant-chat.tsx` 采用 pr-4 能力，外壳与按钮统一为 ui-polish 风格；
  - `competitions/[id]/page.tsx` 同时保留返回筛选参数与 `syncPendingAttachments`；
  - `competition-management.tsx` 以 ui-polish 布局为底，补「问答状态 / 重新解析 / 完整替换旧版」；
  - `login-form.tsx` 保留 ui-polish 输入体验 + pr-4 身份复核（`window.location.replace` 重建客户端缓存）。
- 集成修复：
  - **重定向死循环**：`db:seed` 重建账号后旧 JWT 仍有效，页面查库失败跳 `/login`，middleware 又踢回 `/dashboard`。改为 middleware 不再凭 JWT 重定向登录页，由登录页 `getActiveUser()` 决定。
  - 无效 `competitionId` 因 `(workspace)/loading.tsx` 流式渲染返回 200：页面校验保留，回归脚本改为「200/404 均可，但内容必须是 404 页」。
  - 侧栏删除重复「AI 助手」入口，统一为单一「赛事 AI 问答」板块（页面用 ui-polish 外壳 + pr-4 能力）。
- schema：`CompetitionAttachment` 新增 `knowledgeStatus / knowledgeError / knowledgeIndexedAt / replacesAttachmentId`，`KbDocument` 扩展；已备份 `tmp/dev.db.before-integration.bak` 后 `db push`。
- 验证：`tsc --noEmit`、`next lint`、`npm run build` 通过；`scripts/verify-platform-assistant.cjs` 5 组 PASS（含澄清、配置直答、附件解析/替换、权限、下架失效），模型协议调用 13 次。
- P3 回归（seed + demo:all 大数据两轮）：
  - 基础：草稿学生不可见、发布可见、窗口「报名中」、下架隐藏；审核卡片/展开、获奖导出（管理员 200 xlsx、学生 403）、报名页「未上传」提示、问答单板块、配置类问答 `mode=configuration` 且返回来源、详情问答状态/替换入口、学生知识接口 403。
  - 大数据（872 账号 / 258 项目）：800 学生账号登录、「我的项目」、审核 258 条分页、看板、获奖导出（2 条仅已录奖项）、抽样导入项目详情、教师端均正常；dev 热态耗时约 155–289ms/页，配置问答约 151ms。
- 已知取舍：`(workspace)/loading.tsx` 的 Suspense 流式渲染下，`notFound()` 页面内容正确但 HTTP 状态为 200（草稿/下架详情、无效问答赛事）；尝试 `generateMetadata` 提前校验也无法改变状态码，已回退，保留骨架屏与 404 内容。

## 2026-11-06 获奖名单导出 + 审核列表卡片化

- 获奖名单导出：`/admin/awards` 右上角新增「导出获奖名单」按钮，链接自动带当前筛选（赛事/学院/奖项等级）。
  - 新接口 `GET /api/export/awards-list`：仅 ADMIN，xlsx，列为序号/赛年/赛事/等级/赛道/项目/学院/负责人/学号/指导教师/奖项/获奖时间；只含已录奖项的项目；写审计 `EXPORT_CREATED`。
  - 实测：管理员导出 2 条（金奖/铜奖），`level=GOLD` 只剩 1 条，学生访问 403。
- 审核列表改版：`components/review/review-workbench.tsx` 去掉 5600px 的 27 列表格，改为摘要卡片 + 「展开信息」。
  - 卡头：项目名、状态、未确认指导关系标记、赛事/赛道、负责人、申报单位、提交时间、提交次数/批次，以及展开/详情/通过/驳回按钮。
  - 展开后按赛事详情页风格分组展示：报名信息、负责人信息、作品信息、指导老师、团队成员。
  - 保留全选/批量通过驳回、红色异常卡片、分页与导出/打包入口。
- 复验：`tsc --noEmit`、`next lint` 通过；dev 渲染确认卡片与展开按钮存在、27 列表头已移除。

## 2026-11-06 赛事发布/下架 + 报名开关修复

- 根因：管理员「报名设置」的复选框语义是 `勾选=开放报名`，但新建窗口默认不勾 → 保存后 `TimeWindow.enabled=false`，学生端恒显「报名未开放」；时间窗本身无误。
- 报名开关：新建窗口默认 `enabled=true`；文案改为「开放报名（勾选后学生才可报名）」并加学生端状态提示。
- 发布/下架：`Competition.publishStatus`（早已存在但全代码未使用）正式启用。
  - 新建赛事默认 `DRAFT`；详情页新增「发布状态」区块 + 发布/下架按钮（下架二次确认）；发布前要求至少 1 个赛道。
  - 新增 `POST /api/admin/competitions/[id]/publish`（action=PUBLISH/WITHDRAWN），审计 `COMPETITION_PUBLISHED` / `COMPETITION_WITHDRAWN`。
  - 管理员列表新增「发布状态」列与状态筛选（`?publishStatus=`）。
- 学生端不可绕过：列表只查 `PUBLISHED`；草稿/下架详情 404；`/apply?competitionId=` 重定向；`saveDraft`/`submitProject` 接口层校验 `publishStatus`（403）。
- 复验：`tsc --noEmit`、`next lint`、`npm run build` 通过；HTTP 实测：草稿学生不可见 → 发布可见 → 设窗口显示「报名中」→ 下架隐藏且详情 404，测试赛事已删除。
- 「发布状态」「危险操作」两个区块移到赛事详情页最底部（获奖名单之后），避免管理员误触。

## 2026-11-03 发布记录

- 隐私扫描（当前跟踪树 + 本地全部提交历史）：**无** `.env`、`prisma/dev.db`、`public/uploads/`、私钥、API Key；仅 `.env.example` 占位示例、`scripts/crypto-selftest.ts` 假密钥与测试账号（138…/123456）。`docs/` 内也只有演示账号与字段说明。
- 已合并远程 `jinhui/main`（含 `483f136 chore: scrub placeholder secrets` 与文档相关提交），合并后 `tsc --noEmit`、`next lint` 通过。
- 已推送 `longjunwwk/WHU_AI_application` 的 `main`：`54599c0..f661637`（本地分支 `fix/2026-11-01-test-findings` 的 17 个修复提交 + 1 个合并提交）。
- **未推送到 `JinhuiChan/WHU_AI_application`**：本机 SSH key 属于 `longjunwwk`，对该仓库无写权限（read 可用）。需 JinhuiChan 加协作者，或用网页从 `longjunwwk/main` 发 PR 合入。

## 2026-11-01 全流程测试修复（分支 `fix/2026-11-01-test-findings`）

测试方式：清空演示数据 → 重建账号 → 按 DEMO 8 环节走查（界面 + 接口 + 数据库三方核对）。
完整问题清单与方案见工作区 `测试问题与修复方案-2026-11-01.md`。

### B1 字典链路（已完成，未动 schema）
- 根因：`DictOption.value` 按赛道内序号生成（C1..Cn/G1..Gn），跨赛道重号；`listOptions` 不按 trackId 过滤；`getLabelMap` 用 `Object.fromEntries` 后写覆盖 → 组别/类别在详情、27 列、导出里随机张冠李戴。
- 新增 `lib/dict-labels.ts`：`loadScopedLabels / trackLabel / globalLabel`，赛道级字段一律按项目 `trackId` 解析，查不到再回退全局。
- 新增 `lib/apply-options.ts`：服务端首屏与 `/api/apply/options` 共用同一套赛道树构造，杜绝两份字典逻辑漂移；全局字典只返回 `trackId IS NULL` 的项。
- 改造 `lib/review.ts`、`lib/apply.ts`、`lib/form-export.ts`、`app/(workspace)/apply/page.tsx`、`app/(workspace)/competitions/[id]/page.tsx` 的 label 解析与字典读取。
- 复验：27 列/详情页/报名表导出均显示「本科生创意组 · 人工智能+」「公益组 · 现代农业」；报名选项按赛道下发；赛事主页按赛道展示组别/类别。
- 结论：**不需要改写库里的 code**——按赛道解析即可消除错乱；后续 B2 在后台新建字典时再用全局唯一 code。

### B2 赛道可配置 + 报名入口/赛事隔离（已完成，未动 schema）
- 新增 `lib/admin-tracks.ts`：赛道增删改查 + 组别/类别覆盖保存。
  - 保存策略：已存在标签保留 `value`（历史项目不动）、新增标签分配下一个 `G/C` 序号、移除的标签只 `enabled=false`（不物理删）。
  - 删除赛道：先删该赛道 DictOption（否则 `onDelete: SetNull` 会洗成全局字典）；有子赛道或有项目引用时返回 409。
- 新增接口：`GET/POST /api/admin/competitions/[id]/tracks`、`PATCH/DELETE /api/admin/tracks/[id]`、`PUT /api/admin/tracks/[id]/options`，均写 AuditLog。
- 新增 `components/admin/track-editor.tsx`，挂到赛事详情页「赛道与组别」（管理员可编辑，学生仍只读）。
- P0-4：删除赛事列表页「我要报名」；`/apply` 必须带 `competitionId`（编辑时取项目所属赛事），否则 307 回 `/competitions`；`/api/apply/options` 支持 `?competitionId=`，客户端请求同步带参，避免锁死后被全量选项覆盖。

### B3 审核前置门槛 + 驳回冻结老师确认（已完成，未动 schema）
- `lib/review.ts` 新增 `assertTeachersConfirmed`：审核**通过**（学院/校级）前必须"有指导老师且全部 `CONFIRMED`"，否则 422 并列出未确认老师姓名；驳回不受限；批量审核复用同一函数，逐条失败不整体回滚。
- `lib/teacher.ts`：项目处于 `REJECTED`/`WITHDRAWN` 时，老师确认/拒绝一律 409「指导关系确认已冻结」。
- 验收（临时开窗→造 3 条项目→删净→恢复窗口）：
  - 无老师 → 422「该项目还没有指导老师…」
  - 有老师未确认 → 422「指导老师尚未确认指导关系：刘敏…」
  - 老师确认后学院/校级两次通过均 200
  - 驳回后老师再确认 → 409「项目已驳回，指导关系确认已冻结」

### B4 角色体系（schema + 后端 + 前端，已 build）
- schema：`UserRoleLink`（userId+role）、`User.approvalStatus/approvedAt/approvedBy`、`Competition.publishStatus`
- 会话 token 带 `roles[]`（旧 token 自动回退单角色）；守卫/middleware/侧栏按角色集合
- 登录校验审核状态；注册支持 学生/老师（教工号）/管理员（PENDING）
- 用户管理：角色可选中学生/指导教师、状态读字段、新增「驳回」、保存角色同步多身份
- 注意：`approvedBy` 存的是**操作人姓名**（便于列表直显）

### B5 体验修复（进行中）
- ✅ 登录页测试账号框删除；上传赛事文件标题默认填文件名；审计动作 25 条中文化
- ✅ 负责人（1/2/3）才能在窗口内编辑，成员只读（服务端 307 兜底）
- ✅ B5-A1（`fix(ui): B5-A1`）：
  - `/projects` 新增「赛事」筛选与「赛事」列；筛选选项只列有项目的赛事，分页保留 `competitionId`。
  - 学生 `/competitions` 表头改「报名截止 / 我的报名」，去系列标识列；截止取 SCHOOL 窗口（与 `submitProject` 口径一致，`startAt` 最新），补报名中/已关闭与状态徽标、立即报名/我的项目入口；管理员表不变。
  - `/review` 顶部 tab「待审核 N / 已审核 / 全部」，默认待审核；待审核=PENDING+COLLEGE_REVIEW，已审核=SCHOOL_FINAL/REJECTED/PROVINCE_ADVANCED/NATIONAL_ADVANCED/WITHDRAWN（DRAFT 只计入全部）；tab 计数为全局值。
  - 口径决定：**导出/打包不受 tab 影响**（tab 仅列表视图），否则默认待审核时导出会 422 无项目。
- ✅ B5-A2（`fix(ui): B5-A2`）：
  - 变更申请待办：`lib/pending.ts` 并发统计「待审核项目 + 待审批变更」；侧栏「报名审核」右侧红底数字（仅 ADMIN 查库）；`/review` 的「变更申请」按钮带角标；`/review/changes` 默认「待审批」，状态下拉加「待审批（学院/校级）/全部状态」，翻页保留状态。
  - 面包屑：路由表补 `/my`、`/apply`、`/teacher`、`/review`、`/review/changes`、`/admin/awards`；详情页统一「首页 > 栏目 > 真实名称」，由页面挂 `<BreadcrumbTitle label={名称}/>`（客户端共享状态，卸载即清空，不引入 Provider）。
  - 时间格式：报名表 xlsx 与数据表「提交时间」统一走 `formatDateTime`（水印里的 ISO 保留作溯源）；数据表「导出信息」页导出时间同样格式化。
  - 打包：zip 内附 `跳过的项目.txt`（UTF-8 BOM + CRLF，逐条「项目名（学院）：未上传最终版盖章件」）；`X-Skipped-Count` 与 ExportRecord 新增 `skippedNames`。
- ✅ B6（`fix(security): B6`）：
  - SensitiveAccessLog 落库（新增 `lib/sensitive-access.ts`）：完整报名表导出写 `REGISTRATION_FORM`（含导出编号、项目、`idCard,bankCard`、原因）；含敏感字段的数据表导出写 `DATASET`（按项目逐条、同一导出编号）。详情页/27 列目前只显示脱敏值，没有「查看完整证件」入口，故仅两条导出路径留痕。
  - 完整报名表下载改为先弹黄色确认条（含完整身份证/银行卡号、带水印并留痕），确认后才请求 `/api/export/form?full=1`；数据表导出保留敏感字段二次确认勾选（不勾则脱敏）。
  - 领款人口径（C 兜底）：全队都没勾选时**服务端默认负责人为领款人**（`resolvePayeeState`）；前端关闭最后一个开关时保持负责人勾选并提示；校验由「必须且只能 1 人」改为「最多 1 人 + 兜底」，草稿保存与提交同一口径。
- ✅ P1-7 / P1-8（`fix(apply): P1-7/P1-8`）：
  - 单位字典：按武大官网「院系设置」（`https://www.whu.edu.cn/jgsz/yxsz.htm`，7 学部）写入 `TRAINING_UNIT`/`APPLICATION_UNIT` 各 43 条（trackId 空）。写库前备份 `tmp/db-backup-2026-11-03T08-44-03-before-units.db`（dev.db 未进 git）。
  - `buildApplyOptions` 新增 `dictionaries.units` = 字典 ∪ 用户档案(college/trainingUnit) ∪ 历史项目(申报/培养单位)，去重保序；培养单位/申报单位改为 datalist「可下拉可手填」，旧值「机械与动力学院」等仍可选。
  - 老师检索：`/api/lookup/teacher` 改为取历史指导记录中「最近非空」的 unit/title（原来只取最新一条，最新为空就带不出）；结果行显示「职称未登记」。
  - 添加老师弹窗改逐字段红框校验（工号/姓名/手机号 11 位/学校/单位/职称），替换原来一句笼统提示。
  - 已知限制：无教师人事档案表，从未提交过项目的老师检索不出职称，只能手填；彻底解决需加 `User.title` 或档案表（schema 变更，需单独批准）。
- ✅ 赛事删除（`fix(admin): 误建赛事可删除`）：
  - 新增 `DELETE /api/admin/competitions/[id]`（仅管理员）：有项目报名或奖项记录 → 409 拒绝；否则事务内先删该赛事赛道级字典（防 `SetNull` 洗成全局字典）→ 删赛事（赛道/报名窗口/赛事文件级联）→ 写 `COMPETITION_DELETED` 审计（`presentation.ts` 已补中文）。
  - 列表行「删除」+ 赛事详情「危险操作」卡各加红色二次确认按钮（`components/admin/competition-delete-button.tsx`）。
  - **dev 实测**：误建赛事「122」已由管理员点删除（审计 `9e126d0b`，tracks 0，列表由 2 条变 1 条）；对「中国国际大学生创新大赛」删除 → 409「该赛事已有 2 个项目报名，不能删除」；自测创建+删除 `794ef8ac` 成功且已清理。
  - 未做：有项目赛事的「下架/撤回」隐藏（用 `publishStatus=WITHDRAWN` + 列表过滤），需要时再做。
- ⬜ 未做（测试清单余项）：P2-3 队长导完整件（PRD 允许，需拍板）、P2-7 作品/PPT 真实上传、P2-8 `/my/<id>` 首访 404 复验。

## 已完成阶段

| 阶段 | 内容 | 提交 |
|---|---|---|
| 0 | 数据底座：29 表 + 种子（3 赛事 × 6 项目、含 2 驳回/1 待确认老师/1 未上传盖章件） | `9405575` |
| 0.4 | 冻结旧模块（rankings/anomalies/assistant/check 改占位页） | `ef0d90f` |
| 1 | 三角色认证：学生注册、ADMIN/TEACHER/STUDENT 守卫、中间件按路由段拦截 | `aa40222` `4378e54` |
| 2.1 | 加密与字典层：AES-256-GCM、maskTail（短值整串遮蔽）、DictOption 读取 | `ff50472` `bcd122d` |
| 2.2 | 报名表单 UI：17 项基本信息 + 老师/成员双弹窗 + 领款人 + 作品 + PPT | `4f3bba6` |
| 2.2.1 | 赛道三级字段：组别/类别/命题名称/命题企业，字典值统一用 code | `618e42d` |
| 2.3 | 提交与「我的项目」：草稿、提交、跨学生越权拦截、银行卡密文入库 | `ac5a854` |
| 3.1 | 管理员赛事管理：新建/编辑赛事、附件上传（白名单+MIME+文件头+20MB）、报名窗口开关 | `78813b0` |
| — | Lead 补：提交时服务端校验报名窗口 | `125fc81` |
| 3.2 | 审核工作台：27 列对齐 PRD 5.3、两级审核、批量逐条失败、详情含盖章件与审核历史 | `bb571b7` |
| 4.1 | 盖章闭环：报名表 xlsx（签字位/公章位）、上传版本化、最终版回退、管理员批量打包 zip | `e5fda82` |
| 4.2 | 自定义数据表导出：字段勾选与调序、`full` 参数（脱敏 vs 完整件）、4 个导出接口均写 ExportRecord | `23e8fe2` |
| 5.1 | 统计看板：byCollege/byTrack/byStage/byAward，学生 scope=mine 隔离，数字与查库一致 | `8c1e5e1` |
| 5.2a | 变更申请后端：3 个接口 + `CHANGE_WHITELIST` 字段白名单（禁止夹带 status/score） | `09ee8db` |
| 5.2b | 变更申请前端：学生申请面板（7 类型动态字段）+ 管理员 `/review/changes` 审批页 | `23147cf` |
| 5.4 | 老师端 `/teacher`：我指导的项目 + 确认/拒绝指导关系（理由入 AuditLog） | `cda97a0` |
| 6.1 | 重写 README.md 与 DEMO.md（10 分钟演示脚本 + 评委问答准备） | `92bda9a` |
| 5.3a | 导入中心：xlsx/docx/pdf 解析、前 20 行预览、映射方案保存（不入库）；Lead 已将系统字段从 10 个扩到 **24 个** | `c9674e1` |
| 5.3b | 导入入库：续行合并、逐行校验、赛道/多人/领款人解析、失败行 xlsx、批次防重 | `134c591` |
| 5.5 | 管理员奖项列表/录入/改级、AwardHistory + AuditLog、终审门槛与看板联动 | `7b40057` |

## 关键决定（勿擅自更改）

1. `TeamMember.personNo` 可空（校外成员无学号）。
2. `RegistrationStatus` 取值：DRAFT / PENDING / COLLEGE_REVIEW / SCHOOL_FINAL / REJECTED / PROVINCE_ADVANCED / NATIONAL_ADVANCED / WITHDRAWN。
3. 审核状态流转：提交→PENDING；学院通过→COLLEGE_REVIEW；校级通过→SCHOOL_FINAL；任一级驳回→REJECTED。
4. 报名表敏感字段：默认脱敏；`full=1` 才出完整身份证/银行卡，限负责人/第二三负责人/管理员，且带水印 + ExportRecord。
5. 学生看板只看本人数据（scope=mine），不看全校聚合。
6. 兼容补丁（阶段 2/3/6 重写对应模块时可移除）：`types/project.ts` personNo 可空、`lib/scoring.ts` 补 GOLD/SILVER/BRONZE、`lib/presentation.ts` 补状态标签与 roleLabels。

## 踩过的坑（避免重复）

| 现象 | 根因 | 处置 |
|---|---|---|
| `prisma validate` 报 P1012 | 引用了未定义枚举 RegistrationStatus | 补定义 |
| seed 报 `Argument 'project' is missing` | personNo 必填但 seed 写 null，Prisma 回退到 checked 输入 | 改可空 |
| seed 自检「被驳回项目应为 2，实际 0」 | `status` 算对但只写了 `status`，没写 `reviewStatus` | 两个字段同时写 |
| seed 自检「DictOption 应为 14，实际 119」 | 补了 105 条赛道级字典，断言没跟着拆 | 拆成全局 14 + 赛道 105 两条断言 |
| 学生侧栏出现「导入」且点进去 403 | 导航项没按角色过滤 | 侧栏改 role-aware |
| 学生找不到报名入口 | `/apply` 与 `/my` 没有导航入口 | 学生侧栏「赛事与报名 / 我的项目」 |
| 报名关闭期仍能提交 | 只在编辑时校验窗口，提交时没校验 | `submitProject` 内校验 TimeWindow |
| 二课样例首次自动匹配仅 9 个字段 | 实际第 5 列是“负责人”（学号），且“负责人姓名”别名误命中该列 | 负责人别名单独归学号；匹配按系统字段名、别名顺序优先 |
| 二课首行“团队成员”也包含负责人 | 直接逐行写入会产生同学号 LEADER/MEMBER 重复 | 成员列按负责人学号去重，保留 LEADER，其余成员写 MEMBER |

## 工具环境注意

- Windows PowerShell 5.1：**没有 pwsh**；脚本写文件必须显式 UTF-8，否则中英混编会乱码（本文件曾因此损坏过）。
- 沙箱限制：`next build` 与 `tsx` 因 fork 被拒（spawn EPERM），需在本机终端执行。
- `npx.cmd tsc` 有时去网上抓包导致 EPERM，改用 `node_modules\.bin\tsc.cmd`。

## 自测纪律（硬约束）

- 集成自测脚本**最多一次、≤5 分钟**；失败不许改脚本重跑，改用一条数据库查询核对。
- **严禁放宽断言**（如 `>=5` 改成 `>=4`）。发现一次，本阶段判失败。
- 临时数据/服务/脚本收尾必须清理并在汇报中确认。

## 下一步

**首期阶段已完成，后续进入二期（OCR / AI 问答 / 国创对接 / 统一认证）**

- 5.5 已完成：`/admin/awards` 支持筛选、录入与改级；仅终审及后续状态可录奖，新增/改级同事务写 AwardHistory 与 AuditLog。
- 验收项目“低碳校园能源优化系统·百珈争创”：Award 净增 1 条、AwardHistory 净增 2 条，历史依次为 `null → GOLD`、`GOLD → SILVER`，当前保留银奖。
- 看板无需改代码，实测金奖 `1 → 2 → 1`、银奖 `1 → 1 → 2`；终审前项目返回 422「未通过终审的项目不能录奖项」。
- AwardHistory 按现有 schema 写 `field=awardLevel`、`oldValue/newValue`，接口响应映射为 `oldLevel/newLevel`。
