"use client";

import { FormEvent, useRef, useState } from "react";
import { Bot, Send, UserRound } from "lucide-react";
import type { ApiResponse } from "@/types/api";
import type { AssistantResult } from "@/types/assistant";

const suggestions = [
  "商业计划书要写几页",
  "路演 PPT 多长时间",
  "团队人数上限是多少",
  "指导教师最多几个",
  "校长是谁",
  "2025 年的商业计划书页数要求",
];

type Exchange = {
  id: number;
  question: string;
  result: AssistantResult;
};

function answerBody(answer: string) {
  return answer.replace(/\n?【出处：[^】]*】/g, "").trim();
}

export function AssistantChat() {
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const nextId = useRef(1);

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = question.trim();
    if (!normalized || pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/assistant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: normalized }),
      });
      const result = (await response.json()) as ApiResponse<AssistantResult>;
      if (!response.ok || result.code !== 0) {
        throw new Error(result.message || "咨询失败，请稍后重试");
      }
      if (!result.data || typeof result.data.answer !== "string") {
        throw new Error("接口返回内容不正确");
      }
      setExchanges((current) => [
        ...current,
        { id: nextId.current++, question: normalized, result: result.data },
      ]);
      setQuestion("");
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "咨询失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="mb-4 flex flex-wrap gap-2" aria-label="示例问题">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              disabled={pending}
              onClick={() => setQuestion(item)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs text-slate-600 hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
            >
              {item}
            </button>
          ))}
        </div>
        <form onSubmit={submitQuestion}>
          <label htmlFor="assistant-question" className="mb-2 block text-sm font-medium text-slate-700">
            输入赛事问题
          </label>
          <textarea
            id="assistant-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="例如：商业计划书要写几页"
            className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">最多 500 个字符，出处来自知识库元数据</span>
            <button
              type="submit"
              disabled={pending || !question.trim()}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={16} aria-hidden="true" />
              {pending ? "检索中…" : "发送问题"}
            </button>
          </div>
        </form>
        {error ? <p role="alert" className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>

      {exchanges.length === 0 ? (
        <section className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
          <Bot size={28} className="mx-auto text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-sm text-slate-500">选择示例问题或输入问题，回答下方会显示出处卡片。</p>
        </section>
      ) : (
        <div className="space-y-4" aria-live="polite">
          {exchanges.map((exchange) => (
            <div key={exchange.id} className="space-y-3">
              <div className="flex justify-end">
                <div className="flex max-w-[90%] items-start gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm text-white md:max-w-[75%]">
                  <UserRound size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <p className="whitespace-pre-wrap">{exchange.question}</p>
                </div>
              </div>
              <article className="max-w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:max-w-[85%] md:p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Bot size={18} aria-hidden="true" />
                  </span>
                  <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {answerBody(exchange.result.answer)}
                  </p>
                </div>
                {exchange.result.evidence ? (
                  <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-semibold text-blue-700">出处</p>
                    <p className="mt-2 break-all text-sm font-medium text-slate-900">
                      {exchange.result.evidence.fileName}
                    </p>
                    <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                      <div>
                        <dt className="text-slate-400">章节</dt>
                        <dd className="mt-1">{exchange.result.evidence.section}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">页码</dt>
                        <dd className="mt-1">
                          {exchange.result.evidence.page === null ? "未标注" : `第 ${exchange.result.evidence.page} 页`}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">适用赛年</dt>
                        <dd className="mt-1">{exchange.result.evidence.year}</dd>
                      </div>
                    </dl>
                  </div>
                ) : null}
                {exchange.result.handoff ? (
                  <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    知识库未命中，已提供人工咨询渠道。
                  </p>
                ) : null}
              </article>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
