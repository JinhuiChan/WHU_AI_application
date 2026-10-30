"use client";

import { useState } from "react";
import type { MemberInput, PayeeInput, ProjectFormInput, TeacherInput } from "@/types/apply";
import { BasicInfoCard } from "./basic-info-card";
import { MemberSection } from "./member-section";
import { TeacherSection } from "./teacher-section";
import { WorkSection } from "./work-section";

export type StudentProfile = {
  studentNo: string | null;
  name: string;
  college: string | null;
  trainingUnit: string | null;
  major: string | null;
  grade: string | null;
  gender: string | null;
  ethnicity: string | null;
  educationStage: string | null;
  enrollmentYear: number | null;
  graduationYear: number | null;
  phone: string;
  email: string | null;
  boundFinancePlatform: boolean;
};

type DictionaryItem = { value: string; label: string };
export type ApplyTrack = { id: string; parentId: string | null; name: string; kind: string; children: ApplyTrack[] };
export type ApplyOptions = {
  competitions: Array<{ id: string; name: string; year: number; tracks: ApplyTrack[] }>;
  dictionaries: {
    ethnicities: DictionaryItem[];
    educationStages: DictionaryItem[];
    workForms: DictionaryItem[];
    groups: DictionaryItem[];
    categories: DictionaryItem[];
  };
};

type ApplyFormProps = { student: StudentProfile; options: ApplyOptions };

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

function initialForm(student: StudentProfile): ProjectFormInput {
  return {
    competitionId: "",
    trackId: "",
    name: "",
    leaderStudentNo: student.studentNo ?? "",
    leaderName: student.name,
    grade: student.grade ?? "",
    gender: student.gender ?? "",
    educationStage: student.educationStage ?? "",
    trainingUnit: student.trainingUnit ?? student.college ?? "",
    applicationUnit: student.college ?? student.trainingUnit ?? "",
    ethnicity: student.ethnicity ?? "",
    major: student.major ?? "",
    enrollmentYear: student.enrollmentYear ?? 0,
    graduationYear: student.graduationYear ?? 0,
    phone: student.phone,
    email: student.email ?? "",
    remark: "",
    groupName: "",
    categoryName: "",
    isPayee: true,
    payee: emptyPayee(student.boundFinancePlatform),
    teachers: [],
    members: [],
    work: { form: "", category: "", groupName: "", fileName: "", externalUrl: "" },
  };
}

function validatePayee(payee: PayeeInput | undefined, owner: string): string[] {
  if (!payee) return [`请完善${owner}的领款信息`];
  if (payee.boundFinancePlatform) return [];
  const required = [payee.organization, payee.phone, payee.idCard, payee.bankCard, payee.bankName, payee.accountName];
  return required.every((item) => item.trim()) ? [] : [`请完整填写${owner}的银行信息`];
}

function validateForm(form: ProjectFormInput): string[] {
  const errors: string[] = [];
  const required: Array<[string, string]> = [
    [form.trackId, "请选择项目赛道"],
    [form.name, "请填写项目名称"],
    [form.grade, "请填写年级"],
    [form.gender, "请选择性别"],
    [form.educationStage, "请选择培养阶段"],
    [form.trainingUnit, "请选择培养单位"],
    [form.applicationUnit, "请选择申报单位"],
    [form.ethnicity, "请选择民族"],
    [form.major, "请填写专业"],
    [form.phone, "请填写申报者手机号"],
    [form.email, "请填写申报者邮箱"],
  ];
  for (const [value, message] of required) if (!value.trim()) errors.push(message);
  if (form.phone && !/^1\d{10}$/.test(form.phone)) errors.push("申报者手机号格式不正确");
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.push("申报者邮箱格式不正确");
  if (form.enrollmentYear < 2000 || form.enrollmentYear > 2100) errors.push("入学年份须为 2000–2100 年");
  if (form.graduationYear < form.enrollmentYear) errors.push("毕业年份不能早于入学年份");
  if (form.teachers.length > 8) errors.push("指导老师不能超过 8 名");
  if (form.members.length > 14) errors.push("团队成员不能超过 14 名");
  const payeeCount = Number(form.isPayee) + form.members.filter((member) => member.isPayee).length;
  if (payeeCount !== 1) errors.push("全队必须且只能有一名奖金领款人");
  if (form.isPayee) errors.push(...validatePayee(form.payee, "负责人"));
  form.members.forEach((member, index) => {
    if (member.isPayee) errors.push(...validatePayee(member.payee, `成员 ${index + 1}`));
    if (member.graduationYear < member.enrollmentYear) errors.push(`成员 ${index + 1} 的毕业年份不能早于入学年份`);
  });
  if (!form.work.form) errors.push("请选择作品形式");
  if (!form.work.category) errors.push("请选择作品类别");
  if (!form.work.groupName) errors.push("请选择作品组别");
  if (!form.work.fileName && !form.work.externalUrl?.trim()) errors.push("请选择作品文件或填写作品外链");
  return errors;
}

export function ApplyForm({ student, options }: ApplyFormProps) {
  const [form, setForm] = useState<ProjectFormInput>(() => initialForm(student));
  const [validationVisible, setValidationVisible] = useState(false);
  const errors = validateForm(form);

  function updateBasic(patch: Partial<ProjectFormInput>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function updateWork(patch: Partial<ProjectFormInput["work"]>) {
    setForm((current) => ({
      ...current,
      groupName: patch.groupName ?? current.work.groupName,
      categoryName: patch.category ?? current.work.category,
      work: { ...current.work, ...patch },
    }));
  }

  function toggleLeaderPayee(checked: boolean) {
    setForm((current) => ({
      ...current,
      isPayee: checked,
      members: current.members.map((member) => ({ ...member, isPayee: checked ? false : member.isPayee })),
    }));
  }

  function toggleMemberPayee(index: number, checked: boolean) {
    setForm((current) => ({
      ...current,
      isPayee: checked ? false : current.isPayee,
      members: current.members.map((member, itemIndex) => ({
        ...member,
        isPayee: itemIndex === index ? checked : checked ? false : member.isPayee,
      })),
    }));
  }

  return (
    <div className="space-y-5" onBlur={() => setValidationVisible(true)}>
      <BasicInfoCard student={student} value={form} competitions={options.competitions} dictionaries={options.dictionaries} onChange={updateBasic} onPayeeToggle={toggleLeaderPayee} />
      <TeacherSection teachers={form.teachers} onChange={(teachers: TeacherInput[]) => updateBasic({ teachers })} />
      <MemberSection members={form.members} dictionaries={options.dictionaries} onChange={(members: MemberInput[]) => updateBasic({ members })} onPayeeToggle={toggleMemberPayee} />
      <WorkSection value={form.work} dictionaries={options.dictionaries} onChange={updateWork} />
      {validationVisible ? (
        <section className={`rounded-lg border p-4 text-sm ${errors.length ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          <h2 className="font-medium">前端校验</h2>
          {errors.length ? <ul className="mt-2 list-disc space-y-1 pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul> : <p className="mt-2">当前填写已通过前端校验，尚未保存或提交。</p>}
        </section>
      ) : null}
      <div className="flex justify-end rounded-lg border border-slate-200 bg-white p-4">
        <button type="button" disabled className="cursor-not-allowed rounded-md bg-slate-400 px-6 py-2 text-sm font-medium text-white">提交功能开发中</button>
      </div>
    </div>
  );
}
