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
type TrackNode = FlatTrack & { children: TrackNode[] };

function trackTree(tracks: FlatTrack[], parentId: string | null = null): TrackNode[] {
  return tracks
    .filter((track) => track.parentId === parentId)
    .map((track) => ({ ...track, children: trackTree(tracks, track.id) }));
}

export async function GET() {
  const authorization = await requireApiRoles(["STUDENT"]);
  if (!authorization.ok) return authorization.response;
  try {
    const [competitions, ethnicities, educationStages, workForms, groups, categories] = await Promise.all([
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
      listOptions("GROUP"),
      listOptions("CATEGORY"),
    ]);
    const labels = (items: Array<{ value: string; label: string }>) => items.map(({ value, label }) => ({ value, label }));
    return apiSuccess({
      competitions: competitions.map((competition) => ({
        id: competition.id,
        name: competition.name,
        year: competition.year,
        tracks: trackTree(competition.tracks),
      })),
      dictionaries: {
        ethnicities: labels(ethnicities),
        educationStages: labels(educationStages),
        workForms: labels(workForms),
        groups: labels(groups),
        categories: labels(categories),
      },
    }, "查询成功");
  } catch (error) {
    console.error("报名选项读取失败：", error);
    return apiError(500, "报名选项读取失败");
  }
}
