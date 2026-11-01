import { apiError, apiSuccess } from "@/lib/api";
import { listManagedUsers } from "@/lib/admin-users";
import { requireApiAdmin } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authorization = await requireApiAdmin();
    if (!authorization.ok) {
      return authorization.response;
    }
    return apiSuccess(await listManagedUsers());
  } catch (error) {
    console.error("用户列表接口错误：", error);
    return apiError(500, "获取用户列表失败");
  }
}
