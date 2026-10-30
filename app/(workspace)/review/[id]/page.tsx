import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActiveUser } from "@/lib/auth.server";
import { formatDateTime, memberRoleLabels, registrationStatusLabels } from "@/lib/presentation";
import { getReviewDetail } from "@/lib/review";

export const metadata: Metadata = { title: "审核项目详情" };
export const dynamic = "force-dynamic";

const stageLabels = { SCHOOL: "校赛", PROVINCE: "省赛", NATIONAL: "国赛", FINISHED: "已结束" } as const;
const levelLabels = { COLLEGE: "学院审核", SCHOOL: "校级终审" } as const;
const resultLabels = { APPROVED: "通过", REJECTED: "驳回" } as const;
const confirmLabels = { PENDING: "待确认", CONFIRMED: "已确认", REJECTED: "已拒绝" } as const;

function Item({ label, value }: { label: string; value: ReactNode }) {
  return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm text-slate-900">{value === "" || value === null || value === undefined ? "—" : value}</dd></div>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <h2 className="border-b border-slate-100 px-5 py-4 text-sm font-semibold text-slate-900">{title}</h2>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default async function ReviewDetailPage({ params }: { params: { id: string } }) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") {
    return <section className="rounded-lg border border-red-200 bg-white p-6"><h1 className="text-xl font-semibold text-red-600">403 无权限</h1></section>;
  }
  const project = await getReviewDetail(params.id);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/review" className="text-sm text-blue-600 hover:underline">返回审核列表</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">{project.projectName}</h1>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">{registrationStatusLabels[project.status]}</span>
          {project.hasUnconfirmedTeachers ? <span className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-700">指导关系未确认</span> : null}
        </div>
        <p className="mt-2 text-sm text-slate-500">{project.competitionName} · {stageLabels[project.stage]} · 已提交 {project.submissionCount} 次</p>
      </div>

      <Section title="基本信息">
        <dl className="grid grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-4">
          <Item label="批次" value={project.batchName} />
          <Item label="申报单位" value={project.applicationUnit} />
          <Item label="培养单位" value={project.trainingUnit} />
          <Item label="赛道 / 组别 / 类别" value={project.trackDisplay} />
          <Item label="命题名称" value={project.propositionName} />
          <Item label="命题企业" value={project.propositionCompany} />
          <Item label="负责人" value={`${project.leaderName}（${project.leaderStudentNo || "无学号"}）`} />
          <Item label="年级" value={project.grade} />
          <Item label="入学 / 毕业年份" value={`${project.enrollmentYear ?? "—"} / ${project.graduationYear ?? "—"}`} />
          <Item label="培养阶段" value={project.educationStage} />
          <Item label="性别 / 民族" value={`${project.gender || "—"} / ${project.ethnicity || "—"}`} />
          <Item label="手机号 / 邮箱" value={`${project.phone || "—"} / ${project.email || "—"}`} />
          <Item label="奖金领款人" value={project.payeeName} />
          <Item label="评分（二课遗留）" value={project.score ?? "—"} />
          <Item label="提交时间" value={project.submittedAt ? formatDateTime(project.submittedAt) : "—"} />
          <Item label="创建 / 修改时间" value={`${formatDateTime(project.createdAt)} / ${formatDateTime(project.updatedAt)}`} />
        </dl>
        <div className="mt-5 border-t border-slate-100 pt-4 text-sm"><span className="text-xs text-slate-500">备注</span><p className="mt-1 whitespace-pre-line text-slate-800">{project.remark || "—"}</p></div>
      </Section>

      <Section title={`指导老师（${project.teacherDetails.length}）`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2">姓名</th><th className="px-3 py-2">校内 / 工号</th><th className="px-3 py-2">学校 / 单位</th><th className="px-3 py-2">职称</th><th className="px-3 py-2">联系方式</th><th className="px-3 py-2">确认状态</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {project.teacherDetails.map((teacher) => (
                <tr key={teacher.id} className={teacher.confirmStatus === "CONFIRMED" ? "" : "bg-red-50 text-red-900"}>
                  <td className="px-3 py-3 font-medium">{teacher.name}</td>
                  <td className="px-3 py-3">{teacher.isInternal ? "校内" : "校外"} / {teacher.staffNo || "—"}</td>
                  <td className="px-3 py-3">{teacher.school} / {teacher.unit}</td>
                  <td className="px-3 py-3">{teacher.title || "—"}</td>
                  <td className="px-3 py-3">{teacher.phone || "—"}<span className="block text-xs text-slate-500">{teacher.email || ""}</span></td>
                  <td className="px-3 py-3">{confirmLabels[teacher.confirmStatus]}</td>
                </tr>
              ))}
              {!project.teacherDetails.length ? <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">暂无指导老师</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={`团队成员（${project.memberDetails.length}）`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2">姓名</th><th className="px-3 py-2">角色</th><th className="px-3 py-2">学号</th><th className="px-3 py-2">培养阶段 / 单位</th><th className="px-3 py-2">专业</th><th className="px-3 py-2">入学 / 毕业</th><th className="px-3 py-2">联系方式</th><th className="px-3 py-2">领款人</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {project.memberDetails.map((member) => (
                <tr key={member.id}>
                  <td className="px-3 py-3 font-medium">{member.name}<span className="block text-xs font-normal text-slate-500">{member.gender} / {member.ethnicity}</span></td>
                  <td className="px-3 py-3">{memberRoleLabels[member.role]}</td>
                  <td className="px-3 py-3">{member.personNo || "—"}</td>
                  <td className="px-3 py-3">{member.educationStage || "—"}<span className="block text-xs text-slate-500">{member.trainingUnit}</span></td>
                  <td className="px-3 py-3">{member.major || "—"}</td>
                  <td className="px-3 py-3">{member.enrollmentYear ?? "—"} / {member.graduationYear ?? "—"}</td>
                  <td className="px-3 py-3">{member.phone || "—"}<span className="block text-xs text-slate-500">{member.email || ""}</span></td>
                  <td className="px-3 py-3">{member.isPayee ? "是" : "否"}</td>
                </tr>
              ))}
              {!project.memberDetails.length ? <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">暂无团队成员</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="作品与材料">
        {project.workDetail ? (
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Item label="作品文件" value={project.workDetail.fileName} />
            <Item label="作品文件地址" value={<span className="break-all">{project.workDetail.fileUrl}</span>} />
            <Item label="作品外链" value={<span className="break-all">{project.workDetail.externalUrl}</span>} />
            <Item label="作品形式" value={project.workDetail.form} />
            <Item label="作品类别" value={project.workDetail.category} />
            <Item label="作品组别" value={project.workDetail.groupName} />
            <Item label="PPT 文件" value={project.workDetail.pptFileName} />
            <Item label="PPT 文件地址" value={<span className="break-all">{project.workDetail.pptFileUrl}</span>} />
          </dl>
        ) : <p className="text-sm text-slate-500">暂无作品信息</p>}
      </Section>

      <Section title={`盖章件（${project.sealedFiles.length}）`}>
        {project.sealedFiles.length ? (
          <div className="divide-y divide-slate-100">
            {project.sealedFiles.map((file) => (
              <div key={file.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2"><span className="font-medium text-slate-900">{file.fileName}</span><span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">v{file.versionNo}</span>{file.isFinal ? <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">最终版</span> : null}</div>
                <p className="mt-1 break-all text-xs text-slate-500">{file.filePath} · {file.mimeType} · {(file.sizeBytes / 1024).toFixed(1)} KB</p>
                <p className="mt-1 text-xs text-slate-500">{file.uploaderName} 上传于 {formatDateTime(file.uploadedAt)} · 审查：{file.reviewResult}{file.reviewNote ? ` · ${file.reviewNote}` : ""}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-slate-500">暂无盖章件</p>}
      </Section>

      <Section title={`变更历史（${project.changeLogs.length}）`}>
        {project.changeLogs.length ? (
          <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2">时间</th><th className="px-3 py-2">字段</th><th className="px-3 py-2">旧值</th><th className="px-3 py-2">新值</th><th className="px-3 py-2">操作人 / 来源</th></tr></thead><tbody className="divide-y divide-slate-100">
            {project.changeLogs.map((log) => <tr key={log.id}><td className="whitespace-nowrap px-3 py-3 text-xs">{formatDateTime(log.changedAt)}</td><td className="px-3 py-3">{log.field}</td><td className="max-w-64 break-all px-3 py-3 text-xs">{log.oldValue || "—"}</td><td className="max-w-64 break-all px-3 py-3 text-xs">{log.newValue || "—"}</td><td className="px-3 py-3">{log.changerName}<span className="block text-xs text-slate-500">{log.source}</span></td></tr>)}
          </tbody></table></div>
        ) : <p className="text-sm text-slate-500">暂无变更历史</p>}
      </Section>

      <Section title={`审核记录（${project.reviews.length}）`}>
        {project.reviews.length ? (
          <div className="space-y-3">
            {project.reviews.map((review) => (
              <article key={review.id} className={`rounded-lg border p-4 ${review.result === "REJECTED" ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
                <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-medium text-slate-900">{levelLabels[review.level]}</span><span className={review.result === "REJECTED" ? "text-red-700" : "text-emerald-700"}>{resultLabels[review.result]}</span></div>
                {review.reason ? <p className="mt-2 whitespace-pre-line text-sm text-slate-700">理由：{review.reason}</p> : null}
                <p className="mt-2 text-xs text-slate-500">{review.reviewerName} · {formatDateTime(review.createdAt)}</p>
              </article>
            ))}
          </div>
        ) : <p className="text-sm text-slate-500">暂无审核记录</p>}
      </Section>
    </div>
  );
}
