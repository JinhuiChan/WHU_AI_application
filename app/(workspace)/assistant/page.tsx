import type { Metadata } from "next";
import { AssistantChat } from "@/components/data/assistant-chat";

export const metadata: Metadata = { title: "AI 助手" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AssistantPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">AI 助手</h1>
        <p className="mt-1 text-sm text-slate-500">
          只回答知识库中有出处的问题；未命中时会给出人工咨询渠道，不会编造答案。
        </p>
      </div>
      <AssistantChat />
    </div>
  );
}
