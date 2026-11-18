import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { WhuEavesWatermark, WhuSeal, WhuTitleRule } from "@/components/brand/whu-motifs";
import { ProfileForm } from "@/components/profile/profile-form";
import { Button, ButtonArrow } from "@/components/ui/button";
import { getActiveUser } from "@/lib/auth.server";
import { roleLabels } from "@/lib/presentation";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "我的资料" };
export const dynamic = "force-dynamic";

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="t-label text-xs text-[#5c6c65]">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium tabular-nums text-[#0f1d18]">{value || "未填写"}</dd>
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
      bio: true,
      avatarUrl: true,
      skills: true,
      showRecords: true,
      showAwards: true,
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
  const primaryUnit = isStudent ? profile.college : teacherUnit;
  const sealLabel = isStudent ? "珞珈学籍" : isTeacher ? "珞珈教籍" : "管理铭牌";
  const details = isStudent
    ? [
        { label: "学院", value: profile.college },
        { label: "专业", value: profile.major },
        { label: "年级", value: profile.grade },
        { label: "学号后 4 位", value: profile.studentNo?.slice(-4) },
      ]
    : isTeacher
      ? [
          { label: "所属单位", value: teacherUnit },
          { label: "专业技术职称", value: teacher?.title },
        ]
      : [{ label: "所属单位", value: teacherUnit }];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="t-page-title font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
              我的资料
            </h1>
            <WhuSeal label={sealLabel} />
          </div>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-[#54635d]">
            <WhuTitleRule />
            <span>核对当前账号实名档案，维护个人公开主页展示的简介、专长技能与履历可见性。</span>
          </p>
        </div>
        <Button
          asChild
          className="group h-10 rounded-full bg-[#115740] px-5 text-white hover:bg-[#0d4633] active:bg-[#093426] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
        >
          <Link href={`/u/${profile.id}`}>
            查看我的主页
            <ButtonArrow />
          </Link>
        </Button>
      </div>

      <section className="relative overflow-hidden card border-[#c0d5ca] bg-gradient-to-br from-white via-[#fbfdfc] to-[#eef6f1] p-6 sm:p-7 before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-[#115740] before:via-[#237a5d] before:to-[#c59b45]">
        <WhuEavesWatermark className="pointer-events-none absolute -bottom-3 right-2 h-[126px] w-[220px] text-[#115740]/[0.06]" />

        <div className="relative z-[1] flex flex-wrap items-center gap-4 sm:gap-5">
          <span
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[#c59b45]/80 bg-[#115740] font-display text-2xl font-bold text-[#f3e3b3] shadow-[0_4px_14px_-4px_rgba(17,87,64,0.35)] ring-4 ring-[#e5efe9]"
          >
            {Array.from(profile.name.trim())[0] ?? "珞"}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-bold tracking-tight text-[#0e1d17] sm:text-2xl">
                {profile.name}
              </h2>
              <span className="inline-flex items-center rounded-full border border-[#c5d9ce] bg-[#eef5f1] px-2.5 py-0.5 text-xs font-semibold text-[#115740]">
                {roleLabels[profile.role]}
              </span>
              {primaryUnit ? (
                <span className="inline-flex items-center rounded-full border border-[#d5e2db] bg-white/85 px-2.5 py-0.5 text-xs font-medium text-[#2c3e36]">
                  {primaryUnit}
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 text-xs text-[#5c6c65]">
              以上实名身份档案为只读记录，如需变更所属院系或学工号请联系学院管理员。
            </p>
          </div>
        </div>

        <dl className="relative z-[1] mt-6 grid grid-cols-2 gap-4 border-t border-[#dce8e1] pt-5 md:grid-cols-4">
          {details.map((item) => (
            <InfoItem key={item.label} label={item.label} value={item.value} />
          ))}
        </dl>
      </section>

      <ProfileForm initialValue={profile} />
    </div>
  );
}
