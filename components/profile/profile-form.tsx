"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SectionHead, SectionRule } from "@/components/ui/section-head";

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

const fieldClass =
  "h-10 w-full rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition-colors focus:border-[#115740] focus-visible:ring-2 focus-visible:ring-[#115740]/20 disabled:bg-[#f2f6f4] disabled:text-[#5c6c65]";

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
  const parsedSkills = splitSkills(form.skills);

  function update<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const bio = form.bio.trim();
    const avatarUrl = form.avatarUrl.trim();
    const skills = splitSkills(form.skills);
    const validationError =
      Array.from(bio).length > 60
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
      const result = (await response.json()) as { code: number; message: string };
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
      <section className="card p-5 sm:p-6">
        <SectionHead title="编辑公开资料" sub="个人简介与擅长技能会展示在你的公开铭牌页及组队申请中" />
        <SectionRule className="mt-3.5" />

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="flex items-center justify-between text-xs font-medium text-[#24362f]">
              <span>个人简介</span>
              <span className="font-normal tabular-nums text-[#6c7e76]">{Array.from(form.bio).length}/60</span>
            </span>
            <textarea
              className="mt-2 min-h-24 w-full rounded-lg border border-[#7f9384] bg-white px-3 py-2 text-sm text-[#0f1d18] outline-none transition-colors focus:border-[#115740] focus-visible:ring-2 focus-visible:ring-[#115740]/20"
              value={form.bio}
              maxLength={60}
              placeholder="用不超过 60 字介绍自己的研究兴趣或科创方向"
              onChange={(event) => update("bio", event.target.value)}
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-[#24362f]">头像链接（选填）</span>
              <input
                type="url"
                className={`${fieldClass} mt-2`}
                value={form.avatarUrl}
                placeholder="https://example.com/avatar.png"
                onChange={(event) => update("avatarUrl", event.target.value)}
              />
              <span className="mt-1.5 block text-xs text-[#6c7e76]">留空时默认展示珞珈深绿金边宋体首字徽章。</span>
            </label>

            <div className="block">
              <label htmlFor="profile-skills-input" className="flex items-center justify-between text-xs font-medium text-[#24362f]">
                <span>擅长技能</span>
                <span className={`font-normal tabular-nums ${parsedSkills.length > 10 ? "font-medium text-red-700" : "text-[#6c7e76]"}`}>
                  {parsedSkills.length}/10
                </span>
              </label>
              <input
                id="profile-skills-input"
                className={`${fieldClass} mt-2`}
                value={form.skills}
                placeholder="产品设计，前端开发，数据分析"
                onChange={(event) => update("skills", event.target.value)}
              />
              <span className="mt-1.5 block text-xs text-[#6c7e76]">使用逗号分隔，最多填写 10 项。</span>
            </div>
          </div>

          {parsedSkills.length ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {parsedSkills.map((skill, index) => (
                <span
                  key={`${skill}-${index}`}
                  className="inline-flex items-center rounded-full border border-[#d0e0d6] bg-[#eef5f1] px-2.5 py-0.5 text-xs font-medium text-[#115740]"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <SectionHead title="主页可见性" sub="按需控制本人公开主页向校内师生展示的科创履历范围" />
        <SectionRule className="mt-3.5" />

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-4 transition-colors hover:border-[#7f9384]">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-[#7f9384] text-[#115740] accent-[#115740] focus-visible:ring-2 focus-visible:ring-[#115740]/25"
              checked={form.showRecords}
              onChange={(event) => update("showRecords", event.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium text-[#0f1d18]">公开参赛与指导记录</span>
              <span className="mt-1 block text-xs leading-5 text-[#5c6c65]">
                关闭后，本人与他人访问公开主页时均隐藏项目参与履历。
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-4 transition-colors hover:border-[#7f9384]">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-[#7f9384] text-[#115740] accent-[#115740] focus-visible:ring-2 focus-visible:ring-[#115740]/25"
              checked={form.showAwards}
              onChange={(event) => update("showAwards", event.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium text-[#0f1d18]">公开获奖记录</span>
              <span className="mt-1 block text-xs leading-5 text-[#5c6c65]">
                关闭后，本人与他人访问公开主页时均隐藏已归档获奖记录。
              </span>
            </span>
          </label>
        </div>
      </section>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="submit"
          className="h-10 min-w-32 rounded-full bg-[#115740] px-6 text-white hover:bg-[#0d4633] active:bg-[#093426] focus-visible:ring-[#115740]/30"
          loading={saving}
        >
          {saving ? "保存中…" : "保存资料"}
        </Button>
      </div>
    </form>
  );
}
