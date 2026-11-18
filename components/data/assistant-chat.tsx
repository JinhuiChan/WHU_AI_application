"use client";

import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { ArrowUpRight, Send } from "lucide-react";
import { WhuGateEmblem } from "@/components/brand/whu-motifs";
import { Button } from "@/components/ui/button";
import type { ApiResponse } from "@/types/api";
import type { AssistantResult } from "@/types/assistant";

const EXEMPLAR_PROMPTS = [
  {
    tag: "参赛资格",
    title: "报名开放与资格核验",
    prompt: "现在有哪些比赛还能报名？本科生与研究生的参赛资格有什么要求？",
  },
  {
    tag: "跨院组队",
    title: "跨院组队与人数上限",
    prompt: "是否允许跨学院组队参赛？每个项目团队成员与指导教师的人数上限各是多少？",
  },
  {
    tag: "截止节点",
    title: "申报截止与赛程流转",
    prompt: "目前各已发布赛事的校赛申报截止时间节点与晋级评审流程是怎样的？",
  },
  {
    tag: "材料规范",
    title: "必备附件与命名规范",
    prompt: "赛事报名需要提交哪些必备材料？项目计划书与附件命名有什么规范？",
  },
] as const;

type Exchange = { id: number; question: string; result: AssistantResult };

