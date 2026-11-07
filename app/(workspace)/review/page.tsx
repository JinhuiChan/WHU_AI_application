import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
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
        <h1 className="text-xl font-semibold text-red-600">403 无权限</h1>
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

  const tabs: { key: ReviewTab; label: string }[] = [
    { key: "pending", label: `待审核 ${tabCounts.pending}` },
    { key: "reviewed", label: `已审核 ${tabCounts.reviewed}` },
    { key: "all", label: `全部 ${tabCounts.total}` },
  ];
  // 导出/打包不受 tab 影响：tab 只是列表视图，避免默认「待审核」时导出 0 行
  const exportFilters = { ...values, tab: "" };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">报名审核</h1>
          <p className="mt-1 text-sm text-slate-500">学院审核通过后进入校级终审；红色行表示存在未确认指导关系。</p>
        </div>
        <Link href="/review/changes" className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition duration-[160ms] ease-out hover:bg-slate-50 active:scale-[0.97] active:bg-slate-100 motion-reduce:active:scale-100">
          变更申请
          {pendingChanges > 0 ? (
            <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white" title={`待审批变更申请 ${pendingChanges} 条`}>
              {pendingChanges}
            </span>
          ) : null}
        </Link>
        <PackageDownload filters={exportFilters} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((item) => (
          <Link
            key={item.key}
            href={tabHref(item.key)}
            aria-current={tab === item.key ? "page" : undefined}
            className={`h-10 rounded-lg px-4 text-sm leading-10 ${tab === item.key ? "bg-blue-600 font-medium text-white" : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            {item.label}
          </Link>
        ))}
        <span className="text-xs text-slate-400">默认只看待审核；状态下拉可精确到某一状态</span>
      </div>
      {tab === "pending" && data.total === 0 ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          当前没有待审核项目，可切换到
          <Link href={tabHref("reviewed")} className="mx-1 underline">已审核</Link>或
          <Link href={tabHref("all")} className="mx-1 underline">全部</Link>查看。
        </p>
      ) : null}
      <ReviewFilters options={options} values={values} />
      <DatasetExport scope="all" filters={exportFilters} buttonLabel="导出数据表" />
      <ReviewWorkbench data={data} />
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Pagination basePath="/review" query={values} total={data.total} page={data.page} pageSize={data.pageSize} />
      </div>
    </div>
  );
}
