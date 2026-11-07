"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ApiResponse } from "@/types/api";
import type { AuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";

type LoginData = {
  user: AuthUser;
};

type Identity = "STUDENT" | "TEACHER" | "ADMIN";

const IDENTITY_STORAGE_KEY = "login.lastIdentity";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const phoneRef = useRef<HTMLInputElement>(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [identity, setIdentity] = useState<Identity>("STUDENT");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(IDENTITY_STORAGE_KEY);
    if (saved === "STUDENT" || saved === "TEACHER" || saved === "ADMIN") {
      setIdentity(saved);
    }
  }, []);

  function handleIdentityChange(value: Identity) {
    setIdentity(value);
    window.localStorage.setItem(IDENTITY_STORAGE_KEY, value);
  }

  function clearAndRetry() {
    setPhone("");
    setPassword("");
    setError("");
    phoneRef.current?.focus();
  }

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
  const passwordFieldClassName =
    "h-11 w-full rounded-lg border border-slate-300 bg-white pl-3 pr-16 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="w-full">
      <div className="mb-8">
        <p className="text-xs font-medium tracking-[0.18em] text-blue-600">Account login</p>
        <h1 className="mt-2 text-2xl font-medium text-slate-900">登录赛事工作台</h1>
        <p className="mt-2 text-sm text-slate-500">使用手机号与密码登录，身份需与账号匹配。</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="identity">
            身份
          </label>
          <select
            className={fieldClassName}
            id="identity"
            name="identity"
            onChange={(event) => handleIdentityChange(event.target.value as Identity)}
            value={identity}
          >
            <option value="STUDENT">学生</option>
            <option value="TEACHER">指导老师</option>
            <option value="ADMIN">管理员</option>
          </select>
          <p className="text-xs text-slate-500">多身份账号：以所选身份进入，身份不对会被拒绝</p>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="phone">
            手机号
          </label>
          <input
            autoComplete="username"
            autoFocus
            className={fieldClassName}
            id="phone"
            inputMode="tel"
            name="phone"
            onChange={(event) => setPhone(event.target.value)}
            placeholder="请输入手机号"
            ref={phoneRef}
            required
            type="tel"
            value={phone}
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="password">
            密码
          </label>
          <div className="relative">
            <input
              autoComplete="current-password"
              className={passwordFieldClassName}
              id="password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="请输入密码"
              required
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <Button
              className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 px-3 text-xs"
              onClick={() => setShowPassword((value) => !value)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {showPassword ? "隐藏" : "显示"}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="space-y-2">
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
              {error}
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-600">请检查身份、手机号与密码后重试</p>
              <Button onClick={clearAndRetry} size="sm" type="button" variant="outline">
                清空重输
              </Button>
            </div>
          </div>
        ) : null}

        <Button className="w-full" disabled={loading} type="submit">
          {loading ? "登录中…" : "登录"}
        </Button>
      </form>
    </div>
  );
}
