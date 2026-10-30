# PROGRESS

> 交接凭据。**AI 恢复时只读本文件 + `git log --oneline | head -8`，禁止通读 schema.prisma / seed.ts。**

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
| 5.3a | 导入中心：上传（xlsx/docx/pdf）+ 字段映射 | 待做 |
| 5.3b | 导入入库 + 逐行校验报告 | 待做 |
| 5.5 | 奖项录入与变更留痕 | 待做 |

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

## 工具环境注意

- Windows PowerShell 5.1：**没有 pwsh**；脚本写文件必须显式 UTF-8，否则中英混编会乱码（本文件曾因此损坏过）。
- 沙箱限制：`next build` 与 `tsx` 因 fork 被拒（spawn EPERM），需在本机终端执行。
- `npx.cmd tsc` 有时去网上抓包导致 EPERM，改用 `node_modules\.bin\tsc.cmd`。

## 自测纪律（硬约束）

- 集成自测脚本**最多一次、≤5 分钟**；失败不许改脚本重跑，改用一条数据库查询核对。
- **严禁放宽断言**（如 `>=5` 改成 `>=4`）。发现一次，本阶段判失败。
- 临时数据/服务/脚本收尾必须清理并在汇报中确认。

## 下一步

**5.3a 导入中心（上传 + 字段映射，先不做入库）**

- 页面：重写 `/import`（当前是 V1 获奖导入，已过时）
- 接口：`POST /api/import/parse`（上传 + 解析表头 + 预览）、`POST /api/import/mapping`（保存映射方案到 `ImportBatch.mappingJson`，不改 schema）
- 解析：xlsx 走 xlsx 库，docx 走 mammoth，pdf 走 pdf-parse；解析结果必须落成"待人工确认"
- 测试文件：`public/samples/二课导出数据样例.xlsx`（27 列，仿真数据）
- 安全红线：`newValues` 类任意 JSON 必须走白名单，禁止直接 spread 进 `prisma.update`
- 之后：5.3b 入库与校验报告 → 5.5 奖项录入 → 二期（OCR / AI 问答 / 国创对接 / 统一认证）
