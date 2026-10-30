import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Pagination } from "@/components/data/pagination";
import { ReviewFilters } from "@/components/review/review-filters";
import type { ReviewFilterValues } from "@/components/review/review-filters";
import { ReviewWorkbench } from "@/components/review/review-workbench";
import { getActiveUser } from "@/lib/auth.server";
import { firstParam } from "@/lib/list-query";
import { getReviewList, listReviewFilterOptions, parseReviewQuery } from "@/lib/review";

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

  const values: ReviewFilterValues = {
    competitionId: firstParam(searchParams?.competitionId),
    stage: firstParam(searchParams?.stage),
    college: firstParam(searchParams?.college),
    status: firstParam(searchParams?.status),
    trackId: firstParam(searchParams?.trackId),
    q: firstParam(searchParams?.q),
    pageSize: firstParam(searchParams?.pageSize),
  };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
  }
  const page = firstParam(searchParams?.page);
  if (page) params.set("page", page);
  const [data, options] = await Promise.all([
    getReviewList(parseReviewQuery(params)),
    listReviewFilterOptions(),
  ]);
  values.pageSize = String(data.pageSize);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">报名审核</h1>
        <p className="mt-1 text-sm text-slate-500">学院审核通过后进入校级终审；红色行表示存在未确认指导关系。</p>
      </div>
      <ReviewFilters options={options} values={values} />
      <ReviewWorkbench data={data} />
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <Pagination basePath="/review" query={values} total={data.total} page={data.page} pageSize={data.pageSize} />
      </div>
    </div>
  );
}
