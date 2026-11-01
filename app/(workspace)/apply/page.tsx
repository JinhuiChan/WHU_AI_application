import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApplyForm } from "@/components/apply/apply-form";
import { getMyProject } from "@/lib/apply";
import { buildApplyOptions } from "@/lib/apply-options";
import { getActiveUser } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "项目报名" };
export const dynamic = "force-dynamic";

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

  const [student, options] = await Promise.all([
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
    // 与 /api/apply/options 共用同一实现：组别/类别只取「当前赛道」挂载的字典
    buildApplyOptions(competitionId || undefined),
  ]);
  if (!student) redirect("/login");
  const existing = projectId ? await getMyProject(projectId, user.id) : null;
  if (projectId && !existing) redirect("/my");

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
