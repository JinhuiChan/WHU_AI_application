import { BackLink } from "@/components/data/list-link";
import { WhuSeal, WhuTitleRule } from "@/components/brand/whu-motifs";
import { firstParam } from "@/lib/list-query";
import { ProjectProgress } from "@/components/project/project-progress";
import { SectionHead } from "@/components/ui/section-head";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button, ButtonArrow } from "@/components/ui/button";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DatasetExport } from "@/components/export/dataset-export";
import { BreadcrumbTitle } from "@/components/layout/breadcrumbs";
import { ChangeRequestPanel } from "@/components/change/change-request-panel";
import { SealedPanel } from "@/components/sealed/sealed-panel";
import { getMyProject } from "@/lib/apply";
import { getActiveUser } from "@/lib/auth.server";
import { getChangeRequestPanel } from "@/lib/change";
import { formatDateTime, projectStatusLabels } from "@/lib/presentation";
import { canExportFullForm, currentSealedFileId, listSealedFiles } from "@/lib/sealed";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "项目详情" };
export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

function Item({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-[#5c6c65]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-[#0f1d18]">
        {value === "" || value === null || value === undefined ? "—" : value}
      </dd>
    </div>
  );
}

export default async function MyProjectPage({ params, searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/dashboard");
  const project = await getMyProject(params.id, user.id);
  if (!project) notFound();
  const latestRejectedReview = project.reviewStatus === "REJECTED"
    ? await prisma.review.findFirst({
        where: { projectId: params.id, result: "REJECTED" },
        orderBy: { createdAt: "desc" },
        select: { level: true },
      })
    : null;
  const form = project.formInput;
  const sealedFiles = await listSealedFiles(params.id);
  const currentFileId = currentSealedFileId(sealedFiles);
  const canExportSensitive = await canExportFullForm(params.id, user);
  const changePanel = await getChangeRequestPanel(params.id, user.id);

  return (
    <div className="space-y-5">
      <BreadcrumbTitle label={project.name} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <BackLink to={firstParam(searchParams?.from)} fallback="/my" label="返回我的项目" />
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <h1 className="t-page-title break-words font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
              {project.name}
            </h1>
            <WhuSeal label="项目档案" />
          </div>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-[#54635d]">
            <WhuTitleRule />
            <span>{project.competitionName} / {project.trackName}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusBadge status={project.status} scope="project">{projectStatusLabels[project.status]}</StatusBadge>
          {project.canEdit ? (
            <Button
              asChild
              size="sm"
              className="rounded-full bg-[#115740] px-5 text-white hover:bg-[#0d4633] active:scale-[0.98] active:bg-[#093526] focus-visible:ring-[#115740]/25 disabled:opacity-60"
            >
              <Link href={`/apply?projectId=${project.id}`}>编辑报名表</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <ProjectProgress status={project.reviewStatus} rejectedStage={latestRejectedReview?.level} />

      {project.rejectedReason ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e5b8bd] border-l-[4px] border-l-[#9e2a35] bg-[#fffafa] p-4">
          <p className="min-w-0 text-sm text-[#7f1d26]">
            <span className="font-semibold">驳回原因：</span>
            {project.rejectedReason}
          </p>
          {project.canEdit ? (
            <Button
              asChild
              size="sm"
              className="group shrink-0 rounded-full bg-[#9e2a35] px-5 text-white hover:bg-[#82202a] active:scale-[0.98] focus-visible:ring-[#9e2a35]/25"
            >
              <Link href={`/apply?projectId=${project.id}`}>
                去补材料
                <ButtonArrow />
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      <section className="card p-5 sm:p-6">
        <SectionHead sub="报名表已登记的立项信息，此处只读存档" title="项目基本信息" />
        <div aria-hidden="true" className="mt-4 h-px bg-[#d5e2db]/70" />
        <dl className="mt-4 grid gap-4 md:grid-cols-3">
          <Item label="项目组别" value={project.groupLabel} />
          <Item label="项目类别" value={project.categoryLabel} />
          <Item label="申报单位" value={project.applicationUnit} />
          <Item label="培养单位" value={project.trainingUnit} />
          <Item label="命题名称" value={project.propositionName} />
          <Item label="命题企业" value={project.propositionCompany} />
          <Item label="负责人学号" value={form.leaderStudentNo} />
          <Item label="负责人姓名" value={form.leaderName} />
          <Item label="年级" value={form.grade} />
          <Item label="性别" value={form.gender} />
          <Item label="培养阶段" value={project.leader.educationStageLabel} />
          <Item label="民族" value={project.leader.ethnicityLabel} />
          <Item label="专业" value={form.major} />
          <Item label="入学年份" value={form.enrollmentYear} />
          <Item label="毕业年份" value={form.graduationYear} />
          <Item label="申报者手机号" value={form.phone} />
          <Item label="申报者邮箱" value={form.email} />
          <Item label="提交次数" value={project.submissionCount} />
          <Item label="最后修改时间" value={formatDateTime(project.updatedAt.toISOString())} />
          <Item label="提交时间" value={project.submittedAt ? formatDateTime(project.submittedAt.toISOString()) : null} />
          <div className="md:col-span-3">
            <Item label="备注" value={form.remark} />
          </div>
        </dl>
      </section>

      <section className="card p-5 sm:p-6">
        <SectionHead sub="负责人可在窗口期内修订；校外成员需备齐在读或工作证明" title="团队成员" />
        <div aria-hidden="true" className="mt-4 h-px bg-[#d5e2db]/70" />
        <div className="mt-4 space-y-3">
          {[project.leader, ...project.members].map((member) => (
            <div key={member.id} className="rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#cde0d5] bg-[#eef5f1] font-display text-sm font-bold text-[#115740]">
                    {member.name?.slice(0, 1) || "成"}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-[#0f1d18]">{member.name}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          member.role === "LEADER"
                            ? "border border-[#cde0d5] bg-[#eef5f1] text-[#115740]"
                            : "border border-[#d5e2db] bg-white text-[#43554d]"
                        }`}
                      >
                        {member.role === "LEADER" ? "负责人" : "成员"}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          member.isInternal
                            ? "border border-[#cde0d5] bg-[#eef5f1] text-[#115740]"
                            : "border border-[#ead7af] bg-[#fdf8ee] text-[#8a651b]"
                        }`}
                      >
                        {member.isInternal ? "校内" : "校外"}
                      </span>
                      {member.isPayee ? (
                        <span className="rounded-full border border-[#ead7af] bg-[#fdf8ee] px-2.5 py-0.5 text-[11px] font-medium text-[#8a651b]">
                          领款人
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[#54635d]">
                      {[member.school, member.trainingUnit, member.major].filter(Boolean).join(" · ") || "单位待补充"}
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono text-xs text-[#54635d] tabular-nums">
                  <span className="block">{member.personNo || "无学号"}</span>
                  <span className="mt-0.5 block">{member.phone || "—"}</span>
                </div>
              </div>
              {member.payeeBank ? (
                <div className="mt-3 rounded-xl border border-[#d5e2db] bg-white px-4 py-3 text-sm text-[#43554d]">
                  {member.payeeBank.boundFinancePlatform ? (
                    <p className="text-xs font-medium text-[#115740]">已绑定校园卡财务账户，仅需学号核验。</p>
                  ) : (
                    <dl className="grid gap-3 md:grid-cols-3">
                      <Item label="学习/工作单位" value={member.payeeBank.organization} />
                      <Item label="联系电话" value={member.payeeBank.phone} />
                      <Item label="身份证号" value={member.payeeBank.idCardMasked} />
                      <Item label="银行卡号" value={member.payeeBank.bankCardMasked} />
                      <Item label="开户行" value={member.payeeBank.bankName} />
                      <Item label="开户人" value={member.payeeBank.accountName} />
                    </dl>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <SectionHead sub="锁定期内变更需提交申请，由学院与校级管理员核准" title="指导老师" />
        <div aria-hidden="true" className="mt-4 h-px bg-[#d5e2db]/70" />
        <div className="mt-4 space-y-2.5">
          {project.teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d5e2db] bg-[#f8fbf9] px-4 py-3.5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#cde0d5] bg-[#eef5f1] font-display text-xs font-bold text-[#115740]">
                  {teacher.name?.slice(0, 1) || "师"}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[#0f1d18]">{teacher.name}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        teacher.isInternal
                          ? "border border-[#cde0d5] bg-[#eef5f1] text-[#115740]"
                          : "border border-[#ead7af] bg-[#fdf8ee] text-[#8a651b]"
                      }`}
                    >
                      {teacher.isInternal ? "校内导师" : "校外导师"}
                    </span>
                    {teacher.title ? <span className="text-xs font-medium text-[#43554d]">{teacher.title}</span> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-[#54635d]">{teacher.unit || "所属单位未填"}</p>
                </div>
              </div>
              <span className="font-mono text-xs text-[#54635d] tabular-nums">{teacher.phone || "—"}</span>
            </div>
          ))}
          {project.teachers.length === 0 ? <p className="text-sm text-[#5c6c65] inline-empty">暂无指导老师</p> : null}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <SectionHead sub="此处登记作品名称与外链；签字盖章件请在下方专区上传" title="作品与材料" />
        <div aria-hidden="true" className="mt-4 h-px bg-[#d5e2db]/70" />
        {project.work ? (
          <dl className="mt-4 grid gap-4 md:grid-cols-3">
            <Item label="作品形式" value={project.work.formLabel} />
            <Item label="作品类别" value={project.work.categoryLabel} />
            <Item label="作品组别" value={project.work.groupLabel} />
            <Item label="作品文件" value={project.work.fileName ? `${project.work.fileName}（仅登记名称，未上传）` : ""} />
            <Item label="作品外链" value={project.work.externalUrl} />
            <Item label="PPT 文件" value={project.work.pptFileName ? `${project.work.pptFileName}（仅登记名称，未上传）` : ""} />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-[#5c6c65] inline-empty">暂无作品信息</p>
        )}
      </section>

      <SealedPanel projectId={params.id} files={sealedFiles} currentFileId={currentFileId} canExportSensitive={canExportSensitive} />

      {canExportSensitive ? (
        <div className="no-print flex justify-end print:hidden">
          <a
            href={`/my/${project.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#7f9384] bg-white px-5 text-sm font-medium text-[#115740] transition-colors duration-150 hover:border-[#115740] hover:bg-[#eef5f1] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 focus-visible:ring-offset-2 motion-reduce:active:scale-100"
          >
            打印报名表（PDF）
          </a>
        </div>
      ) : null}

      {changePanel ? <ChangeRequestPanel projectId={params.id} data={changePanel} /> : null}
      <DatasetExport scope="mine" buttonLabel="导出我的数据表" />
      <BackLink to={firstParam(searchParams?.from)} fallback="/my" label="返回我的项目" />
    </div>
  );
}
