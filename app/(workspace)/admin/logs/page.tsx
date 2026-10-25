import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Pagination } from "@/components/data/pagination";
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

export default async function AuditLogsPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") {
    return (
      <section className="rounded-lg border border-red-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-red-600">403 无权限</h1>
        <p className="mt-2 text-sm text-slate-500">仅管理员可以查看审计日志。</p>
      </section>
    );
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">审计日志</h1>
        <p className="mt-1 text-sm text-slate-500">按操作人和动作类型查看操作留痕，日志只读，不提供删除。</p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <form action="/admin/logs" method="get" className="flex flex-wrap items-end gap-3">
          <label className="min-w-52 flex-1 text-xs text-slate-500">
            <span className="mb-1 block">操作人</span>
            <input
              name="actor"
              type="search"
              defaultValue={actor}
              placeholder="姓名或手机号"
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600"
            />
          </label>
          <label className="text-xs text-slate-500">
            <span className="mb-1 block">动作类型</span>
            <select name="action" defaultValue={action} className="h-10 min-w-40 rounded-md border border-slate-300 bg-white px-3 text-sm">
              <option value="">全部动作</option>
              {actions.map((item) => (
                <option key={item} value={item}>{auditActionLabels[item] ?? item}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            <span className="mb-1 block">每页条数</span>
            <select name="pageSize" defaultValue={String(pageSize)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
              {[10, 20, 50].map((size) => <option key={size} value={size}>{size} 条</option>)}
            </select>
          </label>
          <button type="submit" className="h-10 rounded-md bg-blue-600 px-4 text-sm text-white hover:bg-blue-700">筛选</button>
          <Link href="/admin/logs" className="flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50">重置</Link>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">操作时间</th>
                <th className="px-4 py-3 font-medium">操作人</th>
                <th className="px-4 py-3 font-medium">动作类型</th>
                <th className="px-4 py-3 font-medium">操作对象</th>
                <th className="px-4 py-3 font-medium">详情</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.list.map((log) => (
                <tr key={log.id} className="align-top text-slate-700">
                  <td className="whitespace-nowrap px-4 py-4 text-xs">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-900">{log.actor.name}</div>
                    <div className="mt-1 text-xs text-slate-400">{log.actor.phone}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                      {auditActionLabels[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="max-w-xs px-4 py-4 text-xs">
                    <div>{log.targetType}</div>
                    <div className="mt-1 break-all text-slate-400">{log.targetId}</div>
                  </td>
                  <td className="max-w-md px-4 py-4">
                    <details>
                      <summary className="cursor-pointer text-xs text-blue-600">查看详情</summary>
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-50 p-3 font-sans text-xs leading-5 text-slate-600">{detailText(log.detail)}</pre>
                    </details>
                  </td>
                </tr>
              ))}
              {data.list.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">暂无符合条件的审计日志</td></tr>
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
