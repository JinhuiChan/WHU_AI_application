"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SectionHead, SectionRule } from "@/components/ui/section-head";
import type { ApiResponse } from "@/types/api";

export type TeamCompetitionOption = {
  id: string;
  name: string;
  year: number;
  tracks: Array<{ id: string; name: string }>;
};

type FormValue = {
  competitionId: string;
  trackId: string;
  title: string;
  summary: string;
  expectation: string;
  skills: string;
  memberLimit: string;
  expiresAt: string;
  requirement: string;
  contact: string;
};

const inputClass =
  "h-10 w-full rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition-colors focus:border-[#115740] focus-visible:ring-2 focus-visible:ring-[#115740]/20";
const textareaClass =
  "w-full rounded-lg border border-[#7f9384] bg-white px-3 py-2 text-sm text-[#0f1d18] outline-none transition-colors focus:border-[#115740] focus-visible:ring-2 focus-visible:ring-[#115740]/20";

function toLocalInput(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function skillList(value: string) {
  return value.split(/[,，、;；\n]/).map((item) => item.trim()).filter(Boolean);
}

function validate(value: FormValue) {
  const errors: string[] = [];
  if (!value.competitionId) errors.push("请选择赛事");
  if (!value.title.trim()) errors.push("请填写标题");
  else if (value.title.trim().length > 40) errors.push("标题不能超过 40 个字");
  if (!value.summary.trim()) errors.push("请填写简介");
  else if (value.summary.trim().length > 200) errors.push("简介不能超过 200 个字");
  if (value.expectation.trim().length > 300) errors.push("想找的队友不能超过 300 个字");
  if (skillList(value.skills).length > 5) errors.push("技能最多填写 5 项");
  const memberLimit = Number(value.memberLimit);
  if (!Number.isInteger(memberLimit) || memberLimit < 2 || memberLimit > 10) errors.push("队伍人数须为 2 至 10 人");
  const expiresAt = new Date(value.expiresAt);
  if (!value.expiresAt || Number.isNaN(expiresAt.getTime())) errors.push("请选择有效的有效期");
  else if (expiresAt.getTime() <= Date.now()) errors.push("有效期必须晚于当前时间");
  else if (expiresAt.getTime() > Date.now() + 30 * 86400000) errors.push("有效期不能超过 30 天");
  return errors;
}

function Required() {
  return (
    <span aria-hidden="true" className="ml-1 text-[#9e2a35]">
      *
    </span>
  );
}

export function TeamForm({ competitions }: { competitions: TeamCompetitionOption[] }) {
  const router = useRouter();
  const [minExpiry] = useState(() => toLocalInput(new Date(Date.now() + 60000)));
  const [maxExpiry] = useState(() => toLocalInput(new Date(Date.now() + 30 * 86400000)));
  const [form, setForm] = useState<FormValue>(() => ({
    competitionId: "",
    trackId: "",
    title: "",
    summary: "",
    expectation: "",
    skills: "",
    memberLimit: "5",
    expiresAt: toLocalInput(new Date(Date.now() + 7 * 86400000)),
    requirement: "全部",
    contact: "",
  }));
  const [showErrors, setShowErrors] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [pending, setPending] = useState(false);
  const errors = validate(form);
  const selectedCompetition = competitions.find((item) => item.id === form.competitionId);
  const skills = skillList(form.skills);

  function update<K extends keyof FormValue>(key: K, value: FormValue[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowErrors(true);
    setRequestError("");
    if (errors.length || pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitionId: form.competitionId,
          trackId: form.trackId,
          title: form.title,
          summary: form.summary,
          expectation: form.expectation,
          skills: skillList(form.skills).join("，"),
          memberLimit: Number(form.memberLimit),
          expiresAt: new Date(form.expiresAt).toISOString(),
          requirement: form.requirement,
          contact: form.contact,
        }),
      });
      const result = (await response.json()) as ApiResponse<{ id: string } | null>;
      if (!response.ok || result.code !== 0 || !result.data?.id) throw new Error(result.message || "发布组队帖失败");
      toast.success(result.message || "组队帖发布成功");
      router.push(`/teams/${result.data.id}`);
    } catch (caught) {
      setRequestError(caught instanceof Error ? caught.message : "网络异常，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="card space-y-6 p-5 sm:p-6">
      <div>
        <SectionHead title="目标赛事与招募标题" sub="关联已发布赛事与对应赛道，方便同方向同学按赛事检索" />
        <SectionRule className="mt-3.5" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm text-[#24362f]">
            <span className="font-medium">
              赛事
              <Required />
            </span>
            <select
              required
              value={form.competitionId}
              onChange={(event) =>
                setForm((current) => ({ ...current, competitionId: event.target.value, trackId: "" }))
              }
              className={inputClass}
            >
              <option value="">请选择已发布赛事</option>
              {competitions.map((competition) => (
                <option key={competition.id} value={competition.id}>
                  {competition.name}（{competition.year}）
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm text-[#24362f]">
            <span className="font-medium">赛道</span>
            <select
              value={form.trackId}
              onChange={(event) => update("trackId", event.target.value)}
              disabled={!form.competitionId}
              className={`${inputClass} disabled:bg-[#f2f6f4] disabled:text-[#6c7e76]`}
            >
              <option value="">不限赛道</option>
              {selectedCompetition?.tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm text-[#24362f] sm:col-span-2">
            <span className="flex items-center justify-between">
              <span className="font-medium">
                标题
                <Required />
              </span>
              <span className="text-xs tabular-nums text-[#6c7e76]">{form.title.length}/40</span>
            </span>
            <input
              required
              maxLength={40}
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
              placeholder="一句话说明组队目标与项目方向"
              className={inputClass}
            />
          </label>
        </div>
      </div>

      <div className="border-t border-[#e5eee8] pt-6">
        <SectionHead title="项目简介与队友分工" sub="说明已有准备、缺口分工与期望具备的技能标签" />
        <SectionRule className="mt-3.5" />
        <div className="mt-4 grid gap-4">
          <label className="grid gap-1.5 text-sm text-[#24362f]">
            <span className="flex items-center justify-between">
              <span className="font-medium">
                简介
                <Required />
              </span>
              <span className="text-xs tabular-nums text-[#6c7e76]">{form.summary.length}/200</span>
            </span>
            <textarea
              required
              maxLength={200}
              rows={4}
              value={form.summary}
              onChange={(event) => update("summary", event.target.value)}
              placeholder="介绍项目方向、目前已有的进展和组队计划"
              className={textareaClass}
            />
          </label>
          <label className="grid gap-1.5 text-sm text-[#24362f]">
            <span className="flex items-center justify-between">
              <span className="font-medium">想找的队友</span>
              <span className="text-xs tabular-nums text-[#6c7e76]">{form.expectation.length}/300</span>
            </span>
            <textarea
              maxLength={300}
              rows={4}
              value={form.expectation}
              onChange={(event) => update("expectation", event.target.value)}
              placeholder="希望队友具备哪些能力、投入多少时间、负责哪部分工作"
              className={textareaClass}
            />
          </label>
          <div className="grid gap-1.5 text-sm text-[#24362f]">
            <label htmlFor="team-skills-input" className="flex items-center justify-between">
              <span className="font-medium">所需技能</span>
              <span className={`text-xs tabular-nums ${skills.length > 5 ? "font-medium text-red-700" : "text-[#6c7e76]"}`}>
                最多 5 项，当前 {skills.length} 项
              </span>
            </label>
            <input
              id="team-skills-input"
              value={form.skills}
              onChange={(event) => update("skills", event.target.value)}
              placeholder="用逗号分隔，如：前端开发，界面设计，数据分析"
              className={inputClass}
            />
            {skills.length ? (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {skills.map((skill, index) => (
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
        </div>
      </div>

      <div className="border-t border-[#e5eee8] pt-6">
        <SectionHead title="名额上限与联络方式" sub="满员或到达截止时间后，招募帖将自动停止接收新申请" />
        <SectionRule className="mt-3.5" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm text-[#24362f]">
            <span className="font-medium">
              队伍人数（含发起人）
              <Required />
            </span>
            <input
              required
              type="number"
              min={2}
              max={10}
              step={1}
              value={form.memberLimit}
              onChange={(event) => update("memberLimit", event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="grid gap-1.5 text-sm text-[#24362f]">
            <span className="font-medium">
              有效期
              <Required />
            </span>
            <input
              required
              type="datetime-local"
              min={minExpiry}
              max={maxExpiry}
              value={form.expiresAt}
              onChange={(event) => update("expiresAt", event.target.value)}
              className={inputClass}
            />
            <span className="text-xs text-[#6c7e76]">从现在起最长 30 天</span>
          </label>
          <label className="grid gap-1.5 text-sm text-[#24362f]">
            <span className="font-medium">招募范围</span>
            <input
              value={form.requirement}
              onChange={(event) => update("requirement", event.target.value)}
              placeholder="全部"
              className={inputClass}
            />
          </label>
          <label className="grid gap-1.5 text-sm text-[#24362f]">
            <span className="font-medium">联系方式</span>
            <input
              value={form.contact}
              onChange={(event) => update("contact", event.target.value)}
              placeholder="选填，方便队友进一步沟通"
              className={inputClass}
            />
          </label>
        </div>
      </div>

      {showErrors && errors.length ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">请先修正以下内容：</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {requestError ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {requestError}
        </p>
      ) : null}

      <div className="flex justify-end gap-3 border-t border-[#e5eee8] pt-5">
        <Button
          asChild
          variant="outline"
          className="h-10 rounded-full border-[#7f9384] px-6 text-[#24362f] hover:border-[#115740] hover:bg-[#f2f8f4]"
        >
          <Link href="/teams">取消</Link>
        </Button>
        <Button
          type="submit"
          loading={pending}
          className="h-10 rounded-full bg-[#115740] px-6 text-white hover:bg-[#0d4633] active:bg-[#093426] focus-visible:ring-[#115740]/30"
        >
          {pending ? "发布中…" : "发布组队帖"}
        </Button>
      </div>
    </form>
  );
}