export function AssistantChat({
  competitionId,
  competitionLabel,
}: {
  competitionId?: string;
  competitionLabel?: string;
}) {
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const nextId = useRef(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await ask(question.trim());
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void ask(question.trim());
    }
  }

  function applyPrompt(text: string) {
    setQuestion(text);
    setError("");
    textareaRef.current?.focus();
  }

  async function ask(normalized: string, scope = competitionId) {
    if (!normalized || pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/assistant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: normalized, ...(scope ? { competitionId: scope } : {}) }),
      });
      const result = (await response.json()) as ApiResponse<AssistantResult>;
      if (!response.ok || result.code !== 0 || !result.data) {
        throw new Error(result.message || "咨询失败，请稍后重试");
      }
      setExchanges((current) => [...current, { id: nextId.current++, question: normalized, result: result.data! }]);
      setQuestion("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "咨询失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-4" aria-live="polite">
        {!exchanges.length ? (
          <div className="py-2">
            <div className="text-center">
              <div className="mx-auto inline-flex h-14 w-20 items-center justify-center rounded-2xl border border-[#d6e3dc] bg-[#f8fbf9] text-[#115740]/75">
                <WhuGateEmblem className="h-9 w-14" />
              </div>
              <h3 className="mt-3.5 font-display text-lg font-bold tracking-tight text-[#0e1d17]">
                展卷研读 · 规程细则有据可查
              </h3>
              <p className="mx-auto mt-1.5 max-w-2xl text-balance text-xs leading-6 text-[#54635d]">
                {competitionLabel
                  ? `已锁定「${competitionLabel}」，可直接询问参赛资格、组队人数上限、截止节点与申报材料规范。`
                  : "可就全校已发布赛事询问参赛资格、跨院组队上限、截止时间节点与材料规范，系统将自动摘录通知原文供核对。"}
              </p>
            </div>

            {/* 4 张常见规程示范提问卡：非 .card 嵌套，点击直接填入提问框 */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {EXEMPLAR_PROMPTS.map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  disabled={pending}
                  onClick={() => applyPrompt(item.prompt)}
                  className="group flex flex-col items-start justify-between gap-2 rounded-2xl border border-[#d5e2db] bg-[#f8fbf9] p-4 text-left transition-colors duration-150 hover:border-[#115740]/55 hover:bg-[#eef5f1]/75 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:active:scale-100"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-full bg-[#e3f0ea] px-2.5 py-0.5 text-[11px] font-semibold text-[#115740]">
                      {item.tag}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#6c7e76] transition-colors group-hover:text-[#115740]">
                      填入提问
                      <ArrowUpRight size={12} aria-hidden="true" />
                    </span>
                  </div>
                  <div>
                    <p className="font-display text-sm font-semibold text-[#0f1d18]">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[#54635d]">{item.prompt}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {exchanges.map(({ id, question: asked, result }) => (
          <div key={id} className="space-y-3">
            {/* 用户提问气泡：珞珈深绿 */}
            <div className="flex justify-end">
              <div className="max-w-[88%] rounded-2xl rounded-tr-sm bg-[#115740] px-4 py-3 text-sm leading-6 text-white shadow-[0_2px_10px_-4px_rgba(17,87,64,0.3)] sm:max-w-[78%]">
                <p className="whitespace-pre-wrap">{asked}</p>
              </div>
            </div>

            {/* 助手答复卡片：青瓷宣纸白 + 书院徽记 */}
            <article className="rounded-2xl border border-[#d6e3dc] bg-[#f8fbf9] p-4 sm:p-5">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2">
                  <span className="inline-flex h-6 w-7 items-center justify-center rounded-full bg-[#e3f0ea] text-[#115740] ring-1 ring-[#c4ddd1]">
                    <WhuGateEmblem className="h-3.5 w-5" />
                  </span>
                  <span className="font-display text-xs font-bold tracking-wide text-[#115740]">珞珈规程助手</span>
                </div>
                {result.sources.length > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-[#e3f0ea] px-2.5 py-0.5 text-[11px] font-medium text-[#115740] tabular-nums">
                    附 {result.sources.length} 处原文依据
                  </span>
                ) : null}
              </div>

              <p className="whitespace-pre-wrap text-sm leading-7 text-[#162620]">{result.answer}</p>

              {result.candidates && result.candidates.length > 0 ? (
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[#54635d]">请选择具体赛事继续核对：</span>
                  {result.candidates.map((candidate) => (
                    <Button
                      key={candidate.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => void ask(asked, candidate.id)}
                      className="rounded-full border-[#7f9384] bg-white text-[#162620] hover:border-[#115740] hover:bg-[#eef5f1]"
                    >
                      {candidate.year} · {candidate.name}
                    </Button>
                  ))}
                </div>
              ) : null}

              {/* 引用溯源：书签引文样式 */}
              {result.sources.length > 0 ? (
                <div className="mt-3.5 space-y-2.5">
                  {result.sources.map((source) => (
                    <details
                      key={source.id}
                      className="group rounded-r-xl border border-[#d6e3dc]/80 border-l-2 border-l-[#115740] bg-[#eef5f1]/70 px-3.5 py-2.5 text-sm"
                    >
                      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[#115740] marker:content-none">
                        <span className="min-w-0 flex-1 leading-5">
                          <span className="mr-1.5 inline-flex items-center rounded bg-[#115740]/10 px-1.5 py-0.5 font-display text-[11px] font-bold text-[#115740] tabular-nums">
                            [{source.id}]
                          </span>
                          {source.competitionName ? `${source.year} · ${source.competitionName} · ` : ""}
                          {source.fileName} · {source.section}
                          {source.page ? ` · 第 ${source.page} 页` : ""}
                        </span>
                        <span className="shrink-0 text-[11px] font-medium text-[#54635d] group-open:hidden">
                          展开引文
                        </span>
                        <span className="hidden shrink-0 text-[11px] font-medium text-[#54635d] group-open:inline">
                          收起引文
                        </span>
                      </summary>

                      <div className="mt-2.5 space-y-2 border-t border-[#cfe0d7]/75 pt-2.5">
                        {(source.quotes ?? [source.quote]).map((quote, index) => (
                          <blockquote
                            key={index}
                            className="whitespace-pre-wrap border-l-2 border-[#2a7b5f]/45 pl-3 text-xs leading-6 text-[#33433d]"
                          >
                            {quote}
                          </blockquote>
                        ))}

                        {source.fileUrl ? (
                          <a
                            href={`${source.fileUrl}${source.page ? `#page=${source.page}` : ""}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-7 items-center gap-1 rounded-full border border-[#7f9384] bg-white px-3 text-xs font-medium text-[#115740] transition-colors hover:border-[#115740] hover:bg-[#f6faf8]"
                          >
                            {source.kind === "configuration"
                              ? "查看赛事配置"
                              : source.attachmentKind === "TEMPLATE"
                                ? "查看填表模板（不作为资格规则）"
                                : "查看来源文件"}
                            <ArrowUpRight size={12} aria-hidden="true" />
                          </a>
                        ) : null}
                      </div>
                    </details>
                  ))}
                </div>
              ) : null}
            </article>
          </div>
        ))}
      </div>

      {/* 对话展开后提供精简胶囊快捷追问 */}
      {exchanges.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-[#677770]">快捷示范：</span>
          {EXEMPLAR_PROMPTS.map((item) => (
            <Button
              key={item.tag}
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => applyPrompt(item.prompt)}
              className="h-8 rounded-full border-[#7f9384] bg-white px-3.5 text-xs text-[#33433d] hover:border-[#115740] hover:bg-[#f2f7f4]"
            >
              {item.tag}：{item.title}
            </Button>
          ))}
        </div>
      ) : null}

      <form onSubmit={submitQuestion} className="border-t border-[#dce7e0] pt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label htmlFor="assistant-question" className="text-xs font-semibold text-[#33433d]">
            输入咨询问题
          </label>
          <span className="text-[11px] text-[#6c7e76] tabular-nums">{question.length} / 500</span>
        </div>

        <textarea
          ref={textareaRef}
          id="assistant-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={500}
          rows={3}
          required
          placeholder="例如：国创赛跨学院组队最多几人？指导教师人数上限与报名截止时间是什么？"
          className="w-full rounded-xl border border-[#7f9384] bg-white px-3.5 py-2.5 text-sm text-[#0f1d18] outline-none transition-colors placeholder:text-[#6e7f78] focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#54635d]">
            {pending
              ? "正在研读规程原文并交叉核对依据…"
              : "支持按 Ctrl + Enter 快捷发送；未限定范围时自动跨全部已发布赛事检索"}
          </p>
          <Button
            type="submit"
            disabled={pending || !question.trim()}
            loading={pending}
            className="rounded-full bg-[#115740] px-6 text-white hover:bg-[#0d4432] active:bg-[#093325] focus-visible:ring-[#115740]/25"
          >
            {!pending ? <Send size={15} aria-hidden="true" /> : null}
            {pending ? "核对依据中…" : "发送提问"}
          </Button>
        </div>

        {error ? (
          <p role="alert" className="mt-2.5 text-sm text-[#b91c1c]">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
