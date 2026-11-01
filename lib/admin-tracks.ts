import { prisma } from "@/lib/prisma";

/**
 * 赛道 / 组别 / 类别 的后台配置服务（P0-1）。
 *
 * 重要约定：
 * 1) 删除赛道前必须先清理它的 DictOption —— 否则 onDelete: SetNull 会把这些选项洗成"全局字典"，
 *    污染所有赛事的组别/类别下拉（B1 修的就是这个坑）。
 * 2) 已有项目引用的赛道不允许删除；子赛道非空不允许删除。
 * 3) 组别/类别只做"新增 + 停用"，不物理删除、不改 value —— 历史项目的 groupName/categoryName
 *    存的仍是旧 value，物理删除会让历史数据失去 label。
 */

export class TrackAdminError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "TrackAdminError";
  }
}

export type TrackOptionView = { id: string; value: string; label: string; enabled: boolean; sortOrder: number };

export type TrackView = {
  id: string;
  parentId: string | null;
  name: string;
  kind: string;
  enabled: boolean;
  sortOrder: number;
  projectCount: number;
  groups: TrackOptionView[];
  categories: TrackOptionView[];
  children: TrackView[];
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function listTracks(competitionId: string): Promise<TrackView[]> {
  const tracks = await prisma.track.findMany({
    where: { competitionId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      parentId: true,
      name: true,
      kind: true,
      enabled: true,
      sortOrder: true,
      _count: { select: { projects: true } },
      dictOptions: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, value: true, label: true, enabled: true, sortOrder: true, type: true },
      },
    },
  });
  const nodes = tracks.map((track) => ({
    id: track.id,
    parentId: track.parentId,
    name: track.name,
    kind: track.kind,
    enabled: track.enabled,
    sortOrder: track.sortOrder,
    projectCount: track._count.projects,
    groups: track.dictOptions.filter((item) => item.type === "GROUP").map(((item) => ({
      id: item.id, value: item.value, label: item.label, enabled: item.enabled, sortOrder: item.sortOrder,
    }))),
    categories: track.dictOptions.filter((item) => item.type === "CATEGORY").map(((item) => ({
      id: item.id, value: item.value, label: item.label, enabled: item.enabled, sortOrder: item.sortOrder,
    }))),
    children: [] as TrackView[],
  })) as TrackView[];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const roots: TrackView[] = [];
  for (const node of nodes) {
    if (node.parentId && byId.has(node.parentId)) byId.get(node.parentId)!.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export async function createTrack(input: { competitionId: string; parentId?: string | null; name: string; kind?: string }) {
  const name = text(input.name);
  if (!name) throw new TrackAdminError(422, "赛道名称不能为空");
  const competition = await prisma.competition.findUnique({ where: { id: input.competitionId }, select: { id: true } });
  if (!competition) throw new TrackAdminError(404, "赛事不存在");
  if (input.parentId) {
    const parent = await prisma.track.findFirst({ where: { id: input.parentId, competitionId: input.competitionId }, select: { id: true } });
    if (!parent) throw new TrackAdminError(422, "父级赛道不属于该赛事");
  }
  const duplicated = await prisma.track.findFirst({
    where: { competitionId: input.competitionId, parentId: input.parentId ?? null, name },
    select: { id: true },
  });
  if (duplicated) throw new TrackAdminError(409, "同级下已存在同名赛道");
  const maxOrder = await prisma.track.aggregate({
    where: { competitionId: input.competitionId, parentId: input.parentId ?? null },
    _max: { sortOrder: true },
  });
  return prisma.track.create({
    data: {
      competitionId: input.competitionId,
      parentId: input.parentId ?? null,
      name,
      kind: text(input.kind) || (input.parentId ? "BRANCH" : "TRACK"),
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      enabled: true,
    },
    select: { id: true, name: true, parentId: true },
  });
}

export async function updateTrack(input: { id: string; name?: string; enabled?: boolean; sortOrder?: number }) {
  const track = await prisma.track.findUnique({ where: { id: input.id }, select: { id: true, competitionId: true, parentId: true } });
  if (!track) throw new TrackAdminError(404, "赛道不存在");
  const data: { name?: string; enabled?: boolean; sortOrder?: number } = {};
  if (input.name !== undefined) {
    const name = text(input.name);
    if (!name) throw new TrackAdminError(422, "赛道名称不能为空");
    const duplicated = await prisma.track.findFirst({
      where: { competitionId: track.competitionId, parentId: track.parentId, name, id: { not: track.id } },
      select: { id: true },
    });
    if (duplicated) throw new TrackAdminError(409, "同级下已存在同名赛道");
    data.name = name;
  }
  if (input.enabled !== undefined) data.enabled = input.enabled;
  if (input.sortOrder !== undefined && Number.isFinite(input.sortOrder)) data.sortOrder = Math.trunc(input.sortOrder);
  if (!Object.keys(data).length) throw new TrackAdminError(422, "没有需要更新的字段");
  return prisma.track.update({ where: { id: track.id }, data, select: { id: true } });
}

export async function deleteTrack(id: string) {
  const track = await prisma.track.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { children: true, projects: true } } },
  });
  if (!track) throw new TrackAdminError(404, "赛道不存在");
  if (track._count.children > 0) throw new TrackAdminError(409, `「${track.name}」还有 ${track._count.children} 个子赛道，请先删除子赛道`);
  if (track._count.projects > 0) throw new TrackAdminError(409, `「${track.name}」已被 ${track._count.projects} 个项目引用，不能删除；可改为停用`);
  await prisma.$transaction(async (transaction) => {
    // 先删字典，避免 onDelete: SetNull 把它们变成全局字典
    await transaction.dictOption.deleteMany({ where: { trackId: track.id } });
    await transaction.track.delete({ where: { id: track.id } });
  });
  return { id: track.id };
}

