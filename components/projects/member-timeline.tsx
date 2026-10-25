import { formatDate, formatDateTime, memberRoleLabels } from "@/lib/presentation";
import type { ProjectSnapshot } from "@/types/project";

export function MemberTimeline({ snapshots }: { snapshots: ProjectSnapshot[] }) {
  if (snapshots.length === 0) {
    return <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">暂无历史成员版本</div>;
  }

  return (
    <div className="space-y-3">
      {snapshots.map((snapshot) => (
        <details key={snapshot.id} className="group overflow-hidden rounded-lg border border-slate-200 bg-white">
          <summary className="cursor-pointer list-none px-4 py-4 hover:bg-slate-50">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="font-medium text-slate-900">版本 v{snapshot.versionNo}</span>
                <span className="ml-3 text-sm text-slate-500">{formatDateTime(snapshot.changedAt)}</span>
              </div>
              <span className="text-sm text-blue-600">
                <span className="group-open:hidden">展开回放</span>
                <span className="hidden group-open:inline">收起回放</span>
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              变更人：{snapshot.changedByName} · 原因：{snapshot.reason ?? "未填写"}
            </div>
          </summary>
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
            <p className="mb-3 text-xs text-slate-500">该版本共 {snapshot.members.length} 名成员</p>
            {snapshot.members.length ? (
              <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">姓名</th>
                      <th className="px-3 py-2 font-medium">学号</th>
                      <th className="px-3 py-2 font-medium">角色</th>
                      <th className="px-3 py-2 font-medium">加入时间</th>
                      <th className="px-3 py-2 font-medium">离队时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {snapshot.members.map((member) => (
                      <tr key={`${snapshot.id}-${member.personNo}-${member.role}`}>
                        <td className="px-3 py-3">{member.name}</td>
                        <td className="px-3 py-3">{member.personNo}</td>
                        <td className="px-3 py-3">{memberRoleLabels[member.role]}</td>
                        <td className="px-3 py-3">{formatDate(member.joinedAt)}</td>
                        <td className="px-3 py-3">{member.leftAt ? formatDate(member.leftAt) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-slate-500">该版本暂无可回放成员</p>}
          </div>
        </details>
      ))}
    </div>
  );
}
