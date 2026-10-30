# PROGRESS

> 渚?AI 缁帴浣跨敤銆?*鎭㈠鏃跺彧璇绘湰鏂囦欢 + `git log --oneline | head -5`锛岀姝㈤€氳 `schema.prisma` / `seed.ts`銆?*

## 闃舵 0锛堣繘琛屼腑锛?
### 宸插畬鎴?- [0.1] 澶囦唤鏃у簱锛歚prisma/dev.db` 鈫?`prisma/dev.db.v1.bak`锛堝凡 gitignore锛?- [0.2] `prisma/schema.prisma` 閲嶅啓锛?*28 model / 20 enum**锛宍prisma validate` 閫氳繃
- [0.2] `prisma/seed.ts` 閲嶅啓骞堕€氳繃鎵ц
- [0.2] `.env` / `.env.example` 澧炲姞 `FIELD_ENCRYPTION_KEY`
- [0.3] `prisma db push` 鎴愬姛锛泂eed 鎵ц鎴愬姛锛屾暟鎹垎甯冨凡鏍搁獙锛?  - Project 18锛? 璧涗簨 脳 6锛夈€乀eamMember 54銆乀eacher 18銆丳ayeeBank 18銆乄ork 18銆丼ealedFile 18
  - Review 23銆丆hangeLog 1銆丆hangeRequest 1銆乀imeWindow 3銆丏ictOption 14銆丗ormTemplate 3
  - Award 2銆丄wardHistory 2銆両mportBatch 1銆丒xportRecord 1銆丼ensitiveAccessLog 1
  - 瀹℃牳鐘舵€侊細REJECTED 2 / PENDING 4 / COLLEGE_REVIEW 4 / SCHOOL_FINAL 4 / PROVINCE_ADVANCED 4
  - 鑰佸笀纭锛歅ENDING 1 / CONFIRMED 17锛涙湭涓婁紶鐩栫珷浠堕」鐩?1

### 鏈畬鎴?- [0.4] 4 涓棫鍏ュ彛鏀瑰崰浣嶏紙rankings / anomalies / assistant / check锛? 璋冩暣 sidebar
- [0.5] `tsc --noEmit` + `build` 楠屾敹 + 鏀跺熬

## 鍏抽敭鍐冲畾锛堝嬁鎿呰嚜鏇存敼锛?
1. **鏍″鎴愬憳 `TeamMember.personNo` 鍏佽 null**銆?2. **`RegistrationStatus` 鍙栧€?*锛歚DRAFT / PENDING / COLLEGE_REVIEW / SCHOOL_FINAL / REJECTED / PROVINCE_ADVANCED / NATIONAL_ADVANCED / WITHDRAWN`銆?3. **椤圭洰鍚屾椂鏈?`status`锛圥rojectStatus锛変笌 `reviewStatus`锛圧egistrationStatus锛?*锛宻eed 閲屼袱鑰呭悓鍊硷紱鍒彧鍐欎竴涓€?4. **鍏煎琛ヤ竵**锛堥樁娈?2/3/6 閲嶅啓瀵瑰簲妯″潡鏃剁Щ闄わ級锛?   - `types/project.ts`锛歚personNo` 鏀惧涓?`string | null`
   - `lib/scoring.ts`锛歚AwardLevel` 琛?`GOLD 1.0 / SILVER 0.8 / BRONZE 0.6`
   - `lib/presentation.ts`锛氳ˉ榻愭柊澧炵姸鎬併€佸椤广€佹垚鍛樿鑹蹭腑鏂囨爣绛?
## 韪╄繃鐨勫潙锛堥伩鍏嶉噸澶嶏級

| 鐜拌薄 | 鏍瑰洜 | 澶勭疆 |
|---|---|---|
| `prisma validate` 鎶?P1012 | 寮曠敤浜嗘湭瀹氫箟鏋氫妇 `RegistrationStatus` | 琛ュ畾涔?|
| seed 鎶?`Argument 'project' is missing` | `personNo` 蹇呭～浣嗗啓 null锛孭risma 鍥為€€鍒?checked 杈撳叆 | 鏀逛负鍙┖ |
| seed 鑷 `琚┏鍥為」鐩?搴斾负 2锛屽疄闄呬负 0` | `status` 绠楀浜嗕絾鍙啓杩?`status`锛屾病鍐?`reviewStatus` | 涓や釜瀛楁鍚屾椂鍐?|

## 涓嬩竴姝ワ紙鍙仛杩欎竴鏉★紝鍋氬畬鍋滀笅锛?
寰 0.4锛氭妸 `rankings` 鏀逛负"宸插苟鍏ョ湅鏉?鍗犱綅锛宍anomalies` / `assistant` / `check` 鏀逛负"鍔熻兘鏆傛湭寮€鏀?鍗犱綅锛?*椤甸潰鏂囦欢淇濈暀銆佸彧鏀瑰唴瀹?*锛夛紝骞惰皟鏁?`components/layout/sidebar.tsx` 涓嬬嚎杩?4 涓叆鍙ｃ€?**涓嶈缁х画 0.5銆?*


