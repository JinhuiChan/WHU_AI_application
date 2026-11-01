import { apiError, apiSuccess } from "@/lib/api";
import { requireApiRoles } from "@/lib/auth.server";
import { listOptions } from "@/lib/dict";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type FlatTrack = {
  id: string;
  parentId: string | null;
  name: string;
  kind: string;
};
type DictionaryOption = {
  type: string;
  trackId: string | null;
  value: string;
  label: string;
};
type OptionItem = { value: string; label: string };
type TrackNode = FlatTrack & {
  groups: OptionItem[];
  categories: OptionItem[];
  children: TrackNode[];
};

const labels = (items: Array<{ value: string; label: string }>): OptionItem[] => items.map(({ value, label }) => ({ value, label }));

function globalOptions(options: DictionaryOption[], primary: string, fallback: string): OptionItem[] {
  const primaryItems = options.filter((item) => item.trackId === null && item.type === primary);
  return labels(primaryItems.length ? primaryItems : options.filter((item) => item.trackId === null && item.type === fallback));
}

function scopedOptions(options: DictionaryOption[], trackId: string, primary: string, fallback: string): OptionItem[] | undefined {
  const primaryItems = options.filter((item) => item.trackId === trackId && item.type === primary);
  if (primaryItems.length) return labels(primaryItems);
  const fallbackItems = options.filter((item) => item.trackId === trackId && item.type === fallback);
  return fallbackItems.length ? labels(fallbackItems) : undefined;
}

function trackTree(
  tracks: FlatTrack[],
  dictionaryOptions: DictionaryOption[],
  parentId: string | null = null,
  inherited?: { groups: OptionItem[]; categories: OptionItem[] },
): TrackNode[] {
  return tracks
    .filter((track) => track.parentId === parentId)
    .map((track) => {
      const groups = scopedOptions(dictionaryOptions, track.id, "GROUP", "TRACK_GROUP")
        ?? inherited?.groups
        ?? globalOptions(dictionaryOptions, "GROUP", "TRACK_GROUP");
      const categories = scopedOptions(dictionaryOptions, track.id, "CATEGORY", "TRACK_CATEGORY")
        ?? inherited?.categories
        ?? globalOptions(dictionaryOptions, "CATEGORY", "TRACK_CATEGORY");
      return {
        ...track,
        groups,
        categories,
        children: trackTree(tracks, dictionaryOptions, track.id, { groups, categories }),
      };
    });
}

export async function GET() {
  const authorization = await requireApiRoles(["STUDENT"]);
  if (!authorization.ok) return authorization.response;
  try {
    const [competitions, ethnicities, educationStages, workForms, dictionaryOptions] = await Promise.all([
      prisma.competition.findMany({
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
      listOptions("ETHNICITY"),
      listOptions("EDUCATION_STAGE"),
      listOptions("WORK_FORM"),
      prisma.dictOption.findMany({
        where: { enabled: true, type: { in: ["GROUP", "CATEGORY", "TRACK_GROUP", "TRACK_CATEGORY"] } },
        select: { type: true, trackId: true, value: true, label: true },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      }),
    ]);
    return apiSuccess({
      competitions: competitions.map((competition) => ({
        id: competition.id,
        name: competition.name,
        year: competition.year,
        tracks: trackTree(competition.tracks, dictionaryOptions),
      })),
      dictionaries: {
        ethnicities: labels(ethnicities),
        educationStages: labels(educationStages),
        workForms: labels(workForms),
        groups: globalOptions(dictionaryOptions, "GROUP", "TRACK_GROUP"),
        categories: globalOptions(dictionaryOptions, "CATEGORY", "TRACK_CATEGORY"),
      },
    }, "查询成功");
  } catch (error) {
    console.error("报名选项读取失败：", error);
    return apiError(500, "报名选项读取失败");
  }
}
