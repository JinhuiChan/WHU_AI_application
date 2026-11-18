import { Button } from "@/components/ui/button";
import { WhuSeal, WhuTitleRule } from "@/components/brand/whu-motifs";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHead } from "@/components/ui/section-head";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChangeReviewActions } from "@/components/change/change-review-actions";
import { getActiveUser } from "@/lib/auth.server";
import { listChangeRequests, parseChangeListQuery } from "@/lib/change";
import { formatDateTime } from "@/lib/presentation";
import {
  CHANGE_FIELD_LABELS,
  CHANGE_STATUS_LABELS,
  CHANGE_TYPE_LABELS,
  type ChangeType,
} from "@/types/change";
import type { ChangeRequestStatus } from "@prisma/client";

export const metadata: Metadata = { title: "变更申请" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "PENDING", label: "待审批（学院/校级）" },
  ...(["PENDING_COLLEGE", "PENDING_SCHOOL", "APPROVED", "REJECTED", "CANCELLED"] as ChangeRequestStatus[]).map((value) => ({
    value,
    label: CHANGE_STATUS_LABELS[value],
  })),
];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function statusPillClass(status: ChangeRequestStatus) {
  if (status === "APPROVED") return "border border-[#cde0d5] bg-[#eef5f1] text-[#115740]";
  if (status === "REJECTED") return "border border-[#e5b8bd] bg-[#fdf2f3] text-[#9e2a35]";
  if (status === "PENDING_COLLEGE" || status === "PENDING_SCHOOL") {
    return "border border-[#ead7af] bg-[#fdf8ee] text-[#8a651b]";
  }
  return "border border-[#d5e2db] bg-[#f4f8f5] text-[#5c6c65]";
}

