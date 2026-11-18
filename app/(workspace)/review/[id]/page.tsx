import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { WhuEavesWatermark, WhuSeal } from "@/components/brand/whu-motifs";
import { BackLink } from "@/components/data/list-link";
import { BreadcrumbTitle } from "@/components/layout/breadcrumbs";
import { ReviewDecisionBar } from "@/components/review/review-decision-bar";
import { SectionHead, SectionRule } from "@/components/ui/section-head";
import { StatusBadge } from "@/components/ui/status-badge";
import { WorkspaceForbidden } from "@/components/ui/workspace-forbidden";
import { getActiveUser } from "@/lib/auth.server";
import { firstParam } from "@/lib/list-query";
import { formatDateTime, memberRoleLabels, registrationStatusLabels } from "@/lib/presentation";
import { getReviewDetail } from "@/lib/review";
import { currentSealedFileId } from "@/lib/sealed";

export const metadata: Metadata = { title: "审核项目详情" };
export const dynamic = "force-dynamic";

const stageLabels = { SCHOOL: "校赛", PROVINCE: "省赛", NATIONAL: "国赛", FINISHED: "已结束" } as const;
const levelLabels = { COLLEGE: "学院审核", SCHOOL: "校级终审" } as const;
const resultLabels = { APPROVED: "通过", REJECTED: "驳回" } as const;
const confirmLabels = { PENDING: "待确认", CONFIRMED: "已确认", REJECTED: "已拒绝" } as const;
const sealedReviewLabels: Record<string, string> = {
  APPROVED: "已通过",
  REJECTED: "已驳回",
  PENDING: "待审核",
};
const changeFieldLabels: Record<string, string> = {
  name: "项目名称",
  projectName: "项目名称",
  college: "申报学院",
  trackId: "参赛赛道",
  members: "团队成员",
  teachers: "指导老师",
  work: "作品材料",
  payeeName: "奖金领款人",
  phone: "联系电话",
  email: "电子邮箱",
  remark: "备注说明",
};
const changeSourceLabels: Record<string, string> = {
  APPLY: "学生申报提交",
  CHANGE_REQUEST: "变更申请审批",
  IMPORT: "批量导入",
  ADMIN: "管理员核改",
  REVIEW: "审核流转",
};

function Item({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="t-label text-xs text-[#5c6c65]">{label}</dt>
      <dd className="mt-1 break-words text-sm text-[#0e1d17]">
        {value === "" || value === null || value === undefined ? "未填" : value}
      </dd>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden card">
      <div className="px-5 pt-4">
        <SectionHead title={title} sub={sub} />
      </div>
      <SectionRule className="mx-5 mt-3.5" />
      <div className="p-5">{children}</div>
    </section>
  );
}

type PageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function ReviewDetailPage({ params, searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") {
    return <WorkspaceForbidden message="仅管理员可以查看审核项目详情。" />;
  }
  const project = await getReviewDetail(params.id);
  if (!project) notFound();
  const currentFileId = currentSealedFileId(project.sealedFiles);

  return (
    <div className="space-y-5">
      <BreadcrumbTitle label={project.projectName} />
      <div>
        <BackLink to={firstParam(searchParams?.from)} fallback="/review" label="返回审核列表" />
      </div>

      <section className="card relative overflow-hidden border-[#c0d5ca] bg-gradient-to-br from-white via-white to-[#eef5f1] p-6 before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-[#115740] before:via-[#1c7859] before:to-[#c59b45]">
        <div className="relative z-[1] flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <WhuSeal label="审核卷宗" />
              <StatusBadge status={project.status}>{registrationStatusLabels[project.status]}</StatusBadge>
              {project.hasUnconfirmedTeachers ? (
                <span className="rounded-full bg-[#faeaea] px-3 py-0.5 text-xs font-medium text-[#9e2a35] ring-1 ring-[#eccacd]">
                  指导关系未确认
                </span>
              ) : null}
            </div>
            <h1 className="t-page-title mt-3 font-display text-[25px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
              {project.projectName}
            </h1>
            <p className="mt-2 text-sm text-[#54635d] tabular-nums">
              {project.competitionName} · {stageLabels[project.stage]} · 已提交 {project.submissionCount} 次
            </p>
          </div>
          <div className="shrink-0">
            <ReviewDecisionBar projectId={project.id} projectName={project.projectName} status={project.status} />
          </div>
        </div>
        <WhuEavesWatermark className="pointer-events-none absolute -bottom-3 -right-2 h-[112px] w-[198px] text-[#0d3b2e]/[0.05]" />
      </section>

      <Section title="基本信息" sub="申报主体、负责人学籍与流转时间戳">
        <dl className="grid grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-4">
          <Item label="批次" value={project.batchName} />
          <Item label="申报单位" value={project.applicationUnit} />
          <Item label="培养单位" value={project.trainingUnit} />
          <Item label="赛道 / 组别 / 类别" value={project.trackDisplay} />
          <Item label="命题名称" value={project.propositionName} />
          <Item label="命题企业" value={project.propositionCompany} />
          <Item label="负责人" value={`${project.leaderName}（${project.leaderStudentNo || "无学号"}）`} />
          <Item label="年级" value={project.grade} />
          <Item
            label="入学 / 毕业年份"
            value={`${project.enrollmentYear ?? "未填"} / ${project.graduationYear ?? "未填"}`}
          />
          <Item label="培养阶段" value={project.educationStage} />
          <Item label="性别 / 民族" value={`${project.gender || "未填"} / ${project.ethnicity || "未填"}`} />
          <Item label="手机号 / 邮箱" value={`${project.phone || "未填"} / ${project.email || "未填"}`} />
          <Item label="奖金领款人" value={project.payeeName} />
          <Item label="历史评分（只读）" value={project.score ?? "未登记"} />
          <Item label="提交时间" value={project.submittedAt ? formatDateTime(project.submittedAt) : "未提交"} />
          <Item
            label="创建 / 修改时间"
            value={`${formatDateTime(project.createdAt)} / ${formatDateTime(project.updatedAt)}`}
          />
        </dl>
        <div className="mt-5 border-t border-[#e5ede8] pt-4 text-sm">
          <span className="t-label text-xs text-[#5c6c65]">备注</span>
          <p className="mt-1 whitespace-pre-line text-[#162620]">{project.remark || "无备注"}</p>
        </div>
      </Section>

      <Section title={`指导老师（${project.teacherDetails.length}）`} sub="未确认指导关系的教师行将以朱砂浅底高亮提醒">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="t-thead bg-[#f5faf7] text-xs text-[#4d5e57]">
              <tr>
                <th className="px-3 py-2.5 font-medium">姓名</th>
                <th className="px-3 py-2.5 font-medium">校内 / 工号</th>
                <th className="px-3 py-2.5 font-medium">学校 / 单位</th>
                <th className="px-3 py-2.5 font-medium">职称</th>
                <th className="px-3 py-2.5 font-medium">联系方式</th>
                <th className="px-3 py-2.5 font-medium">确认状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef4f0]">
              {project.teacherDetails.map((teacher) => (
                <tr
                  key={teacher.id}
                  className={teacher.confirmStatus === "CONFIRMED" ? "text-[#26342e]" : "bg-[#fdf4f5] text-[#7f1d1d]"}
                >
                  <td className="px-3 py-3 font-medium text-[#0e1d17]">{teacher.name}</td>
                  <td className="px-3 py-3 text-xs tabular-nums">
                    {teacher.isInternal ? "校内" : "校外"} / {teacher.staffNo || "未填"}
                  </td>
                  <td className="px-3 py-3">
                    {teacher.school} / {teacher.unit}
                  </td>
                  <td className="px-3 py-3">{teacher.title || "未填"}</td>
                  <td className="px-3 py-3 text-xs tabular-nums">
                    {teacher.phone || "未填"}
                    <span className="block text-[#5c6c65]">{teacher.email || ""}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        teacher.confirmStatus === "CONFIRMED"
                          ? "bg-[#eef5f1] text-[#115740]"
                          : teacher.confirmStatus === "REJECTED"
                            ? "bg-[#faeaea] text-[#9e2a35]"
                            : "bg-[#fdf6e7] text-[#9a5b13]"
                      }`}
                    >
                      {confirmLabels[teacher.confirmStatus]}
                    </span>
                  </td>
                </tr>
              ))}
              {!project.teacherDetails.length ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-[#5c6c65]">
                    暂无指导老师记录
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={`团队成员（${project.memberDetails.length}）`} sub="团队成员分工、学籍信息与领款资格核对">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="t-thead bg-[#f5faf7] text-xs text-[#4d5e57]">
              <tr>
                <th className="px-3 py-2.5 font-medium">姓名</th>
                <th className="px-3 py-2.5 font-medium">角色</th>
                <th className="px-3 py-2.5 font-medium">学号</th>
                <th className="px-3 py-2.5 font-medium">培养阶段 / 单位</th>
                <th className="px-3 py-2.5 font-medium">专业</th>
                <th className="px-3 py-2.5 font-medium">入学 / 毕业</th>
                <th className="px-3 py-2.5 font-medium">联系方式</th>
                <th className="px-3 py-2.5 font-medium">领款人</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef4f0]">
              {project.memberDetails.map((member) => (
                <tr key={member.id} className="text-[#26342e]">
                  <td className="px-3 py-3 font-medium text-[#0e1d17]">
                    {member.name}
                    <span className="block text-xs font-normal text-[#5c6c65]">
                      {member.gender} / {member.ethnicity}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {member.role === "LEADER" ? (
                      <span className="inline-flex rounded-full bg-[#eef5f1] px-2.5 py-0.5 text-xs font-semibold text-[#115740]">
                        {memberRoleLabels[member.role]}
                      </span>
                    ) : (
                      <span className="text-xs">{memberRoleLabels[member.role]}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs tabular-nums">{member.personNo || "未填"}</td>
                  <td className="px-3 py-3 text-xs">
                    {member.educationStage || "未填"}
                    <span className="block text-[#5c6c65]">{member.trainingUnit}</span>
                  </td>
                  <td className="px-3 py-3 text-xs">{member.major || "未填"}</td>
                  <td className="px-3 py-3 text-xs tabular-nums">
                    {member.enrollmentYear ?? "未填"} / {member.graduationYear ?? "未填"}
                  </td>
                  <td className="px-3 py-3 text-xs tabular-nums">
                    {member.phone || "未填"}
                    <span className="block text-[#5c6c65]">{member.email || ""}</span>
                  </td>
                  <td className="px-3 py-3">
                    {member.isPayee ? (
                      <span className="inline-flex rounded-full bg-[#eef5f1] px-2 py-0.5 text-xs font-medium text-[#115740]">
                        是
                      </span>
                    ) : (
                      <span className="text-xs text-[#6c7e76]">否</span>
                    )}
                  </td>
                </tr>
              ))}
              {!project.memberDetails.length ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-[#5c6c65]">
                    暂无团队成员记录
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="作品与材料" sub="申报作品附件、演示材料与外链地址">
        {project.workDetail ? (
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Item label="作品文件" value={project.workDetail.fileName} />
            <Item label="作品文件地址" value={<span className="break-all">{project.workDetail.fileUrl}</span>} />
            <Item label="作品外链" value={<span className="break-all">{project.workDetail.externalUrl}</span>} />
            <Item label="作品形式" value={project.workDetail.form} />
            <Item label="作品类别" value={project.workDetail.category} />
            <Item label="作品组别" value={project.workDetail.groupName} />
            <Item label="答辩课件文件" value={project.workDetail.pptFileName} />
            <Item label="答辩课件地址" value={<span className="break-all">{project.workDetail.pptFileUrl}</span>} />
          </dl>
        ) : (
          <p className="inline-empty text-sm">暂无作品信息</p>
        )}
      </Section>

      <Section title={`盖章件（${project.sealedFiles.length}）`} sub="各历史上传版本与当前生效最终版存档">
        {project.sealedFiles.length ? (
          <div className="divide-y divide-[#eef4f0]">
            {project.sealedFiles.map((file) => (
              <div
                key={file.id}
                className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[#0e1d17]">{file.fileName}</span>
                    <span className="rounded-full bg-[#f1f5f3] px-2.5 py-0.5 text-xs text-[#4d5e57] tabular-nums">
                      第 {file.versionNo} 版
                    </span>
                    {file.id === currentFileId ? (
                      <span className="rounded-full bg-[#eef5f1] px-2.5 py-0.5 text-xs font-semibold text-[#115740] ring-1 ring-[#badec9]">
                        当前最终版
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        file.reviewResult === "REJECTED"
                          ? "bg-[#faeaea] text-[#9e2a35]"
                          : file.reviewResult === "APPROVED"
                            ? "bg-[#eef5f1] text-[#115740]"
                            : "bg-[#fdf6e7] text-[#9a5b13]"
                      }`}
                    >
                      {sealedReviewLabels[file.reviewResult] ?? file.reviewResult}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#54635d] tabular-nums">
                    {(file.sizeBytes / 1024).toFixed(1)} KB · {file.uploaderName} 上传于 {formatDateTime(file.uploadedAt)}
                    {file.reviewNote ? ` · 审查备注：${file.reviewNote}` : ""}
                  </p>
                </div>
                <a
                  href={`/api/sealed/download?fileId=${encodeURIComponent(file.id)}`}
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-[#7f9384] bg-white px-4 text-xs font-medium text-[#115740] transition-colors hover:border-[#115740] hover:bg-[#eef5f1]"
                >
                  下载此版本
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="inline-empty text-sm">暂无盖章件</p>
        )}
      </Section>

      <Section title={`变更历史（${project.changeLogs.length}）`} sub="项目核心字段的历史修改记录与来源">
        {project.changeLogs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="t-thead bg-[#f5faf7] text-xs text-[#4d5e57]">
                <tr>
                  <th className="px-3 py-2.5 font-medium">变更时间</th>
                  <th className="px-3 py-2.5 font-medium">变更字段</th>
                  <th className="px-3 py-2.5 font-medium">变更前</th>
                  <th className="px-3 py-2.5 font-medium">变更后</th>
                  <th className="px-3 py-2.5 font-medium">操作人 / 来源</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef4f0]">
                {project.changeLogs.map((log) => (
                  <tr key={log.id} className="align-top text-[#26342e]">
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-[#54635d] tabular-nums">
                      {formatDateTime(log.changedAt)}
                    </td>
                    <td className="px-3 py-3 font-medium text-[#0e1d17]">
                      {changeFieldLabels[log.field] ?? log.field}
                    </td>
                    <td className="max-w-56 break-all px-3 py-3 text-xs text-[#5c6c65]">{log.oldValue || "空"}</td>
                    <td className="max-w-56 break-all px-3 py-3 text-xs text-[#0e1d17]">{log.newValue || "空"}</td>
                    <td className="px-3 py-3 text-xs">
                      <span className="font-medium text-[#0e1d17]">{log.changerName}</span>
                      <span className="mt-0.5 block text-[#5c6c65]">
                        {changeSourceLabels[log.source] ?? log.source}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="inline-empty text-sm">暂无变更历史</p>
        )}
      </Section>

      <Section title={`审核记录（${project.reviews.length}）`} sub="历次学院初审与校级终审意见归档">
        {project.reviews.length ? (
          <div className="space-y-3">
            {project.reviews.map((review) => (
              <article
                key={review.id}
                className={`rounded-xl border p-4 ${
                  review.result === "REJECTED"
                    ? "border-[#eccacd] bg-[#faeaea]/70"
                    : "border-[#badec9] bg-[#eef5f1]"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-[#0e1d17]">{levelLabels[review.level]}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      review.result === "REJECTED"
                        ? "bg-white text-[#9e2a35]"
                        : "bg-white text-[#115740]"
                    }`}
                  >
                    {resultLabels[review.result]}
                  </span>
                </div>
                {review.reason ? (
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#26342e]">
                    审核意见：{review.reason}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-[#54635d] tabular-nums">
                  {review.reviewerName} · {formatDateTime(review.createdAt)}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="inline-empty text-sm">暂无审核记录</p>
        )}
      </Section>
    </div>
  );
}
