"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

const inputClass = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600";
const textareaClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600";

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
  if (!Number.isInteger(memberLimit) || memberLimit < 2 || memberLimit > 10) errors.push("队伍人数须为 2–10 人");
  const expiresAt = new Date(value.expiresAt);
  if (!value.expiresAt || Number.isNaN(expiresAt.getTime())) errors.push("请选择有效的有效期");
  else if (expiresAt.getTime() <= Date.now()) errors.push("有效期必须晚于当前时间");
  else if (expiresAt.getTime() > Date.now() + 30 * 86400000) errors.push("有效期不能超过 30 天");
  return errors;
}

function Required() {
  return <span aria-hidden="true" className="ml-1 text-red-500">*</span>;
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
      const result = await response.json() as ApiResponse<{ id: string } | null>;
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
    <form noValidate onSubmit={(event) => void submit(event)} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm text-slate-700">
          <span>赛事<Required /></span>
          <select required value={form.competitionId} onChange={(event) => setForm((current) => ({ ...current, competitionId: event.target.value, trackId: "" }))} className={inputClass}>
            <option value="">请选择已发布赛事</option>
            {competitions.map((competition) => <option key={competition.id} value={competition.id}>{competition.name}（{competition.year}）</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm text-slate-700">
          <span>赛道</span>
          <select value={form.trackId} onChange={(event) => update("trackId", event.target.value)} disabled={!form.competitionId} className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}>
            <option value="">不限赛道</option>
            {selectedCompetition?.tracks.map((track) => <option key={track.id} value={track.id}>{track.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm text-slate-700 sm:col-span-2">
          <span>标题<Required /></span>
          <input required maxLength={40} value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="一句话说明组队目标" className={inputClass} />
          <span className="text-right text-xs text-slate-400">{form.title.length}/40</span>
        </label>
        <label className="grid gap-1.5 text-sm text-slate-700 sm:col-span-2">
          <span>简介<Required /></span>
          <textarea required maxLength={200} rows={4} value={form.summary} onChange={(event) => update("summary", event.target.value)} placeholder="介绍项目方向、目前已有的进展和组队计划" className={textareaClass} />
          <span className="text-right text-xs text-slate-400">{form.summary.length}/200</span>
        </label>
        <label className="grid gap-1.5 text-sm text-slate-700 sm:col-span-2">
          <span>想找的队友</span>
          <textarea maxLength={300} rows={4} value={form.expectation} onChange={(event) => update("expectation", event.target.value)} placeholder="希望队友具备哪些能力、投入多少时间、负责哪部分工作" className={textareaClass} />
          <span className="text-right text-xs text-slate-400">{form.expectation.length}/300</span>
        </label>
        <label className="grid gap-1.5 text-sm text-slate-700 sm:col-span-2">
          <span>所需技能</span>
          <input value={form.skills} onChange={(event) => update("skills", event.target.value)} placeholder="用逗号分隔，如：前端，UI 设计，数据分析" className={inputClass} />
          <span className={`text-xs ${skills.length > 5 ? "text-red-600" : "text-slate-400"}`}>最多 5 项，当前 {skills.length} 项</span>
        </label>
        <label className="grid gap-1.5 text-sm text-slate-700">
          <span>队伍人数（含发起人）<Required /></span>
          <input required type="number" min={2} max={10} step={1} value={form.memberLimit} onChange={(event) => update("memberLimit", event.target.value)} className={inputClass} />
        </label>
        <label className="grid gap-1.5 text-sm text-slate-700">
          <span>有效期<Required /></span>
          <input required type="datetime-local" min={minExpiry} max={maxExpiry} value={form.expiresAt} onChange={(event) => update("expiresAt", event.target.value)} className={inputClass} />
          <span className="text-xs text-slate-400">从现在起最长 30 天</span>
        </label>
        <label className="grid gap-1.5 text-sm text-slate-700">
          <span>招募范围</span>
          <input value={form.requirement} onChange={(event) => update("requirement", event.target.value)} placeholder="全部" className={inputClass} />
        </label>
        <label className="grid gap-1.5 text-sm text-slate-700">
          <span>联系方式</span>
          <input value={form.contact} onChange={(event) => update("contact", event.target.value)} placeholder="选填，方便队友进一步沟通" className={inputClass} />
        </label>
      </div>
      {showErrors && errors.length ? (
        <div role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">请先修正以下内容：</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </div>
      ) : null}
      {requestError ? <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{requestError}</p> : null}
      <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
        <Button asChild variant="outline"><Link href="/teams">取消</Link></Button>
        <Button type="submit" loading={pending}>{pending ? "发布中…" : "发布组队帖"}</Button>
      </div>
    </form>
  );
}
