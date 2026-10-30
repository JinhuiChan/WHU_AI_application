# PROGRESS

> 供 AI 续接使用。**恢复时只读本文件 + `git log --oneline | head -5`，禁止通读 `schema.prisma` / `seed.ts`。**

## 阶段 0（进行中）

### 已完成
- [0.1] 备份旧库：`prisma/dev.db` → `prisma/dev.db.v1.bak`
- [0.2] 重写 `prisma/schema.prisma`：**28 个 model / 20 个 enum**，`prisma validate` 通过
- [0.2] 重写 `prisma/seed.ts`（22KB，未成功执行过）
- [0.2] `.env` 与 `.env.example` 增加 `FIELD_ENCRYPTION_KEY`，`.env` 已写入开发密钥

### 未完成
- [0.3] `prisma db push` + 执行 seed（曾因 schema 问题失败，已修，待重跑）
- [0.4] 4 个旧入口改占位页（rankings / anomalies / assistant / check）+ 调整 sidebar
- [0.5] `tsc --noEmit` + `build` + 收尾

## 关键决定（勿擅自更改）

1. **校外成员 `TeamMember.personNo` 允许为 null**（校外无学号）。
2. **`RegistrationStatus` 枚举取值**：`DRAFT / PENDING / COLLEGE_REVIEW / SCHOOL_FINAL / REJECTED / PROVINCE_ADVANCED / NATIONAL_ADVANCED / WITHDRAWN`。
3. **兼容补丁**（由 Lead 加，阶段 2/3/6 重写对应模块时移除）：
   - `types/project.ts`：`personNo` 放宽为 `string | null`
   - `lib/scoring.ts`：`AwardLevel` 补 `GOLD 1.0 / SILVER 0.8 / BRONZE 0.6`
   - `lib/presentation.ts`：补齐新增状态、奖项、成员角色的中文标签

## 踩过的坑（避免重复）

| 现象 | 根因 | 处置 |
|---|---|---|
| seed 报 `Argument 'project' is missing` | `personNo` 必填但 seed 写 null，Prisma 回退到 checked 输入形态 | 把 `personNo` 改为可空 |
| `prisma validate` 报 P1012 | 引用了未定义的枚举 `RegistrationStatus` | 补定义 |

## 下一步（只做这一条，做完停下）

```
npx.cmd prisma db push
npx.cmd tsx prisma/seed.ts
```
记录各表行数 → `git commit -m "stage-0.3: rebuild db and seed"` → 停下汇报。
**不要继续 0.4。**
