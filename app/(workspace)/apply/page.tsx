import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApplyForm } from "@/components/apply/apply-form";
import type { ApplyOptions } from "@/components/apply/apply-form";
import { getMyProject } from "@/lib/apply";
import { getActiveUser } from "@/lib/auth.server";
import { listOptions } from "@/lib/dict";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "项目报名" };
export const dynamic = "force-dynamic";

type FlatTrack = { id: string; parentId: string | null; name: string; kind: string };

function trackTree(tracks: FlatTrack[], parentId: string | null = null): ApplyOptions["competitions"][number]["tracks"] {
  return tracks
    .filter((track) => track.parentId === parentId)
    .map((track) => ({ ...track, children: trackTree(tracks, track.id) }));
}

type PageProps = { searchParams?: { projectId?: string | string[]; competitionId?: string | string[] } };

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ApplyPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/dashboard");
  const projectId = firstParam(searchParams?.projectId);
  const competitionId = firstParam(searchParams?.competitionId);

  const [student, competitions, ethnicities, educationStages, workForms, groups, categories] = await Promise.all([
    prisma.user.findFirst({
      where: { id: user.id, role: "STUDENT", deletedAt: null },
      select: {
        studentNo: true,
        name: true,
        college: true,
        trainingUnit: true,
        major: true,
        grade: true,
        gender: true,
        ethnicity: true,
        educationStage: true,
        enrollmentYear: true,
        graduationYear: true,
        phone: true,
        email: true,
        boundFinancePlatform: true,
      },
    }),
    prisma.competition.findMany({
      where: competitionId ? { id: competitionId } : undefined,
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
  if (!student) redirect("/login");
  const existing = projectId ? await getMyProject(projectId, user.id) : null;
  if (projectId && !existing) redirect("/my");
  const labels = (items: Array<{ value: string; label: string }>) => items.map(({ value, label }) => ({ value, label }));
  const options: ApplyOptions = {
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
  };

  return (
    <div className="space-y-5">
      <header className="rounded-lg border border-blue-100 bg-blue-50 px-5 py-4">
        <h1 className="text-xl font-semibold text-slate-900">项目报名</h1>
        <p className="mt-1 text-sm text-blue-900">当前学生：{student.studentNo ?? "未绑定学号"} · {student.name}</p>
      </header>
      <ApplyForm
        student={student}
        options={options}
        projectId={projectId}
        initialValue={existing?.formInput}
        lockedCompetitionId={competitionId}
      />
    </div>
  );
}
