import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, ButtonArrow } from "@/components/ui/button";
import { getActiveUser } from "@/lib/auth.server";
import { roleLabels } from "@/lib/presentation";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "我的资料" };
export const dynamic = "force-dynamic";

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value || "未填写"}</dd>
    </div>
  );
}

export default async function ProfilePage() {
  const viewer = await getActiveUser();
  if (!viewer) redirect("/login");

  const profile = await prisma.user.findFirst({
    where: { id: viewer.id, deletedAt: null, approvalStatus: "APPROVED" },
    select: {
      id: true,
      name: true,
      role: true,
      studentNo: true,
      college: true,
      major: true,
      grade: true,
      trainingUnit: true,
    },
  });
  if (!profile) redirect("/login");

  const isStudent = profile.role === "STUDENT";
  const isTeacher = profile.role === "TEACHER";
  const teacher = isTeacher
    ? await prisma.teacher.findFirst({
        where: { userId: profile.id, confirmStatus: "CONFIRMED", project: { deletedAt: null } },
        select: { unit: true, title: true },
        orderBy: [{ confirmedAt: "desc" }, { createdAt: "desc" }],
      })
    : null;
  const teacherUnit = teacher?.unit || profile.trainingUnit || profile.college;
  const details = isStudent
    ? [
        { label: "学院", value: profile.college },
        { label: "专业", value: profile.major },
        { label: "年级", value: profile.grade },
        { label: "学号后 4 位", value: profile.studentNo?.slice(-4) },
      ]
    : isTeacher
      ? [{ label: "单位", value: teacherUnit }, { label: "职称", value: teacher?.title }]
      : [{ label: "单位", value: teacherUnit }];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">我的资料</h1>
          <p className="mt-1 text-sm text-slate-500">查看当前账号的身份与公开资料。</p>
        </div>
        <Button asChild className="group">
          <Link href={`/u/${profile.id}`}>
            查看我的主页
            <ButtonArrow />
          </Link>
        </Button>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-50 text-2xl font-semibold text-blue-700">
            {Array.from(profile.name.trim())[0] ?? "?"}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-900">{profile.name}</h2>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                {roleLabels[profile.role]}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">资料当前为只读状态</p>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 md:grid-cols-4">
          {details.map((item) => <InfoItem key={item.label} label={item.label} value={item.value} />)}
        </dl>
      </section>
    </div>
  );
}
