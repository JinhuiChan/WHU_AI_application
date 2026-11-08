import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { Prisma, RegistrationStatus } from "@prisma/client";
import { BreadcrumbTitle } from "@/components/layout/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { awardWhereForRole } from "@/lib/award-visibility";
import { getActiveUser } from "@/lib/auth.server";
import {
  awardLevelLabels,
  awardStatusLabels,
  formatDate,
  memberRoleLabels,
  registrationStatusLabels,
  roleLabels,
} from "@/lib/presentation";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "个人主页" };
export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

type TimelineItem = {
  id: string;
  projectName: string;
  competitionName: string;
  trackName: string;
  role: string;
  status: RegistrationStatus;
  date: Date;
  dateLabel: string;
};

const awardSelection = {
  id: true,
  awardLevel: true,
  status: true,
  verifiedAt: true,
  createdAt: true,
  project: { select: { name: true } },
  competition: { select: { name: true, year: true } },
} satisfies Prisma.AwardRecordSelect;

type AwardItem = Prisma.AwardRecordGetPayload<{ select: typeof awardSelection }>;

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value || "未填写"}</dd>
    </div>
  );
}

export default async function PublicProfilePage({ params }: PageProps) {
  const viewer = await getActiveUser();
  if (!viewer) redirect("/login");

  const profile = await prisma.user.findFirst({
    where: { id: params.id, deletedAt: null, approvalStatus: "APPROVED" },
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
  if (!profile) notFound();

  const isStudent = profile.role === "STUDENT";
  const isTeacher = profile.role === "TEACHER";
  let timeline: TimelineItem[] = [];
  let awards: AwardItem[] = [];
  let teacherUnit = profile.trainingUnit ?? profile.college;
  let teacherTitle: string | null = null;

  if (isStudent) {
    const projectWhere: Prisma.ProjectWhereInput = {
      deletedAt: null,
      reviewStatus: { notIn: ["DRAFT", "REJECTED", "WITHDRAWN"] },
      OR: [
        { ownerId: profile.id },
        { teamMembers: { some: { userId: profile.id, leftAt: null } } },
      ],
    };
    const [projects, awardRows] = await Promise.all([
      prisma.project.findMany({
        where: projectWhere,
        select: {
          id: true,
          name: true,
          ownerId: true,
          reviewStatus: true,
          submittedAt: true,
          updatedAt: true,
          competition: { select: { name: true } },
          track: { select: { name: true } },
          teamMembers: {
            where: { userId: profile.id, leftAt: null },
            select: { role: true },
            take: 1,
          },
        },
        orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
      }),
      prisma.awardRecord.findMany({
        where: { ...awardWhereForRole(viewer.role), project: projectWhere },
        select: awardSelection,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      }),
    ]);
    timeline = projects.map((project) => ({
      id: project.id,
      projectName: project.name,
      competitionName: project.competition?.name ?? "未设置赛事",
      trackName: project.track?.name ?? "未设置赛道",
      role: project.ownerId === profile.id
        ? "负责人"
        : project.teamMembers[0]
          ? memberRoleLabels[project.teamMembers[0].role]
          : "成员",
      status: project.reviewStatus,
      date: project.submittedAt ?? project.updatedAt,
      dateLabel: project.submittedAt ? "提交" : "更新",
    }));
    awards = awardRows;
  } else if (isTeacher) {
    const [teacherRows, awardRows] = await Promise.all([
      prisma.teacher.findMany({
        where: { userId: profile.id, confirmStatus: "CONFIRMED", project: { deletedAt: null } },
        select: {
          id: true,
          unit: true,
          title: true,
          confirmedAt: true,
          createdAt: true,
          project: {
            select: {
              id: true,
              name: true,
              reviewStatus: true,
              competition: { select: { name: true } },
              track: { select: { name: true } },
            },
          },
        },
        orderBy: [{ confirmedAt: "desc" }, { createdAt: "desc" }],
      }),
      prisma.awardRecord.findMany({
        where: {
          ...awardWhereForRole(viewer.role),
          project: {
            deletedAt: null,
            teachers: { some: { userId: profile.id, confirmStatus: "CONFIRMED" } },
          },
        },
        select: awardSelection,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      }),
    ]);
    teacherUnit = teacherRows.find((row) => row.unit.trim())?.unit ?? teacherUnit;
    teacherTitle = teacherRows.find((row) => row.title?.trim())?.title ?? null;
    timeline = teacherRows.map((row) => ({
      id: row.id,
      projectName: row.project.name,
      competitionName: row.project.competition?.name ?? "未设置赛事",
      trackName: row.project.track?.name ?? "未设置赛道",
      role: "指导教师",
      status: row.project.reviewStatus,
      date: row.confirmedAt ?? row.createdAt,
      dateLabel: "确认指导",
    }));
    awards = awardRows;
  }

  const details = isStudent
    ? [
        { label: "学院", value: profile.college },
        { label: "专业", value: profile.major },
        { label: "年级", value: profile.grade },
        { label: "学号后 4 位", value: profile.studentNo?.slice(-4) },
      ]
    : isTeacher
      ? [{ label: "单位", value: teacherUnit }, { label: "职称", value: teacherTitle }]
      : [{ label: "单位", value: teacherUnit }];
  const recordTitle = isTeacher ? "指导记录" : isStudent ? "参赛记录" : "公开记录";

  return (
    <div className="space-y-6">
      <BreadcrumbTitle label={profile.name} />
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-50 text-2xl font-semibold text-blue-700">
            {Array.from(profile.name.trim())[0] ?? "?"}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">{profile.name}</h1>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                {roleLabels[profile.role]}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">个人公开主页</p>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 md:grid-cols-4">
          {details.map((item) => <InfoItem key={item.label} label={item.label} value={item.value} />)}
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">{recordTitle}（{timeline.length}）</h2>
        {timeline.length ? (
          <ol className="mt-5 space-y-5">
            {timeline.map((item) => (
              <li key={item.id} className="relative border-l border-slate-200 pl-5">
                <span aria-hidden="true" className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-blue-50" />
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">{item.competitionName} · {item.trackName}</p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900">{item.projectName}</h3>
                    <p className="mt-2 text-xs text-slate-500">
                      角色：{item.role} · {item.dateLabel}：<time dateTime={item.date.toISOString()}>{formatDate(item.date.toISOString())}</time>
                    </p>
                  </div>
                  <StatusBadge status={item.status} scope="registration">
                    {registrationStatusLabels[item.status]}
                  </StatusBadge>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            title={`暂无${recordTitle}`}
            description={isTeacher ? "已确认的指导关系会显示在这里。" : "可公开的参赛与项目记录会显示在这里。"}
          />
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">获奖记录（{awards.length}）</h2>
        {awards.length ? (
          <ul className="mt-3 divide-y divide-slate-100">
            {awards.map((award) => (
              <li key={award.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">{award.competition.year} · {award.competition.name}</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">{award.project.name}</h3>
                  <p className="mt-2 text-xs text-slate-500">
                    记录时间：<time dateTime={award.createdAt.toISOString()}>{formatDate(award.createdAt.toISOString())}</time>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                    {awardLevelLabels[award.awardLevel]}
                  </span>
                  <span className="text-slate-500">{awardStatusLabels[award.status]}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="暂无获奖记录" description="与本人关联且当前可见的获奖记录会显示在这里。" />
        )}
      </section>
    </div>
  );
}
