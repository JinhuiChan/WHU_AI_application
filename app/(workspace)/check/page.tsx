import type { Metadata } from "next";
import { MaterialChecker } from "@/components/data/material-checker";

export const metadata: Metadata = { title: "材料检查" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function CheckPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="t-page-title font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">材料检查</h1>
        <p className="mt-1.5 text-sm text-[#54635d]">上传 PDF / DOCX 检查格式与必备条款，原文不入库、不发送给模型。</p>
      </div>
      <MaterialChecker />
    </div>
  );
}
