"use client";

import { Lock } from "lucide-react";
import type { ProjectFormInput } from "@/types/apply";
import { PayeeToggle } from "./payee-toggle";
import type { ApplyOptions, StudentProfile } from "./apply-form";

type BasicInfoCardProps = {
  student: StudentProfile;
  value: ProjectFormInput;
  competitions: ApplyOptions["competitions"];
  dictionaries: ApplyOptions["dictionaries"];
  onChange: (patch: Partial<ProjectFormInput>) => void;
  onPayeeToggle: (checked: boolean) => void;
};

const fieldClass =
  "h-10 w-full rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition-colors placeholder:text-[#7c8e85] focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 disabled:cursor-not-allowed disabled:border-[#c8d7cf] disabled:bg-[#f1f6f3] disabled:text-[#5c6c65]";

/** 必填标记。读屏用户靠控件自带的 required 属性，这里只做视觉提示，避免重复播报。 */
function RequiredMark() {
  return <span aria-hidden="true" className="ml-0.5 text-[#9e2a35]">*</span>;
}

type TrackNode = ApplyOptions["competitions"][number]["tracks"][number];

function leafTracks(tracks: TrackNode[], prefix: string[] = []): Array<{ id: string; label: string; track: TrackNode }> {
  return tracks.flatMap((track) => {
    const path = [...prefix, track.name];
    return track.children.length ? leafTracks(track.children, path) : [{ id: track.id, label: path.join(" / "), track }];
  });
}

