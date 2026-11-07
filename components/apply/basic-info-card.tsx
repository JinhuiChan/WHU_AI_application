"use client";

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

const fieldClass = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-600";

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
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">项目基本信息</h2>
      <datalist id="unit-options">
        {units.map((unit) => <option key={unit} value={unit} />)}
      </datalist>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-slate-700">负责人学号</span>
          <input className={fieldClass} value={value.leaderStudentNo || "未绑定学号"} disabled />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-slate-700">负责人姓名</span>
          <input className={fieldClass} value={value.leaderName} disabled />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-slate-700">年级</span>
          <input className={fieldClass} value={value.grade} onChange={(event) => onChange({ grade: event.target.value })} required />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-slate-700">性别</span>
          <select className={fieldClass} value={value.gender} onChange={(event) => onChange({ gender: event.target.value })} required>
            <option value="">请选择</option><option value="男">男</option><option value="女">女</option>
          </select>
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-slate-700">培养阶段</span>
          <select className={fieldClass} value={value.educationStage} onChange={(event) => onChange({ educationStage: event.target.value })} required>
            <option value="">请选择</option>
            {dictionaries.educationStages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-slate-700">培养单位</span>
          <input className={fieldClass} list="unit-options" value={value.trainingUnit} onChange={(event) => onChange({ trainingUnit: event.target.value })} placeholder="可下拉选择，也可直接填写" required />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-slate-700">项目赛道</span>
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
          <span className="text-sm font-medium text-slate-700">项目组别</span>
          <select className={fieldClass} value={value.groupName} onChange={(event) => onChange({ groupName: event.target.value })} required>
            <option value="">请选择</option>
            {groups.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-slate-700">项目类别</span>
          <select className={fieldClass} value={value.categoryName} onChange={(event) => onChange({ categoryName: event.target.value })} required>
            <option value="">请选择</option>
            {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        {isEnterpriseTrack ? (
          <>
            <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
              <span className="text-sm font-medium text-slate-700">命题名称</span>
              <input className={fieldClass} value={value.propositionName ?? ""} onChange={(event) => onChange({ propositionName: event.target.value })} required />
            </label>
            <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
              <span className="text-sm font-medium text-slate-700">命题企业</span>
              <input className={fieldClass} value={value.propositionCompany ?? ""} onChange={(event) => onChange({ propositionCompany: event.target.value })} required />
            </label>
          </>
        ) : null}
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-slate-700">申报单位</span>
          <input className={fieldClass} list="unit-options" value={value.applicationUnit} onChange={(event) => onChange({ applicationUnit: event.target.value })} placeholder="可下拉选择，也可直接填写" required />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-slate-700">民族</span>
          <select className={fieldClass} value={value.ethnicity} onChange={(event) => onChange({ ethnicity: event.target.value })} required>
            <option value="">请选择</option>
            {dictionaries.ethnicities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-slate-700">项目名称</span>
          <input className={fieldClass} value={value.name} onChange={(event) => onChange({ name: event.target.value })} required />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-slate-700">专业</span>
          <input className={fieldClass} value={value.major} onChange={(event) => onChange({ major: event.target.value })} required />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-slate-700">入学年份</span>
          <input type="number" min="2000" max="2100" className={fieldClass} value={value.enrollmentYear || ""} onChange={(event) => onChange({ enrollmentYear: Number(event.target.value) })} required />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-slate-700">毕业年份</span>
          <input type="number" min="2000" max="2100" className={fieldClass} value={value.graduationYear || ""} onChange={(event) => onChange({ graduationYear: Number(event.target.value) })} required />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-slate-700">申报者手机号</span>
          <input type="tel" className={fieldClass} value={value.phone} onChange={(event) => onChange({ phone: event.target.value })} required />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">申报者邮箱</span>
          <input type="email" className={fieldClass} value={value.email} onChange={(event) => onChange({ email: event.target.value })} required />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">备注</span>
          <textarea className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600" value={value.remark ?? ""} onChange={(event) => onChange({ remark: event.target.value })} placeholder="若该生 6 月毕业，请填写其后续去向单位" />
        </label>
        <div className="md:col-span-2">
          <PayeeToggle checked={value.isPayee} payee={value.payee} onCheckedChange={onPayeeToggle} onPayeeChange={(payee) => onChange({ payee })} />
        </div>
      </div>
    </section>
  );
}
