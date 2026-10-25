# 交接卡：阶段 3 开工说明（供新会话使用）

> 用途：开一个新会话时，把本文件内容作为第一条消息发给 AI，可把上下文从 20 万 token 压到 1 万左右，成本下降一个数量级。

---

## 0. 你先读这三个东西（按顺序）

1. `PROMPT.md` —— 完整任务书（榜题原文、数据模型、页面清单、停止条件）
2. `git log --oneline` —— 已完成阶段
3. 本文件剩余部分

## 1. 项目现状（阶段 0–2 已完成并通过验收）

| 阶段 | 内容 | 状态 |
|---|---|---|
| 0 | Next.js 14.2 + TS + Prisma + SQLite；19 张表；种子数据（120 项目 / 60 获奖 / 662 成员 / 12 异常 / 6 篇文档 23 条知识块 / 2 个账号） | ✅ |
| 1 | JWT（jose）+ HttpOnly Cookie 登录、全局布局（240px 侧栏/面包屑/用户菜单）、`/admin/users`、中间件权限（USER 写操作 403） | ✅ |
| 2 | 赛事列表/详情（含证据链四列）、项目列表/全貌（版本时间线可回放）、4 个 GET 接口、分页、软删过滤、可见性过滤 | ✅ |

## 2. 环境事实（不要重复做，做了就是浪费）

- 包管理器：**npm**（不是 pnpm）。本机 PowerShell 禁用 `npm.ps1`，命令一律用 `npm.cmd` / `npx.cmd`
- 依赖已装（497 包）、Prisma Client 已生成、`prisma/dev.db` 已建并灌好数据、`.env` 已存在
- **不要修改 `prisma/schema.prisma`**（表结构已定稿，改了要重灌种子）
- **不要重跑 seed**（数据已在）
- **不要启动常驻 dev server**（会占住终端，看起来像卡死）
- 测试账号：`13800000001 / 123456`（ADMIN）、`13800000002 / 123456`（USER）

## 3. 代码约定（照抄，不要发明新风格）

- 接口响应：`{ code, message, data }`，分页 `{ list, total, page, pageSize }`
- 权限：`requireApiAdmin()`（服务端回查数据库角色，不信任 token 里的 role）
- 软删：查询默认过滤 `deletedAt: null`
- 可见性：普通用户只可见 `status = PUBLISHED` 的获奖（见 `lib/award-visibility.ts`）
- 审计：所有写操作调用 `writeAuditLog({ actorId, action, targetType, targetId, detail })`
- 组件目录：`components/layout`、`components/data`、`components/projects`、`components/admin`
- 数据访问集中在 `lib/*.ts`，页面只做展示与调用

## 4. 本阶段任务：阶段 3（只做这个，做完停下汇报）

1. **导入向导 `/import`**（管理员）
   - 三步：下载/上传模板 → 逐行校验（**不落库**）→ 确认入库（**事务**）
   - 校验项：必填字段、学号格式、赛事与赛年匹配、团队人数上下限、重复行、同项目同赛事重复获奖
   - 失败**不整批回滚**：返回逐行错误（行号、字段、原因），支持"仅导入有效行"
   - 成功入库时：写 `ImportBatch`、为每条记录写 `DataSource(sourceType=IMPORT, batchId)`
   - 示例文件：`public/samples/获奖公示模板.xlsx`（含 3 行故意错误）

2. **异常规则 R1–R6**（命中写入 `Anomaly`，同 `ruleId + projectId` 不重复）
   - R1 一人多队：同一 `personNo` 同一年出现在 ≥3 个 ACTIVE 项目
   - R2 成员数超限：单项目 LEADER+MEMBER > 10
   - R3 指导老师超编：单项目 TEACHER > 3
   - R4 同名不同号：同项目内 name 相同但 personNo 不同
   - R5 获奖后换人：成员 `joinedAt` 晚于对应 `AwardRecord.createdAt`
   - R6 跨院冲突：同 name + 同 year 出现在两个不同 college

3. **待核实池 `/anomalies`**
   - 按规则分组列表、显示异常说明与涉及项目
   - 可填处置结论：`CONFIRMED / FIXED / UNTRACEABLE`，记录 `resolvedBy`、`resolvedAt`
   - 顶部显示**处置率**（已处置 / 总数）

4. **对应接口**
   - `POST /api/import/validate`、`POST /api/import/commit`
   - `GET /api/anomalies`、`PATCH /api/anomalies/[id]`
   - 另需一个内部入口触发规则重算（可放在 import commit 之后自动跑）

## 5. 完成标准（自检后汇报）

- `npx.cmd tsc --noEmit` 零报错
- `npm.cmd run build` 通过
- 手动验证：上传示例 Excel → 看到 ≥3 行错误并指出原因 → 仅导入有效行 → 数据库无脏数据 → 待核实池出现 R5 异常 → 处置一条后处置率上升
- 汇报格式：新增文件 / 修改文件 / 自检结果 / 已知未做 / 下一步

## 6. 停止条件（命中立即停，不要硬扛）

- 同一错误连续 3 次未解决
- 需要改 `prisma/schema.prisma` 或重跑 seed（说明设计有缺口，先停下讨论）
- 15 分钟无文件新建或修改
- 需要引入技术栈之外的依赖（Docker/Redis/向量库等）

## 7. 之后还有（本阶段不要做）

- 阶段 4：看板 + 学院排行（折算分可下钻）+ 获奖 Excel 导出
- 阶段 5：AI 助手（站内咨询带出处）+ 材料检查（规则引擎）+ 审计日志页
- 阶段 6：README + 全量自测 + 演示脚本
