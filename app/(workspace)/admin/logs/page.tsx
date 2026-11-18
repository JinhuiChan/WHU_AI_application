import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveAuditTargets } from "@/components/admin/audit-targets";
import { WhuSeal, WhuTitleRule } from "@/components/brand/whu-motifs";
import { Pagination } from "@/components/data/pagination";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHead, SectionRule } from "@/components/ui/section-head";
import { WorkspaceForbidden } from "@/components/ui/workspace-forbidden";
import { getAuditLogPage, listAuditActions } from "@/lib/audit-logs";
import { getActiveUser } from "@/lib/auth.server";
import { firstParam, optionalText, pageParams } from "@/lib/list-query";
import { auditActionLabels, formatDateTime } from "@/lib/presentation";

export const metadata: Metadata = { title: "审计日志" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function detailText(detail: string) {
  try {
    const parsed: unknown = JSON.parse(detail);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return detail;
  }
}

function actionCapsuleTone(action: string) {
  if (/FAILED|REJECT|DELETE|WITHDRAW|REMOVE|DECLINE/.test(action)) {
    return "bg-[#faeaea] text-[#9e2a35] ring-1 ring-[#eccacd]";
  }
  if (/APPROVE|CONFIRM|PUBLISH|COMMIT|RESOLVE|ACCEPT|CREATED|REGISTERED/.test(action)) {
    return "bg-[#eef5f1] text-[#115740] ring-1 ring-[#cbe0d4]";
  }
  if (/PENDING|REQUEST|UPDATE|SAVE|CHECK|UPLOAD|EXPORT/.test(action)) {
    return "bg-[#fdf6e7] text-[#9a5b13] ring-1 ring-[#ead4a8]";
  }
  return "bg-[#f1f5f3] text-[#3f524a] ring-1 ring-[#d5e2db]";
}

export default async function AuditLogsPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") {
    return <WorkspaceForbidden message="仅管理员可以查看审计日志。" />;
  }

  const actor = firstParam(searchParams?.actor);
  const action = firstParam(searchParams?.action);
  const { page, pageSize } = pageParams(
    firstParam(searchParams?.page),
    firstParam(searchParams?.pageSize),
  );
  const [data, storedActions] = await Promise.all([
    getAuditLogPage({
      actor: optionalText(actor),
      action: optionalText(action),
      page,
      pageSize,
    }),
    listAuditActions(),
  ]);
  const actions = [...new Set([...storedActions, action].filter(Boolean))].sort();
  const { typeLabel, lookup } = await resolveAuditTargets(data.list);
  const controlClass =
    "h-10 rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15";

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="t-page-title font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
            审计日志
          </h1>
          <WhuSeal label="安全留痕" />
        </div>
        <p className="mt-1.5 flex items-center gap-2 text-sm text-[#54635d]">
          <WhuTitleRule />
          <span>按操作人与动作类型回溯全平台关键留痕，审计日志只读归档，不提供篡改或删除。</span>
        </p>
      </div>

      <section className="card p-5">
        <SectionHead
          title="日志筛选"
          sub="支持按经办人姓名、手机号与业务动作精确检索"
          meta={`共 ${data.total} 条留痕`}
        />
        <SectionRule className="my-3.5" />
        <form action="/admin/logs" method="get" className="flex flex-wrap items-end gap-3">
          <label className="min-w-52 flex-1 text-sm text-[#33433d]">
            <span className="mb-1 block text-xs font-medium text-[#54635d]">操作人</span>
            <input
              name="actor"
              type="search"
              defaultValue={actor}
              placeholder="输入姓名或手机号"
              className={`${controlClass} w-full`}
            />
          </label>
          <label className="text-sm text-[#33433d]">
            <span className="mb-1 block text-xs font-medium text-[#54635d]">动作类型</span>
            <select name="action" defaultValue={action} className={`${controlClass} min-w-44`}>
              <option value="">全部动作</option>
              {actions.map((item) => (
                <option key={item} value={item}>
                  {auditActionLabels[item] ?? item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-[#33433d]">
            <span className="mb-1 block text-xs font-medium text-[#54635d]">每页条数</span>
            <select name="pageSize" defaultValue={String(pageSize)} className={controlClass}>
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size} 条
                </option>
              ))}
            </select>
          </label>
          <Button
            type="submit"
            size="default"
            className="h-10 bg-[#115740] px-6 text-white hover:bg-[#0d4633]"
          >
            筛选
          </Button>
          <Link
            href="/admin/logs"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#7f9384] bg-white px-5 text-sm font-medium text-slate-700 transition duration-150 ease-out hover:border-[#657a6f] hover:bg-[#f7faf8] active:scale-[0.98] motion-reduce:active:scale-100"
          >
            重置
          </Link>
        </form>
      </section>

      <section className="overflow-hidden card">
        <div className="px-5 pt-4">
          <SectionHead
            title="操作留痕明细"
            sub="点击右侧「查看详情」可展开核查变更载荷"
            meta={`第 ${data.page} 页 · 每页 ${data.pageSize} 条`}
          />
        </div>
        <SectionRule className="mx-5 mt-3.5" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="t-thead bg-[#f5faf7] text-xs text-[#4d5e57]">
              <tr>
                <th className="w-[18%] px-4 py-3 font-medium">操作时间</th>
                <th className="w-[16%] px-4 py-3 font-medium">操作人</th>
                <th className="w-[18%] px-4 py-3 font-medium">动作类型</th>
                <th className="w-[26%] px-4 py-3 font-medium">操作对象</th>
                <th className="w-[22%] px-4 py-3 font-medium">留痕详情</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef4f0]">
              {data.list.map((log) => {
                const target = lookup(log.targetType, log.targetId);
                const onSelf =
                  log.targetType === "User" && target?.name === log.actor.name && target?.note === log.actor.phone;
                return (
                  <tr key={log.id} className="align-top text-[#26342e]">
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-[#4d5e57] tabular-nums">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-[#0e1d17]">{log.actor.name}</div>
                      <div className="mt-0.5 text-xs text-[#6c7e76] tabular-nums">{log.actor.phone}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${actionCapsuleTone(log.action)}`}
                      >
                        {auditActionLabels[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="max-w-[260px] px-4 py-3.5 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-[#eef5f1] px-2 py-0.5 text-[11px] font-medium text-[#115740]">
                          {typeLabel(log.targetType)}
                        </span>
                        <span className="font-medium text-[#0e1d17]">
                          {target ? (onSelf ? "本人" : target.name) : "未找到对应记录"}
                        </span>
                      </div>
                      {target?.note && !onSelf ? (
                        <div className="mt-1 text-[11px] text-[#54635d]">{target.note}</div>
                      ) : null}
                      <div className="mt-1 select-all break-all font-mono text-[11px] text-[#7c8e85]">
                        {log.targetId}
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-3.5">
                      <details>
                        <summary className="cursor-pointer text-xs font-medium text-[#115740] hover:underline">
                          查看详情
                        </summary>
                        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[#d5e2db] bg-[#f8fbf9] p-3 font-sans text-xs leading-5 text-[#33433d]">
                          {detailText(log.detail)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                );
              })}
              {data.list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-0">
                    <EmptyState
                      title="暂无符合条件的审计日志"
                      description="请尝试调整操作人关键词或动作类型，也可重置检索条件查看全部留痕。"
                      action={{ href: "/admin/logs", label: "重置检索" }}
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pagination
          basePath="/admin/logs"
          query={{ actor, action, pageSize: String(pageSize) }}
          total={data.total}
          page={data.page}
          pageSize={data.pageSize}
        />
      </section>
    </div>
  );
}
