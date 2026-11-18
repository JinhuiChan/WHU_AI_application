"use client";

import { useEffect } from "react";

/** 根级错误边界：捕获 layout 之外的渲染错误，避免整页白屏。 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("页面渲染失败:", error);
  }, [error]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#edf4ef] px-4 py-10">
      <section className="card w-full max-w-md border-[#c9dad1] p-8 text-center">
        <span
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#faeaea] text-xl font-bold text-[#9e2a35]"
          aria-hidden="true"
        >
          !
        </span>
        <h1 className="t-page-title mt-4 font-display text-2xl font-bold text-[#0e1d17]">页面暂时打不开</h1>
        <p className="mt-2 text-sm leading-6 text-[#54635d]">
          加载时出了点问题，通常重试一次就好。如果反复出现，请联系管理员并提供下面的错误编号。
        </p>
        {error.digest ? (
          <p className="mt-3 rounded-lg border border-[#d5e2db] bg-[#f5faf7] px-3 py-2 font-mono text-xs text-[#54635d]">
            错误编号：{error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#115740] px-6 text-sm font-medium text-white transition hover:bg-[#0d4633] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:active:scale-100"
            onClick={() => reset()}
            type="button"
          >
            重试
          </button>
          <a
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#7f9384] bg-white px-6 text-sm font-medium text-slate-700 transition hover:border-[#657a6f] hover:bg-[#f7faf8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:active:scale-100"
            href="/dashboard"
          >
            返回看板
          </a>
        </div>
      </section>
    </main>
  );
}
