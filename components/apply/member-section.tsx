"use client";

import { useState } from "react";
import type { MemberInput, PayeeInput } from "@/types/apply";
import type { ApplyOptions } from "./apply-form";
import { PayeeToggle } from "./payee-toggle";
import { Button } from "@/components/ui/button";

type MemberSectionProps = {
  members: MemberInput[];
  dictionaries: ApplyOptions["dictionaries"];
  onChange: (members: MemberInput[]) => void;
  onPayeeToggle: (index: number, checked: boolean) => void;
};

type StudentResult = {
  studentNo: string | null;
  name: string;
  college: string | null;
  trainingUnit: string | null;
  major: string | null;
  gender: string | null;
  ethnicity: string | null;
  educationStage: string | null;
  enrollmentYear: number | null;
  graduationYear: number | null;
  phone: string;
  email: string | null;
  boundFinancePlatform: boolean;
};

const fieldClass = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100";

function emptyPayee(bound: boolean): PayeeInput {
  return bound ? { boundFinancePlatform: true } : {
    boundFinancePlatform: false,
    organization: "",
    phone: "",
    idCard: "",
    bankCard: "",
    bankName: "",
    accountName: "",
  };
}

function emptyMember(isInternal: boolean, sortOrder: number): MemberInput {
  return {
    isInternal,
    personNo: isInternal ? "" : null,
    name: "",
    school: isInternal ? "武汉大学" : "",
    educationStage: "",
    trainingUnit: "",
    major: "",
    gender: "",
    ethnicity: "",
    enrollmentYear: 0,
    graduationYear: 0,
    phone: "",
    email: "",
    remark: "",
    sortOrder,
    isPayee: false,
    payee: emptyPayee(false),
  };
}

