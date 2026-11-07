"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { TeacherInput } from "@/types/apply";

type TeacherSectionProps = {
  teachers: TeacherInput[];
  onChange: (teachers: TeacherInput[]) => void;
};

type TeacherResult = {
  staffNo: string | null;
  name: string;
  gender: string | null;
  phone: string;
  school: string;
  unit: string;
  title: string;
  email: string | null;
};

const fieldClass = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100";

function emptyTeacher(isInternal: boolean): TeacherInput {
  return {
    isInternal,
    staffNo: isInternal ? "" : null,
    name: "",
    gender: "",
    phone: "",
    school: isInternal ? "武汉大学" : "",
    unit: "",
    title: "",
    email: "",
  };
}

type FieldKey = "staffNo" | "name" | "phone" | "school" | "unit" | "title";

export function TeacherSection({ teachers, onChange }: TeacherSectionProps) {
  const [modal, setModal] = useState<"internal" | "external" | null>(null);
  const [draft, setDraft] = useState<TeacherInput>(emptyTeacher(true));
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<TeacherResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});

  function updateDraft(patch: Partial<TeacherInput>) {
    setDraft((current) => ({ ...current, ...patch }));
    setFieldErrors({});
  }

  function openModal(isInternal: boolean) {
    if (teachers.length >= 8) {
      setError("指导老师最多 8 名，已超出上限");
      return;
    }
    setError("");
    setFieldErrors({});
    setKeyword("");
    setResults([]);
    setDraft(emptyTeacher(isInternal));
    setModal(isInternal ? "internal" : "external");
  }

  async function searchTeachers() {
    if (!keyword.trim()) {
      setError("请输入工号或姓名");
      return;
    }
    setSearching(true);
    setError("");
    try {
      const response = await fetch(`/api/lookup/teacher?keyword=${encodeURIComponent(keyword.trim())}`, { method: "GET" });
      const result = await response.json() as { code: number; message: string; data: TeacherResult[] };
      if (!response.ok || result.code !== 0) throw new Error(result.message || "检索失败");
      setResults(result.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "检索失败");
    } finally {
      setSearching(false);
    }
  }

  function addTeacher() {
    const next: Partial<Record<FieldKey, string>> = {};
    if (modal === "internal" && !draft.staffNo?.trim()) next.staffNo = "校内老师须填写工号";
    if (!draft.name.trim()) next.name = "请填写姓名";
    if (!draft.phone.trim()) next.phone = "请填写手机号";
    else if (!/^1\d{10}$/.test(draft.phone.trim())) next.phone = "手机号须为 11 位";
    if (!draft.school.trim()) next.school = "请填写所在院校/公司";
    if (!draft.unit.trim()) next.unit = "请填写所在单位/部门";
    if (!draft.title.trim()) next.title = modal === "internal" ? "请填写职称" : "请填写职务";
    setFieldErrors(next);
    if (Object.keys(next).length) {
      setError("请完善标红的必填项");
      return;
    }
    if (teachers.length >= 8) {
      setError("指导老师最多 8 名，已超出上限");
      return;
    }
    onChange([...teachers, draft]);
    setModal(null);
    setError("");
    setFieldErrors({});
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">指导老师</h2>
          <p className="mt-1 text-xs text-slate-500">已添加 {teachers.length}/8 名</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => openModal(true)} className="rounded-full">
            + 添加校内指导老师
          </Button>
          <Button type="button" variant="outline" onClick={() => openModal(false)} className="rounded-full">
            + 添加校外指导老师
          </Button>
        </div>
      </div>
      {error && !modal ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr><th className="px-3 py-2">是否校内</th><th className="px-3 py-2">姓名</th><th className="px-3 py-2">单位</th><th className="px-3 py-2">性别</th><th className="px-3 py-2">职称/职务</th><th className="px-3 py-2">联系电话</th><th className="px-3 py-2">操作</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {teachers.map((teacher, index) => (
              <tr key={teacher.id ?? `${teacher.staffNo}-${index}`}>
                <td className="px-3 py-3">{teacher.isInternal ? "校内" : "校外"}</td><td className="px-3 py-3">{teacher.name}</td><td className="px-3 py-3">{teacher.unit}</td><td className="px-3 py-3">{teacher.gender}</td><td className="px-3 py-3">{teacher.title}</td><td className="px-3 py-3">{teacher.phone}</td>
                <td className="px-3 py-3"><Button variant="ghost" size="default" type="button" onClick={() => onChange(teachers.filter((_, itemIndex) => itemIndex !== index))} >删除</Button></td>
              </tr>
            ))}
            {teachers.length === 0 ? <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">暂未添加指导老师</td></tr> : null}
          </tbody>
        </table>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label={modal === "internal" ? "添加校内指导老师" : "添加校外指导老师"}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">{modal === "internal" ? "添加校内指导老师" : "添加校外指导老师"}</h3>
            {modal === "internal" ? (
              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                  <span className="text-sm text-slate-600">按工号/姓名检索</span>
                  <div className="flex gap-2">
                    <input className={fieldClass} value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="工号或姓名" />
                    <Button type="button" onClick={searchTeachers} disabled={searching} className="shrink-0">
                      {searching ? "检索中" : "检索"}
                    </Button>
                  </div>
                </label>
                {results.length ? <div className="mt-2 space-y-1">{results.map((teacher) => (
                  <Button variant="default" size="default"
                    type="button"
                    key={teacher.staffNo ?? teacher.name}
                    onClick={() => {
                      setDraft({ isInternal: true, staffNo: teacher.staffNo, name: teacher.name, gender: teacher.gender ?? "", phone: teacher.phone, school: "武汉大学", unit: teacher.unit, title: teacher.title, email: teacher.email ?? "" });
                      setFieldErrors({});
                    }}
                    className="block w-full text-left" >{teacher.staffNo} · {teacher.name} · {teacher.unit} · {teacher.title || "职称未登记"}</Button>
                ))}</div> : <p className="mt-2 text-xs text-slate-500">检索后选择老师，也可继续校正信息；检索结果没有职称时请手填。</p>}
              </div>
            ) : null}
            <div className="mt-4 space-y-3">
              {modal === "internal" ? (
                <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                  <span className="text-sm text-slate-600">工号</span>
                  <div>
                    <input className={`${fieldClass}${fieldErrors.staffNo ? " border-red-500" : ""}`} value={draft.staffNo ?? ""} onChange={(event) => updateDraft({ staffNo: event.target.value })} required />
                    {fieldErrors.staffNo ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.staffNo}</span> : null}
                  </div>
                </label>
              ) : null}
              <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm text-slate-600">姓名</span>
                <div>
                  <input className={`${fieldClass}${fieldErrors.name ? " border-red-500" : ""}`} value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} required />
                  {fieldErrors.name ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.name}</span> : null}
                </div>
              </label>
              <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm text-slate-600">性别</span>
                <select className={fieldClass} value={draft.gender} onChange={(event) => updateDraft({ gender: event.target.value })}><option value="">请选择</option><option value="男">男</option><option value="女">女</option></select>
              </label>
              <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm text-slate-600">手机号</span>
                <div>
                  <input type="tel" className={`${fieldClass}${fieldErrors.phone ? " border-red-500" : ""}`} value={draft.phone} onChange={(event) => updateDraft({ phone: event.target.value })} required />
                  {fieldErrors.phone ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.phone}</span> : null}
                </div>
              </label>
              <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm text-slate-600">所在院校/公司</span>
                <div>
                  <input className={`${fieldClass}${fieldErrors.school ? " border-red-500" : ""}`} value={draft.school} onChange={(event) => updateDraft({ school: event.target.value })} disabled={modal === "internal"} required />
                  {fieldErrors.school ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.school}</span> : null}
                </div>
              </label>
              <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm text-slate-600">所在单位/部门</span>
                <div>
                  <input className={`${fieldClass}${fieldErrors.unit ? " border-red-500" : ""}`} value={draft.unit} onChange={(event) => updateDraft({ unit: event.target.value })} required />
                  {fieldErrors.unit ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.unit}</span> : null}
                </div>
              </label>
              <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm text-slate-600">{modal === "internal" ? "职称" : "职务"}</span>
                <div>
                  <input className={`${fieldClass}${fieldErrors.title ? " border-red-500" : ""}`} value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} required />
                  {fieldErrors.title ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.title}</span> : null}
                </div>
              </label>
              <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm text-slate-600">邮箱</span>
                <input type="email" className={fieldClass} value={draft.email} onChange={(event) => updateDraft({ email: event.target.value })} />
              </label>
            </div>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setModal(null); setError(""); }}>取消</Button>
              <Button type="button" onClick={addTeacher}>确认添加</Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
