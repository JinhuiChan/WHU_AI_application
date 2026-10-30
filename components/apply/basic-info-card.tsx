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

const fieldClass = "mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-600";

type TrackNode = ApplyOptions["competitions"][number]["tracks"][number];

function leafTracks(tracks: TrackNode[], prefix: string[] = []): Array<{ id: string; label: string; track: TrackNode }> {
  return tracks.flatMap((track) => {
    const path = [...prefix, track.name];
    return track.children.length ? leafTracks(track.children, path) : [{ id: track.id, label: path.join(" / "), track }];
  });
}

export function BasicInfoCard({ student, value, competitions, dictionaries, onChange, onPayeeToggle }: BasicInfoCardProps) {
  const units = [...new Set([value.trainingUnit, value.applicationUnit, student.trainingUnit, student.college].filter((item): item is string => Boolean(item)))];
  const trackValue = value.competitionId && value.trackId ? `${value.competitionId}:${value.trackId}` : "";
  const selectedTrack = competitions.flatMap((competition) => leafTracks(competition.tracks)).find((item) => item.id === value.trackId)?.track;
  const groups = selectedTrack?.groups ?? dictionaries.groups;
  const categories = selectedTrack?.categories ?? dictionaries.categories;
  const isEnterpriseTrack = Boolean(selectedTrack && `${selectedTrack.kind}${selectedTrack.name}`.includes("企业命题"));
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">项目基本信息</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-xs text-slate-600">负责人学号
          <input className={fieldClass} value={value.leaderStudentNo || "未绑定学号"} disabled />
        </label>
        <label className="text-xs text-slate-600">负责人姓名
          <input className={fieldClass} value={value.leaderName} disabled />
        </label>
        <label className="text-xs text-slate-600">年级
          <input className={fieldClass} value={value.grade} onChange={(event) => onChange({ grade: event.target.value })} required />
        </label>
        <label className="text-xs text-slate-600">性别
          <select className={fieldClass} value={value.gender} onChange={(event) => onChange({ gender: event.target.value })} required>
            <option value="">请选择</option><option value="男">男</option><option value="女">女</option>
          </select>
        </label>
        <label className="text-xs text-slate-600">培养阶段
          <select className={fieldClass} value={value.educationStage} onChange={(event) => onChange({ educationStage: event.target.value })} required>
            <option value="">请选择</option>
            {dictionaries.educationStages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-600">培养单位
          <select className={fieldClass} value={value.trainingUnit} onChange={(event) => onChange({ trainingUnit: event.target.value })} required>
            <option value="">请选择</option>
            {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-600">项目赛道
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
        <label className="text-xs text-slate-600">项目组别
          <select className={fieldClass} value={value.groupName} onChange={(event) => onChange({ groupName: event.target.value })} required>
            <option value="">请选择</option>
            {groups.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-600">项目类别
          <select className={fieldClass} value={value.categoryName} onChange={(event) => onChange({ categoryName: event.target.value })} required>
            <option value="">请选择</option>
            {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        {isEnterpriseTrack ? (
          <>
            <label className="text-xs text-slate-600">命题名称
              <input className={fieldClass} value={value.propositionName ?? ""} onChange={(event) => onChange({ propositionName: event.target.value })} required />
            </label>
            <label className="text-xs text-slate-600">命题企业
              <input className={fieldClass} value={value.propositionCompany ?? ""} onChange={(event) => onChange({ propositionCompany: event.target.value })} required />
            </label>
          </>
        ) : null}
        <label className="text-xs text-slate-600">申报单位
          <select className={fieldClass} value={value.applicationUnit} onChange={(event) => onChange({ applicationUnit: event.target.value })} required>
            <option value="">请选择</option>
            {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-600">民族
          <select className={fieldClass} value={value.ethnicity} onChange={(event) => onChange({ ethnicity: event.target.value })} required>
            <option value="">请选择</option>
            {dictionaries.ethnicities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-600">项目名称
          <input className={fieldClass} value={value.name} onChange={(event) => onChange({ name: event.target.value })} required />
        </label>
        <label className="text-xs text-slate-600">专业
          <input className={fieldClass} value={value.major} onChange={(event) => onChange({ major: event.target.value })} required />
        </label>
        <label className="text-xs text-slate-600">入学年份
          <input type="number" min="2000" max="2100" className={fieldClass} value={value.enrollmentYear || ""} onChange={(event) => onChange({ enrollmentYear: Number(event.target.value) })} required />
        </label>
        <label className="text-xs text-slate-600">毕业年份
          <input type="number" min="2000" max="2100" className={fieldClass} value={value.graduationYear || ""} onChange={(event) => onChange({ graduationYear: Number(event.target.value) })} required />
        </label>
        <label className="text-xs text-slate-600">申报者手机号
          <input type="tel" className={fieldClass} value={value.phone} onChange={(event) => onChange({ phone: event.target.value })} required />
        </label>
        <label className="text-xs text-slate-600">申报者邮箱
          <input type="email" className={fieldClass} value={value.email} onChange={(event) => onChange({ email: event.target.value })} required />
        </label>
        <label className="text-xs text-slate-600 md:col-span-2">备注
          <textarea className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600" value={value.remark ?? ""} onChange={(event) => onChange({ remark: event.target.value })} placeholder="若该生 6 月毕业，请填写其后续去向单位" />
        </label>
        <div className="md:col-span-2">
          <PayeeToggle checked={value.isPayee} payee={value.payee} onCheckedChange={onPayeeToggle} onPayeeChange={(payee) => onChange({ payee })} />
        </div>
      </div>
    </section>
  );
}
