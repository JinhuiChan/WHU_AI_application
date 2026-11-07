"use client";

import { useEffect } from "react";

/** 根级错误边界：捕获 layout 之外的渲染错误，避免整页白屏。 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("页面渲染失败:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-2xl text-red-600" aria-hidden="true">!</span>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">页面暂时打不开</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          加载时出了点问题，通常重试一次就好。如果反复出现，请联系管理员并提供下面的错误编号。
        </p>
        {error.digest ? (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500">错误编号：{error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            className="inline-flex h-11 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:ring-offset-2"
            onClick={() => reset()}
            type="button"
          >
            重试
          </button>
          <a
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:ring-offset-2"
            href="/dashboard"
          >
            返回看板
          </a>
        </div>
      </section>
    </main>
  );
}
