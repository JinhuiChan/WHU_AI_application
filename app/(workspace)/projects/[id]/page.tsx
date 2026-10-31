import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MemberTimeline } from "@/components/projects/member-timeline";
import { getActiveUser } from "@/lib/auth.server";
import { aliasTypeLabels, awardLevelLabels, awardStatusLabels, evidenceTypeLabels, formatDate, formatDateTime, memberRoleLabels, projectStatusLabels } from "@/lib/presentation";
import { getProjectDetail } from "@/lib/projects";

export const metadata: Metadata = { title: "项目全貌" };

type PageProps = {
  params: { id: string };
};

export default async function ProjectDetailPage({ params }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  const project = await getProjectDetail(params.id, user.role);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className="text-sm text-blue-600 hover:underline">返回项目列表</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="max-w-4xl text-xl font-semibold text-slate-900">{project.name}</h1>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">{project.year}</span>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{projectStatusLabels[project.status]}</span>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">基本信息</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div><dt className="text-xs text-slate-500">所属学院</dt><dd className="mt-1 text-slate-900">{project.college}</dd></div>
          <div><dt className="text-xs text-slate-500">赛年</dt><dd className="mt-1 text-slate-900">{project.year}</dd></div>
          <div><dt className="text-xs text-slate-500">项目状态</dt><dd className="mt-1 text-slate-900">{projectStatusLabels[project.status]}</dd></div>
          <div><dt className="text-xs text-slate-500">创建时间</dt><dd className="mt-1 text-slate-900">{formatDate(project.createdAt)}</dd></div>
        </dl>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <h3 className="text-xs text-slate-500">项目别名与编号</h3>
          {project.aliases.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {project.aliases.map((alias) => (
                <span key={alias.id} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {aliasTypeLabels[alias.aliasType]}：{alias.aliasValue}
                </span>
              ))}
            </div>
          ) : <p className="mt-2 text-sm text-slate-400">暂无别名或编号</p>}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">获奖记录（{project.awards.length}）</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">赛事</th>
                <th className="px-4 py-3 font-medium">奖项</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">证据</th>
                <th className="px-4 py-3 font-medium">核验人</th>
                <th className="px-4 py-3 font-medium">核验时间</th>
                <th className="px-4 py-3 font-medium">获奖时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {project.awards.map((award) => (
                <tr key={award.id} className="align-top text-slate-700">
                  <td className="px-4 py-4"><Link href={`/competitions/${award.competition.id}`} className="text-blue-600 hover:underline">{award.competition.name}</Link></td>
                  <td className="px-4 py-4"><span className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">{awardLevelLabels[award.awardLevel]}</span></td>
                  <td className="px-4 py-4">{awardStatusLabels[award.status]}</td>
                  <td className="max-w-56 px-4 py-4 text-xs">
                    <div>{evidenceTypeLabels[award.evidenceType]}</div>
                    <div className="mt-1 break-all text-slate-500">{award.evidenceRef}</div>
                  </td>
                  <td className="px-4 py-4">{award.verifierName}</td>
                  <td className="px-4 py-4 text-xs">{formatDateTime(award.verifiedAt)}</td>
                  <td className="px-4 py-4 text-xs">{formatDate(award.createdAt)}</td>
                </tr>
              ))}
              {project.awards.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">暂无可见获奖记录</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">当前成员（{project.members.length}）</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">姓名</th>
                <th className="px-4 py-3 font-medium">学号</th>
                <th className="px-4 py-3 font-medium">角色</th>
                <th className="px-4 py-3 font-medium">加入时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {project.members.map((member) => (
                <tr key={member.id} className="text-slate-700">
                  <td className="px-4 py-3 font-medium text-slate-900">{member.name}</td>
                  <td className="px-4 py-3">{member.personNo}</td>
                  <td className="px-4 py-3">{memberRoleLabels[member.role]}</td>
                  <td className="px-4 py-3">{formatDate(member.joinedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">版本时间线（{project.snapshots.length}）</h2>
          <p className="mt-1 text-xs text-slate-500">展开任一历史版本，回放当时的成员构成。</p>
        </div>
        <MemberTimeline snapshots={project.snapshots} />
      </section>
    </div>
  );
}
