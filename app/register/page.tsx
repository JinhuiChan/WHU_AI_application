"use client";

import Link from "next/link";
import { useState } from "react";

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

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900">账号注册</h1>
          <p className="mt-1 text-sm text-slate-500">学生、老师注册后可直接登录；管理员账号需管理员审核通过后才能登录。</p>
        </div>

        <label className="block text-sm text-slate-700">
          身份
          <select
            className={fieldClass}
            value={form.identity}
            onChange={(event) => update("identity", event.target.value as FormState["identity"])}
          >
            <option value="STUDENT">学生</option>
            <option value="TEACHER">指导老师</option>
            <option value="ADMIN">管理员（需审核）</option>
          </select>
        </label>

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

        <label className="block text-sm text-slate-700">
          密码
          <input
            className={fieldClass}
            type="password"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
            placeholder="至少 6 位"
            required
          />
        </label>

        <label className="block text-sm text-slate-700">
          确认密码
          <input
            className={fieldClass}
            type="password"
            value={form.confirm}
            onChange={(event) => update("confirm", event.target.value)}
            required
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? "注册中…" : "注册"}
        </button>

        <p className="text-center text-sm text-slate-500">
          已有账号？
          <Link className="ml-1 text-blue-600 hover:underline" href="/login">
            返回登录
          </Link>
        </p>
      </form>
    </main>
  );
}
