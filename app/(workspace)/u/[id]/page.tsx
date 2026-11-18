import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Prisma, RegistrationStatus } from "@prisma/client";
import { WhuEavesWatermark, WhuSeal } from "@/components/brand/whu-motifs";
import { BreadcrumbTitle } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHead, SectionRule } from "@/components/ui/section-head";
import { StatusBadge } from "@/components/ui/status-badge";
import { getActiveUser } from "@/lib/auth.server";
import {
  awardLevelLabels,
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
  createdAt: true,
  project: { select: { name: true } },
  competition: { select: { name: true, year: true } },
} satisfies Prisma.AwardSelect;

type AwardItem = Prisma.AwardGetPayload<{ select: typeof awardSelection }>;

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="t-label text-xs text-[#5c6c65]">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium tabular-nums text-[#0f1d18]">{value || "未填写"}</dd>
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
      bio: true,
      skills: true,
      showRecords: true,
      showAwards: true,
      extraRoles: { select: { role: true } },
    },
  });
  if (!profile) notFound();

  const roles = new Set([profile.role, ...profile.extraRoles.map((item) => item.role)]);
  const isStudent = roles.has("STUDENT");
  const isTeacher = roles.has("TEACHER");
  let studentTimeline: TimelineItem[] = [];
  let teacherTimeline: TimelineItem[] = [];
  let studentAwards: AwardItem[] = [];
  let teacherAwards: AwardItem[] = [];
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
      profile.showRecords
        ? prisma.project.findMany({
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
          })
        : Promise.resolve([]),
      profile.showAwards
        ? prisma.award.findMany({
            where: { project: projectWhere },
            select: awardSelection,
            orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          })
        : Promise.resolve([]),
    ]);
    studentTimeline = projects.map((project) => ({
      id: project.id,
      projectName: project.name,
      competitionName: project.competition?.name ?? "未设置赛事",
      trackName: project.track?.name ?? "未设置赛道",
      role:
        project.ownerId === profile.id
          ? "负责人"
          : project.teamMembers[0]
            ? memberRoleLabels[project.teamMembers[0].role]
            : "成员",
      status: project.reviewStatus,
      date: project.submittedAt ?? project.updatedAt,
      dateLabel: project.submittedAt ? "提交" : "更新",
    }));
    studentAwards = awardRows;
  }

  if (isTeacher) {
    const [teacherRows, awardRows] = await Promise.all([
      profile.showRecords
        ? prisma.teacher.findMany({
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
            orderBy: [{ confirmedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
          })
        : Promise.resolve([]),
      profile.showAwards
        ? prisma.award.findMany({
            where: {
              project: {
                deletedAt: null,
                teachers: { some: { userId: profile.id, confirmStatus: "CONFIRMED" } },
              },
            },
            select: awardSelection,
            orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          })
        : Promise.resolve([]),
    ]);
    const seenProjectIds = new Set<string>();
    const latestTeacherRows = teacherRows.filter((row) => {
      if (seenProjectIds.has(row.project.id)) return false;
      seenProjectIds.add(row.project.id);
      return true;
    });
    teacherUnit = teacherRows.find((row) => row.unit.trim())?.unit ?? teacherUnit;
    teacherTitle = teacherRows.find((row) => row.title?.trim())?.title ?? null;
    teacherTimeline = latestTeacherRows.map((row) => ({
      id: row.project.id,
      projectName: row.project.name,
      competitionName: row.project.competition?.name ?? "未设置赛事",
      trackName: row.project.track?.name ?? "未设置赛道",
      role: "指导教师",
      status: row.project.reviewStatus,
      date: row.confirmedAt ?? row.createdAt,
      dateLabel: "确认指导",
    }));
    teacherAwards = awardRows;
  }

  const skills = profile.skills.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
  const primaryUnit = isStudent ? profile.college : teacherUnit;
  const sealLabel = isStudent ? "珞珈学籍" : isTeacher ? "珞珈教籍" : "公开铭牌";
  const isSelf = viewer.id === profile.id;
  const details = [
    ...(isStudent
      ? [
          { label: "学院", value: profile.college },
          { label: "专业", value: profile.major },
          { label: "年级", value: profile.grade },
          { label: "学号后 4 位", value: profile.studentNo?.slice(-4) },
        ]
      : []),
    ...(isTeacher
      ? [
          { label: "所属单位", value: teacherUnit },
          { label: "专业技术职称", value: teacherTitle },
        ]
      : []),
    ...(!isStudent && !isTeacher ? [{ label: "所属单位", value: teacherUnit }] : []),
  ];
  const recordSections = [
    ...(isStudent
      ? [{ title: "参赛记录", timeline: studentTimeline, emptyDescription: "可公开的参赛与项目记录会显示在这里。" }]
      : []),
    ...(isTeacher
      ? [{ title: "指导记录", timeline: teacherTimeline, emptyDescription: "已确认的指导关系会显示在这里。" }]
      : []),
  ];
  const awardSections = [
    ...(isStudent ? [{ title: isTeacher ? "参赛获奖记录" : "获奖记录", awards: studentAwards }] : []),
    ...(isTeacher ? [{ title: isStudent ? "指导获奖记录" : "获奖记录", awards: teacherAwards }] : []),
  ];

  return (
    <div className="space-y-5">
      <BreadcrumbTitle label={profile.name} />

      <section className="relative overflow-hidden card border-[#c0d5ca] bg-gradient-to-br from-white via-[#fbfdfc] to-[#eef6f1] p-6 sm:p-7 before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-[#115740] before:via-[#237a5d] before:to-[#c59b45]">
        <WhuEavesWatermark className="pointer-events-none absolute -bottom-3 right-2 h-[128px] w-[224px] text-[#115740]/[0.06]" />

        <div className="relative z-[1] flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <span
              aria-hidden="true"
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[#c59b45]/80 bg-[#115740] font-display text-2xl font-bold text-[#f3e3b3] shadow-[0_4px_14px_-4px_rgba(17,87,64,0.35)] ring-4 ring-[#e5efe9]"
            >
              {Array.from(profile.name.trim())[0] ?? "珞"}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="t-page-title font-display text-2xl font-bold tracking-tight text-[#0e1d17] sm:text-[26px]">
                  {profile.name}
                </h1>
                <span className="inline-flex items-center rounded-full border border-[#c5d9ce] bg-[#eef5f1] px-2.5 py-0.5 text-xs font-semibold text-[#115740]">
                  {roleLabels[profile.role]}
                </span>
                {primaryUnit ? (
                  <span className="inline-flex items-center rounded-full border border-[#d5e2db] bg-white/85 px-2.5 py-0.5 text-xs font-medium text-[#2c3e36]">
                    {primaryUnit}
                  </span>
                ) : null}
                <WhuSeal label={sealLabel} />
              </div>
              <p className="mt-1.5 text-sm text-[#54635d]">武汉大学科创赛事平台公开铭牌主页</p>
            </div>
          </div>

          {isSelf ? (
            <Button
              asChild
              variant="outline"
              className="h-9 rounded-full border-[#7f9384] bg-white/90 px-4 text-xs font-medium text-[#24362f] hover:border-[#115740] hover:bg-[#f2f8f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
            >
              <Link href="/profile">编辑我的资料</Link>
            </Button>
          ) : null}
        </div>

        <dl className="relative z-[1] mt-6 grid grid-cols-2 gap-4 border-t border-[#dce8e1] pt-5 md:grid-cols-4">
          {details.map((item) => (
            <InfoItem key={item.label} label={item.label} value={item.value} />
          ))}
        </dl>
      </section>

      {profile.bio?.trim() || skills.length ? (
        <section className="card p-5 sm:p-6">
          <SectionHead title="简介与擅长技能" sub="本人公开展示的研究兴趣与技术专长标签" />
          <SectionRule className="mt-3.5" />
          {profile.bio?.trim() ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#1f3029]">{profile.bio}</p>
          ) : null}
          {skills.length ? (
            <div className={profile.bio?.trim() ? "mt-4 border-t border-[#e5eee8] pt-4" : "mt-4"}>
              <h3 className="t-label text-xs font-medium text-[#5c6c65]">擅长技能</h3>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                  <li
                    key={`${skill}-${index}`}
                    className="inline-flex items-center rounded-full border border-[#d0e0d6] bg-[#eef5f1] px-3 py-1 text-xs font-medium text-[#115740]"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {profile.showRecords
        ? recordSections.map(({ title, timeline, emptyDescription }) => (
            <section key={title} className="card p-5 sm:p-6">
              <SectionHead
                title={title}
                sub={title === "参赛记录" ? "已提交进入审核流转的本人参与项目履历" : "本人已确认指导关系的科创项目履历"}
                meta={
                  <span className="inline-flex items-center rounded-full border border-[#d0e0d6] bg-[#eef5f1] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-[#115740]">
                    共 {timeline.length} 项
                  </span>
                }
              />
              <SectionRule className="mt-3.5" />
              {timeline.length ? (
                <ol className="mt-5 space-y-5">
                  {timeline.map((item) => (
                    <li key={item.id} className="relative border-l border-[#cfe0d6] pl-5">
                      <span
                        aria-hidden="true"
                        className="absolute -left-[5.5px] top-1.5 h-2.5 w-2.5 rounded-full border border-[#c59b45] bg-[#115740] ring-4 ring-[#eef5f1]"
                      />
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-[#5c6c65]">
                            {item.competitionName}，{item.trackName}
                          </p>
                          <h3 className="mt-1 text-sm font-semibold text-[#0f1d18]">{item.projectName}</h3>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#5c6c65]">
                            <span className="inline-flex items-center rounded-full bg-[#eef5f1] px-2 py-0.5 font-medium text-[#115740]">
                              {item.role}
                            </span>
                            <span className="tabular-nums">
                              {item.dateLabel}：
                              <time dateTime={item.date.toISOString()}>{formatDate(item.date.toISOString())}</time>
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={item.status} scope="registration">
                          {registrationStatusLabels[item.status]}
                        </StatusBadge>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState title={`暂无${title}`} description={emptyDescription} />
              )}
            </section>
          ))
        : null}

      {profile.showAwards
        ? awardSections.map(({ title, awards }) => (
            <section key={title} className="card p-5 sm:p-6">
              <SectionHead
                title={title}
                sub="经学校核验归档的科创赛事荣誉记录"
                meta={
                  <span className="inline-flex items-center rounded-full border border-[#dfc890] bg-[#fcf7eb] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-[#7d5914]">
                    共 {awards.length} 项
                  </span>
                }
              />
              <SectionRule className="mt-3.5" />
              {awards.length ? (
                <ul className="mt-3 divide-y divide-[#e6efe9]">
                  {awards.map((award) => (
                    <li key={award.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                      <div className="min-w-0">
                        <p className="text-xs tabular-nums text-[#5c6c65]">
                          {award.competition.year} 年度，{award.competition.name}
                        </p>
                        <h3 className="mt-1 text-sm font-semibold text-[#0f1d18]">{award.project.name}</h3>
                        <p className="mt-2 text-xs tabular-nums text-[#5c6c65]">
                          记录时间：
                          <time dateTime={award.createdAt.toISOString()}>
                            {formatDate(award.createdAt.toISOString())}
                          </time>
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center rounded-full border border-[#dfc890] bg-[#fcf7eb] px-3 py-1 font-semibold text-[#7d5914]">
                          {awardLevelLabels[award.awardLevel]}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title={`暂无${title}`} description="与本人关联且当前可见的获奖记录会显示在这里。" />
              )}
            </section>
          ))
        : null}
    </div>
  );
}
