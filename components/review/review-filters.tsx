import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ProjectStage, RegistrationStatus } from "@prisma/client";
import { registrationStatusLabels } from "@/lib/presentation";
import type { ReviewFilterOptions } from "@/types/review";

const stages: { value: ProjectStage; label: string }[] = [
  { value: "SCHOOL", label: "校赛" },
  { value: "PROVINCE", label: "省赛" },
  { value: "NATIONAL", label: "国赛" },
  { value: "FINISHED", label: "已结束" },
];

const statuses: RegistrationStatus[] = [
  "DRAFT",
  "PENDING",
  "COLLEGE_REVIEW",
  "SCHOOL_FINAL",
  "REJECTED",
  "PROVINCE_ADVANCED",
  "NATIONAL_ADVANCED",
  "WITHDRAWN",
];

export type ReviewFilterValues = {
  competitionId: string;
  stage: string;
  college: string;
  status: string;
  trackId: string;
  q: string;
  pageSize: string;
  tab: string;
};

export function ReviewFilters({
  options,
  values,
  embedded = false,
}: {
  options: ReviewFilterOptions;
  values: ReviewFilterValues;
  embedded?: boolean;
}) {
  const competitionNames = new Map(options.competitions.map((item) => [item.id, item.name]));
  const form = (
    <form action="/review" method="get" className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8 xl:items-end">
      {values.tab ? <input type="hidden" name="tab" value={values.tab} /> : null}
      <label className="min-w-0 text-sm text-slate-600 xl:col-span-2">
        <span className="mb-1 block text-xs text-slate-500">赛事</span>
        <select name="competitionId" defaultValue={values.competitionId} className="h-9 w-full rounded-lg border border-[#cbd8d1] bg-[#fafcfb] px-3 text-sm focus:border-[#002554]">
          <option value="">全部赛事</option>
          {options.competitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="min-w-0 text-sm text-slate-600">
        <span className="mb-1 block text-xs text-slate-500">阶段</span>
        <select name="stage" defaultValue={values.stage} className="h-9 w-full rounded-lg border border-[#cbd8d1] bg-[#fafcfb] px-3 text-sm focus:border-[#002554]">
          <option value="">全部阶段</option>
          {stages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label className="min-w-0 text-sm text-slate-600">
        <span className="mb-1 block text-xs text-slate-500">学院</span>
        <select name="college" defaultValue={values.college} className="h-9 w-full rounded-lg border border-[#cbd8d1] bg-[#fafcfb] px-3 text-sm focus:border-[#002554]">
          <option value="">全部学院</option>
          {options.colleges.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label className="min-w-0 text-sm text-slate-600">
        <span className="mb-1 block text-xs text-slate-500">状态</span>
        <select name="status" defaultValue={values.status} className="h-9 w-full rounded-lg border border-[#cbd8d1] bg-[#fafcfb] px-3 text-sm focus:border-[#002554]">
          <option value="">全部状态</option>
          {statuses.map((item) => <option key={item} value={item}>{registrationStatusLabels[item]}</option>)}
        </select>
      </label>
      <label className="min-w-0 text-sm text-slate-600 sm:col-span-2 xl:col-span-2">
        <span className="mb-1 block text-xs text-slate-500">赛道</span>
        <select name="trackId" defaultValue={values.trackId} className="h-9 w-full rounded-lg border border-[#cbd8d1] bg-[#fafcfb] px-3 text-sm focus:border-[#002554]">
          <option value="">全部赛道</option>
          {options.tracks.map((item) => (
            <option key={item.id} value={item.id}>{item.name}（{competitionNames.get(item.competitionId) ?? "未知赛事"}）</option>
          ))}
        </select>
      </label>
      <label className="min-w-0 text-sm text-slate-600">
        <span className="mb-1 block text-xs text-slate-500">每页条数</span>
        <select name="pageSize" defaultValue={values.pageSize} className="h-9 w-full rounded-lg border border-[#cbd8d1] bg-[#fafcfb] px-3 text-sm focus:border-[#002554]">
          {[10, 20, 50].map((size) => <option key={size} value={size}>{size} 条</option>)}
        </select>
      </label>
      <label className="col-span-2 min-w-0 text-sm text-slate-500 sm:col-span-3 xl:col-span-6">
        <span className="mb-1 block text-xs text-slate-500">关键词</span>
        <input name="q" type="search" defaultValue={values.q} placeholder="搜索项目名称、赛事、学院、负责人或成员姓名" className="h-9 w-full rounded-lg border border-[#cbd8d1] bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#002554]" />
      </label>
      <div className="col-span-2 flex items-center gap-2 sm:col-span-1 xl:col-span-2 xl:justify-end">
        <Button variant="default" size="sm" type="submit" className="h-9 flex-1 px-5 xl:flex-none">筛选</Button>
        <Link href="/review" className="inline-flex h-9 items-center justify-center rounded-full px-3 text-sm font-medium text-[#54645d] transition duration-150 ease-out hover:bg-[#eef4f0] hover:text-[#0f1d18] active:scale-[0.98]">重置</Link>
      </div>
    </form>
  );

  if (embedded) {
    return <div className="bg-white px-5 py-4">{form}</div>;
  }
  return <section className="card p-4">{form}</section>;
}
