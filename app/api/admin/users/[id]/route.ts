import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { listManagedUsers } from "@/lib/admin-users";
import { writeAuditLog } from "@/lib/audit";
import { requireApiAdmin } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: { id: string };
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const authorization = await requireApiAdmin();
    if (!authorization.ok) {
      return authorization.response;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError(422, "请求格式不正确");
    }
    if (typeof body !== "object" || body === null) {
      return apiError(422, "请求内容不正确");
    }
    const action = "action" in body ? body.action : undefined;
    const target = await prisma.user.findFirst({
      where: { id: params.id, deletedAt: null },
      select: { id: true, role: true },
    });
    if (!target) {
      return apiError(404, "用户不存在");
    }

    if (action === "APPROVE") {
      const existingApproval = await prisma.auditLog.findFirst({
        where: { action: "USER_APPROVED", targetType: "User", targetId: target.id },
        select: { id: true },
      });
      if (existingApproval) {
        return apiError(409, "该用户已审核");
      }
      await prisma.$transaction(async (transaction) => {
        await transaction.user.update({
          where: { id: target.id },
          data: { approvalStatus: "APPROVED", approvedAt: new Date(), approvedBy: authorization.user.id },
        });
        await writeAuditLog({
          actorId: authorization.user.id,
          action: "USER_APPROVED",
          targetType: "User",
          targetId: target.id,
          detail: { result: "审核通过" },
        }, transaction);
      });
      return apiSuccess(await listManagedUsers(), "审核通过");
    }

    if (action === "REJECT") {
      if (target.id === authorization.user.id) return apiError(409, "不能驳回当前登录账号");
      await prisma.$transaction(async (transaction) => {
        await transaction.user.update({
          where: { id: target.id },
          data: { approvalStatus: "REJECTED", approvedAt: new Date(), approvedBy: authorization.user.id },
        });
        await writeAuditLog({
          actorId: authorization.user.id,
          action: "USER_REJECTED",
          targetType: "User",
          targetId: target.id,
          detail: { result: "审核驳回" },
        }, transaction);
      });
      return apiSuccess(await listManagedUsers(), "已驳回该注册申请");
    }

    if (action === "UPDATE_ROLE") {
      const role = "role" in body ? body.role : undefined;
      if (role !== "ADMIN" && role !== "STUDENT" && role !== "TEACHER" && role !== "USER") {
        return apiError(422, "角色仅支持 ADMIN / STUDENT / TEACHER / USER");
      }
      const rolesInput = "roles" in body ? (body as Record<string, unknown>).roles : undefined;
      const rawRoles: unknown[] = Array.isArray(rolesInput) ? rolesInput : [role];
      const allowed = new Set(["ADMIN", "STUDENT", "TEACHER", "USER"]);
      const extraRoles = [...new Set(rawRoles.filter((item): item is string => typeof item === "string" && allowed.has(item)))];
      if (!extraRoles.length) extraRoles.push(role as string);
      if (target.id === authorization.user.id) {
        return apiError(409, "不能修改当前登录账号的角色");
      }
      if (target.role === role) {
        return apiError(409, "用户角色未发生变化");
      }
      await prisma.$transaction(async (transaction) => {
        await transaction.user.update({ where: { id: target.id }, data: { role } });
        // 主角色之外的附加身份写进 UserRoleLink（支持老师+管理员 / 学生+管理员）
        await transaction.userRoleLink.deleteMany({ where: { userId: target.id } });
        const extra = extraRoles.filter((item) => item !== role).map((item) => ({ userId: target.id, role: item as "ADMIN" | "STUDENT" | "TEACHER" | "USER", grant: "ADMIN_GRANT" }));
        if (extra.length) await transaction.userRoleLink.createMany({ data: extra });
        await writeAuditLog(
          {
            actorId: authorization.user.id,
            action: "USER_ROLE_UPDATED",
            targetType: "User",
            targetId: target.id,
            detail: { previousRole: target.role, nextRole: role, extraRoles },
          },
          transaction,
        );
      });
      return apiSuccess(await listManagedUsers(), "角色已更新");
    }

    return apiError(422, "不支持的用户操作");
  } catch (error) {
    console.error("用户修改接口错误：", error);
    return apiError(500, "修改用户失败");
  }
}
