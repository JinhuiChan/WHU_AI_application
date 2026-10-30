import type { Metadata } from "next";

export const metadata: Metadata = { title: "材料检查" };

export default function CheckPage() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">材料检查</h1>
      <p className="mt-2 text-sm text-slate-500">功能暂未开放</p>
    </div>
  );
}
