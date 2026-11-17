import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { WhuRoofDivider } from "@/components/brand/whu-motifs";
import { listHref } from "@/components/data/list-link";
import { Pagination } from "@/components/data/pagination";
import { DatasetExport } from "@/components/export/dataset-export";
import { PackageDownload } from "@/components/review/package-download";
import { ReviewFilters } from "@/components/review/review-filters";
import type { ReviewFilterValues } from "@/components/review/review-filters";
import { ReviewWorkbench } from "@/components/review/review-workbench";
import { getActiveUser } from "@/lib/auth.server";
import { countPendingChangeRequests } from "@/lib/change";
import { firstParam } from "@/lib/list-query";
import { getReviewList, getReviewTabCounts, listReviewFilterOptions, parseReviewQuery } from "@/lib/review";
import type { ReviewTab } from "@/types/review";

export const metadata: Metadata = { title: "报名审核" };
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function ReviewPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") {
    return (
      <section className="rounded-lg border border-red-200 bg-white p-6">
        <h1 className="t-page-title text-xl font-semibold text-red-600">403 无权限</h1>
        <p className="mt-2 text-sm text-slate-500">仅管理员可以查看报名审核。</p>
      </section>
    );
  }

  const rawTab = firstParam(searchParams?.tab);
  const tab: ReviewTab = rawTab === "reviewed" || rawTab === "all" ? rawTab : "pending";
  const values: ReviewFilterValues = {
    competitionId: firstParam(searchParams?.competitionId),
    stage: firstParam(searchParams?.stage),
    college: firstParam(searchParams?.college),
    status: firstParam(searchParams?.status),
    trackId: firstParam(searchParams?.trackId),
    q: firstParam(searchParams?.q),
    pageSize: firstParam(searchParams?.pageSize),
    tab,
  };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
  }
  const page = firstParam(searchParams?.page);
  if (page) params.set("page", page);
  const [data, options, tabCounts, pendingChanges] = await Promise.all([
    getReviewList(parseReviewQuery(params)),
    listReviewFilterOptions(),
    getReviewTabCounts(),
    countPendingChangeRequests(),
  ]);
  values.pageSize = String(data.pageSize);

  function tabHref(key: ReviewTab) {
    const next = new URLSearchParams();
    for (const [name, value] of Object.entries(values)) {
      if (!value || name === "tab" || name === "status") continue;
      next.set(name, value);
    }
    next.set("tab", key);
    return `/review?${next.toString()}`;
  }

  const tabs: { key: ReviewTab; label: string; count: number }[] = [
    { key: "pending", label: "待审核", count: tabCounts.pending },
    { key: "reviewed", label: "已审核", count: tabCounts.reviewed },
    { key: "all", label: "全部", count: tabCounts.total },
  ];
  // 导出/打包不受 tab 影响：tab 只是列表视图，避免默认「待审核」时导出 0 行
  const exportFilters = { ...values, tab: "" };

  return (
    <div className="space-y-5">
      {/* 修复页头左右错位：左标题区 + 右动作区紧凑对齐 */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[#115740]">
            LUOJIA AUDIT WORKBENCH
          </p>
          <h1 className="t-page-title mt-1 text-xl font-semibold text-slate-900">报名审核</h1>
          <p className="mt-1 text-sm text-slate-500">
            学院审核通过后进入校级终审；左侧红线标示存在未确认指导关系。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/review/changes"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#d0c9ba] bg-white px-5 text-sm font-medium text-slate-700 transition duration-150 ease-out hover:border-[#002554]/40 hover:bg-[#faf8f4] active:scale-[0.98]"
          >
            变更申请
            {pendingChanges > 0 ? (
              <span
                className="ml-2 rounded-full bg-red-50 px-2 py-0.5 font-mono text-xs font-medium text-red-700 ring-1 ring-red-200"
                title={`待审批变更申请 ${pendingChanges} 条`}
              >
                {pendingChanges}
              </span>
            ) : null}
          </Link>
          <PackageDownload filters={exportFilters} />
        </div>
      </div>

      {/* 一体化工作台控制面板：分段 Tab + 暖石筛选区 + 内嵌导出栏 */}
      <section className="overflow-hidden rounded-xl border border-[#e5e0d5] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e0d5] px-5 py-3">
          <nav aria-label="审核状态分栏" className="inline-flex rounded-lg border border-[#e5e0d5] bg-[#f7f5f0] p-1">
            {tabs.map((item) => {
              const active = tab === item.key;
              return (
                <Link
                  key={item.key}
                  href={tabHref(item.key)}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm transition duration-150 ${
                    active
                      ? "bg-[#002554] font-medium text-white shadow-sm"
                      : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      active ? "text-white/80" : "text-slate-400"
                    }`}
                  >
                    {item.count}
                  </span>
                </Link>
              );
            })}
          </nav>
          <span className="text-xs text-slate-500">默认仅看待审核；下方状态下拉可精确筛选</span>
        </div>

        <ReviewFilters embedded options={options} values={values} />
        <DatasetExport embedded scope="all" filters={exportFilters} buttonLabel="导出数据表" />
      </section>

      {tab === "pending" && data.total === 0 ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          当前没有待审核项目，可切换到
          <Link href={tabHref("reviewed")} className="mx-1 underline">已审核</Link>或
          <Link href={tabHref("all")} className="mx-1 underline">全部</Link>查看。
        </p>
      ) : null}

      <WhuRoofDivider />

      <ReviewWorkbench data={data} from={listHref("/review", { ...values } as Record<string, string>)} />
      <div className="card">
        <Pagination basePath="/review" query={values} total={data.total} page={data.page} pageSize={data.pageSize} />
      </div>
    </div>
  );
}
