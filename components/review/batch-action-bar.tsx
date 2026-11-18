"use client";

import type { ReviewLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";

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
    <section className="flex flex-col gap-3 rounded-xl border border-[#badec9] bg-[#eef5f1] p-4 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-[#115740]">
        已选择 <span className="font-serif font-semibold tabular-nums">{selectedCount}</span> 个项目，状态不匹配的项目将单独列出原因。
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="批量审核级别"
          value={level}
          disabled={pending}
          onChange={(event) => onLevelChange(event.target.value as ReviewLevel)}
          className="select-pill h-10 rounded-full border border-[#7f9384] bg-white px-4 text-sm font-medium text-[#162620] outline-none transition focus:border-[#115740]"
        >
          <option value="COLLEGE">学院审核</option>
          <option value="SCHOOL">校级终审</option>
        </select>
        <Button
          type="button"
          disabled={pending}
          onClick={onApprove}
          className="h-10 bg-[#115740] px-5 text-white hover:bg-[#0d4633]"
        >
          {pending ? "处理中…" : "批量通过"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onReject}
          className="h-10 rounded-full border-red-300 bg-white px-5 text-red-700 hover:bg-red-50"
        >
          批量驳回
        </Button>
      </div>
    </section>
  );
}