export default async function ChangeReviewPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const params = new URLSearchParams();
  const rawStatus = first(searchParams?.status);
  // 默认只看待审批；status=ALL 表示全状态
  const status = rawStatus === "ALL" ? "" : rawStatus || "PENDING";
  const page = first(searchParams?.page);
  if (status) params.set("status", status);
  if (page) params.set("page", page);
  const statusQuery = status || "ALL";

  const result = await listChangeRequests(user, parseChangeListQuery(params));
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const pagePendingCount = result.list.filter(
    (item) => item.status === "PENDING_COLLEGE" || item.status === "PENDING_SCHOOL",
  ).length;
  const pageResolvedCount = result.list.length - pagePendingCount;
  const currentFilterLabel =
    statusQuery === "ALL"
      ? "全部状态"
      : STATUS_OPTIONS.find((item) => item.value === statusQuery)?.label ?? "待审批";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="t-page-title font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
              变更申请
            </h1>
            <WhuSeal label="异动审批" />
          </div>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-[#54635d]">
            <WhuTitleRule />
            <span>学生提交的变更申请，按类型走学院审核或学院与校级两级审核；默认只列待审批。</span>
          </p>
        </div>
        <Link
          href="/review"
          className="inline-flex h-10 items-center justify-center rounded-full border border-[#7f9384] bg-white px-5 text-sm font-medium text-[#24362f] transition-colors duration-150 hover:border-[#115740] hover:bg-[#eef5f1] hover:text-[#115740] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 motion-reduce:active:scale-100"
        >
          返回报名审核
        </Link>
      </div>

      <form action="/review/changes" method="get" className="flex flex-wrap items-end justify-between gap-3 card p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-[#24362f]">
            <span className="mb-1 block text-xs text-[#54635d]">审批状态</span>
            <select
              name="status"
              defaultValue={status || "ALL"}
              className="h-10 min-w-44 rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition-colors focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25"
            >
              <option value="ALL">全部状态</option>
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <Button
            variant="default"
            size="default"
            type="submit"
            className="h-10 rounded-full bg-[#115740] px-5 text-white hover:bg-[#0d4633] active:scale-[0.98] active:bg-[#093526] focus-visible:ring-[#115740]/25 disabled:opacity-60"
          >
            筛选
          </Button>
          <Link
            href="/review/changes"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#7f9384] bg-white px-5 text-sm font-medium text-[#24362f] transition-colors duration-150 hover:border-[#115740] hover:bg-[#eef5f1] hover:text-[#115740] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 motion-reduce:active:scale-100"
          >
            重置
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#cde0d5] bg-[#eef5f1] px-3 py-1 font-medium text-[#115740] tabular-nums">
            <span>当前范围：{currentFilterLabel}</span>
            <span aria-hidden="true" className="h-3 w-px bg-[#b8d4c5]" />
            <span>共 {result.total} 条</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#ead7af] bg-[#fdf8ee] px-3 py-1 font-medium text-[#8a651b] tabular-nums">
            <span>本页待批 {pagePendingCount}</span>
            <span aria-hidden="true" className="h-3 w-px bg-[#e3c78e]" />
            <span>已结 {pageResolvedCount}</span>
          </span>
        </div>
      </form>

      <section className="overflow-hidden card">
        <div className="px-5 pt-5">
          <SectionHead
            meta={`共 ${result.total} 条`}
            sub="逐项比对变更前后字段差异与申请理由，在右侧直接执行通过或驳回"
            title="变更审批明细"
          />
        </div>
        <div aria-hidden="true" className="mx-5 mt-4 h-px bg-[#d5e2db]/70" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="t-thead bg-[#f5faf7] text-xs text-[#43554d]">
              <tr>
                <th className="w-[12%] px-4 py-3 font-semibold">提交时间</th>
                <th className="w-[16%] px-4 py-3 font-semibold">项目</th>
                <th className="w-[8%] px-4 py-3 font-semibold">申请人</th>
                <th className="w-[9%] px-4 py-3 font-semibold">类型</th>
                <th className="w-[19%] px-4 py-3 font-semibold">变更内容</th>
                <th className="w-[13%] px-4 py-3 font-semibold">理由</th>
                <th className="w-[9%] px-4 py-3 font-semibold">状态</th>
                <th className="w-[14%] min-w-[152px] px-4 py-3 font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaf1ed]">
              {result.list.map((item) => (
                <tr key={item.id} className="align-top text-[#24362f] hover:bg-[#f7faf8]">
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs text-[#54635d] tabular-nums">
                    {formatDateTime(item.createdAt)}
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/review/${item.projectId}`}
                      className="font-semibold text-[#0f1d18] transition-colors hover:text-[#115740] focus-visible:outline-none focus-visible:underline"
                    >
                      {item.projectName}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5">{item.applicantName}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs font-medium text-[#33433d]">
                    {CHANGE_TYPE_LABELS[item.type as ChangeType] ?? item.type}
                  </td>
                  <td className="px-4 py-3.5 text-xs leading-5">
                    {Object.entries(item.newValues).length > 0 ? (
                      Object.entries(item.newValues).map(([key, value]) => (
                        <div key={key} className="break-all">
                          <span className="text-[#5c6c65]">{CHANGE_FIELD_LABELS[key] ?? key}：</span>
                          <span className="text-[#8c9c95] line-through">{item.oldValues[key] || "空"}</span>
                          <span className="mx-1 text-[#54635d]">→</span>
                          <span className="font-medium text-[#0f1d18]">{value || "空"}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[#6b7c74]">详见申请理由</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs leading-5 text-[#43554d]">{item.reason}</td>
                  <td className="px-4 py-3.5 text-xs">
                    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusPillClass(item.status)}`}>
                      {CHANGE_STATUS_LABELS[item.status]}
                    </span>
                    {item.collegeReason || item.schoolReason ? (
                      <p className="mt-1 text-[#9e2a35]">驳回：{item.schoolReason || item.collegeReason}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5">
                    <ChangeReviewActions requestId={item.id} status={item.status} />
                  </td>
                </tr>
              ))}
              {result.list.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title="当前筛选下没有变更申请"
                      description={status === "PENDING" ? "可以切换「全部状态」查看历史申请，或重置筛选条件。" : "试试放宽筛选条件，或重置后查看全部申请。"}
                      action={{ href: "/review/changes", label: "清除筛选" }}
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[#e5efe9] px-5 py-3 text-xs text-[#54635d] tabular-nums">
          <span>共 {result.total} 条，第 {result.page} / {totalPages} 页</span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <Link
                href={`/review/changes?page=${result.page - 1}&status=${statusQuery}`}
                className="inline-flex h-8 items-center rounded-full border border-[#7f9384] bg-white px-3.5 text-xs font-medium text-[#24362f] transition-colors hover:border-[#115740] hover:bg-[#eef5f1] hover:text-[#115740] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 motion-reduce:active:scale-100"
              >
                上一页
              </Link>
            ) : null}
            {result.page < totalPages ? (
              <Link
                href={`/review/changes?page=${result.page + 1}&status=${statusQuery}`}
                className="inline-flex h-8 items-center rounded-full border border-[#7f9384] bg-white px-3.5 text-xs font-medium text-[#24362f] transition-colors hover:border-[#115740] hover:bg-[#eef5f1] hover:text-[#115740] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 motion-reduce:active:scale-100"
              >
                下一页
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
