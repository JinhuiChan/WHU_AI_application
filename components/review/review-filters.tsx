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

// 小屏两列、大屏回到按内容宽度排。
// 原生 select 的 min-content 由最长的 option 决定（「海外项目（挑战杯）」这类全角括号很长），
// min-w-* 只能抬高下限、拦不住它把整行顶出去，所以小屏必须同时给 w-full 与 min-w-0。
const fieldClass = "min-w-0 basis-[calc(50%-0.375rem)] text-sm text-slate-600 sm:basis-auto";
const selectClass = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm sm:w-auto";

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
    <form action="/review" method="get" className="flex flex-wrap items-end gap-3">
      {values.tab ? <input type="hidden" name="tab" value={values.tab} /> : null}
      <label className={fieldClass}>
        <span className="mb-1 block text-xs text-slate-500">赛事</span>
        <select name="competitionId" defaultValue={values.competitionId} className={`${selectClass} sm:min-w-40`}>
          <option value="">全部赛事</option>
          {options.competitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className={fieldClass}>
        <span className="mb-1 block text-xs text-slate-500">阶段</span>
        <select name="stage" defaultValue={values.stage} className={`${selectClass} sm:min-w-24`}>
          <option value="">全部阶段</option>
          {stages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label className={fieldClass}>
        <span className="mb-1 block text-xs text-slate-500">学院</span>
        <select name="college" defaultValue={values.college} className={`${selectClass} sm:min-w-32`}>
          <option value="">全部学院</option>
          {options.colleges.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label className={fieldClass}>
        <span className="mb-1 block text-xs text-slate-500">状态</span>
        <select name="status" defaultValue={values.status} className={`${selectClass} sm:min-w-28`}>
          <option value="">全部状态</option>
          {statuses.map((item) => <option key={item} value={item}>{registrationStatusLabels[item]}</option>)}
        </select>
      </label>
      <label className={fieldClass}>
        <span className="mb-1 block text-xs text-slate-500">赛道</span>
        <select name="trackId" defaultValue={values.trackId} className={`${selectClass} sm:max-w-44`}>
          <option value="">全部赛道</option>
          {options.tracks.map((item) => (
            <option key={item.id} value={item.id}>{item.name}（{competitionNames.get(item.competitionId) ?? "未知赛事"}）</option>
          ))}
        </select>
      </label>
      <label className="min-w-0 basis-full text-sm text-slate-500 sm:min-w-44 sm:flex-1 sm:basis-auto">
        <span className="mb-1 block text-xs text-slate-500">关键词</span>
        <input name="q" type="search" defaultValue={values.q} placeholder="项目、赛事、学院、负责人" className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-600" />
      </label>
      <label className="min-w-0 text-sm text-slate-600">
        <span className="mb-1 block text-xs text-slate-500">每页条数</span>
        <select name="pageSize" defaultValue={values.pageSize} className={selectClass}>
          {[10, 20, 50].map((size) => <option key={size} value={size}>{size} 条</option>)}
        </select>
      </label>
      <Button variant="default" size="sm" type="submit" className="h-10 px-5">筛选</Button>
      <Link href="/review" className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition duration-150 ease-out hover:bg-slate-50 active:scale-[0.98]">重置</Link>
    </form>
  );

  if (embedded) {
    return <div className="bg-[#faf8f4] px-5 py-4">{form}</div>;
  }
  return <section className="card p-4">{form}</section>;
}
