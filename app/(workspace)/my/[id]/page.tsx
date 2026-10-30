import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DatasetExport } from "@/components/export/dataset-export";
import { SealedPanel } from "@/components/sealed/sealed-panel";
import { getMyProject } from "@/lib/apply";
import { getActiveUser } from "@/lib/auth.server";
import { formatDateTime, projectStatusLabels } from "@/lib/presentation";
import { canExportFullForm, currentSealedFileId, listSealedFiles } from "@/lib/sealed";

export const metadata: Metadata = { title: "项目详情" };
export const dynamic = "force-dynamic";

type PageProps = { params: { id: string } };

function Item({ label, value }: { label: string; value: string | number | null | undefined }) {
  return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-sm text-slate-900">{value === "" || value === null || value === undefined ? "—" : value}</dd></div>;
}

export default async function MyProjectPage({ params }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/dashboard");
  const project = await getMyProject(params.id, user.id);
  if (!project) notFound();
  const form = project.formInput;
  const sealedFiles = await listSealedFiles(params.id);
  const currentFileId = currentSealedFileId(sealedFiles);
  const canExportSensitive = await canExportFullForm(params.id, user);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-xl font-semibold text-slate-900">{project.name}</h1><p className="mt-1 text-sm text-slate-500">{project.competitionName} / {project.trackName}</p></div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">{projectStatusLabels[project.status]}</span>
          {project.canEdit ? <Link href={`/apply?projectId=${project.id}`} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white">编辑</Link> : null}
        </div>
      </div>
      {project.rejectedReason ? <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">驳回原因：{project.rejectedReason}</p> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">项目基本信息</h2>
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

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">团队成员</h2>
        <div className="mt-4 space-y-3">
          {[project.leader, ...project.members].map((member) => (
            <div key={member.id} className="rounded-md border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{member.name}<span className="ml-2 text-xs font-normal text-slate-500">{member.role === "LEADER" ? "负责人" : "成员"}</span></p>
                <p className="text-sm text-slate-600">{member.personNo || "无学号"} · {member.isInternal ? "校内" : "校外"}{member.isPayee ? " · 领款人" : ""}</p>
              </div>
              <p className="mt-2 text-sm text-slate-600">{member.school} / {member.trainingUnit} / {member.major} / {member.phone || "—"}</p>
              {member.payeeBank ? (
                <div className="mt-3 rounded bg-slate-50 p-3 text-sm text-slate-600">
                  {member.payeeBank.boundFinancePlatform ? <p>已绑定校园卡银行账户，仅需学号。</p> : (
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

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">指导老师</h2>
        <div className="mt-4 space-y-2">
          {project.teachers.map((teacher) => <p key={teacher.id} className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">{teacher.isInternal ? "校内" : "校外"} · {teacher.name} · {teacher.unit} · {teacher.title || "—"} · {teacher.phone || "—"}</p>)}
          {project.teachers.length === 0 ? <p className="text-sm text-slate-500">暂无指导老师</p> : null}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">作品与材料</h2>
        {project.work ? <dl className="mt-4 grid gap-4 md:grid-cols-3"><Item label="作品形式" value={project.work.formLabel} /><Item label="作品类别" value={project.work.categoryLabel} /><Item label="作品组别" value={project.work.groupLabel} /><Item label="作品文件" value={project.work.fileName} /><Item label="作品外链" value={project.work.externalUrl} /><Item label="PPT 文件" value={project.work.pptFileName} /></dl> : <p className="mt-3 text-sm text-slate-500">暂无作品信息</p>}
      </section>

      <SealedPanel projectId={params.id} files={sealedFiles} currentFileId={currentFileId} canExportSensitive={canExportSensitive} />
      <DatasetExport scope="mine" buttonLabel="导出我的数据表" />
      <Link href="/my" className="inline-block text-sm text-blue-600 hover:underline">返回我的项目</Link>
    </div>
  );
}