/**
 * 覆盖保存某个赛道的组别或类别。
 * - 已存在的标签：保留 value（历史数据不用动），只更新 sortOrder / enabled
 * - 新增标签：分配该赛道该类型下一个未被占用的序号 value（G/C 前缀）
 * - 被移除的标签：只停用，不删除
 */
export async function saveTrackOptions(input: { trackId: string; kind: "GROUP" | "CATEGORY"; labels: string[] }) {
  const track = await prisma.track.findUnique({ where: { id: input.trackId }, select: { id: true } });
  if (!track) throw new TrackAdminError(404, "赛道不存在");
  const labels = [...new Set(input.labels.map((item) => text(item)).filter(Boolean))];
  if (labels.length > 60) throw new TrackAdminError(422, "同一赛道同类选项不能超过 60 个");
  const existing = await prisma.dictOption.findMany({
    where: { trackId: input.trackId, type: input.kind },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const prefix = input.kind === "GROUP" ? "G" : "C";
  let maxNumber = 0;
  for (const option of existing) {
    const matched = new RegExp(`^${prefix}(\\d+)$`).exec(option.value);
    if (matched) maxNumber = Math.max(maxNumber, Number(matched[1]));
  }
  const labelToOption = new Map(existing.map((option) => [option.label, option]));

  await prisma.$transaction(async (transaction) => {
    for (const [index, label] of labels.entries()) {
      const hit = labelToOption.get(label);
      if (hit) {
        await transaction.dictOption.update({
          where: { id: hit.id },
          data: { enabled: true, sortOrder: index + 1 },
        });
        continue;
      }
      maxNumber += 1;
      await transaction.dictOption.create({
        data: {
          type: input.kind,
          value: `${prefix}${maxNumber}`,
          label,
          trackId: input.trackId,
          sortOrder: index + 1,
          enabled: true,
        },
      });
    }
    const keep = new Set(labels);
    const removed = existing.filter((option) => !keep.has(option.label)).map((option) => option.id);
    if (removed.length) {
      await transaction.dictOption.updateMany({ where: { id: { in: removed } }, data: { enabled: false } });
    }
  });

  const fresh = await prisma.dictOption.findMany({
    where: { trackId: input.trackId, type: input.kind },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, value: true, label: true, enabled: true, sortOrder: true },
  });
  return fresh;
}
