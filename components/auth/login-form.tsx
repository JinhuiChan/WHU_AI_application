"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ApiResponse } from "@/types/api";
import type { AuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";

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

  const fieldClassName =
    "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  return (
    <section className="w-full rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8 space-y-2 text-left">
        <h1 className="text-2xl font-semibold text-slate-900">欢迎登录</h1>
        <p className="text-sm text-slate-500">高校科创赛事综合管理服务平台</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-2 sm:grid-cols-[5rem_1fr] sm:items-center sm:gap-x-4">
          <label className="text-sm font-medium text-slate-700" htmlFor="identity">
            身份
          </label>
          <select
            className={fieldClassName}
            id="identity"
            name="identity"
            onChange={(event) => setIdentity(event.target.value as "STUDENT" | "TEACHER" | "ADMIN")}
            value={identity}
          >
            <option value="STUDENT">学生</option>
            <option value="TEACHER">指导老师</option>
            <option value="ADMIN">管理员</option>
          </select>
          <p className="text-xs text-slate-500 sm:col-start-2">多身份账号：以所选身份进入，身份不对会被拒绝</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-[5rem_1fr] sm:items-center sm:gap-x-4">
          <label className="text-sm font-medium text-slate-700" htmlFor="phone">
            手机号
          </label>
          <input
            autoComplete="username"
            className={fieldClassName}
            id="phone"
            inputMode="tel"
            name="phone"
            onChange={(event) => setPhone(event.target.value)}
            placeholder="请输入手机号"
            required
            type="tel"
            value={phone}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-[5rem_1fr] sm:items-center sm:gap-x-4">
          <label className="text-sm font-medium text-slate-700" htmlFor="password">
            密码
          </label>
          <input
            autoComplete="current-password"
            className={fieldClassName}
            id="password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="请输入密码"
            required
            type="password"
            value={password}
          />
        </div>

        {error ? (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
            {error}
          </div>
        ) : null}

        <div className="grid sm:grid-cols-[5rem_1fr] sm:gap-x-4">
          <div className="sm:col-start-2">
            <Button className="w-full" disabled={loading} type="submit">
              {loading ? "登录中…" : "登录"}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
