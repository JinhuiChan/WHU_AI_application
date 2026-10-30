"use client";

import { useState } from "react";
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

const fieldClass = "mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100";

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

export function TeacherSection({ teachers, onChange }: TeacherSectionProps) {
  const [modal, setModal] = useState<"internal" | "external" | null>(null);
  const [draft, setDraft] = useState<TeacherInput>(emptyTeacher(true));
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<TeacherResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  function openModal(isInternal: boolean) {
    if (teachers.length >= 8) {
      setError("指导老师最多 8 名，已超出上限");
      return;
    }
    setError("");
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
    if (!draft.name.trim() || !draft.phone.trim() || !draft.school.trim() || !draft.unit.trim() || !draft.title.trim()) {
      setError("请完整填写姓名、手机号、学校/公司、单位/部门和职称/职务");
      return;
    }
    if (draft.isInternal && !draft.staffNo?.trim()) {
      setError("校内老师须填写工号");
      return;
    }
    if (teachers.length >= 8) {
      setError("指导老师最多 8 名，已超出上限");
      return;
    }
    onChange([...teachers, draft]);
    setModal(null);
    setError("");
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">指导老师</h2>
          <p className="mt-1 text-xs text-slate-500">已添加 {teachers.length}/8 名</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => openModal(true)} className="rounded-md border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50">+ 添加校内指导老师</button>
          <button type="button" onClick={() => openModal(false)} className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">+ 添加校外指导老师</button>
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
                <td className="px-3 py-3"><button type="button" onClick={() => onChange(teachers.filter((_, itemIndex) => itemIndex !== index))} className="text-red-600 hover:underline">删除</button></td>
              </tr>
            ))}
            {teachers.length === 0 ? <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">暂未添加指导老师</td></tr> : null}
          </tbody>
        </table>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label={modal === "internal" ? "添加校内指导老师" : "添加校外指导老师"}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">{modal === "internal" ? "添加校内指导老师" : "添加校外指导老师"}</h3>
            {modal === "internal" ? (
              <div className="mt-4 rounded-md bg-slate-50 p-3">
                <label className="text-xs text-slate-600">按工号/姓名检索
                  <div className="mt-1 flex gap-2">
                    <input className={fieldClass} value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="工号或姓名" />
                    <button type="button" onClick={searchTeachers} disabled={searching} className="shrink-0 rounded-md bg-blue-600 px-4 text-sm text-white disabled:opacity-60">{searching ? "检索中" : "检索"}</button>
                  </div>
                </label>
                {results.length ? <div className="mt-2 space-y-1">{results.map((teacher) => (
                  <button
                    type="button"
                    key={teacher.staffNo ?? teacher.name}
                    onClick={() => setDraft({ isInternal: true, staffNo: teacher.staffNo, name: teacher.name, gender: teacher.gender ?? "", phone: teacher.phone, school: "武汉大学", unit: teacher.unit, title: teacher.title, email: teacher.email ?? "" })}
                    className="block w-full rounded bg-white px-3 py-2 text-left text-sm hover:bg-blue-50"
                  >{teacher.staffNo} · {teacher.name} · {teacher.unit}</button>
                ))}</div> : <p className="mt-2 text-xs text-slate-500">检索后选择老师，也可继续校正信息。</p>}
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {modal === "internal" ? <label className="text-xs text-slate-600">工号<input className={fieldClass} value={draft.staffNo ?? ""} onChange={(event) => setDraft({ ...draft, staffNo: event.target.value })} required /></label> : null}
              <label className="text-xs text-slate-600">姓名<input className={fieldClass} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label>
              <label className="text-xs text-slate-600">性别<select className={fieldClass} value={draft.gender} onChange={(event) => setDraft({ ...draft, gender: event.target.value })}><option value="">请选择</option><option value="男">男</option><option value="女">女</option></select></label>
              <label className="text-xs text-slate-600">手机号<input type="tel" className={fieldClass} value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} required /></label>
              <label className="text-xs text-slate-600">所在院校/公司<input className={fieldClass} value={draft.school} onChange={(event) => setDraft({ ...draft, school: event.target.value })} disabled={modal === "internal"} required /></label>
              <label className="text-xs text-slate-600">所在单位/部门<input className={fieldClass} value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} required /></label>
              <label className="text-xs text-slate-600">{modal === "internal" ? "职称" : "职务"}<input className={fieldClass} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required /></label>
              <label className="text-xs text-slate-600">邮箱<input type="email" className={fieldClass} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label>
            </div>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setModal(null); setError(""); }} className="rounded-md border border-slate-300 px-4 py-2 text-sm">取消</button>
              <button type="button" onClick={addTeacher} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white">确认添加</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
