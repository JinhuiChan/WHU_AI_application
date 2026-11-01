import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * 查询字典选项。
 * - 不传 options：保持旧行为（该 type 下所有记录，含各赛道挂载的），仅供兼容调用；
 * - options.trackId === null：只取全局字典（trackId 为空）；
 * - options.trackId === "<id>"：只取该赛道挂载的字典。
 */
export async function listOptions(type: string, options?: { trackId?: string | null }) {
  const where: Prisma.DictOptionWhereInput = { type, enabled: true };
  if (options && Object.hasOwn(options, "trackId")) {
    where.trackId = options.trackId ?? null;
  }
  return prisma.dictOption.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
}

/** 旧接口：全局 value -> label（跨赛道同 value 会互相覆盖，禁止用于赛道级组别/类别）。 */
export async function getLabelMap(type: string): Promise<Record<string, string>> {
  const options = await listOptions(type);
  return Object.fromEntries(options.map((option) => [option.value, option.label]));
}

/** 只取全局字典的 value -> label（民族、培养阶段、作品形式等）。 */
export async function getGlobalLabelMap(type: string): Promise<Record<string, string>> {
  const options = await listOptions(type, { trackId: null });
  return Object.fromEntries(options.map((option) => [option.value, option.label]));
}
