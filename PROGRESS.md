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
