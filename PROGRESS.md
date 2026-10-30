# PROGRESS

> 供 AI 续接使用。**恢复时只读本文件 + `git log --oneline | head -5`，禁止通读 `schema.prisma` / `seed.ts`。**

## 阶段 0（进行中）

### 已完成
- [0.1] 备份旧库：`prisma/dev.db` → `prisma/dev.db.v1.bak`（已 gitignore）
- [0.2] `prisma/schema.prisma` 重写：**28 model / 20 enum**，`prisma validate` 通过
- [0.2] `prisma/seed.ts` 重写并通过执行
- [0.2] `.env` / `.env.example` 增加 `FIELD_ENCRYPTION_KEY`
- [0.3] `prisma db push` 成功；seed 执行成功，数据分布已核验：
  - Project 18（3 赛事 × 6）、TeamMember 54、Teacher 18、PayeeBank 18、Work 18、SealedFile 18
  - Review 23、ChangeLog 1、ChangeRequest 1、TimeWindow 3、DictOption 14、FormTemplate 3
  - Award 2、AwardHistory 2、ImportBatch 1、ExportRecord 1、SensitiveAccessLog 1
  - 审核状态：REJECTED 2 / PENDING 4 / COLLEGE_REVIEW 4 / SCHOOL_FINAL 4 / PROVINCE_ADVANCED 4
  - 老师确认：PENDING 1 / CONFIRMED 17；未上传盖章件项目 1

### 未完成
- [0.4] 4 个旧入口改占位（rankings / anomalies / assistant / check）+ 调整 sidebar
- [0.5] `tsc --noEmit` + `build` 验收 + 收尾

## 关键决定（勿擅自更改）

1. **校外成员 `TeamMember.personNo` 允许 null**。
2. **`RegistrationStatus` 取值**：`DRAFT / PENDING / COLLEGE_REVIEW / SCHOOL_FINAL / REJECTED / PROVINCE_ADVANCED / NATIONAL_ADVANCED / WITHDRAWN`。
3. **项目同时有 `status`（ProjectStatus）与 `reviewStatus`（RegistrationStatus）**，seed 里两者同值；别只写一个。
4. **兼容补丁**（阶段 2/3/6 重写对应模块时移除）：
   - `types/project.ts`：`personNo` 放宽为 `string | null`
   - `lib/scoring.ts`：`AwardLevel` 补 `GOLD 1.0 / SILVER 0.8 / BRONZE 0.6`
   - `lib/presentation.ts`：补齐新增状态、奖项、成员角色中文标签

## 踩过的坑（避免重复）

| 现象 | 根因 | 处置 |
|---|---|---|
| `prisma validate` 报 P1012 | 引用了未定义枚举 `RegistrationStatus` | 补定义 |
| seed 报 `Argument 'project' is missing` | `personNo` 必填但写 null，Prisma 回退到 checked 输入 | 改为可空 |
| seed 自检 `被驳回项目 应为 2，实际为 0` | `status` 算对了但只写进 `status`，没写 `reviewStatus` | 两个字段同时写 |

## 下一步（只做这一条，做完停下）

微步 0.4：把 `rankings` 改为"已并入看板"占位，`anomalies` / `assistant` / `check` 改为"功能暂未开放"占位（**页面文件保留、只改内容**），并调整 `components/layout/sidebar.tsx` 下线这 4 个入口。
**不要继续 0.5。**