## 阶段 1（代码已写，待 AI review + build 验证）

### Lead 已写（均通过 tsc --noEmit）
- `lib/auth.ts`：角色校验扩展到 5 种（ADMIN/USER/STUDENT/TEACHER/FINANCE），新增 `isRole`
- `lib/auth.server.ts`：新增 `requireApiRoles` / `requireApiStudent` / `requireApiTeacher`
- `middleware.ts`：按路由段守卫（/admin、/settings、/review、/import 仅 ADMIN；/apply、/my 仅 STUDENT；/teacher 仅 TEACHER；FINANCE 只读）
- `app/api/auth/register/route.ts`：学生注册（学号 6–20 位、手机号、密码≥6、查重、写审计）
- `app/register/page.tsx`：注册页
- `app/login/page.tsx`：加注册入口
- `lib/presentation.ts`：新增 `roleLabels`

### 待验证
- `npm.cmd run build`（Lead 沙箱禁止 fork，无法执行）
- 三种角色登录与越权拦截的真机验证

### 下一步（AI 执行）
1. review 上述 7 个文件，输出问题清单（最多 5 条，按严重度排序），**先不改代码**
2. 执行 `npm.cmd run build`
3. 若 build 失败，只修阻断项（最多改 3 个文件），修完再 build 一次
4. 汇报后停下

### 阶段 1 review 结论（AI review + Lead 裁定）

