"use client";

import { useEffect } from "react";

/** 工作区错误边界：保留侧栏外壳，内容区显示可恢复的提示。 */
export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("工作区页面渲染失败:", error);
  }, [error]);

  return (
    <section className="card px-6 py-12 text-center" role="alert">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#faeaea] text-xl font-bold text-[#9e2a35]" aria-hidden="true">!</span>
      <h1 className="t-page-title mt-4 font-display text-2xl font-bold text-[#0e1d17]">这个页面暂时打不开</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#54635d]">
        可能是数据加载失败，重试一次通常就能恢复；也可以从左侧导航回到看板。
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-slate-400">错误编号：{error.digest}</p>
      ) : null}
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <button
          className="inline-flex h-10 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2"
          onClick={() => reset()}
          type="button"
        >
          重试
        </button>
        <a
          className="inline-flex h-10 items-center justify-center rounded-full border border-[#7f9384] bg-white px-6 text-sm font-medium text-slate-700 hover:border-[#657a6f] hover:bg-[#f7faf8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2"
          href="/dashboard"
        >
          返回看板
        </a>
      </div>
    </section>
  );
}
