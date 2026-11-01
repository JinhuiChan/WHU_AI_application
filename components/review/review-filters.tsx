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
};

export function ReviewFilters({ options, values }: { options: ReviewFilterOptions; values: ReviewFilterValues }) {
  const competitionNames = new Map(options.competitions.map((item) => [item.id, item.name]));
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <form action="/review" method="get" className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-500">
          <span className="mb-1 block">赛事</span>
          <select name="competitionId" defaultValue={values.competitionId} className="h-10 min-w-48 rounded-md border border-slate-300 bg-white px-3 text-sm">
            <option value="">全部赛事</option>
            {options.competitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          <span className="mb-1 block">阶段</span>
          <select name="stage" defaultValue={values.stage} className="h-10 min-w-28 rounded-md border border-slate-300 bg-white px-3 text-sm">
            <option value="">全部阶段</option>
            {stages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          <span className="mb-1 block">学院</span>
          <select name="college" defaultValue={values.college} className="h-10 min-w-40 rounded-md border border-slate-300 bg-white px-3 text-sm">
            <option value="">全部学院</option>
            {options.colleges.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          <span className="mb-1 block">状态</span>
          <select name="status" defaultValue={values.status} className="h-10 min-w-36 rounded-md border border-slate-300 bg-white px-3 text-sm">
            <option value="">全部状态</option>
            {statuses.map((item) => <option key={item} value={item}>{registrationStatusLabels[item]}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          <span className="mb-1 block">赛道</span>
          <select name="trackId" defaultValue={values.trackId} className="h-10 min-w-44 rounded-md border border-slate-300 bg-white px-3 text-sm">
            <option value="">全部赛道</option>
            {options.tracks.map((item) => (
              <option key={item.id} value={item.id}>{item.name}（{competitionNames.get(item.competitionId) ?? "未知赛事"}）</option>
            ))}
          </select>
        </label>
        <label className="min-w-56 flex-1 text-xs text-slate-500">
          <span className="mb-1 block">关键词</span>
          <input name="q" type="search" defaultValue={values.q} placeholder="项目、赛事、学院、负责人或成员" className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-600" />
        </label>
        <label className="text-xs text-slate-500">
          <span className="mb-1 block">每页条数</span>
          <select name="pageSize" defaultValue={values.pageSize} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
            {[10, 20, 50].map((size) => <option key={size} value={size}>{size} 条</option>)}
          </select>
        </label>
        <button type="submit" className="h-10 rounded-md bg-blue-600 px-4 text-sm text-white hover:bg-blue-700">筛选</button>
        <Link href="/review" className="flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50">重置</Link>
      </form>
    </section>
  );
}
