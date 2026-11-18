import type { Metadata } from "next";
import { WhuSeal, WhuTitleRule } from "@/components/brand/whu-motifs";
import { MaterialChecker } from "@/components/data/material-checker";

export const metadata: Metadata = { title: "材料检查" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function CheckPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="t-page-title font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
              材料检查
            </h1>
            <WhuSeal label="合规预检" />
          </div>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-[#54635d]">
            <WhuTitleRule />
            <span>上传申报书或计划书（PDF / DOCX）核验格式要素与必备条款，原文不入库、不发送给模型。</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-[#e3f0ea] px-3 py-1 text-xs font-semibold text-[#115740] ring-1 ring-[#bfd8cc]">
            内存即席解析 · 原文零留存
          </span>
        </div>
      </div>

      <MaterialChecker />
    </div>
  );
}
