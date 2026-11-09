import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { apiError, apiSuccess } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireApiUser } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const fields = ["bio", "avatarUrl", "skills", "showRecords", "showAwards"] as const;
type EditableField = (typeof fields)[number];

const profileSelection = {
  bio: true,
  avatarUrl: true,
  skills: true,
  showRecords: true,
  showAwards: true,
} satisfies Prisma.UserSelect;

function splitSkills(value: string) {
  return value.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
}

export async function PATCH(request: NextRequest) {
  const authorization = await requireApiUser();
  if (!authorization.ok) return authorization.response;
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return apiError(422, "请求内容不正确");
    }
    const input = body as Record<string, unknown>;
    if (!fields.some((field) => field in input)) return apiError(422, "没有可保存的资料字段");

    const current = await prisma.user.findFirst({
      where: { id: authorization.user.id, deletedAt: null, approvalStatus: "APPROVED" },
      select: profileSelection,
    });
    if (!current) return apiError(404, "账号不可用");

    let bio = current.bio;
    let avatarUrl = current.avatarUrl;
    let skills = current.skills;
    let showRecords = current.showRecords;
    let showAwards = current.showAwards;
    if ("bio" in input) {
      if (input.bio !== null && typeof input.bio !== "string") return apiError(422, "简介格式不正确");
      bio = typeof input.bio === "string" ? input.bio.trim() || null : null;
    }
    if (bio && Array.from(bio).length > 60) return apiError(422, "简介不能超过 60 字");
    if ("avatarUrl" in input) {
      if (input.avatarUrl !== null && typeof input.avatarUrl !== "string") return apiError(422, "头像地址格式不正确");
      avatarUrl = typeof input.avatarUrl === "string" ? input.avatarUrl.trim() || null : null;
    }
    if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) return apiError(422, "头像地址必须以 http(s) 开头");
    if ("skills" in input) {
      if (typeof input.skills !== "string") return apiError(422, "擅长技能格式不正确");
      const items = splitSkills(input.skills);
      if (items.length > 10) return apiError(422, "擅长技能不能超过 10 个");
      skills = items.join(",");
    }
    if ("showRecords" in input) {
      if (typeof input.showRecords !== "boolean") return apiError(422, "参赛记录开关格式不正确");
      showRecords = input.showRecords;
    }
    if ("showAwards" in input) {
      if (typeof input.showAwards !== "boolean") return apiError(422, "获奖记录开关格式不正确");
      showAwards = input.showAwards;
    }

    const data: Prisma.UserUpdateInput = {};
    const changedFields: EditableField[] = [];
    if (bio !== current.bio) { data.bio = bio; changedFields.push("bio"); }
    if (avatarUrl !== current.avatarUrl) { data.avatarUrl = avatarUrl; changedFields.push("avatarUrl"); }
    if (skills !== current.skills) { data.skills = skills; changedFields.push("skills"); }
    if (showRecords !== current.showRecords) { data.showRecords = showRecords; changedFields.push("showRecords"); }
    if (showAwards !== current.showAwards) { data.showAwards = showAwards; changedFields.push("showAwards"); }

    const saved = await prisma.$transaction(async (transaction) => {
      const user = changedFields.length
        ? await transaction.user.update({ where: { id: authorization.user.id }, data, select: profileSelection })
        : current;
      await writeAuditLog({
        actorId: authorization.user.id,
        action: "PROFILE_UPDATED",
        targetType: "User",
        targetId: authorization.user.id,
        detail: { changedFields },
      }, transaction);
      return user;
    });
    return apiSuccess(saved, "资料已保存");
  } catch (error) {
    console.error("个人资料保存接口错误：", error instanceof Error ? error.message : error);
    return apiError(500, "保存个人资料失败");
  }
}