export function BasicInfoCard({ student, value, competitions, dictionaries, onChange, onPayeeToggle }: BasicInfoCardProps) {
  // 培养/申报单位：全局字典（官网院系清单）∪ 现有档案与历史项目 ∪ 当前值，可下拉可手填
  const units = [...new Set([
    ...(dictionaries.units ?? []),
    value.trainingUnit,
    value.applicationUnit,
    student.trainingUnit,
    student.college,
  ].filter((item): item is string => Boolean(item && item.trim())))];
  const trackValue = value.competitionId && value.trackId ? `${value.competitionId}:${value.trackId}` : "";
  const selectedTrack = competitions.flatMap((competition) => leafTracks(competition.tracks)).find((item) => item.id === value.trackId)?.track;
  const groups = selectedTrack?.groups ?? dictionaries.groups;
  const categories = selectedTrack?.categories ?? dictionaries.categories;
  const isEnterpriseTrack = Boolean(selectedTrack && `${selectedTrack.kind}${selectedTrack.name}`.includes("企业命题"));

  return (
    <section id="apply-basic" className="scroll-mt-28 card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#cde0d5] bg-[#eef5f1] font-display text-xs font-bold text-[#115740] tabular-nums">
            01
          </span>
          <div>
            <h2 className="text-base font-semibold text-[#0f1d18]">项目基本信息</h2>
            <p className="mt-0.5 text-xs text-[#54635d]">
              带 <span className="text-[#9e2a35]">*</span> 的为必填项；青灰锁定字段自账号学籍读取，报名时不可改动。
            </p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full border border-[#d5e2db] bg-[#f8fbf9] px-3 py-1 text-xs font-medium text-[#43554d]">
          负责人立项档案
        </span>
      </div>
      <div aria-hidden="true" className="mt-4 h-px bg-[#d5e2db]/70" />

      <datalist id="unit-options">
        {units.map((unit) => <option key={unit} value={unit} />)}
      </datalist>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="flex flex-wrap items-center gap-1 text-sm font-medium text-[#24362f]">
            负责人学号
            <Lock size={11} className="text-[#6c7e76]" aria-hidden="true" />
            <span className="text-xs font-normal text-[#6c7e76]">来自账号</span>
          </span>
          <input className={fieldClass} value={value.leaderStudentNo || "未绑定学号"} disabled />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="flex flex-wrap items-center gap-1 text-sm font-medium text-[#24362f]">
            负责人姓名
            <Lock size={11} className="text-[#6c7e76]" aria-hidden="true" />
            <span className="text-xs font-normal text-[#6c7e76]">来自账号</span>
          </span>
          <input className={fieldClass} value={value.leaderName} disabled />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-[#24362f]">年级<RequiredMark /></span>
          <input className={fieldClass} value={value.grade} onChange={(event) => onChange({ grade: event.target.value })} required />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-[#24362f]">性别<RequiredMark /></span>
          <select className={fieldClass} value={value.gender} onChange={(event) => onChange({ gender: event.target.value })} required>
            <option value="">请选择</option>
            <option value="男">男</option>
            <option value="女">女</option>
          </select>
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-[#24362f]">培养阶段<RequiredMark /></span>
          <select className={fieldClass} value={value.educationStage} onChange={(event) => onChange({ educationStage: event.target.value })} required>
            <option value="">请选择</option>
            {dictionaries.educationStages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-[#24362f]">培养单位<RequiredMark /></span>
          <input className={fieldClass} list="unit-options" value={value.trainingUnit} onChange={(event) => onChange({ trainingUnit: event.target.value })} placeholder="可下拉选择，也可直接填写" required />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-[#24362f]">项目赛道<RequiredMark /></span>
          <select
            className={fieldClass}
            value={trackValue}
            onChange={(event) => {
              const [competitionId = "", trackId = ""] = event.target.value.split(":");
              onChange({ competitionId, trackId, groupName: "", categoryName: "", propositionName: "", propositionCompany: "" });
            }}
            required
          >
            <option value="">请选择赛事与赛道</option>
            {competitions.map((competition) => (
              <optgroup key={competition.id} label={`${competition.name}（${competition.year}）`}>
                {leafTracks(competition.tracks).map((track) => (
                  <option key={track.id} value={`${competition.id}:${track.id}`}>{track.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-[#24362f]">项目组别<RequiredMark /></span>
          <select className={fieldClass} value={value.groupName} onChange={(event) => onChange({ groupName: event.target.value })} required>
            <option value="">请选择</option>
            {groups.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-[#24362f]">项目类别<RequiredMark /></span>
          <select className={fieldClass} value={value.categoryName} onChange={(event) => onChange({ categoryName: event.target.value })} required>
            <option value="">请选择</option>
            {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        {isEnterpriseTrack ? (
          <>
            <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
              <span className="text-sm font-medium text-[#24362f]">命题名称<RequiredMark /></span>
              <input className={fieldClass} value={value.propositionName ?? ""} onChange={(event) => onChange({ propositionName: event.target.value })} required />
            </label>
            <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
              <span className="text-sm font-medium text-[#24362f]">命题企业<RequiredMark /></span>
              <input className={fieldClass} value={value.propositionCompany ?? ""} onChange={(event) => onChange({ propositionCompany: event.target.value })} required />
            </label>
          </>
        ) : null}
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-[#24362f]">申报单位<RequiredMark /></span>
          <input className={fieldClass} list="unit-options" value={value.applicationUnit} onChange={(event) => onChange({ applicationUnit: event.target.value })} placeholder="可下拉选择，也可直接填写" required />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-[#24362f]">民族<RequiredMark /></span>
          <select className={fieldClass} value={value.ethnicity} onChange={(event) => onChange({ ethnicity: event.target.value })} required>
            <option value="">请选择</option>
            {dictionaries.ethnicities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-[#24362f]">项目名称<RequiredMark /></span>
          <input className={fieldClass} value={value.name} onChange={(event) => onChange({ name: event.target.value })} required />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-[#24362f]">专业<RequiredMark /></span>
          <input className={fieldClass} value={value.major} onChange={(event) => onChange({ major: event.target.value })} required />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-[#24362f]">入学年份<RequiredMark /></span>
          <input type="number" min="2000" max="2100" className={`${fieldClass} tabular-nums`} value={value.enrollmentYear || ""} onChange={(event) => onChange({ enrollmentYear: Number(event.target.value) })} required />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-[#24362f]">毕业年份<RequiredMark /></span>
          <input type="number" min="2000" max="2100" className={`${fieldClass} tabular-nums`} value={value.graduationYear || ""} onChange={(event) => onChange({ graduationYear: Number(event.target.value) })} required />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-[#24362f]">申报者手机号<RequiredMark /></span>
          <input type="tel" className={`${fieldClass} tabular-nums`} value={value.phone} onChange={(event) => onChange({ phone: event.target.value })} required />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4 md:col-span-2">
          <span className="text-sm font-medium text-[#24362f]">申报者邮箱<RequiredMark /></span>
          <input type="email" className={fieldClass} value={value.email} onChange={(event) => onChange({ email: event.target.value })} required />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-start sm:gap-x-4 md:col-span-2">
          <span className="text-sm font-medium text-[#24362f] sm:pt-2">备注</span>
          <textarea
            className="min-h-20 w-full rounded-lg border border-[#7f9384] bg-white px-3 py-2 text-sm text-[#0f1d18] outline-none transition-colors placeholder:text-[#7c8e85] focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25"
            value={value.remark ?? ""}
            onChange={(event) => onChange({ remark: event.target.value })}
            placeholder="若该生 6 月毕业，请填写其后续去向单位"
          />
        </label>
        <div className="rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-4 md:col-span-2">
          <PayeeToggle checked={value.isPayee} payee={value.payee} onCheckedChange={onPayeeToggle} onPayeeChange={(payee) => onChange({ payee })} />
        </div>
      </div>
    </section>
  );
}
