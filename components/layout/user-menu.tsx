"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { roleLabels } from "@/lib/presentation";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, MoreHorizontal, UserRound } from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import type { ApiResponse } from "@/types/api";

export function UserMenu({
  user,
  variant = "header",
}: {
  user: AuthUser;
  variant?: "header" | "sidebar";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (open && event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  async function logout() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const result = (await response.json()) as ApiResponse<null>;
      if (!response.ok || result.code !== 0) {
        throw new Error(result.message || "退出失败");
      }
      window.location.replace("/login");
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "退出失败，请稍后重试");
      setLoading(false);
    }
  }

  const isSidebar = variant === "sidebar";
  const initial = user.name?.trim().slice(0, 1) || "用";

  return (
    <div ref={containerRef} className={isSidebar ? "relative w-full" : "relative shrink-0"}>
      {isSidebar ? (
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.075] px-3 py-2.5 text-left transition duration-150 hover:border-white/20 hover:bg-white/[0.13] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.18] font-display text-xs font-bold text-white">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold leading-tight text-white">{user.name}</span>
            <span className="mt-0.5 block truncate text-[11px] leading-tight text-[#9fc5b5]">
              {roleLabels[user.role] ?? "普通用户"} · 在线
            </span>
          </span>
          <MoreHorizontal size={15} className="shrink-0 text-[#9fc5b5]" aria-hidden="true" />
        </button>
      ) : (
        <Button
          variant="outline"
          size="default"
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="h-9 gap-2 border-[#7f9384] bg-white/90 px-2.5 shadow-none hover:border-[#657a6f] hover:bg-white"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e3ede7] text-[#115740]">
            <UserRound size={15} aria-hidden="true" />
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-xs font-medium leading-tight text-slate-800">{user.name}</span>
            <span className="block text-[11px] leading-tight text-slate-400">{roleLabels[user.role] ?? "普通用户"}</span>
          </span>
          <ChevronDown size={14} className="text-slate-400" aria-hidden="true" />
        </Button>
      )}
      {open ? (
        <div
          role="menu"
          className={
            isSidebar
              ? "card absolute bottom-full left-0 right-0 z-50 mb-2 p-2 text-slate-900 shadow-xl"
              : "card absolute right-0 top-12 z-40 w-64 p-2 shadow-lg"
          }
        >
          <div className="border-b border-slate-100 px-3 py-3">
            <p className="font-medium text-slate-800">{user.name}</p>
            <p className="mt-1 text-xs text-slate-500">{user.phone}</p>
          </div>
          {error ? <p role="alert" className="px-3 py-2 text-xs text-red-600">{error}</p> : null}
          <Button asChild variant="ghost" size="sm" className="w-full justify-start gap-2">
            <Link href="/profile" role="menuitem" onClick={() => setOpen(false)}>
              <UserRound size={16} aria-hidden="true" />
              个人中心
            </Link>
          </Button>
          <Button variant="outline" size="default"
            type="button"
            role="menuitem"
            disabled={loading}
            onClick={logout}
            className="mt-1 w-full gap-2" >
            <LogOut size={16} aria-hidden="true" />
            {loading ? "退出中…" : "退出登录"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
