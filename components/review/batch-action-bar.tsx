"use client";

import type { ReviewLevel } from "@prisma/client";

export function BatchActionBar({
  selectedCount,
  level,
  pending,
  onLevelChange,
  onApprove,
  onReject,
}: {
  selectedCount: number;
  level: ReviewLevel;
  pending: boolean;
  onLevelChange: (level: ReviewLevel) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (selectedCount === 0) return null;
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-blue-900">已选择 <span className="font-semibold">{selectedCount}</span> 个项目，状态不符的项目将单独返回失败原因。</p>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="批量审核级别" value={level} disabled={pending} onChange={(event) => onLevelChange(event.target.value as ReviewLevel)} className="h-9 rounded-md border border-blue-300 bg-white px-3 text-sm text-slate-700">
          <option value="COLLEGE">学院审核</option>
          <option value="SCHOOL">校级终审</option>
        </select>
        <button type="button" disabled={pending} onClick={onApprove} className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {pending ? "处理中…" : "批量通过"}
        </button>
        <button type="button" disabled={pending} onClick={onReject} className="h-9 rounded-md border border-red-300 bg-white px-4 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">批量驳回</button>
      </div>
    </section>
  );
}
