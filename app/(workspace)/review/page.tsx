import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { WhuSeal, WhuTitleRule } from "@/components/brand/whu-motifs";
import { listHref } from "@/components/data/list-link";
import { Pagination } from "@/components/data/pagination";
import { DatasetExport } from "@/components/export/dataset-export";
import { PackageDownload } from "@/components/review/package-download";
import { ReviewFilters, type ReviewFilterValues } from "@/components/review/review-filters";
import { ReviewWorkbench } from "@/components/review/review-workbench";
import { WorkspaceForbidden } from "@/components/ui/workspace-forbidden";
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
    return <WorkspaceForbidden message="仅管理员可以查看报名审核。" />;
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
  const exportFilters = { ...values, tab: "" };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="t-page-title font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
              报名审核
            </h1>
            <WhuSeal label="审核工作台" />
          </div>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-[#54635d]">
            <WhuTitleRule />
            <span>学院初审通过后进入校级终审；存在未确认指导关系的项目以左侧朱砂红线标示。</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/review/changes"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#7f9384] bg-white px-4 text-sm font-medium text-[#162620] transition duration-150 ease-out hover:border-[#115740] hover:bg-[#eef5f1] active:scale-[0.98] motion-reduce:active:scale-100"
          >
            变更申请
            {pendingChanges > 0 ? (
              <span
                className="ml-2 rounded-full bg-[#faeaea] px-2 py-0.5 text-xs font-semibold text-[#9e2a35] tabular-nums"
                title={`待审批变更申请 ${pendingChanges} 条`}
              >
                {pendingChanges}
              </span>
            ) : null}
          </Link>
          <PackageDownload filters={exportFilters} />
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#cedcd4]">
        <nav aria-label="审核状态分栏" className="flex items-center gap-6">
          {tabs.map((item) => {
            const active = tab === item.key;
            return (
              <Link
                key={item.key}
                href={tabHref(item.key)}
                aria-current={active ? "page" : undefined}
                className={`-mb-px inline-flex items-center gap-2 border-b-[2.5px] pb-2.5 pt-1 text-sm transition-colors duration-150 ${
                  active
                    ? "border-[#115740] font-semibold text-[#115740]"
                    : "border-transparent font-medium text-[#5d6c65] hover:text-[#0e1d17]"
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                    active ? "bg-[#eef5f1] text-[#115740] ring-1 ring-[#badec9]" : "bg-[#e3ede7] text-[#54635d]"
                  }`}
                >
                  {item.count}
                </span>
              </Link>
            );
          })}
        </nav>
        <span className="pb-2.5 text-xs text-[#5c6c65]">默认仅展示待审核项目，可随时切换全部状态</span>
      </div>

      <section className="overflow-hidden rounded-xl border border-[#d5e2db] bg-white shadow-[0_1px_2px_rgba(20,34,27,0.03)]">
        <ReviewFilters embedded options={options} values={values} />
        <DatasetExport embedded scope="all" filters={exportFilters} buttonLabel="导出数据表" />
      </section>

      {tab === "pending" && data.total === 0 ? (
        <p className="rounded-xl border border-[#badec9] bg-[#eef5f1] px-4 py-3 text-sm text-[#115740]">
          当前没有待审核项目，可切换到
          <Link href={tabHref("reviewed")} className="mx-1 font-semibold underline">
            已审核
          </Link>
          或
          <Link href={tabHref("all")} className="mx-1 font-semibold underline">
            全部
          </Link>
          查看历史台账。
        </p>
      ) : null}

      <ReviewWorkbench data={data} from={listHref("/review", { ...values } as Record<string, string>)} />
      <div className="card">
        <Pagination basePath="/review" query={values} total={data.total} page={data.page} pageSize={data.pageSize} />
      </div>
    </div>
  );
}