| # | 问题 | 裁定 | 处理 |
|---|---|---|---|
| 1 | 学生/教师 API 未纳入中间件守卫 | 真问题 | 已加 `/api/apply` `/api/my` `/api/teacher` 前缀守卫 |
| 2 | 中间件信任 JWT 内旧角色（最长 8h） | 接受 | Edge 无法查库；每个接口内部用 `getActiveUser` 回查，页面渲染前也会校验。已记录为已知限制 |
| 3 | 注册查重非原子，并发撞唯一键返回 500 | 真问题 | 捕获 P2002 → 返回 409，并按冲突字段给提示 |
| 4 | 建用户与写审计不在同一事务 | 真问题 | 改为 `prisma.\` 内完成，审计失败则用户不落库 |
| 5 | ADMIN 始终通过学生/教师守卫 | 接受 | 设计意图：管理员可代操作；后续若限制需显式加参数 |

build 已由 AI 在 2026-10-30 执行成功（Middleware 32.3 kB，无错误）。

### 阶段 1 验收结论：✅ 通过（2026-10-30）
- `npm.cmd run build` 成功，路由表包含 `/register`（1.47 kB）、`/api/auth/register`
- 中间件守卫覆盖页面与 API：/admin、/settings、/review、/import → ADMIN；/apply、/my、/api/apply、/api/my → STUDENT；/teacher、/api/teacher → TEACHER；FINANCE 只读
- 已知限制：JWT 内角色最长 8 小时有效（中间件无法查库），业务接口均以 `getActiveUser` 回查兜底

## 阶段 2（进行中）

### 2.1 加密与字典基础层（已完成）
- `lib/crypto.ts`：AES-256-GCM，支持 64 位 hex / base64 密钥；密文版本格式为 `v1:iv:tag:data`
- `lib/dict.ts`：新增 `listOptions` / `getLabelMap`；现有模型以 `enabled: true` 实现 active 过滤并按 `sortOrder` 排序
- `types/apply.ts`：新增 `ProjectFormInput` / `MemberInput` / `TeacherInput` / `PayeeInput`
- `scripts/crypto-selftest.ts`：中文长文本往返、随机 IV、篡改抛错、脱敏共 4 项全部通过
- 验证：`npx.cmd tsx scripts/crypto-selftest.ts` 通过；`npx.cmd tsc --noEmit` 通过
- 下一步：等待阶段 2.2 指令，不提前实现页面或接口
**不做页面、不做接口、不改 schema。**

### 阶段 2.1 验收：✅ 通过（Lead 独立复核）
- 密钥：64 位 hex，解码 32 字节 ✓
- 往返一致 ✓、同明文两次密文不同（IV 随机）✓、篡改密文抛错 ✓
- 密文格式 `v1:<iv>:<tag>:<data>`，4 段；解密失败不返回原文 ✓
- **Lead 加固**：`maskTail` 原实现对长度 ≤ keep 的值原样返回（短值等于没脱敏），已改为整串遮蔽

## 阶段 2（进行中）：2.2 报名表单 UI（已完成）
- 新增 `app/(workspace)/apply/page.tsx`：服务端读取当前学生、赛事赛道树与字典；学号和姓名固定展示
- 新增 `components/apply/` 6 个组件：17 项基本信息、老师/成员双入口弹窗、上限与排序、唯一领款人、作品与 PPT 占位、前端校验
- 新增只读接口：`/api/lookup/student`、`/api/lookup/teacher`、`/api/apply/options`；学生查不到返回 404，老师查不到返回空数组
- 全部表单数据均为客户端状态；提交按钮禁用并显示“提交功能开发中”，无保存、上传或 Prisma 写入
- 验证：`npx.cmd tsc --noEmit` 通过；`npm.cmd run build` 通过（21 个静态页生成步骤完成）
- 真实请求：学生登录后 `/apply` 正常；选项含 3 赛事及国内/海外层级；学生查询 200/404、老师查询命中/空数组均通过
- 未做：`/my`、提交逻辑、schema 变更；等待下一阶段指令
- 不做提交/保存，不做 prisma 写入

## 阶段 2.2.1：赛道三级字段（已完成）
- 仅修改 `basic-info-card.tsx`、`apply-form.tsx`、`options/route.ts`、`types/apply.ts` 四个允许文件
- `/api/apply/options` 每个赛道节点均返回 `groups` / `categories`，支持赛道专属、父级继承和通用字典回退
- 实际字典 key：`GROUP` / `CATEGORY`；当前无 `TRACK_GROUP` / `TRACK_CATEGORY` 及赛道专属记录，故使用通用字典，回退逻辑已保留
- 新增项目组别、项目类别必填下拉；赛道 kind/name 含“企业命题”时显示命题名称和命题企业并校验必填
- 切换赛道会清空组别、类别、命题名称和命题企业；字典在表单状态统一保存 code，界面显示 label
- 验证：`npx.cmd tsc --noEmit`、`npm.cmd run build` 均通过；真实 GET 验证赛道节点字典与新增表单字段通过
- 未做提交逻辑、`/my` 或 schema 变更

## 阶段 2.3：报名提交与我的项目（已完成）
- 新增 `lib/apply.ts`：`createOrUpdateDraft` / `submitProject` / `withdrawProject` / `getMyProjects` / `getMyProject`；写操作均走事务
- 新增 `POST /api/apply` 保存嵌套草稿、`POST /api/apply/submit` 校验并提交；失败 message 会回传表单
- 新增 `/my` 与 `/my/[id]`：列表展示名称、赛道、状态、驳回原因、修改时间；详情只读并脱敏，窗口内才显示编辑
- 提交后 `status` / `reviewStatus` 同时为 `PENDING`；以 `ChangeLog.field=SUBMIT` 记录“首次提交/重新提交”并计算次数
- 读写权限均限定为项目负责人或 `TeamMember.userId` 成员；身份证和银行卡仅密文入库，详情仅用 `maskTail` 展示
- `/apply` 已接入草稿、提交和已有项目编辑；成员、老师、作品、领款人嵌套写入，未改 schema 或 `lib/crypto.ts`
- 验证：`npx.cmd tsc --noEmit`、`npm.cmd run build` 通过；真实草稿→提交→列表/详情、密文、脱敏、成员访问和跨学生读写拦截均通过
- 端到端测试项目已清理；未做审核、导出

## 阶段 3.1：管理员赛事管理（已完成）
- 新增管理员接口：新建/编辑赛事、上传/删除附件、upsert 校赛报名窗口；全部 `requireApiAdmin` 且写 AuditLog
- 上传校验扩展名、MIME、文件头和 20MB 上限；文件保存至 `public/uploads/competitions/<id>/`，目录已加入 `.gitignore`
- 新增公开附件读取路由，解决生产模式下运行时新增 public 文件无法下载的问题；下载无需登录，管理写接口仍仅管理员
- 赛事详情新增管理员编辑抽屉、附件上传/删除、报名设置；列表新增管理员新建赛事入口
- 学生端 `enabled=false` 时显示“报名未开放”；未修改 schema、`lib/crypto.ts`、学生端 `/apply` 或 `/my`
- 验证：`tsc` 与 `build` 通过；真实 PDF 上传/删除、无登录下载、学生管理写 403、关闭/开放窗口均通过；已执行 `db:push` 同步既有附件模型
- 实测落盘：`public/uploads/competitions/d717b357-366d-48c8-bd12-12e769dc7801/f8375123-ad73-4977-a9c1-18842ec9fe45-stage31-upload.pdf`
- 实测窗口：`competitionId=d717b357-366d-48c8-bd12-12e769dc7801`，`stage=SCHOOL`，`startAt=2026-10-30T08:56:24.858Z`，`endAt=2026-11-29T09:56:24.996Z`，`enabled=true`
- 构建附带修复：移除 `components/layout/sidebar.tsx` 未使用的 `FilePlus2` 导入

## 阶段 3.2：管理员审核（已完成）
- 状态流转：提交后为 `PENDING`；学院通过后为 `COLLEGE_REVIEW`；校级通过后为 `SCHOOL_FINAL`；任一级驳回为 `REJECTED`，记录理由与驳回级别
- 接口（全部 `requireApiAdmin`）：`GET /api/review/list`（PRD 5.3 的 27 列、赛事/阶段/学院/状态/赛道/关键词筛选、分页）；`POST /api/review/approve`；`POST /api/review/reject`；`POST /api/review/batch`
- 学院级仅处理 `PENDING`，校级仅处理 `COLLEGE_REVIEW`；其他状态返回 422。驳回理由必填且不超过 200 字，空理由返回「请填写驳回理由」
- 批量通过或驳回使用同一理由，先过滤状态不符项，并分别返回成功与 `{ projectId, message }` 失败清单
- 每次成功审核在同一事务写 `Review` 与 `AuditLog`；现有学生重新提交逻辑保持回到 `PENDING` 且不删除审核历史，未修改 `/apply`
- 页面：`/review` 27 列审核列表并显示提交次数，未确认指导关系的项目标红；`/review/[id]` 展示基本信息、老师、成员、作品、盖章件、变更历史与审核记录
- 组件：筛选栏、勾选后显示的批量操作条、驳回理由弹窗；侧栏管理区已增加「报名审核」入口
- 约束：未改 schema，未碰 `/apply` 与 `/my`，未做导出、看板或晋级流转
- 验证：`npx.cmd tsc --noEmit`、`npm.cmd run build` 通过；构建包含 `/review`、`/review/[id]` 和四个审核 API
- 真实 HTTP 验收：未登录 401、学生页面与接口 403；27 列及六类筛选/分页正确；空理由/超长理由/越级与重复审核 422；学院通过→校级通过、驳回、批量部分成功均正确
- 数据库验收：成功操作的状态同步、驳回级别/理由、Review 与 AuditLog 数量一致；失败项未写 Review 且状态未变；临时项目、赛事、赛道与脚本均已清理
- 提交：`bb571b7 stage-3.2: review workbench`
- 下一步：等待后续阶段指令，不提前实现晋级流转、奖项或看板

## 阶段 4.1：盖章件上传与最终版闭环（已完成）
- 学生项目详情提供报名表 xlsx 下载；包含基本信息、指导老师、团队成员、领款人，以及留空的三个签字位和公章位；银行信息默认脱敏并写入唯一导出编号
- 本队任一学生成员可上传 PDF/JPG/PNG 盖章件，单文件不超过 20MB；校验扩展名、MIME 与文件头，UUID 重命名，版本递增且旧版保留
- 以最后上传且 `reviewResult != REJECTED` 的盖章件为当前最终版；学生与管理员可查看全部版本并下载，最新版被驳回后回退上一可用版本
- 接口：`POST /api/sealed/upload`、`GET /api/sealed/download`、`GET /api/export/form`、`POST /api/export/package`；每次表单、单版本或打包下载均写 `ExportRecord`
- 管理员按当前审核筛选结果流式打包 zip，单次不超过 100 个项目且文件总量不超过 500MB；按 `赛事_阶段_学院_项目名_队长_第N版` 命名，PDF 使用 `.pdf`，图片保留对应扩展名
- 运行时上传目录已由现有 `.gitignore` 的 `public/uploads/` 覆盖；未改 schema、`lib/crypto.ts` 或 `/apply`，未做 4.2 数据表自定义导出
- 真实验收：本队两名成员均可上传，无关学生跨项目操作被拦截；文件头、MIME 和 20MB 上限通过；两版替换后旧文件保留且内容一致
- 真实验收：学生/管理员页面、历史版本下载、教师报名表下载通过；xlsx 已解析核对四类字段、签字公章位、脱敏与导出编号；zip 已解压核对文件名和文件内容
- 限额验收：101 个项目返回分批提示；25×20MB=500MB 可准备打包，26×20MB 超限返回分批提示；临时数据库行、文件和脚本均已清理
- 验证：`npx.cmd tsc --noEmit`、`npm.cmd run build` 通过，构建包含四个新增接口
- 提交：`e5fda82 stage-4.1: sealed files and form export`
- 下一步：等待 4.2 指令，不提前实现数据表自定义导出

## 阶段 4.2：完整报名表与自定义数据表导出（进行中）
- 修正 `/api/export/form`：`full=0` 默认脱敏；`full=1` 输出完整身份证与银行卡号，仅项目负责人/第二三负责人/管理员可用，其他成员返回 403
- `full=1` 报名表带「项目名+导出人+时间+导出编号」水印，`ExportRecord.includeSensitive=true`；学生详情提供交学院核验与脱敏留存两个入口
- 字段目录集中于 `lib/export-fields.ts`，包含 key、中文列名和敏感标记，页面与接口共用
- `GET/POST /api/export/dataset` 支持 `scope=mine|all`、赛事/阶段/学院/状态筛选和有序 `fields[]`；`all` 仅管理员，输出首行中文表头的 xlsx
- 身份证与银行卡列默认脱敏；仅管理员在 `scope=all` 且 `confirmSensitive=1` 时可导出完整敏感列，并写 `ExportRecord`
- 学生可导出本队数据表，字段勾选与上下移调序且至少保留项目名称、状态；管理员可勾选 27 字段并调序，导出当前筛选结果
- 单次最多 5000 行，超限提示缩小筛选；不改 schema、不碰 `/apply`，不做 Word/PDF 导入
- 验收：权限、水印、敏感信息、字段顺序、GET/POST 一致性、真实 xlsx 解析与 5000 行边界；`tsc --noEmit` 和 `build` 通过后提交 `stage-4.2: custom dataset export`
