import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WhuEavesWatermark, WhuSeal } from "@/components/brand/whu-motifs";
import { BackLink } from "@/components/data/list-link";
import { BreadcrumbTitle } from "@/components/layout/breadcrumbs";
import { MemberTimeline } from "@/components/projects/member-timeline";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHead, SectionRule } from "@/components/ui/section-head";
import { StatusBadge } from "@/components/ui/status-badge";
import { getActiveUser } from "@/lib/auth.server";
import { firstParam } from "@/lib/list-query";
import {
  aliasTypeLabels,
  awardLevelLabels,
  awardStatusLabels,
  evidenceTypeLabels,
  formatDate,
  formatDateTime,
  memberRoleLabels,
  projectStatusLabels,
} from "@/lib/presentation";
import { getProjectDetail } from "@/lib/projects";

export const metadata: Metadata = { title: "项目全貌" };

type PageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  const project = await getProjectDetail(params.id, user.role);
  if (!project) notFound();

  const canSeeContact = user.roles.includes("TEACHER") || user.roles.includes("ADMIN");

  return (
    <div className="space-y-5">
      <BreadcrumbTitle label={project.name} />
      <div>
        <BackLink to={firstParam(searchParams?.from)} fallback="/projects" label="返回项目列表" />
      </div>

      <section className="card relative overflow-hidden border-[#c0d5ca] bg-gradient-to-br from-white via-white to-[#eef5f1] p-6 before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-[#115740] before:via-[#1c7859] before:to-[#c59b45]">
        <div className="relative z-[1]">
          <div className="flex flex-wrap items-center gap-2.5">
            <WhuSeal label="项目档案" />
            <span className="inline-flex items-center rounded-full bg-[#eef5f1] px-2.5 py-0.5 text-xs font-semibold text-[#115740] ring-1 ring-[#cbe0d4] tabular-nums">
              {project.year} 赛年
            </span>
            <StatusBadge status={project.status} scope="project">
              {projectStatusLabels[project.status]}
            </StatusBadge>
          </div>

          <h1 className="t-page-title mt-3 max-w-4xl font-display text-[25px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
            {project.name}
          </h1>

          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-[#dce8e1] pt-4 text-sm md:grid-cols-4">
            <div>
              <dt className="t-label text-xs text-[#5c6c65]">所属学院</dt>
              <dd className="mt-1 font-medium text-[#0e1d17]">{project.college}</dd>
            </div>
            <div>
              <dt className="t-label text-xs text-[#5c6c65]">立项赛年</dt>
              <dd className="mt-1 font-serif text-base font-semibold text-[#0e1d17] tabular-nums">{project.year}</dd>
            </div>
            <div>
              <dt className="t-label text-xs text-[#5c6c65]">当前状态</dt>
              <dd className="mt-1">
                <StatusBadge status={project.status} scope="project">
                  {projectStatusLabels[project.status]}
                </StatusBadge>
              </dd>
            </div>
            <div>
              <dt className="t-label text-xs text-[#5c6c65]">建档时间</dt>
              <dd className="mt-1 text-[#33433d] tabular-nums">{formatDate(project.createdAt)}</dd>
            </div>
          </dl>

          <div className="mt-4 border-t border-[#e5ede8] pt-4">
            <h2 className="t-label text-xs text-[#5c6c65]">项目别名与编号</h2>
            {project.aliases.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {project.aliases.map((alias) => (
                  <span
                    key={alias.id}
                    className="inline-flex items-center rounded-full border border-[#d5e2db] bg-[#f8fbf9] px-3 py-1 text-xs text-[#33433d]"
                  >
                    {aliasTypeLabels[alias.aliasType]}：{alias.aliasValue}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 inline-empty text-sm">暂无别名或编号</p>
            )}
          </div>
        </div>
        <WhuEavesWatermark className="pointer-events-none absolute -bottom-3 -right-2 h-[116px] w-[204px] text-[#0d3b2e]/[0.05]" />
      </section>

      <section className="overflow-hidden card">
        <div className="px-5 pt-4">
          <SectionHead
            title={`获奖记录（${project.awards.length}）`}
            sub="已归档的各阶段获奖等级、佐证材料与核验留痕"
          />
        </div>
        <SectionRule className="mx-5 mt-3.5" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="t-thead bg-[#f5faf7] text-xs text-[#4d5e57]">
              <tr>
                <th className="px-4 py-3 font-medium">赛事</th>
                <th className="px-4 py-3 font-medium">奖项</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">佐证依据</th>
                <th className="px-4 py-3 font-medium">核验人</th>
                <th className="px-4 py-3 font-medium">核验时间</th>
                <th className="px-4 py-3 font-medium">获奖时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef4f0]">
              {project.awards.map((award) => (
                <tr key={award.id} className="align-top text-[#26342e]">
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/competitions/${award.competition.id}`}
                      className="font-medium text-[#115740] hover:underline"
                    >
                      {award.competition.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center rounded-full bg-[#eef5f1] px-2.5 py-0.5 text-xs font-medium text-[#115740] ring-1 ring-[#cbe0d4]">
                      {awardLevelLabels[award.awardLevel]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-[#3f524a]">{awardStatusLabels[award.status]}</td>
                  <td className="max-w-56 px-4 py-3.5 text-xs">
                    <div className="font-medium text-[#162620]">{evidenceTypeLabels[award.evidenceType]}</div>
                    <div className="mt-0.5 break-all text-[#5c6c65]">{award.evidenceRef}</div>
                  </td>
                  <td className="px-4 py-3.5">{award.verifierName}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs text-[#54635d] tabular-nums">
                    {formatDateTime(award.verifiedAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs text-[#54635d] tabular-nums">
                    {formatDate(award.createdAt)}
                  </td>
                </tr>
              ))}
              {project.awards.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <EmptyState
                      title="暂无可见获奖记录"
                      description="项目获奖记录经核验或正式发布后将归档至此。"
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden card">
        <div className="px-5 pt-4">
          <SectionHead
            title={`当前成员（${project.members.length}）`}
            sub="项目当前在队成员与团队分工"
          />
        </div>
        <SectionRule className="mx-5 mt-3.5" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="t-thead bg-[#f5faf7] text-xs text-[#4d5e57]">
              <tr>
                <th className="px-4 py-3 font-medium">姓名</th>
                <th className="px-4 py-3 font-medium">学号</th>
                <th className="px-4 py-3 font-medium">角色</th>
                {canSeeContact ? <th className="px-4 py-3 font-medium">负责人联系方式</th> : null}
                <th className="px-4 py-3 font-medium">加入时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef4f0]">
              {project.members.map((member) => {
                const isLeader = member.role === "LEADER";
                return (
                  <tr key={member.id} className="text-[#26342e]">
                    <td className="px-4 py-3 font-medium text-[#0e1d17]">{member.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#33433d] tabular-nums">{member.personNo}</td>
                    <td className="px-4 py-3">
                      {isLeader ? (
                        <span className="inline-flex rounded-full bg-[#eef5f1] px-2.5 py-0.5 text-xs font-semibold text-[#115740]">
                          {memberRoleLabels[member.role]}
                        </span>
                      ) : (
                        <span className="text-xs text-[#3f524a]">{memberRoleLabels[member.role]}</span>
                      )}
                    </td>
                    {canSeeContact ? (
                      <td className="px-4 py-3 text-xs">
                        {isLeader ? (
                          member.phone || member.email ? (
                            <div className="space-y-0.5">
                              {member.phone ? <div className="text-[#0e1d17] tabular-nums">{member.phone}</div> : null}
                              {member.email ? <div className="text-[#5c6c65]">{member.email}</div> : null}
                            </div>
                          ) : (
                            <span className="text-[#7c8e85]">未填写</span>
                          )
                        ) : (
                          <span className="text-[#8c9c95]">仅展示负责人</span>
                        )}
                      </td>
                    ) : null}
                    <td className="px-4 py-3 text-xs text-[#54635d] tabular-nums">{formatDate(member.joinedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHead
          title={`版本时间线（${project.snapshots.length}）`}
          sub="展开任一历史版本，回放当时的成员构成与变更原因"
        />
        <MemberTimeline snapshots={project.snapshots} />
      </section>
    </div>
  );
}
