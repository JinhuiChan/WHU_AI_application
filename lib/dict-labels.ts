import { prisma } from "@/lib/prisma";

/**
 * 按「赛道 + 类型」解析字典 label。
 *
 * 背景：DictOption.value 是按赛道内序号生成的（C1..Cn / G1..Gn），跨赛道会重号；
 * 任何"全局 value -> label"的映射都会把 A 赛道的 C5 张冠李戴成 B 赛道的 C5。
 * 因此所有赛道级字段（项目组别/项目类别/作品类别/作品组别…）必须带上项目 trackId 再查 label。
 */

export const trackScopedTypes = ["GROUP", "CATEGORY", "TRACK_GROUP", "TRACK_CATEGORY"] as const;
export type TrackScopedType = (typeof trackScopedTypes)[number];

export type ScopedLabels = {
  /** type -> value -> label（全局字典） */
  global: Record<string, Record<string, string>>;
  /** trackId -> type -> value -> label */
  byTrack: Record<string, Record<string, Record<string, string>>>;
};

function put(map: Record<string, string>, list: { value: string; label: string }[]) {
  for (const item of list) map[item.value] = item.label;
}

/** 一次性载入所有赛道级与全局字典（量级很小，整表读一次即可）。 */
export async function loadScopedLabels(extraTypes: string[] = ["EDUCATION_STAGE", "ETHNICITY", "WORK_FORM"]): Promise<ScopedLabels> {
  const types = [...new Set([...trackScopedTypes, ...extraTypes])];
  const rows = await prisma.dictOption.findMany({
    where: { enabled: true, type: { in: types } },
    select: { type: true, trackId: true, value: true, label: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  const labels: ScopedLabels = { global: {}, byTrack: {} };
  for (const type of types) labels.global[type] = {};
  for (const row of rows) {
    if (row.trackId) {
      labels.byTrack[row.trackId] ??= {};
      labels.byTrack[row.trackId][row.type] ??= {};
      put(labels.byTrack[row.trackId][row.type], [row]);
    } else {
      labels.global[row.type] ??= {};
      put(labels.global[row.type], [row]);
    }
  }
  return labels;
}

/** 全局字段（民族/培养阶段/作品形式…）：只查全局字典，缺失时回退原值。 */
export function globalLabel(labels: ScopedLabels, type: string, value: string | null | undefined): string {
  if (!value) return "";
  return labels.global[type]?.[value] ?? value;
}

/**
 * 赛道级字段（项目组别/项目类别/作品组别/作品类别）：
 * 先按项目 trackId 查赛道挂载的字典，再回退全局字典，最后回退原值。
 */
export function trackLabel(
  labels: ScopedLabels,
  type: TrackScopedType,
  value: string | null | undefined,
  trackId: string | null | undefined,
): string {
  if (!value) return "";
  const fallbackType: TrackScopedType | null =
    type === "GROUP" ? "TRACK_GROUP" : type === "CATEGORY" ? "TRACK_CATEGORY" : null;
  if (trackId) {
    const scoped = labels.byTrack[trackId];
    const hit = scoped?.[type]?.[value] ?? (fallbackType ? scoped?.[fallbackType]?.[value] : undefined);
    if (hit) return hit;
  }
  return labels.global[type]?.[value] ?? (fallbackType ? labels.global[fallbackType]?.[value] : undefined) ?? value;
}
