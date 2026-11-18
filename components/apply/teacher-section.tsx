"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDialogA11y } from "@/components/ui/use-dialog-a11y";
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

const fieldClass =
  "h-10 w-full rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition-colors placeholder:text-[#7c8e85] focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 disabled:cursor-not-allowed disabled:border-[#c8d7cf] disabled:bg-[#f1f6f3] disabled:text-[#5c6c65]";

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
  const dialogRef = useDialogA11y(modal !== null, () => setModal(null));
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
    <>
      <section id="apply-teachers" className="scroll-mt-28 card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#cde0d5] bg-[#eef5f1] font-display text-xs font-bold text-[#115740] tabular-nums">
              02
            </span>
            <div>
              <h2 className="text-base font-semibold text-[#0f1d18]">指导老师</h2>
              <p className="mt-0.5 text-xs text-[#54635d]">
                已添加 <span className="font-semibold text-[#0f1d18] tabular-nums">{teachers.length}</span>/8 名校内或校外导师
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
              + 添加校内指导老师
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => openModal(false)}
              className="rounded-full border-[#7f9384] bg-white text-[#1b2e26] hover:border-[#115740] hover:bg-[#eef5f1] focus-visible:ring-[#115740]/25"
            >
              + 添加校外指导老师
            </Button>
          </div>
        </div>
        <div aria-hidden="true" className="mt-4 h-px bg-[#d5e2db]/70" />

        {error && !modal ? <p role="alert" className="mt-3 text-sm text-[#9e2a35]">{error}</p> : null}

        <div className="mt-4 space-y-3">
          {teachers.map((teacher, index) => (
            <div
              key={teacher.id ?? `${teacher.staffNo}-${index}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#cde0d5] bg-[#eef5f1] font-display text-sm font-bold text-[#115740]">
                  {teacher.name?.slice(0, 1) || "师"}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#0f1d18]">{teacher.name}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        teacher.isInternal
                          ? "border border-[#cde0d5] bg-[#eef5f1] text-[#115740]"
                          : "border border-[#ead7af] bg-[#fdf8ee] text-[#8a651b]"
                      }`}
                    >
                      {teacher.isInternal ? "校内" : "校外"}
                    </span>
                    {teacher.title ? <span className="text-xs font-medium text-[#43554d]">{teacher.title}</span> : null}
                    {teacher.gender ? <span className="text-xs text-[#6c7e76]">{teacher.gender}</span> : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[#54635d]">
                    {[teacher.school, teacher.unit, teacher.staffNo ? `工号 ${teacher.staffNo}` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-[#43554d] tabular-nums">{teacher.phone || "—"}</span>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="rounded-full border-[#7f9384] bg-white px-4 text-[#9e2a35] hover:border-[#9e2a35] hover:bg-[#fdf2f3] focus-visible:ring-[#9e2a35]/20"
                  onClick={() => onChange(teachers.filter((_, itemIndex) => itemIndex !== index))}
                >
                  删除
                </Button>
              </div>
            </div>
          ))}
          {teachers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#b8cbc0] bg-[#f8fbf9] py-7 text-center text-sm text-[#5c6c65]">
              暂未添加指导老师
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
          aria-label={modal === "internal" ? "添加校内指导老师" : "添加校外指导老师"}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-display text-lg font-bold text-[#0f1d18]">
              {modal === "internal" ? "添加校内指导老师" : "添加校外指导老师"}
            </h3>
            {modal === "internal" ? (
              <div className="mt-4 rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-4">
                <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                  <span className="text-sm font-medium text-[#24362f]">按工号/姓名检索</span>
                  <div className="flex gap-2">
                    <input className={fieldClass} value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="工号或姓名" />
                    <Button
                      type="button"
                      onClick={searchTeachers}
                      disabled={searching}
                      className="shrink-0 rounded-full bg-[#115740] px-5 text-white hover:bg-[#0d4633] active:bg-[#093526] focus-visible:ring-[#115740]/25"
                    >
                      {searching ? "检索中" : "检索"}
                    </Button>
                  </div>
                </label>
                {results.length ? (
                  <div className="mt-3 space-y-1.5">
                    {results.map((teacher) => (
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        key={teacher.staffNo ?? teacher.name}
                        onClick={() => {
                          setDraft({
                            isInternal: true,
                            staffNo: teacher.staffNo,
                            name: teacher.name,
                            gender: teacher.gender ?? "",
                            phone: teacher.phone,
                            school: "武汉大学",
                            unit: teacher.unit,
                            title: teacher.title,
                            email: teacher.email ?? "",
                          });
                          setFieldErrors({});
                        }}
                        className="w-full justify-start rounded-full border-[#7f9384] bg-white px-4 text-left text-xs text-[#0f1d18] hover:border-[#115740] hover:bg-[#eef5f1]"
                      >
                        {teacher.staffNo} · {teacher.name} · {teacher.unit} · {teacher.title || "职称未登记"}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-[#5c6c65]">检索后选择老师即可带入档案；若检索结果无职称请手填补齐。</p>
                )}
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {modal === "internal" ? (
                <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                  <span className="text-sm font-medium text-[#24362f]">工号</span>
                  <div>
                    <input className={`${fieldClass}${fieldErrors.staffNo ? " border-[#9e2a35]" : ""}`} value={draft.staffNo ?? ""} onChange={(event) => updateDraft({ staffNo: event.target.value })} required />
                    {fieldErrors.staffNo ? <span role="alert" className="mt-1 block text-xs text-[#9e2a35]">{fieldErrors.staffNo}</span> : null}
                  </div>
                </label>
              ) : null}
              <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm font-medium text-[#24362f]">姓名</span>
                <div>
                  <input className={`${fieldClass}${fieldErrors.name ? " border-[#9e2a35]" : ""}`} value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} required />
                  {fieldErrors.name ? <span role="alert" className="mt-1 block text-xs text-[#9e2a35]">{fieldErrors.name}</span> : null}
                </div>
              </label>
              <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm font-medium text-[#24362f]">性别</span>
                <select className={fieldClass} value={draft.gender} onChange={(event) => updateDraft({ gender: event.target.value })}>
                  <option value="">请选择</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </label>
              <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm font-medium text-[#24362f]">手机号</span>
                <div>
                  <input type="tel" className={`${fieldClass} tabular-nums${fieldErrors.phone ? " border-[#9e2a35]" : ""}`} value={draft.phone} onChange={(event) => updateDraft({ phone: event.target.value })} required />
                  {fieldErrors.phone ? <span role="alert" className="mt-1 block text-xs text-[#9e2a35]">{fieldErrors.phone}</span> : null}
                </div>
              </label>
              <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm font-medium text-[#24362f]">所在院校/公司</span>
                <div>
                  <input className={`${fieldClass}${fieldErrors.school ? " border-[#9e2a35]" : ""}`} value={draft.school} onChange={(event) => updateDraft({ school: event.target.value })} disabled={modal === "internal"} required />
                  {fieldErrors.school ? <span role="alert" className="mt-1 block text-xs text-[#9e2a35]">{fieldErrors.school}</span> : null}
                </div>
              </label>
              <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm font-medium text-[#24362f]">所在单位/部门</span>
                <div>
                  <input className={`${fieldClass}${fieldErrors.unit ? " border-[#9e2a35]" : ""}`} value={draft.unit} onChange={(event) => updateDraft({ unit: event.target.value })} required />
                  {fieldErrors.unit ? <span role="alert" className="mt-1 block text-xs text-[#9e2a35]">{fieldErrors.unit}</span> : null}
                </div>
              </label>
              <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm font-medium text-[#24362f]">{modal === "internal" ? "职称" : "职务"}</span>
                <div>
                  <input className={`${fieldClass}${fieldErrors.title ? " border-[#9e2a35]" : ""}`} value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} required />
                  {fieldErrors.title ? <span role="alert" className="mt-1 block text-xs text-[#9e2a35]">{fieldErrors.title}</span> : null}
                </div>
              </label>
              <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
                <span className="text-sm font-medium text-[#24362f]">邮箱</span>
                <input type="email" className={fieldClass} value={draft.email} onChange={(event) => updateDraft({ email: event.target.value })} />
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
                onClick={addTeacher}
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
