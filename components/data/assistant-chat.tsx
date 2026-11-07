"use client";

import { FormEvent, useRef, useState } from "react";
import { Bot, Send, UserRound } from "lucide-react";
import type { ApiResponse } from "@/types/api";
import type { AssistantResult } from "@/types/assistant";

const suggestions = ["现在有哪些比赛还能报名？", "国创赛和挑战杯的报名时间有什么不同？", "国创赛报名需要交哪些材料？"];
type Exchange = { id: number; question: string; result: AssistantResult };

export function AssistantChat({ competitionId }: { competitionId?: string }) {
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const nextId = useRef(1);

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await ask(question.trim());
  }

  async function ask(normalized: string, scope = competitionId) {
    if (!normalized || pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/assistant/ask", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: normalized, ...(scope ? { competitionId: scope } : {}) }),
      });
      const result = await response.json() as ApiResponse<AssistantResult>;
      if (!response.ok || result.code !== 0 || !result.data) throw new Error(result.message || "咨询失败，请稍后重试");
      setExchanges((current) => [...current, { id: nextId.current++, question: normalized, result: result.data! }]);
      setQuestion("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "咨询失败，请稍后重试");
    } finally { setPending(false); }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4" aria-live="polite">
        {!exchanges.length && (
          <div className="rounded-xl bg-slate-50 px-5 py-8 text-center">
            <Bot size={28} className="mx-auto text-blue-600" aria-hidden="true" />
            <p className="mt-3 font-medium text-slate-800">问一问平台赛事</p>
            <p className="mt-2 text-sm text-slate-500">可询问报名状态、比较多场赛事，或查询通知中的具体规则。</p>
          </div>
        )}
        {exchanges.map(({ id, question: asked, result }) => (
          <div key={id} className="space-y-3">
            <div className="flex justify-end">
              <p className="flex max-w-[90%] items-start gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm text-white">
                <UserRound size={17} className="mt-0.5 shrink-0" aria-hidden="true" />{asked}
              </p>
            </div>
            <article className="rounded-xl border border-slate-200 p-4">
              <p className="mb-2 text-xs font-semibold text-blue-700">
                赛事助手
              </p>
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{result.answer}</p>
              {result.candidates && <div className="mt-3 flex flex-wrap gap-2">
                {result.candidates.map((candidate) => <button key={candidate.id} type="button" disabled={pending}
                  className="rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-700 disabled:opacity-50"
                  onClick={() => void ask(asked, candidate.id)}>{candidate.year} · {candidate.name}</button>)}
              </div>}
              {result.sources.map((source) => (
                <details key={source.id} className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                  <summary className="cursor-pointer text-blue-700">
                    [{source.id}] {source.competitionName ? `${source.year} · ${source.competitionName} · ` : ""}{source.fileName} · {source.section}{source.page ? ` · 第 ${source.page} 页` : ""}
                  </summary>
                  {(source.quotes ?? [source.quote]).map((quote, index) => (
                    <blockquote key={index} className="mt-3 whitespace-pre-wrap border-l-2 border-blue-200 pl-3 leading-6 text-slate-600">{quote}</blockquote>
                  ))}
                  {source.fileUrl && (
                    <a href={`${source.fileUrl}${source.page ? `#page=${source.page}` : ""}`}
                      target="_blank" rel="noreferrer" className="mt-3 inline-block text-blue-600 hover:underline">{source.kind === "configuration" ? "查看赛事配置" : "查看来源文件"}</a>
                  )}
                </details>
              ))}
            </article>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((item) => <button key={item} type="button" disabled={pending} onClick={() => setQuestion(item)}
          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-blue-400 disabled:opacity-50">{item}</button>)}
      </div>
      <form onSubmit={submitQuestion}>
        <label htmlFor="assistant-question" className="mb-2 block text-sm font-medium">你的问题</label>
        <textarea id="assistant-question" value={question} onChange={(event) => setQuestion(event.target.value)}
          maxLength={500} rows={3} required placeholder="例如：现在有哪些比赛还能报名？"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">{pending ? "正在查找依据并生成回答…" : "可在问题中写明比赛和年份；未选范围时咨询全部已发布赛事"}</p>
          <button type="submit" disabled={pending || !question.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            <Send size={16} aria-hidden="true" />{pending ? "回答中…" : "发送"}
          </button>
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
