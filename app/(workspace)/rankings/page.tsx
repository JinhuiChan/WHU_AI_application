import type { Metadata } from "next";

export const metadata: Metadata = { title: "学院排行" };

export default function RankingsPage() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">学院排行</h1>
      <p className="mt-2 text-sm text-slate-500">已并入看板</p>
    </div>
  );
}