export function MemberSection({ members, dictionaries, onChange, onPayeeToggle }: MemberSectionProps) {
  const [modal, setModal] = useState<"internal" | "external" | null>(null);
  const [draft, setDraft] = useState<MemberInput>(emptyMember(true, 0));
  const [keyword, setKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  function openModal(isInternal: boolean) {
    if (members.length >= 14) {
      setError("团队成员最多 14 名，已超出上限");
      return;
    }
    setDraft(emptyMember(isInternal, members.length));
    setKeyword("");
    setError("");
    setModal(isInternal ? "internal" : "external");
  }

  async function searchStudent() {
    const studentNo = keyword.split("-")[0]?.trim() ?? "";
    if (!studentNo) {
      setError("请输入学号或学号-姓名");
      return;
    }
    setSearching(true);
    setError("");
    try {
      const response = await fetch(`/api/lookup/student?studentNo=${encodeURIComponent(studentNo)}`, { method: "GET" });
      const result = await response.json() as { code: number; message: string; data: StudentResult | null };
      if (!response.ok || result.code !== 0 || !result.data) throw new Error(result.message || "未找到对应学生");
      const student = result.data;
      setDraft((current) => ({
        ...current,
        personNo: student.studentNo,
        name: student.name,
        school: "武汉大学",
        educationStage: student.educationStage ?? "",
        trainingUnit: student.trainingUnit ?? student.college ?? "",
        major: student.major ?? "",
        gender: student.gender ?? "",
        ethnicity: student.ethnicity ?? "",
        enrollmentYear: student.enrollmentYear ?? 0,
        graduationYear: student.graduationYear ?? 0,
        phone: student.phone,
        email: student.email ?? "",
        payee: emptyPayee(student.boundFinancePlatform),
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "检索失败");
    } finally {
      setSearching(false);
    }
  }

  function addMember() {
    if (!draft.name.trim() || !draft.school.trim() || !draft.trainingUnit.trim() || !draft.major.trim() || !draft.phone.trim()) {
      setError("请完整填写姓名、学校、培养单位、专业和联系电话");
      return;
    }
    if (draft.isInternal && !draft.personNo?.trim()) {
      setError("校内成员须填写学号");
      return;
    }
    if (members.length >= 14) {
      setError("团队成员最多 14 名，已超出上限");
      return;
    }
    onChange([...members, { ...draft, sortOrder: members.length }]);
    setModal(null);
    setError("");
  }

  function updateMember(index: number, patch: Partial<MemberInput>) {
    onChange(members.map((member, itemIndex) => itemIndex === index ? { ...member, ...patch } : member));
  }

  function moveMember(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= members.length) return;
    const next = [...members];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(target, 0, moved);
    onChange(next.map((member, itemIndex) => ({ ...member, sortOrder: itemIndex })));
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-base font-semibold text-slate-900">团队成员</h2><p className="mt-1 text-xs text-slate-500">负责人之外，已添加 {members.length}/14 名成员</p></div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => openModal(true)} className="rounded-full">+ 添加校内成员</Button>
          <Button type="button" variant="outline" onClick={() => openModal(false)} className="rounded-full">+ 添加校外成员</Button>
        </div>
      </div>
      {error && !modal ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <div className="mt-4 space-y-3">
        {members.map((member, index) => (
          <div key={member.id ?? `member-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid items-center gap-3 text-sm md:grid-cols-[70px_1fr_1fr_1fr_auto]">
              <span className="text-slate-500">{member.isInternal ? "校内" : "校外"}</span>
              <span className="font-medium text-slate-900">{member.name}</span>
              <span className="text-slate-600">{member.personNo || "无学号"}</span>
              <span className="text-slate-600">{member.trainingUnit}</span>
              <span className="flex gap-2">
                <button type="button" aria-label="上移" disabled={index === 0} onClick={() => moveMember(index, -1)} className="rounded-lg border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50 disabled:opacity-40">↑</button>
                <button type="button" aria-label="下移" disabled={index === members.length - 1} onClick={() => moveMember(index, 1)} className="rounded-lg border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50 disabled:opacity-40">↓</button>
                <button type="button" onClick={() => onChange(members.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, sortOrder: itemIndex })))} className="rounded-lg px-2 text-red-600 hover:bg-red-50">删除</button>
              </span>
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3">
              <PayeeToggle checked={member.isPayee} payee={member.payee} onCheckedChange={(checked) => onPayeeToggle(index, checked)} onPayeeChange={(payee) => updateMember(index, { payee })} />
            </div>
          </div>
        ))}
        {members.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">暂未添加团队成员</p> : null}
      </div>

      {modal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label={modal === "internal" ? "添加校内成员" : "添加校外成员"}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">{modal === "internal" ? "添加校内成员" : "添加校外成员"}</h3>
            {modal === "internal" ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                  <span className="text-sm text-slate-700">学号-姓名检索</span>
                  <div className="flex gap-2">
                    <input className={fieldClass} value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="例如 12345678-张三" />
                    <Button type="button" onClick={searchStudent} disabled={searching} className="shrink-0">{searching ? "检索中" : "检索"}</Button>
                  </div>
                </label>
              </div>
            ) : null}
            <div className="mt-4 space-y-3">
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm text-slate-700">学校</span>
                <input className={fieldClass} value={draft.school} onChange={(event) => setDraft({ ...draft, school: event.target.value })} disabled={modal === "internal"} required />
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm text-slate-700">姓名</span>
                <input className={fieldClass} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm text-slate-700">学号</span>
                <input className={fieldClass} value={draft.personNo ?? ""} onChange={(event) => setDraft({ ...draft, personNo: modal === "internal" ? event.target.value : null })} disabled={modal === "external"} required={modal === "internal"} />
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm text-slate-700">培养阶段</span>
                <select className={fieldClass} value={draft.educationStage} onChange={(event) => setDraft({ ...draft, educationStage: event.target.value })} required><option value="">请选择</option>{dictionaries.educationStages.map((item) => <option key={item.value} value={item.label}>{item.label}</option>)}</select>
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm text-slate-700">培养单位</span>
                <input className={fieldClass} value={draft.trainingUnit} onChange={(event) => setDraft({ ...draft, trainingUnit: event.target.value })} required />
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm text-slate-700">专业</span>
                <input className={fieldClass} value={draft.major} onChange={(event) => setDraft({ ...draft, major: event.target.value })} required />
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm text-slate-700">性别</span>
                <select className={fieldClass} value={draft.gender} onChange={(event) => setDraft({ ...draft, gender: event.target.value })} required><option value="">请选择</option><option value="男">男</option><option value="女">女</option></select>
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm text-slate-700">民族</span>
                <select className={fieldClass} value={draft.ethnicity} onChange={(event) => setDraft({ ...draft, ethnicity: event.target.value })} required><option value="">请选择</option>{dictionaries.ethnicities.map((item) => <option key={item.value} value={item.label}>{item.label}</option>)}</select>
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm text-slate-700">入学年份</span>
                <input type="number" className={fieldClass} value={draft.enrollmentYear || ""} onChange={(event) => setDraft({ ...draft, enrollmentYear: Number(event.target.value) })} required />
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm text-slate-700">毕业年份</span>
                <input type="number" className={fieldClass} value={draft.graduationYear || ""} onChange={(event) => setDraft({ ...draft, graduationYear: Number(event.target.value) })} required />
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm text-slate-700">联系电话</span>
                <input type="tel" className={fieldClass} value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} required />
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm text-slate-700">邮箱</span>
                <input type="email" className={fieldClass} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm text-slate-700">备注</span>
                <textarea className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100" value={draft.remark ?? ""} onChange={(event) => setDraft({ ...draft, remark: event.target.value })} placeholder="若该生 6 月毕业，请填写其后续去向单位" />
              </label>
            </div>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setModal(null); setError(""); }}>取消</Button>
              <Button type="button" onClick={addMember}>确认添加</Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
