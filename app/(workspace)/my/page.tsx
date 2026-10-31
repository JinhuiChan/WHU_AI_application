import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyProjects } from "@/lib/apply";
import { getActiveUser } from "@/lib/auth.server";
import { formatDateTime, projectStatusLabels } from "@/lib/presentation";

export const metadata: Metadata = { title: "我的项目" };
export const dynamic = "force-dynamic";

export default async function MyProjectsPage() {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/dashboard");
  const projects = await getMyProjects(user.id);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-semibold text-slate-900">我的项目</h1><p className="mt-1 text-sm text-slate-500">查看本人负责或参与项目的报名进度。</p></div>
        <Link href="/apply" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">新建报名</Link>
      </div>
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">名称</th><th className="px-4 py-3">赛道</th><th className="px-4 py-3">状态</th><th className="px-4 py-3">驳回原因</th><th className="px-4 py-3">最后修改时间</th><th className="px-4 py-3">操作</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((project) => (
                <tr key={project.id}>
                  <td className="max-w-72 px-4 py-3 font-medium text-slate-900"><Link href={`/my/${project.id}`} className="hover:text-blue-600">{project.name}</Link></td>
                  <td className="px-4 py-3 text-slate-600">{project.competitionName} / {project.trackName}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">{projectStatusLabels[project.status]}</span></td>
                  <td className="max-w-56 px-4 py-3 text-slate-600">{project.rejectedReason ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(project.updatedAt.toISOString())}</td>
                  <td className="px-4 py-3"><Link href={`/my/${project.id}`} className="text-blue-600 hover:underline">查看</Link></td>
                </tr>
              ))}
              {projects.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">暂无项目，点击“新建报名”开始填写。</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
