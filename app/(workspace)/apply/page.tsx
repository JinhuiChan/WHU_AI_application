import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApplyForm } from "@/components/apply/apply-form";
import { getMyProject, getTeamAcceptedMembers } from "@/lib/apply";
import { buildApplyOptions } from "@/lib/apply-options";
import { getActiveUser } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "项目报名" };
export const dynamic = "force-dynamic";

type PageProps = { searchParams?: { projectId?: string | string[]; competitionId?: string | string[]; teamPostId?: string | string[] } };

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ApplyPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/dashboard");
  const projectId = firstParam(searchParams?.projectId);
  const competitionId = firstParam(searchParams?.competitionId);
  const teamPostId = firstParam(searchParams?.teamPostId);

  // 草稿/已下架赛事不能新报名（编辑已有项目不受影响）
  if (competitionId && !projectId) {
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      select: { publishStatus: true },
    });
    if (!competition || competition.publishStatus !== "PUBLISHED") redirect("/competitions");
  }

  const student = await prisma.user.findFirst({
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
  });
  if (!student) redirect("/login");

  const existing = projectId ? await getMyProject(projectId, user.id) : null;
  if (projectId && !existing) redirect("/my");
  // 普通成员（非负责人）不能编辑，直接回我的项目
  if (projectId && existing && !existing.canEdit) redirect("/my");

  // 报名必须在赛事内进行：优先用 URL 上的 competitionId，编辑时取项目所属赛事；
  // 两者都没有（例如直接访问 /apply）就回赛事列表，避免把所有赛事混在一个下拉里。
  const lockedCompetitionId = competitionId || existing?.formInput.competitionId || "";
  if (!lockedCompetitionId) redirect("/competitions");

  const options = await buildApplyOptions(lockedCompetitionId);
  const initialMembers = teamPostId ? await getTeamAcceptedMembers(teamPostId, user.id) : undefined;

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
        <h1 className="text-xl font-semibold text-slate-900">项目报名</h1>
        <p className="mt-1 text-sm text-blue-900">当前学生：{student.studentNo ?? "未绑定学号"} · {student.name}</p>
      </header>
      <ApplyForm
        student={student}
        options={options}
        projectId={projectId}
        initialValue={existing?.formInput}
        initialMembers={initialMembers}
        lockedCompetitionId={lockedCompetitionId}
      />
    </div>
  );
}
