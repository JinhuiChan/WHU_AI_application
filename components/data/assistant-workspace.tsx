"use client";

import { useEffect, useState, type ReactNode } from "react";
export function AssistantWorkspace({ competitionId, competitions, viewer, children }: {
  competitionId?: string; competitions: { id: string; name: string; year: number }[];
  viewer: { id: string; role: string }; children: ReactNode;
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
      setChecking(true); setSessionError("");
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin", signal: request.signal });
        if (disposed || request.signal.aborted) return;
        if (response.status === 401) {
          window.location.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          return;
        }
        if (!response.ok) throw new Error("身份核对失败，请重试");
        const result = await response.json();
        if (disposed || request.signal.aborted) return;
        const user = result.data?.user;
        if (result.code !== 0 || !user) throw new Error("身份核对失败，请重试");
        if (user.id !== viewer.id || user.role !== viewer.role) {
          // 其他标签页换过账号，或缓存正文属于上一身份：重取整个页面。
          window.location.replace(window.location.href);
          return;
        }
        setChecking(false);
      } catch (caught) {
        if (!disposed && !request.signal.aborted) setSessionError(caught instanceof Error ? caught.message : "身份核对失败，请重试");
      }
    }
    const check = () => { void verifyIdentity(); };
    const visible = () => { if (document.visibilityState === "visible") check(); };
    check();
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);
    document.addEventListener("visibilitychange", visible);
    return () => {
      disposed = true; controller?.abort();
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [viewer.id, viewer.role, competitionId, retry]);
  const current = competitions.find((item) => item.id === competitionId);
  return <>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <label className="block text-sm font-medium text-slate-700">优先咨询赛事（可选）
        <select value={competitionId ?? ""} disabled={pending || checking} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:opacity-50" onChange={(event) => {
          const next = event.target.value;
          if (next === (competitionId ?? "")) return;
          event.currentTarget.value = competitionId ?? "";
          setPending(true);
          window.location.assign(next ? `/assistant?competitionId=${encodeURIComponent(next)}` : "/assistant");
        }}>
          <option value="">全部已发布赛事</option>
          {competitions.map((item) => <option key={item.id} value={item.id}>{item.year} · {item.name}</option>)}
        </select>
      </label>
      <p className="mt-3 text-sm text-slate-600">当前范围：{current ? `${current.year} · ${current.name}` : "全部已发布赛事"}</p>
      {(checking || pending) && <p className="mt-2 text-sm text-slate-500" role="status">{checking ? "正在核对当前登录身份…" : "正在切换赛事…"}</p>}
      {sessionError && <div role="alert" className="mt-3 text-sm text-red-600">{sessionError} <button type="button" className="underline" onClick={() => setRetry((value) => value + 1)}>重新核对</button></div>}
    </section>
    <div hidden={checking} aria-busy={pending || checking} className={pending ? "pointer-events-none space-y-5 opacity-60" : "space-y-5"}>{children}</div>
  </>;
}
