"use client";

import { useState } from "react";
import type { MemberInput, PayeeInput } from "@/types/apply";
import type { ApplyOptions } from "./apply-form";
import { PayeeToggle } from "./payee-toggle";
import { Button } from "@/components/ui/button";
import { useDialogA11y } from "@/components/ui/use-dialog-a11y";

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

const fieldClass =
  "h-10 w-full rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition-colors placeholder:text-[#7c8e85] focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 disabled:cursor-not-allowed disabled:border-[#c8d7cf] disabled:bg-[#f1f6f3] disabled:text-[#5c6c65]";

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
  const dialogRef = useDialogA11y(modal !== null, () => setModal(null));
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
    <>
      <section id="apply-members" className="scroll-mt-28 card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#cde0d5] bg-[#eef5f1] font-display text-xs font-bold text-[#115740] tabular-nums">
              03
            </span>
            <div>
              <h2 className="text-base font-semibold text-[#0f1d18]">团队成员</h2>
              <p className="mt-0.5 text-xs text-[#54635d]">
                负责人之外，已添加 <span className="font-semibold text-[#0f1d18] tabular-nums">{members.length}</span>/14 名成员，可调整贡献顺位
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => openModal(true)}
              className="rounded-full border-[#7f9384] bg-white text-[#1b2e26] hover:border-[#115740] hover:bg-[#eef5f1] focus-visible:ring-[#115740]/25"
            >
              + 添加校内成员
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => openModal(false)}
              className="rounded-full border-[#7f9384] bg-white text-[#1b2e26] hover:border-[#115740] hover:bg-[#eef5f1] focus-visible:ring-[#115740]/25"
            >
              + 添加校外成员
            </Button>
          </div>
        </div>
        <div aria-hidden="true" className="mt-4 h-px bg-[#d5e2db]/70" />

        {error && !modal ? <p role="alert" className="mt-3 text-sm text-[#9e2a35]">{error}</p> : null}

        <div className="mt-4 space-y-3">
          {members.map((member, index) => (
            <div
              key={member.id ?? `member-${index}`}
              className="rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#cde0d5] bg-[#eef5f1] font-display text-sm font-bold text-[#115740]">
                    {member.name?.slice(0, 1) || "成"}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[#0f1d18]">{member.name}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          member.isInternal
                            ? "border border-[#cde0d5] bg-[#eef5f1] text-[#115740]"
                            : "border border-[#ead7af] bg-[#fdf8ee] text-[#8a651b]"
                        }`}
                      >
                        {member.isInternal ? "校内" : "校外"}
                      </span>
                      <span className="font-mono text-xs text-[#54635d] tabular-nums">{member.personNo || "无学号"}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[#54635d]">
                      {[member.school, member.trainingUnit, member.major].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
                <span className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    aria-label="上移"
                    disabled={index === 0}
                    className="rounded-full border-[#7f9384] bg-white px-3.5 hover:border-[#115740] hover:bg-[#eef5f1]"
                    onClick={() => moveMember(index, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    aria-label="下移"
                    disabled={index === members.length - 1}
                    className="rounded-full border-[#7f9384] bg-white px-3.5 hover:border-[#115740] hover:bg-[#eef5f1]"
                    onClick={() => moveMember(index, 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    className="rounded-full border-[#7f9384] bg-white px-4 text-[#9e2a35] hover:border-[#9e2a35] hover:bg-[#fdf2f3] focus-visible:ring-[#9e2a35]/20"
                    onClick={() => onChange(members.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, sortOrder: itemIndex })))}
                  >
                    删除
                  </Button>
                </span>
              </div>
              <div className="mt-3 border-t border-[#dce7e1] pt-3">
                <PayeeToggle
                  checked={member.isPayee}
                  payee={member.payee}
                  onCheckedChange={(checked) => onPayeeToggle(index, checked)}
                  onPayeeChange={(payee) => updateMember(index, { payee })}
                />
              </div>
            </div>
          ))}
          {members.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#b8cbc0] bg-[#f8fbf9] py-7 text-center text-sm text-[#5c6c65]">
              暂未添加团队成员
            </p>
          ) : null}
        </div>
      </section>

      {modal ? (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#091812]/45 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label={modal === "internal" ? "添加校内成员" : "添加校外成员"}
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-display text-lg font-bold text-[#0f1d18]">
              {modal === "internal" ? "添加校内成员" : "添加校外成员"}
            </h3>
            {modal === "internal" ? (
              <div className="mt-4 rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-4">
                <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                  <span className="text-sm font-medium text-[#24362f]">学号-姓名检索</span>
                  <div className="flex gap-2">
                    <input className={fieldClass} value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="例如 12345678-张三" />
                    <Button
                      type="button"
                      onClick={searchStudent}
                      disabled={searching}
                      className="shrink-0 rounded-full bg-[#115740] px-5 text-white hover:bg-[#0d4633] active:bg-[#093526] focus-visible:ring-[#115740]/25"
                    >
                      {searching ? "检索中" : "检索"}
                    </Button>
                  </div>
                </label>
              </div>
            ) : null}
            <div className="mt-4 space-y-3">
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm font-medium text-[#24362f]">学校</span>
                <input className={fieldClass} value={draft.school} onChange={(event) => setDraft({ ...draft, school: event.target.value })} disabled={modal === "internal"} required />
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm font-medium text-[#24362f]">姓名</span>
                <input className={fieldClass} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm font-medium text-[#24362f]">学号</span>
                <input className={`${fieldClass} tabular-nums`} value={draft.personNo ?? ""} onChange={(event) => setDraft({ ...draft, personNo: modal === "internal" ? event.target.value : null })} disabled={modal === "external"} required={modal === "internal"} />
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm font-medium text-[#24362f]">培养阶段</span>
                <select className={fieldClass} value={draft.educationStage} onChange={(event) => setDraft({ ...draft, educationStage: event.target.value })} required>
                  <option value="">请选择</option>
                  {dictionaries.educationStages.map((item) => <option key={item.value} value={item.label}>{item.label}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm font-medium text-[#24362f]">培养单位</span>
                <input className={fieldClass} value={draft.trainingUnit} onChange={(event) => setDraft({ ...draft, trainingUnit: event.target.value })} required />
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm font-medium text-[#24362f]">专业</span>
                <input className={fieldClass} value={draft.major} onChange={(event) => setDraft({ ...draft, major: event.target.value })} required />
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm font-medium text-[#24362f]">性别</span>
                <select className={fieldClass} value={draft.gender} onChange={(event) => setDraft({ ...draft, gender: event.target.value })} required>
                  <option value="">请选择</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm font-medium text-[#24362f]">民族</span>
                <select className={fieldClass} value={draft.ethnicity} onChange={(event) => setDraft({ ...draft, ethnicity: event.target.value })} required>
                  <option value="">请选择</option>
                  {dictionaries.ethnicities.map((item) => <option key={item.value} value={item.label}>{item.label}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm font-medium text-[#24362f]">入学年份</span>
                <input type="number" className={`${fieldClass} tabular-nums`} value={draft.enrollmentYear || ""} onChange={(event) => setDraft({ ...draft, enrollmentYear: Number(event.target.value) })} required />
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm font-medium text-[#24362f]">毕业年份</span>
                <input type="number" className={`${fieldClass} tabular-nums`} value={draft.graduationYear || ""} onChange={(event) => setDraft({ ...draft, graduationYear: Number(event.target.value) })} required />
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm font-medium text-[#24362f]">联系电话</span>
                <input type="tel" className={`${fieldClass} tabular-nums`} value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} required />
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm font-medium text-[#24362f]">邮箱</span>
                <input type="email" className={fieldClass} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
              </label>
              <label className="grid gap-2 text-sm sm:grid-cols-[9.5rem_1fr] sm:items-start sm:gap-x-4">
                <span className="text-sm font-medium text-[#24362f] sm:pt-2">备注</span>
                <textarea
                  className="min-h-20 w-full rounded-lg border border-[#7f9384] bg-white px-3 py-2 text-sm text-[#0f1d18] outline-none transition-colors placeholder:text-[#7c8e85] focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25"
                  value={draft.remark ?? ""}
                  onChange={(event) => setDraft({ ...draft, remark: event.target.value })}
                  placeholder="若该生 6 月毕业，请填写其后续去向单位"
                />
              </label>
            </div>
            {error ? <p role="alert" className="mt-3 text-sm text-[#9e2a35]">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-[#7f9384] px-5 hover:border-[#115740] hover:bg-[#f4f9f6]"
                onClick={() => { setModal(null); setError(""); }}
              >
                取消
              </Button>
              <Button
                type="button"
                className="rounded-full bg-[#115740] px-6 text-white hover:bg-[#0d4633] active:bg-[#093526] focus-visible:ring-[#115740]/25"
                onClick={addMember}
              >
                确认添加
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
