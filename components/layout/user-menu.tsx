"use client";

import { Button } from "@/components/ui/button";
import { roleLabels } from "@/lib/presentation";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import type { ApiResponse } from "@/types/api";

export function UserMenu({ user }: { user: AuthUser }) {
  const router = useRouter();
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
      router.replace("/login");
      router.refresh();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "退出失败，请稍后重试");
      setLoading(false);
    }
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <Button variant="outline" size="default"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="gap-2" >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <UserRound size={17} aria-hidden="true" />
        </span>
        <span className="hidden text-left sm:block">
          <span className="block font-medium text-slate-800">{user.name}</span>
          <span className="block text-xs text-slate-500">{roleLabels[user.role] ?? "普通用户"}</span>
        </span>
        <ChevronDown size={15} className="text-slate-400" aria-hidden="true" />
      </Button>
      {open ? (
        <div role="menu" className="absolute right-0 top-12 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="border-b border-slate-100 px-3 py-3">
            <p className="font-medium text-slate-800">{user.name}</p>
            <p className="mt-1 text-xs text-slate-500">{user.phone}</p>
          </div>
          {error ? <p className="px-3 py-2 text-xs text-red-600">{error}</p> : null}
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
