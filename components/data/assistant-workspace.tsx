"use client";

import { useEffect, useState, type ReactNode } from "react";
import { WhuEavesWatermark } from "@/components/brand/whu-motifs";

export function AssistantWorkspace({
  competitionId,
  competitions,
  viewer,
  children,
}: {
  competitionId?: string;
  competitions: { id: string; name: string; year: number }[];
  viewer: { id: string; role: string };
  children: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let disposed = false;
    let controller: AbortController | undefined;

    async function verifyIdentity() {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      setChecking(true);
      setSessionError("");
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "same-origin",
          signal: request.signal,
        });
        if (disposed || request.signal.aborted) return;
        if (response.status === 401) {
          window.location.replace(
            `/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`,
          );
          return;
        }
        if (!response.ok) throw new Error("身份核对失败，请重试");
        const result = await response.json();
        if (disposed || request.signal.aborted) return;
        const user = result.data?.user;
        if (result.code !== 0 || !user) throw new Error("身份核对失败，请重试");
        if (user.id !== viewer.id || user.role !== viewer.role) {
          window.location.replace(window.location.href);
          return;
        }
        setChecking(false);
      } catch (caught) {
        if (!disposed && !request.signal.aborted) {
          setSessionError(caught instanceof Error ? caught.message : "身份核对失败，请重试");
        }
      }
    }

    const check = () => {
      void verifyIdentity();
    };
    const visible = () => {
      if (document.visibilityState === "visible") check();
    };

    check();
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);
    document.addEventListener("visibilitychange", visible);
    return () => {
      disposed = true;
      controller?.abort();
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [viewer.id, viewer.role, competitionId, retry]);

  const current = competitions.find((item) => item.id === competitionId);

  return (
    <section className="relative overflow-hidden card border-[#c6d8ce]">
      {/* 一体化问答台顶栏：左侧标题说明 + 右侧紧凑胶囊赛事范围选择器 */}
      <div className="relative z-[1] flex flex-col gap-3 border-b border-[#dce7e0] bg-gradient-to-r from-[#f6faf8] via-white to-[#f3f8f5] px-5 py-4 lg:flex-row lg:items-center lg:justify-between sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-[17px] font-bold tracking-tight text-[#0e1d17]">
              赛事规程研读问答台
            </h2>
            <span className="inline-flex items-center rounded-full bg-[#e3f0ea] px-2.5 py-0.5 text-[11px] font-semibold text-[#115740]">
              {current ? `${current.year} 赛年定向` : "全平台检索"}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#54635d]">
            当前检索范围：{current ? `${current.year} · ${current.name}` : "全部已发布赛事"} · 回答严格基于官方配置与规程原文
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <label className="inline-flex h-9 max-w-full items-center gap-2 rounded-full border border-[#7f9384] bg-white pl-3.5 pr-3 text-xs text-[#43554d] shadow-[0_1px_2px_rgba(15,29,24,0.04)] transition-colors focus-within:border-[#115740] focus-within:ring-2 focus-within:ring-[#115740]/15">
            <span className="shrink-0 font-medium text-[#54635d]">优先咨询赛事</span>
            <span aria-hidden="true" className="h-3.5 w-px bg-[#d5e2db]" />
            <select
              value={competitionId ?? ""}
              disabled={pending || checking}
              aria-label="优先咨询赛事（可选）"
              onChange={(event) => {
                const next = event.target.value;
                if (next === (competitionId ?? "")) return;
                event.currentTarget.value = competitionId ?? "";
                setPending(true);
                window.location.assign(next ? `/assistant?competitionId=${encodeURIComponent(next)}` : "/assistant");
              }}
              className="select-pill h-full max-w-[196px] cursor-pointer truncate border-0 bg-transparent py-0 pr-1 text-xs font-semibold text-[#0f1d18] outline-none focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-[240px]"
            >
              <option value="">全部已发布赛事</option>
              {competitions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.year} · {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {(checking || pending || sessionError) && (
        <div className="relative z-[1] border-b border-[#dce7e0] bg-[#f8fbf9] px-5 py-2.5 text-xs sm:px-6">
          {(checking || pending) && !sessionError ? (
            <p className="text-[#54635d]" role="status">
              {checking ? "正在核对当前登录身份…" : "正在切换赛事研读范围…"}
            </p>
          ) : null}
          {sessionError ? (
            <div role="alert" className="flex flex-wrap items-center gap-2.5 text-[#9e2a35]">
              <span>{sessionError}</span>
              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
                className="inline-flex h-7 items-center rounded-full border border-[#9e2a35]/40 bg-white px-3 text-xs font-medium text-[#9e2a35] transition-colors hover:bg-[#fdf3f4]"
              >
                重新核对
              </button>
            </div>
          ) : null}
        </div>
      )}

      <div
        hidden={checking}
        aria-busy={pending || checking}
        className={`relative z-[1] p-5 sm:p-6 ${pending ? "pointer-events-none opacity-60 transition-opacity" : ""}`}
      >
        {children}
      </div>

      <WhuEavesWatermark className="pointer-events-none absolute -bottom-3 -right-2 h-24 w-44 text-[#0d3b2e]/[0.04]" />
    </section>
  );
}
