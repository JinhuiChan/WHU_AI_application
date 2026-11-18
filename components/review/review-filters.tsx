import Link from "next/link";
import type { ProjectStage, RegistrationStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
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

const controlClass =
  "h-10 w-full rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15";

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
      <label className="min-w-0 text-sm text-[#33433d] xl:col-span-2">
        <span className="mb-1 block text-xs font-medium text-[#54635d]">赛事</span>
        <select name="competitionId" defaultValue={values.competitionId} className={controlClass}>
          <option value="">全部赛事</option>
          {options.competitions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-0 text-sm text-[#33433d]">
        <span className="mb-1 block text-xs font-medium text-[#54635d]">阶段</span>
        <select name="stage" defaultValue={values.stage} className={controlClass}>
          <option value="">全部阶段</option>
          {stages.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-0 text-sm text-[#33433d]">
        <span className="mb-1 block text-xs font-medium text-[#54635d]">学院</span>
        <select name="college" defaultValue={values.college} className={controlClass}>
          <option value="">全部学院</option>
          {options.colleges.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-0 text-sm text-[#33433d]">
        <span className="mb-1 block text-xs font-medium text-[#54635d]">状态</span>
        <select name="status" defaultValue={values.status} className={controlClass}>
          <option value="">全部状态</option>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {registrationStatusLabels[item]}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-0 text-sm text-[#33433d] sm:col-span-2 xl:col-span-2">
        <span className="mb-1 block text-xs font-medium text-[#54635d]">赛道</span>
        <select name="trackId" defaultValue={values.trackId} className={controlClass}>
          <option value="">全部赛道</option>
          {options.tracks.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}（{competitionNames.get(item.competitionId) ?? "未知赛事"}）
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-0 text-sm text-[#33433d]">
        <span className="mb-1 block text-xs font-medium text-[#54635d]">每页条数</span>
        <select name="pageSize" defaultValue={values.pageSize} className={controlClass}>
          {[10, 20, 50].map((size) => (
            <option key={size} value={size}>
              {size} 条
            </option>
          ))}
        </select>
      </label>
      <label className="col-span-2 min-w-0 text-sm text-[#33433d] sm:col-span-3 xl:col-span-6">
        <span className="mb-1 block text-xs font-medium text-[#54635d]">关键词</span>
        <input
          name="q"
          type="search"
          defaultValue={values.q}
          placeholder="搜索项目名称、赛事、学院、负责人或成员姓名"
          className={controlClass}
        />
      </label>
      <div className="col-span-2 flex items-center gap-2 sm:col-span-1 xl:col-span-2 xl:justify-end">
        <Button
          type="submit"
          size="default"
          className="h-10 flex-1 bg-[#115740] px-5 text-white hover:bg-[#0d4633] xl:flex-none"
        >
          筛选
        </Button>
        <Link
          href="/review"
          className="inline-flex h-10 items-center justify-center rounded-full border border-[#7f9384] bg-white px-4 text-sm font-medium text-[#33433d] transition duration-150 ease-out hover:border-[#115740] hover:bg-[#eef5f1] hover:text-[#115740] active:scale-[0.98] motion-reduce:active:scale-100"
        >
          重置
        </Link>
      </div>
    </form>
  );

  if (embedded) {
    return <div className="bg-white px-5 py-4">{form}</div>;
  }
  return <section className="card p-4">{form}</section>;
}
