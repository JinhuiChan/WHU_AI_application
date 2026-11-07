import { apiError } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth.server";
export async function POST() {
  const authorization = await requireApiAdmin({ activeIdentity: true });
  if (!authorization.ok) return authorization.response;
  return apiError(410, "问答资料已统一由赛事栏配置和附件维护，请前往赛事详情。");
}
