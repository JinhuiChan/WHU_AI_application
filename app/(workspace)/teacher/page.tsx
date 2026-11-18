import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { WhuEavesWatermark, WhuSeal, WhuTitleRule } from "@/components/brand/whu-motifs";
import { TeacherConfirmActions } from "@/components/teacher/teacher-confirm-actions";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHead, SectionRule } from "@/components/ui/section-head";
import { StatusBadge } from "@/components/ui/status-badge";
import { getActiveUser } from "@/lib/auth.server";
import { formatDateTime, projectStatusLabels } from "@/lib/presentation";
import { listTeacherProjects } from "@/lib/teacher";

export const metadata: Metadata = { title: "指导项目" };
export const dynamic = "force-dynamic";

const CONFIRM_LABELS: Record<string, string> = {
  PENDING: "待我确认",
  CONFIRMED: "已确认指导",
  REJECTED: "已退回",
};

export default async function TeacherPage() {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  // 多身份用户（如教师 + 管理员）只要拥有 TEACHER 身份就该能进；按当前身份判断会把人挡在外面
  if (!user.roles.includes("TEACHER")) redirect("/dashboard");

  const rows = await listTeacherProjects(user);
  const totalCount = rows.length;
  const pendingCount = rows.filter((row) => row.confirmStatus === "PENDING").length;
  const confirmedCount = rows.filter((row) => row.confirmStatus === "CONFIRMED").length;
  const rejectedCount = rows.filter((row) => row.confirmStatus === "REJECTED").length;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="t-page-title font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
            我指导的项目
          </h1>
          <WhuSeal label="导师台账" />
        </div>
        <p className="mt-1.5 flex items-center gap-2 text-sm text-[#54635d]">
          <WhuTitleRule />
          <span>确认指导关系后，学生报名信息中的指导教师一栏方视为有效并进入院系审核。</span>
        </p>
      </div>

      <section aria-label="指导项目概览" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden card border-[#c0d5ca] bg-gradient-to-br from-white via-white to-[#f0f7f3] p-4 sm:p-5 before:absolute before:inset-x-0 before:top-0 before:h-[2.5px] before:bg-gradient-to-r before:from-[#115740] before:to-[#c59b45]">
          <WhuEavesWatermark className="pointer-events-none absolute -bottom-3 -right-2 h-20 w-36 text-[#115740]/[0.05]" />
          <h2 className="t-label text-xs text-[#43554d]">指导项目总数</h2>
          <div className="mt-2 font-display text-[32px] font-bold leading-tight tabular-nums text-[#0f1d18]">
            {totalCount}
          </div>
          <p className="mt-1.5 text-xs text-[#64766e]">当前关联至本人名下的全部项目</p>
        </div>

        <div
          className={`card p-4 sm:p-5 ${
            pendingCount > 0 ? "border-l-[3px] border-l-[#c59b45] bg-[#fffdf7]" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className={`t-label text-xs ${pendingCount > 0 ? "font-semibold !text-[#92580a]" : "text-[#5c6c65]"}`}>
              待我确认
            </h2>
            {pendingCount > 0 ? (
              <span className="inline-flex items-center rounded-full border border-[#e8d29c] bg-[#fcf5e3] px-2 py-0.5 text-[11px] font-semibold text-[#92580a]">
                待处理
              </span>
            ) : null}
          </div>
          <div
            className={`mt-2 font-display text-[32px] font-bold leading-tight tabular-nums ${
              pendingCount > 0 ? "text-[#b45309]" : "text-[#0f1d18]"
            }`}
          >
            {pendingCount}
          </div>
          <p className={`mt-1.5 text-xs ${pendingCount > 0 ? "text-[#92580a]" : "text-[#64766e]"}`}>
            {pendingCount > 0 ? "请核对团队申报信息后确认或退回" : "当前没有待确认的指导申请"}
          </p>
        </div>

        <div className="card p-4 sm:p-5">
          <h2 className="t-label text-xs text-[#5c6c65]">已确认指导</h2>
          <div
            className={`mt-2 font-display text-[32px] font-bold leading-tight tabular-nums ${
              confirmedCount > 0 ? "text-[#115740]" : "text-[#0f1d18]"
            }`}
          >
            {confirmedCount}
          </div>
          <p className="mt-1.5 text-xs text-[#64766e]">指导关系已生效并记入教籍档案</p>
        </div>

        <div className="card p-4 sm:p-5">
          <h2 className="t-label text-xs text-[#5c6c65]">已退回</h2>
          <div
            className={`mt-2 font-display text-[32px] font-bold leading-tight tabular-nums ${
              rejectedCount > 0 ? "text-[#9e2a35]" : "text-[#0f1d18]"
            }`}
          >
            {rejectedCount}
          </div>
          <p className="mt-1.5 text-xs text-[#64766e]">信息不符已附理由退回学生核改</p>
        </div>
      </section>

      <section className="overflow-hidden card">
        <div className="px-5 pt-5">
          <SectionHead
            title="指导确认台账"
            sub="点击项目名称查阅学生申报详情；待我确认的项目支持直接确认或附理由退回"
            meta={
              <span className="tabular-nums">
                {pendingCount > 0 ? `待确认 ${pendingCount} 项 / 共 ${totalCount} 项` : `共 ${totalCount} 项`}
              </span>
            }
          />
        </div>
        <SectionRule className="mx-5 mt-4" />

        {rows.length === 0 ? (
          <EmptyState
            title="暂无你指导的项目"
            description="学生提交赛事报名并填写你的姓名或工号后，待确认的指导记录会自动出现在此处。"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="t-thead bg-[#f5faf7] text-xs text-[#4d5e57]">
                <tr>
                  <th className="w-[22%] px-4 py-3 font-medium">项目</th>
                  <th className="w-[18%] px-3.5 py-3 font-medium">赛事与赛道</th>
                  <th className="w-[13%] px-3.5 py-3 font-medium">学院</th>
                  <th className="w-[7%] whitespace-nowrap px-3 py-3 font-medium">成员数</th>
                  <th className="w-[11%] whitespace-nowrap px-3.5 py-3 font-medium">项目状态</th>
                  <th className="w-[12%] whitespace-nowrap px-3.5 py-3 font-medium">指导关系</th>
                  <th className="w-[17%] min-w-[168px] whitespace-nowrap px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eaf1ed]">
                {rows.map((row) => (
                  <tr key={row.id} className="align-top text-[#24362f]">
                    <td className="max-w-[216px] px-4 py-3.5">
                      {/* 教师只能看项目详情；/review/{id} 是管理员审核页，链过去会被中间件拦成 403 */}
                      <Link
                        href={`/projects/${row.projectId}`}
                        className="rounded-sm font-medium text-[#0f1d18] transition-colors hover:text-[#115740] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
                      >
                        {row.projectName}
                      </Link>
                    </td>
                    <td className="max-w-[184px] px-3.5 py-3.5 text-xs">
                      <span className="block font-medium text-[#24362f]">{row.competitionName}</span>
                      <span className="mt-0.5 block text-[#5c6c65]">{row.trackName}</span>
                    </td>
                    <td className="px-3.5 py-3.5 text-xs text-[#33433d]">{row.college}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-xs tabular-nums text-[#33433d]">
                      {row.memberCount} 人
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-3.5 text-xs">
                      <StatusBadge status={row.status} scope="project">
                        {projectStatusLabels[row.status]}
                      </StatusBadge>
                    </td>
                    <td className="px-3.5 py-3.5 text-xs">
                      <span
                        className={
                          row.confirmStatus === "CONFIRMED"
                            ? "inline-flex items-center whitespace-nowrap rounded-full border border-[#c5d9ce] bg-[#eef5f1] px-2.5 py-0.5 font-medium text-[#115740]"
                            : row.confirmStatus === "REJECTED"
                              ? "inline-flex items-center whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 font-medium text-red-700"
                              : "inline-flex items-center whitespace-nowrap rounded-full border border-[#e8d29c] bg-[#fcf5e3] px-2.5 py-0.5 font-medium text-[#92580a]"
                        }
                      >
                        {CONFIRM_LABELS[row.confirmStatus] ?? row.confirmStatus}
                      </span>
                      {row.confirmedAt ? (
                        <p className="mt-1 tabular-nums text-[11px] text-[#6c7e76]">{formatDateTime(row.confirmedAt)}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5">
                      <TeacherConfirmActions teacherId={row.id} confirmStatus={row.confirmStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-[#5c6c65]">
        说明：退回理由会记入审计日志，全程可追溯。若学生填写的指导教师信息与实际不符，请填写理由退回并联系所属学院核改。
      </p>
    </div>
  );
}
