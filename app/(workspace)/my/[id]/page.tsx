import { BackLink } from "@/components/data/list-link";
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
  return <div><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 text-sm text-slate-900">{value === "" || value === null || value === undefined ? "—" : value}</dd></div>;
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
    <div className="space-y-6">
      <BreadcrumbTitle label={project.name} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackLink to={firstParam(searchParams?.from)} fallback="/my" label="返回我的项目" />
          <h1 className="t-page-title mt-2 font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">{project.name}</h1>
          <p className="mt-1 text-sm text-[#54635d]">{project.competitionName} / {project.trackName}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={project.status} scope="project">{projectStatusLabels[project.status]}</StatusBadge>
          {project.canEdit ? (
            <Button asChild size="sm">
              <Link href={`/apply?projectId=${project.id}`}>编辑报名表</Link>
            </Button>
          ) : null}
        </div>
      </div>
      <ProjectProgress status={project.reviewStatus} rejectedStage={latestRejectedReview?.level} />
      {project.rejectedReason ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="min-w-0 text-sm text-red-800">
            <span className="font-medium">驳回原因：</span>
            {project.rejectedReason}
          </p>
          {project.canEdit ? (
            <Button
              asChild
              size="sm"
              className="group shrink-0 bg-red-600 hover:bg-red-700 hover:shadow-red-600/25"
            >
              <Link href={`/apply?projectId=${project.id}`}>
                去补材料
                <ButtonArrow />
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      <section className="card p-5">
        <SectionHead sub="报名表里填过的内容，这里只读展示" title="项目基本信息" />
        <div aria-hidden="true" className="mt-4 h-px bg-[#d5e2db]/60" />
        <dl className="mt-4 grid gap-4 md:grid-cols-3">
          <Item label="项目组别" value={project.groupLabel} /><Item label="项目类别" value={project.categoryLabel} />
          <Item label="申报单位" value={project.applicationUnit} /><Item label="培养单位" value={project.trainingUnit} />
          <Item label="命题名称" value={project.propositionName} /><Item label="命题企业" value={project.propositionCompany} />
          <Item label="负责人学号" value={form.leaderStudentNo} /><Item label="负责人姓名" value={form.leaderName} /><Item label="年级" value={form.grade} />
          <Item label="性别" value={form.gender} /><Item label="培养阶段" value={project.leader.educationStageLabel} /><Item label="民族" value={project.leader.ethnicityLabel} />
          <Item label="专业" value={form.major} /><Item label="入学年份" value={form.enrollmentYear} /><Item label="毕业年份" value={form.graduationYear} />
          <Item label="申报者手机号" value={form.phone} /><Item label="申报者邮箱" value={form.email} /><Item label="提交次数" value={project.submissionCount} />
          <Item label="最后修改时间" value={formatDateTime(project.updatedAt.toISOString())} />
          <Item label="提交时间" value={project.submittedAt ? formatDateTime(project.submittedAt.toISOString()) : null} />
          <div className="md:col-span-3"><Item label="备注" value={form.remark} /></div>
        </dl>
      </section>

      <section className="card p-5">
        <SectionHead sub="负责人可改；校外成员需上传在读或工作证明" title="团队成员" />
        <div aria-hidden="true" className="mt-4 h-px bg-[#d5e2db]/60" />
        <div className="mt-4 space-y-3">
          {[project.leader, ...project.members].map((member) => (
            <div key={member.id} className="rounded-xl border border-[#d5e2db] bg-[#fbfdfc] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e3ede7] font-display text-sm font-bold text-[#115740]">
                    {member.name?.slice(0, 1) || "成"}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-slate-900">{member.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          member.role === "LEADER" ? "bg-[#e3f0ea] text-[#115740]" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {member.role === "LEADER" ? "负责人" : "成员"}
                      </span>
                      <span className="rounded-full bg-[#eef3f8] px-2 py-0.5 text-[11px] font-medium text-[#002554]">
                        {member.isInternal ? "校内" : "校外"}
                      </span>
                      {member.isPayee ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                          领款人
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[#54635d]">
                      {[member.school, member.trainingUnit, member.major].filter(Boolean).join(" · ") || "单位待补充"}
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono text-xs text-slate-500 tabular-nums">
                  <span className="block">{member.personNo || "无学号"}</span>
                  <span className="mt-0.5 block">{member.phone || "—"}</span>
                </div>
              </div>
              {member.payeeBank ? (
                <div className="mt-3 rounded-lg border border-[#e3ede7] bg-[#f4f9f6] p-3 text-sm text-slate-600">
                  {member.payeeBank.boundFinancePlatform ? <p className="text-xs text-[#3b4d45]">已绑定校园卡银行账户，仅需学号核验。</p> : (
                    <dl className="grid gap-3 md:grid-cols-3">
                      <Item label="学习/工作单位" value={member.payeeBank.organization} /><Item label="联系电话" value={member.payeeBank.phone} />
                      <Item label="身份证号" value={member.payeeBank.idCardMasked} /><Item label="银行卡号" value={member.payeeBank.bankCardMasked} />
                      <Item label="开户行" value={member.payeeBank.bankName} /><Item label="开户人" value={member.payeeBank.accountName} />
                    </dl>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <SectionHead sub="变更需提交申请，由管理员审批" title="指导老师" />
        <div aria-hidden="true" className="mt-4 h-px bg-[#d5e2db]/60" />
        <div className="mt-4 space-y-2.5">
          {project.teachers.map((teacher) => (
            <div key={teacher.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d5e2db] bg-[#fbfdfc] px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e6eef8] font-display text-xs font-bold text-[#002554]">
                  {teacher.name?.slice(0, 1) || "师"}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{teacher.name}</span>
                    <span className="rounded-full bg-[#eef3f8] px-2 py-0.5 text-[11px] font-medium text-[#002554]">
                      {teacher.isInternal ? "校内导师" : "校外导师"}
                    </span>
                    {teacher.title ? <span className="text-xs text-slate-500">{teacher.title}</span> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-[#54635d]">{teacher.unit || "所属单位未填"}</p>
                </div>
              </div>
              <span className="font-mono text-xs text-slate-500 tabular-nums">{teacher.phone || "—"}</span>
            </div>
          ))}
          {project.teachers.length === 0 ? <p className="text-sm text-slate-500 inline-empty">暂无指导老师</p> : null}
        </div>
      </section>

      <section className="card p-5">
        <SectionHead sub="这里只登记名称与链接，文件走下方材料上传" title="作品与材料" />
        <div aria-hidden="true" className="mt-4 h-px bg-[#d5e2db]/60" />
        {project.work ? <dl className="mt-4 grid gap-4 md:grid-cols-3"><Item label="作品形式" value={project.work.formLabel} /><Item label="作品类别" value={project.work.categoryLabel} /><Item label="作品组别" value={project.work.groupLabel} /><Item label="作品文件" value={project.work.fileName ? `${project.work.fileName}（仅登记名称，未上传）` : ""} /><Item label="作品外链" value={project.work.externalUrl} /><Item label="PPT 文件" value={project.work.pptFileName ? `${project.work.pptFileName}（仅登记名称，未上传）` : ""} /></dl> : <p className="mt-3 text-sm text-slate-500 inline-empty">暂无作品信息</p>}
      </section>

      <SealedPanel projectId={params.id} files={sealedFiles} currentFileId={currentFileId} canExportSensitive={canExportSensitive} />
      {canExportSensitive ? (
        <div className="no-print flex justify-end print:hidden">
          <a href={`/my/${project.id}/print`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50">打印报名表（PDF）</a>
        </div>
      ) : null}
      {changePanel ? <ChangeRequestPanel projectId={params.id} data={changePanel} /> : null}
      <DatasetExport scope="mine" buttonLabel="导出我的数据表" />
      <BackLink to={firstParam(searchParams?.from)} fallback="/my" label="返回我的项目" />
    </div>
  );
}
