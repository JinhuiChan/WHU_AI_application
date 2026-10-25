import { AlertTriangle } from "lucide-react";

export function RiskNotice() {
  return (
    <div
      role="note"
      aria-label="风险提示"
      className="sticky top-[5.5rem] z-20 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm"
    >
      <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p>AI 输出仅供参考；材料检查结论不代表任何评分或名次。</p>
    </div>
  );
}
