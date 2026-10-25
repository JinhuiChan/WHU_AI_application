import type { Metadata } from "next";
import { AssistantChat } from "@/components/data/assistant-chat";
import { RiskNotice } from "@/components/layout/risk-notice";

export const metadata: Metadata = { title: "AI 助手" };

export default function AssistantPage() {
  return (
    <div className="space-y-5">
      <RiskNotice />
      <div>
        <h1 className="text-xl font-semibold text-slate-900">AI 站内咨询</h1>
        <p className="mt-1 text-sm text-slate-500">检索赛事知识库并展示权威出处，未配置模型时也能离线回答。</p>
      </div>
      <AssistantChat />
    </div>
  );
}
