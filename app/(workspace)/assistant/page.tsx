import type { Metadata } from "next";

export const metadata: Metadata = { title: "AI 助手" };

export default function AssistantPage() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">AI 助手</h1>
      <p className="mt-2 text-sm text-slate-500">功能暂未开放</p>
    </div>
  );
}
