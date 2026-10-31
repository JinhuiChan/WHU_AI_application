import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChangeReviewActions } from "@/components/change/change-review-actions";
import { getActiveUser } from "@/lib/auth.server";
import { listChangeRequests, parseChangeListQuery } from "@/lib/change";
import { formatDateTime } from "@/lib/presentation";
import { CHANGE_STATUS_LABELS, CHANGE_TYPE_LABELS, type ChangeType } from "@/types/change";
import type { ChangeRequestStatus } from "@prisma/client";

export const metadata: Metadata = { title: "变更申请" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const STATUS_OPTIONS: ChangeRequestStatus[] = ["PENDING_COLLEGE", "PENDING_SCHOOL", "APPROVED", "REJECTED", "CANCELLED"];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ChangeReviewPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const params = new URLSearchParams();
  const status = first(searchParams?.status);
  const page = first(searchParams?.page);
  if (status) params.set("status", status);
  if (page) params.set("page", page);

  const result = await listChangeRequests(user, parseChangeListQuery(params));
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">变更申请</h1>
          <p className="mt-1 text-sm text-slate-500">学生提交的变更申请，按类型走学院审核或学院 + 校级两级审核。</p>
        </div>
        <Link href="/review" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
          返回报名审核
        </Link>
      </div>

      <form action="/review/changes" method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-xs text-slate-500">
          <span className="mb-1 block">状态</span>
          <select name="status" defaultValue={status ?? ""} className="h-10 min-w-40 rounded-md border border-slate-300 bg-white px-3 text-sm">
            <option value="">全部状态</option>
            {STATUS_OPTIONS.map((item) => (
              <option key={item} value={item}>{CHANGE_STATUS_LABELS[item]}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-10 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">筛选</button>
        <Link href="/review/changes" className="h-10 rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">重置</Link>
      </form>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">提交时间</th>
                <th className="px-4 py-3 font-medium">项目</th>
                <th className="px-4 py-3 font-medium">申请人</th>
                <th className="px-4 py-3 font-medium">类型</th>
                <th className="px-4 py-3 font-medium">变更内容</th>
                <th className="px-4 py-3 font-medium">理由</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.list.map((item) => (
                <tr key={item.id} className="align-top text-slate-700">
                  <td className="px-4 py-3 text-xs">{formatDateTime(item.createdAt)}</td>
                  <td className="max-w-52 px-4 py-3">
                    <Link href={`/review/${item.projectId}`} className="font-medium text-slate-900 hover:text-blue-600">{item.projectName}</Link>
                  </td>
                  <td className="px-4 py-3">{item.applicantName}</td>
                  <td className="px-4 py-3">{CHANGE_TYPE_LABELS[item.type as ChangeType] ?? item.type}</td>
                  <td className="max-w-72 px-4 py-3 text-xs">
                    {Object.entries(item.newValues).map(([key, value]) => (
                      <div key={key} className="break-all">
                        <span className="text-slate-500">{key}：</span>
                        <span className="text-slate-400 line-through">{item.oldValues[key] || "空"}</span>
                        <span className="mx-1">→</span>
                        <span className="text-slate-900">{value || "空"}</span>
                      </div>
                    ))}
                  </td>
                  <td className="max-w-56 px-4 py-3 text-xs">{item.reason}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">{CHANGE_STATUS_LABELS[item.status]}</span>
                    {item.collegeReason || item.schoolReason ? (
                      <p className="mt-1 text-red-700">驳回：{item.schoolReason || item.collegeReason}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <ChangeReviewActions requestId={item.id} status={item.status} />
                  </td>
                </tr>
              ))}
              {result.list.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">暂无变更申请</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
          <span>共 {result.total} 条，第 {result.page} / {totalPages} 页</span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <Link href={`/review/changes?page=${result.page - 1}${status ? `&status=${status}` : ""}`} className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50">上一页</Link>
            ) : null}
            {result.page < totalPages ? (
              <Link href={`/review/changes?page=${result.page + 1}${status ? `&status=${status}` : ""}`} className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50">下一页</Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
