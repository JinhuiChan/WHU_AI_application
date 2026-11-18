import { formatDate, formatDateTime, memberRoleLabels } from "@/lib/presentation";
import type { ProjectSnapshot } from "@/types/project";

export function MemberTimeline({ snapshots }: { snapshots: ProjectSnapshot[] }) {
  if (snapshots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#b8cbc0] bg-[#f8fbf9] px-4 py-8 text-center text-sm text-[#5c6c65]">
        暂无历史成员版本
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {snapshots.map((snapshot) => (
        <details
          key={snapshot.id}
          className="group overflow-hidden rounded-xl border border-[#d5e2db] bg-white transition-colors open:border-[#9ebbb0]"
        >
          <summary className="cursor-pointer list-none px-4 py-3.5 transition-colors hover:bg-[#f8fbf9] active:bg-[#eef5f1]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#115740]/25">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center rounded-full border border-[#cde0d5] bg-[#eef5f1] px-2.5 py-0.5 font-display text-xs font-bold text-[#115740] tabular-nums">
                  版本 v{snapshot.versionNo}
                </span>
                <span className="text-sm text-[#54635d] tabular-nums">{formatDateTime(snapshot.changedAt)}</span>
              </div>
              <span className="inline-flex w-fit items-center rounded-full border border-[#cde0d5] bg-[#eef5f1] px-3 py-1 text-xs font-medium text-[#115740] transition-colors group-hover:border-[#115740] group-hover:bg-[#e3f0ea]">
                <span className="group-open:hidden">展开回放</span>
                <span className="hidden group-open:inline">收起回放</span>
              </span>
            </div>
            <div className="mt-2 text-xs text-[#5c6c65]">
              变更人：<span className="font-medium text-[#24362f]">{snapshot.changedByName}</span> · 原因：{snapshot.reason ?? "未填写"}
            </div>
          </summary>
          <div className="border-t border-[#d5e2db] bg-[#f8fbf9] px-4 py-4">
            <p className="mb-3 text-xs font-medium text-[#43554d]">
              该版本共 <span className="font-semibold text-[#0f1d18] tabular-nums">{snapshot.members.length}</span> 名成员
            </p>
            {snapshot.members.length ? (
              <div className="overflow-x-auto rounded-xl border border-[#d5e2db] bg-white">
                <table className="w-full min-w-[580px] text-left text-sm">
                  <thead className="t-thead bg-[#eef5f1] text-xs text-[#33433d]">
                    <tr>
                      <th className="px-3.5 py-2.5 font-semibold">姓名</th>
                      <th className="px-3.5 py-2.5 font-semibold">学号</th>
                      <th className="px-3.5 py-2.5 font-semibold">角色</th>
                      <th className="px-3.5 py-2.5 font-semibold">加入时间</th>
                      <th className="px-3.5 py-2.5 font-semibold">离队时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eaf1ed]">
                    {snapshot.members.map((member) => (
                      <tr key={`${snapshot.id}-${member.personNo}-${member.role}`}>
                        <td className="px-3.5 py-3 font-medium text-[#0f1d18]">{member.name}</td>
                        <td className="px-3.5 py-3 font-mono text-xs text-[#43554d] tabular-nums">{member.personNo}</td>
                        <td className="px-3.5 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              member.role === "LEADER"
                                ? "border border-[#cde0d5] bg-[#eef5f1] text-[#115740]"
                                : "border border-[#d5e2db] bg-[#f8fbf9] text-[#43554d]"
                            }`}
                          >
                            {memberRoleLabels[member.role]}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-xs text-[#54635d] tabular-nums">{formatDate(member.joinedAt)}</td>
                        <td className="px-3.5 py-3 text-xs text-[#54635d] tabular-nums">{member.leftAt ? formatDate(member.leftAt) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-[#5c6c65]">该版本暂无可回放成员</p>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
