"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ApiResponse } from "@/types/api";
import type { AuthUser } from "@/lib/auth";

type LoginData = {
  user: AuthUser;
};

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [identity, setIdentity] = useState<"STUDENT" | "TEACHER" | "ADMIN">("STUDENT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password, identity }),
      });
      const result = (await response.json()) as ApiResponse<LoginData>;
      if (!response.ok || result.code !== 0) {
        throw new Error(result.message || "登录失败");
      }
      router.replace(callbackUrl);
      router.refresh();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "登录失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-xl font-bold text-white">
          科
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">欢迎登录</h1>
        <p className="mt-2 text-sm text-slate-500">高校科创赛事综合管理服务平台</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="identity" className="mb-2 block text-sm font-medium text-slate-700">身份</label>
          <select
            id="identity"
            name="identity"
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
            value={identity}
            onChange={(event) => setIdentity(event.target.value as "STUDENT" | "TEACHER" | "ADMIN")}
          >
            <option value="STUDENT">学生</option>
            <option value="TEACHER">指导老师</option>
            <option value="ADMIN">管理员</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">多身份账号：以所选身份进入，身份不对会被拒绝</p>
        </div>
        <div>
          <label htmlFor="phone" className="mb-2 block text-sm font-medium text-slate-700">
            手机号
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="username"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="请输入手机号"
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
            密码
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="请输入密码"
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        {error ? (
          <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-lg bg-blue-600 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "登录中…" : "登录"}
        </button>
      </form>

    </div>
  );
}
