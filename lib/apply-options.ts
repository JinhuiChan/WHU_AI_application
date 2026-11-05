import { prisma } from "@/lib/prisma";
import { listOptions } from "@/lib/dict";

/**
 * 报名页选项的唯一实现（服务端首屏与 /api/apply/options 共用）。
 *
 * 铁律：项目组别/项目类别只能按「当前所选赛道」取该赛道挂载的字典，
 * 绝不能把所有赛道的字典合并返回（跨赛道 value 会重号，详见 lib/dict-labels.ts）。
 */

export type DictionaryItem = { value: string; label: string };

export type FlatTrack = { id: string; parentId: string | null; name: string; kind: string };

export type TrackOptionNode = FlatTrack & {
  groups: DictionaryItem[];
  categories: DictionaryItem[];
  children: TrackOptionNode[];
};

export type ApplyOptionPayload = {
  competitions: Array<{ id: string; name: string; year: number; tracks: TrackOptionNode[] }>;
  dictionaries: {
    ethnicities: DictionaryItem[];
    educationStages: DictionaryItem[];
    workForms: DictionaryItem[];
    groups: DictionaryItem[];
    categories: DictionaryItem[];
    /** 培养单位 / 申报单位候选：全局字典 ∪ 现有档案与历史项目里的单位（去重保序） */
    units: string[];
  };
};

type DictionaryOption = { type: string; trackId: string | null; value: string; label: string };

const toItems = (items: Array<{ value: string; label: string }>): DictionaryItem[] =>
  items.map(({ value, label }) => ({ value, label }));

function globalOptions(options: DictionaryOption[], primary: string, fallback: string): DictionaryItem[] {
  const primaryItems = options.filter((item) => item.trackId === null && item.type === primary);
  return toItems(
    primaryItems.length ? primaryItems : options.filter((item) => item.trackId === null && item.type === fallback),
  );
}

function scopedOptions(
  options: DictionaryOption[],
  trackId: string,
  primary: string,
  fallback: string,
): DictionaryItem[] | undefined {
  const primaryItems = options.filter((item) => item.trackId === trackId && item.type === primary);
  if (primaryItems.length) return toItems(primaryItems);
  const fallbackItems = options.filter((item) => item.trackId === trackId && item.type === fallback);
  return fallbackItems.length ? toItems(fallbackItems) : undefined;
}

function trackTree(
  tracks: FlatTrack[],
  dictionaryOptions: DictionaryOption[],
  parentId: string | null = null,
  inherited?: { groups: DictionaryItem[]; categories: DictionaryItem[] },
): TrackOptionNode[] {
  return tracks
    .filter((track) => track.parentId === parentId)
    .map((track) => {
      const groups =
        scopedOptions(dictionaryOptions, track.id, "GROUP", "TRACK_GROUP") ??
        inherited?.groups ??
        globalOptions(dictionaryOptions, "GROUP", "TRACK_GROUP");
      const categories =
        scopedOptions(dictionaryOptions, track.id, "CATEGORY", "TRACK_CATEGORY") ??
        inherited?.categories ??
        globalOptions(dictionaryOptions, "CATEGORY", "TRACK_CATEGORY");
      return {
        ...track,
        groups,
        categories,
        children: trackTree(tracks, dictionaryOptions, track.id, { groups, categories }),
      };
    });
}

/** 只读选择：给定 competitionId 时只返回该赛事（报名入口锁定赛事用）。 */
export async function buildApplyOptions(competitionId?: string): Promise<ApplyOptionPayload> {
  const [
    competitions,
    ethnicities,
    educationStages,
    workForms,
    dictionaryOptions,
    trainingUnits,
    applicationUnits,
    userColleges,
    userTrainingUnits,
    projectApplicationUnits,
    projectTrainingUnits,
  ] = await Promise.all([
    prisma.competition.findMany({
      where: competitionId ? { id: competitionId } : { publishStatus: "PUBLISHED" },
      select: {
        id: true,
        name: true,
        year: true,
        tracks: {
          where: { enabled: true },
          select: { id: true, parentId: true, name: true, kind: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ year: "desc" }, { name: "asc" }],
    }),
    listOptions("ETHNICITY", { trackId: null }),
    listOptions("EDUCATION_STAGE", { trackId: null }),
    listOptions("WORK_FORM", { trackId: null }),
    prisma.dictOption.findMany({
      where: { enabled: true, type: { in: ["GROUP", "CATEGORY", "TRACK_GROUP", "TRACK_CATEGORY"] } },
      select: { type: true, trackId: true, value: true, label: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
    listOptions("TRAINING_UNIT", { trackId: null }),
    listOptions("APPLICATION_UNIT", { trackId: null }),
    prisma.user.groupBy({ by: ["college"], where: { deletedAt: null }, orderBy: { college: "asc" } }),
    prisma.user.groupBy({ by: ["trainingUnit"], where: { deletedAt: null }, orderBy: { trainingUnit: "asc" } }),
    prisma.project.groupBy({ by: ["applicationUnit"], where: { deletedAt: null }, orderBy: { applicationUnit: "asc" } }),
    prisma.project.groupBy({ by: ["trainingUnit"], where: { deletedAt: null }, orderBy: { trainingUnit: "asc" } }),
  ]);
  const units = [...new Set([
    ...trainingUnits.map((item) => item.label),
    ...applicationUnits.map((item) => item.label),
    ...userColleges.map((item) => item.college),
    ...userTrainingUnits.map((item) => item.trainingUnit),
    ...projectApplicationUnits.map((item) => item.applicationUnit),
    ...projectTrainingUnits.map((item) => item.trainingUnit),
  ].map((item) => (item ?? "").trim()).filter(Boolean))];
  return {
    competitions: competitions.map((competition) => ({
      id: competition.id,
      name: competition.name,
      year: competition.year,
      tracks: trackTree(competition.tracks, dictionaryOptions),
    })),
    dictionaries: {
      ethnicities: toItems(ethnicities),
      educationStages: toItems(educationStages),
      workForms: toItems(workForms),
      groups: globalOptions(dictionaryOptions, "GROUP", "TRACK_GROUP"),
      categories: globalOptions(dictionaryOptions, "CATEGORY", "TRACK_CATEGORY"),
      units,
    },
  };
}
