import type { Metadata } from "next";
import { MaterialChecker } from "@/components/data/material-checker";
import { RiskNotice } from "@/components/layout/risk-notice";

export const metadata: Metadata = { title: "材料检查" };

export default function CheckPage() {
  return (
    <div className="space-y-5">
      <RiskNotice />
      <div>
        <h1 className="text-xl font-semibold text-slate-900">材料规范性检查</h1>
        <p className="mt-1 text-sm text-slate-500">上传 PDF 或 DOCX，按确定性规则检查页数、字数、必备章节和图表编号。</p>
      </div>
      <MaterialChecker />
    </div>
  );
}
