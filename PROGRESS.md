# PROGRESS

> 交接凭据。**AI 恢复时只读本文件 + `git log --oneline | head -8`，禁止通读 schema.prisma / seed.ts。**

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
- ⬜ 待做：`/projects` 赛事筛选+列、学生赛事列表列改写、审核列表待审/已审 tab、
  变更申请红点、详情页面包屑、导出「提交时间」格式化、打包失败清单、
  B6（SensitiveAccessLog 落库 / 导出二次确认 / 领款人开关口径）

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
