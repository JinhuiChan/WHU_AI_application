"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type ProfileFormValue = {
  bio: string | null;
  avatarUrl: string | null;
  skills: string;
  showRecords: boolean;
  showAwards: boolean;
};

type ProfileFormState = {
  bio: string;
  avatarUrl: string;
  skills: string;
  showRecords: boolean;
  showAwards: boolean;
};

const fieldClass = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-600";

function splitSkills(value: string) {
  return value.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
}

export function ProfileForm({ initialValue }: { initialValue: ProfileFormValue }) {
  const router = useRouter();
  const [form, setForm] = useState<ProfileFormState>({
    ...initialValue,
    bio: initialValue.bio ?? "",
    avatarUrl: initialValue.avatarUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const bio = form.bio.trim();
    const avatarUrl = form.avatarUrl.trim();
    const skills = splitSkills(form.skills);
    const validationError = Array.from(bio).length > 60
      ? "简介不能超过 60 字"
      : skills.length > 10
        ? "擅长技能不能超过 10 个"
        : avatarUrl && !/^https?:\/\//i.test(avatarUrl)
          ? "头像地址必须以 http(s) 开头"
          : "";
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload: ProfileFormValue = {
      bio: bio || null,
      avatarUrl: avatarUrl || null,
      skills: skills.join(","),
      showRecords: form.showRecords,
      showAwards: form.showAwards,
    };
    setError("");
    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { code: number; message: string };
      if (!response.ok || result.code !== 0) {
        setError(result.message || "保存个人资料失败");
        return;
      }
      setForm({ ...payload, bio: payload.bio ?? "", avatarUrl: payload.avatarUrl ?? "" });
      toast.success("资料已保存");
      router.refresh();
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-5" noValidate onSubmit={(event) => void save(event)}>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">编辑公开资料</h2>
        <p className="mt-1 text-xs text-slate-500">简介与技能会显示在你的个人主页。</p>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span>简介</span><span className="font-normal text-slate-400">{Array.from(form.bio).length}/60</span>
            </span>
            <textarea
              className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600"
              value={form.bio}
              maxLength={60}
              placeholder="用不超过 60 字介绍自己"
              onChange={(event) => update("bio", event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-700">头像 URL</span>
            <input
              type="url"
              className={`${fieldClass} mt-2`}
              value={form.avatarUrl}
              placeholder="https://example.com/avatar.png"
              onChange={(event) => update("avatarUrl", event.target.value)}
            />
          </label>
          <label className="block">
            <span className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span>擅长技能</span><span className="font-normal text-slate-400">{splitSkills(form.skills).length}/10</span>
            </span>
            <input
              className={`${fieldClass} mt-2`}
              value={form.skills}
              placeholder="产品设计，前端开发，数据分析"
              onChange={(event) => update("skills", event.target.value)}
            />
            <span className="mt-1 block text-xs text-slate-400">使用逗号分隔，最多 10 个。</span>
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">主页可见性</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600" checked={form.showRecords} onChange={(event) => update("showRecords", event.target.checked)} />
            <span><span className="block text-xs font-medium text-slate-700">公开参赛 / 指导记录</span><span className="mt-1 block text-xs text-slate-500">关闭后，本人与他人主页均不展示这些记录。</span></span>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600" checked={form.showAwards} onChange={(event) => update("showAwards", event.target.checked)} />
            <span><span className="block text-xs font-medium text-slate-700">公开获奖记录</span><span className="mt-1 block text-xs text-slate-500">关闭后，本人与他人主页均不展示获奖记录。</span></span>
          </label>
        </div>
      </section>

      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      <div className="flex justify-end">
        <Button type="submit" className="h-10 min-w-28" loading={saving}>{saving ? "保存中…" : "保存资料"}</Button>
      </div>
    </form>
  );
}
