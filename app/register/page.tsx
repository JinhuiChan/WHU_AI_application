"use client";

import { Button } from "@/components/ui/button";
import { WhuCrest } from "@/components/layout/brand-mark";
import Link from "next/link";
import { useRef, useState } from "react";

type FormState = {
  identity: "STUDENT" | "TEACHER" | "ADMIN";
  staffNo: string;
  email: string;
  studentNo: string;
  name: string;
  phone: string;
  password: string;
  confirm: string;
};

const initialState: FormState = {
  identity: "STUDENT",
  staffNo: "",
  email: "",
  studentNo: "",
  name: "",
  phone: "",
  password: "",
  confirm: "",
};

const identityHint: Record<FormState["identity"], string> = {
  STUDENT: "需填写学号；注册成功后可直接登录。",
  TEACHER: "需填写教工号；注册成功后可直接登录。",
  ADMIN: "无需学号或教工号，注册后须管理员审核通过才能登录。",
};

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function clearPasswords() {
    update("password", "");
    update("confirm", "");
    setError("");
    passwordRef.current?.focus();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("两次输入的密码不一致");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: form.identity,
          email: form.email,
          staffNo: form.staffNo,
          studentNo: form.studentNo,
          name: form.name,
          phone: form.phone,
          password: form.password,
        }),
      });
      const result = (await response.json()) as { code: number; message: string };
      if (!response.ok || result.code !== 0) {
        setError(result.message || "注册失败");
        return;
      }
      window.location.href = form.identity === "ADMIN" ? "/login?pending=1" : "/login?registered=1";
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  const fieldClass =
    "mt-1 h-11 w-full rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15";
  const passwordFieldClass = `${fieldClass} pr-16`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#edf4ef] px-4 py-10">
      <div className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-[#c9dad1] bg-white shadow-[0_8px_28px_-14px_rgba(13,59,46,0.14)]">
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#114636] to-[#0b3327] px-7 py-5 text-white">
          <div className="flex items-center gap-3">
            <WhuCrest framed size={38} />
            <div>
              <span className="block font-display text-base font-bold leading-tight text-white">珞珈科创</span>
              <span className="mt-0.5 block text-[11.5px] text-[#b4d3c5]">武汉大学大学生创新创业竞赛平台</span>
            </div>
          </div>
          <span className="text-[11px] tracking-widest text-[#9ec4b3]">新用户注册</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-7 sm:p-8">
          <div>
            <h1 className="font-display text-[25px] font-bold tracking-tight text-[#0e1d17]">账号注册</h1>
            <p className="mt-1.5 text-sm text-[#54635d]">
              学生、指导老师注册后可直接登录；管理员账号需审核通过后方可登录。
            </p>
          </div>

        <div>
          <label className="block text-sm text-slate-700" htmlFor="identity">
            身份
            <select
              autoFocus
              className={fieldClass}
              id="identity"
              value={form.identity}
              onChange={(event) => update("identity", event.target.value as FormState["identity"])}
            >
              <option value="STUDENT">学生</option>
              <option value="TEACHER">指导老师</option>
              <option value="ADMIN">管理员（需审核）</option>
            </select>
          </label>
          <p className="mt-1.5 text-xs text-slate-500">{identityHint[form.identity]}</p>
        </div>

        {form.identity === "TEACHER" ? (
          <label className="block text-sm text-slate-700">
            教工号
            <input
              className={fieldClass}
              value={form.staffNo}
              onChange={(event) => update("staffNo", event.target.value)}
              placeholder="例如 T2027001"
              required
            />
          </label>
        ) : form.identity === "STUDENT" ? (
          <label className="block text-sm text-slate-700">
            学号
            <input
              className={fieldClass}
              value={form.studentNo}
              onChange={(event) => update("studentNo", event.target.value)}
              placeholder="例如 2023102201846"
              inputMode="numeric"
              required
            />
          </label>
        ) : null}

        <label className="block text-sm text-slate-700">
          姓名
          <input
            className={fieldClass}
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="与学籍一致"
            required
          />
        </label>

        <label className="block text-sm text-slate-700">
          邮箱
          <input
            className={fieldClass}
            type="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="用于接收审核与通知，例如 xxx@whu.edu.cn"
            required
          />
        </label>

        <label className="block text-sm text-slate-700">
          手机号
          <input
            className={fieldClass}
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
            placeholder="11 位手机号"
            inputMode="numeric"
            required
          />
        </label>

        <div>
          <label className="block text-sm text-slate-700" htmlFor="register-password">
            密码
            <div className="relative">
              <input
                className={passwordFieldClass}
                id="register-password"
                ref={passwordRef}
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) => update("password", event.target.value)}
                placeholder="至少 6 位"
                required
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
          </label>
          {form.password.length > 0 && form.password.length < 6 ? (
            <p className="mt-1.5 text-xs text-amber-600">密码至少需要 6 位</p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm text-slate-700">
            确认密码
            <input
              className={fieldClass}
              type={showPassword ? "text" : "password"}
              value={form.confirm}
              onChange={(event) => update("confirm", event.target.value)}
              placeholder="再输入一次，与上方密码保持一致"
              required
            />
          </label>
          <p className="mt-1.5 text-xs text-slate-400">「显示」会同时作用于密码与确认密码</p>
        </div>

        {error ? (
          <div className="space-y-2">
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
              {error}
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-600">请核对两次密码与必填信息后重试</p>
              <Button onClick={clearPasswords} size="sm" type="button" variant="outline">
                清空密码
              </Button>
            </div>
          </div>
        ) : null}

        <Button variant="default" size="default"
          type="submit"
          loading={submitting}
          className="w-full" >
          {submitting ? "注册中…" : "注册"}
        </Button>

        <div className="space-y-2.5 border-t border-[#e5ede8] pt-5">
          <p className="text-center text-sm text-slate-500">已有账号？</p>
          <Button asChild className="w-full" variant="outline">
            <Link href="/login">返回登录</Link>
          </Button>
        </div>
        </form>
      </div>
    </main>
  );
}
