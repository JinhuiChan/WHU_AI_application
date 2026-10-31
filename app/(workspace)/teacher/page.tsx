import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TeacherConfirmActions } from "@/components/teacher/teacher-confirm-actions";
import { getActiveUser } from "@/lib/auth.server";
import { formatDateTime, projectStatusLabels } from "@/lib/presentation";
import { listTeacherProjects } from "@/lib/teacher";

export const metadata: Metadata = { title: "指导项目" };
export const dynamic = "force-dynamic";

const CONFIRM_LABELS: Record<string, string> = {
  PENDING: "待确认",
  CONFIRMED: "已确认",
  REJECTED: "已拒绝",
};

export default async function TeacherPage() {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== "TEACHER") redirect("/dashboard");

  const rows = await listTeacherProjects(user);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">我指导的项目</h1>
        <p className="mt-1 text-sm text-slate-500">确认指导关系后，学生报名信息中的指导老师一栏才视为有效。</p>
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">项目</th>
                <th className="px-4 py-3 font-medium">赛事 / 赛道</th>
                <th className="px-4 py-3 font-medium">学院</th>
                <th className="px-4 py-3 font-medium">成员数</th>
                <th className="px-4 py-3 font-medium">项目状态</th>
                <th className="px-4 py-3 font-medium">指导关系</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="align-top text-slate-700">
                  <td className="max-w-64 px-4 py-3">
                    <Link href={`/review/${row.projectId}`} className="font-medium text-slate-900 hover:text-blue-600">
                      {row.projectName}
                    </Link>
                  </td>
                  <td className="max-w-56 px-4 py-3 text-xs">{row.competitionName}<br /><span className="text-slate-500">{row.trackName}</span></td>
                  <td className="px-4 py-3">{row.college}</td>
                  <td className="px-4 py-3">{row.memberCount}</td>
                  <td className="px-4 py-3 text-xs">{projectStatusLabels[row.status]}</td>
                  <td className="px-4 py-3 text-xs">
                    <span
                      className={
                        row.confirmStatus === "CONFIRMED"
                          ? "rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700"
                          : row.confirmStatus === "REJECTED"
                            ? "rounded-full bg-red-50 px-2 py-0.5 text-red-700"
                            : "rounded-full bg-amber-50 px-2 py-0.5 text-amber-700"
                      }
                    >
                      {CONFIRM_LABELS[row.confirmStatus] ?? row.confirmStatus}
                    </span>
                    {row.confirmedAt ? <p className="mt-1 text-slate-500">{formatDateTime(row.confirmedAt)}</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    <TeacherConfirmActions teacherId={row.id} confirmStatus={row.confirmStatus} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">暂无你指导的项目</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-slate-500">
        说明：拒绝理由会记入审计日志，可追溯。若学生填写的指导老师信息与实际不符，请先拒绝再联系学院更正。
      </p>
    </div>
  );
}
