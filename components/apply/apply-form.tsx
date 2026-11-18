"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
export type ApplyTrack = {
  id: string;
  parentId: string | null;
  name: string;
  kind: string;
  groups?: DictionaryItem[];
  categories?: DictionaryItem[];
  children: ApplyTrack[];
};
export type ApplyOptions = {
  competitions: Array<{ id: string; name: string; year: number; tracks: ApplyTrack[] }>;
  dictionaries: {
    ethnicities: DictionaryItem[];
    educationStages: DictionaryItem[];
    workForms: DictionaryItem[];
    groups: DictionaryItem[];
    categories: DictionaryItem[];
    units: string[];
  };
};

type ApplyFormProps = {
  student: StudentProfile;
  options: ApplyOptions;
  projectId?: string;
  initialValue?: ProjectFormInput;
  initialMembers?: MemberInput[];
  lockedCompetitionId?: string;
};

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

function codeFor(items: DictionaryItem[], value: string): string {
  return items.find((item) => item.value === value)?.value
    ?? items.find((item) => item.label === value)?.value
    ?? value;
}

function labelFor(items: DictionaryItem[], value: string): string {
  return items.find((item) => item.value === value)?.label ?? value;
}

function findTrack(tracks: ApplyTrack[], trackId: string): ApplyTrack | undefined {
  for (const track of tracks) {
    if (track.id === trackId) return track;
    const child = findTrack(track.children, trackId);
    if (child) return child;
  }
  return undefined;
}

function initialForm(student: StudentProfile, options: ApplyOptions): ProjectFormInput {
  return {
    competitionId: "",
    trackId: "",
    name: "",
    leaderStudentNo: student.studentNo ?? "",
    leaderName: student.name,
    grade: student.grade ?? "",
    gender: student.gender ?? "",
    educationStage: codeFor(options.dictionaries.educationStages, student.educationStage ?? ""),
    trainingUnit: student.trainingUnit ?? student.college ?? "",
    applicationUnit: student.college ?? student.trainingUnit ?? "",
    ethnicity: codeFor(options.dictionaries.ethnicities, student.ethnicity ?? ""),
    major: student.major ?? "",
    enrollmentYear: student.enrollmentYear ?? 0,
    graduationYear: student.graduationYear ?? 0,
    phone: student.phone,
    email: student.email ?? "",
    remark: "",
    groupName: "",
    categoryName: "",
    propositionName: "",
    propositionCompany: "",
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

/**
 * 必填完成度与各分步完成情况，用于吸顶总览条展示。
 * 和 validateForm 分开：那边返回的是错误清单（含格式错误、人数上限等），
 * 拿它当“还差几项”会把人填对的字段也算成没完成。
 */
function requiredProgress(form: ProjectFormInput, options: ApplyOptions) {
  const filled = (value: string | undefined | null) => Boolean(value && value.trim());
  const basicFields = [
    form.trackId,
    form.groupName,
    form.categoryName,
    form.name,
    form.grade,
    form.gender,
    form.educationStage,
    form.trainingUnit,
    form.applicationUnit,
    form.ethnicity,
    form.major,
    form.phone,
    form.email,
  ];
  const selectedTrack = options.competitions.map((competition) => findTrack(competition.tracks, form.trackId)).find(Boolean);
  const isEnterprise = Boolean(selectedTrack && `${selectedTrack.kind}${selectedTrack.name}`.includes("企业命题"));
  const extraBasic = isEnterprise ? [form.propositionName ?? "", form.propositionCompany ?? ""] : [];
  const allBasic = [...basicFields, ...extraBasic];
  const basicDone = allBasic.filter(filled).length;
  const basicTotal = allBasic.length;

  const workMeta = [form.work.form, form.work.category, form.work.groupName];
  const workAttached = filled(form.work.fileName) || filled(form.work.externalUrl);
  const workDone = workMeta.filter(filled).length + (workAttached ? 1 : 0);
  const workTotal = workMeta.length + 1;

  return {
    done: basicDone + workDone,
    total: basicTotal + workTotal,
    basicDone,
    basicTotal,
    workDone,
    workTotal,
  };
}

function validateForm(form: ProjectFormInput, options: ApplyOptions): string[] {
  const errors: string[] = [];
  const required: Array<[string, string]> = [
    [form.trackId, "请选择项目赛道"],
    [form.groupName, "请选择项目组别"],
    [form.categoryName, "请选择项目类别"],
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
  const selectedTrack = options.competitions.map((competition) => findTrack(competition.tracks, form.trackId)).find(Boolean);
  if (selectedTrack && `${selectedTrack.kind}${selectedTrack.name}`.includes("企业命题")) {
    if (!form.propositionName?.trim()) errors.push("请填写命题名称");
    if (!form.propositionCompany?.trim()) errors.push("请填写命题企业");
  }
  if (form.phone && !/^1\d{10}$/.test(form.phone)) errors.push("申报者手机号格式不正确");
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.push("申报者邮箱格式不正确");
  if (form.enrollmentYear < 2000 || form.enrollmentYear > 2100) errors.push("入学年份须为 2000–2100 年");
  if (form.graduationYear < form.enrollmentYear) errors.push("毕业年份不能早于入学年份");
  if (form.teachers.length > 8) errors.push("指导老师不能超过 8 名");
  if (form.members.length > 14) errors.push("团队成员不能超过 14 名");
  const payeeCount = Number(form.isPayee) + form.members.filter((member) => member.isPayee).length;
  // 0 人时服务端会兜底负责人，这里只拦多人
  if (payeeCount > 1) errors.push("全队只能有一名奖金领款人");
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

export function ApplyForm({ student, options, projectId, initialValue, initialMembers, lockedCompetitionId }: ApplyFormProps) {
  const router = useRouter();
  const [resolvedOptions, setResolvedOptions] = useState(options);
  const [form, setForm] = useState<ProjectFormInput>(() =>
    initialValue ?? {
      ...initialForm(student, options),
      ...(lockedCompetitionId ? { competitionId: lockedCompetitionId } : {}),
      ...(initialMembers ? { members: initialMembers } : {}),
    },
  );
  const [validationVisible, setValidationVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<"draft" | "submit" | null>(null);
  const [requestError, setRequestError] = useState("");
  const [payeeHint, setPayeeHint] = useState("");
  const errors = validateForm(form, resolvedOptions);
  const progress = requiredProgress(form, resolvedOptions);
  const pct = Math.round((progress.done / progress.total) * 100);

  useEffect(() => {
    let active = true;
    async function loadOptions() {
      try {
        const response = await fetch(lockedCompetitionId ? `/api/apply/options?competitionId=${encodeURIComponent(lockedCompetitionId)}` : "/api/apply/options", { method: "GET" });
        const result = await response.json() as { code: number; data: ApplyOptions };
        if (active && response.ok && result.code === 0) setResolvedOptions(result.data);
      } catch {}
    }
    void loadOptions();
    return () => { active = false; };
  }, [options, lockedCompetitionId]);

  function updateBasic(patch: Partial<ProjectFormInput>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function updateWork(patch: Partial<ProjectFormInput["work"]>) {
    setForm((current) => {
      const normalized = { ...patch };
      if (patch.form !== undefined) normalized.form = codeFor(resolvedOptions.dictionaries.workForms, patch.form);
      if (patch.category !== undefined) normalized.category = codeFor(resolvedOptions.dictionaries.categories, patch.category);
      if (patch.groupName !== undefined) normalized.groupName = codeFor(resolvedOptions.dictionaries.groups, patch.groupName);
      return { ...current, work: { ...current.work, ...normalized } };
    });
  }

  function updateMembers(members: MemberInput[]) {
    updateBasic({
      members: members.map((member) => ({
        ...member,
        educationStage: codeFor(resolvedOptions.dictionaries.educationStages, member.educationStage),
        ethnicity: codeFor(resolvedOptions.dictionaries.ethnicities, member.ethnicity),
      })),
    });
  }

  function toggleLeaderPayee(checked: boolean) {
    if (!checked && !form.members.some((member) => member.isPayee)) {
      setPayeeHint("全队需有一名奖金领款人：负责人保持为领款人。如需更换，请先勾选某位成员。");
      return;
    }
    setPayeeHint("");
    setForm({
      ...form,
      isPayee: checked,
      members: form.members.map((member) => ({ ...member, isPayee: checked ? false : member.isPayee })),
    });
  }

  function toggleMemberPayee(index: number, checked: boolean) {
    const members = form.members.map((member, itemIndex) => ({
      ...member,
      isPayee: itemIndex === index ? checked : checked ? false : member.isPayee,
    }));
    if (!form.isPayee && !members.some((member) => member.isPayee)) {
      setPayeeHint("全队需有一名奖金领款人：已自动把负责人勾选为领款人。");
      setForm({ ...form, isPayee: true, members });
      return;
    }
    setPayeeHint("");
    setForm({ ...form, isPayee: checked ? false : form.isPayee, members });
  }

  async function persist(action: "draft" | "submit") {
    setRequestError("");
    if (action === "submit" && errors.length) {
      setValidationVisible(true);
      return;
    }
    setPendingAction(action);
    try {
      const response = await fetch(action === "draft" ? "/api/apply" : "/api/apply/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: form, projectId }),
      });
      const result = await response.json() as { code: number; message: string; data?: { projectId: string } };
      if (!response.ok || result.code !== 0) {
        setRequestError(result.message || (action === "draft" ? "保存草稿失败" : "提交报名失败"));
        return;
      }
      toast.success(action === "submit" ? "报名已提交" : "草稿已保存");
      if (action === "submit") router.push("/my");
      else if (result.data?.projectId) router.push(`/my/${result.data.projectId}`);
      else router.push("/my");
    } catch {
      setRequestError("网络异常，请稍后重试");
    } finally {
      setPendingAction(null);
    }
  }

  const sectionCapsules = [
    {
      href: "#apply-basic",
      title: "基本信息",
      meta: `${progress.basicDone}/${progress.basicTotal}`,
      complete: progress.basicDone === progress.basicTotal,
    },
    {
      href: "#apply-teachers",
      title: "指导老师",
      meta: form.teachers.length > 0 ? `${form.teachers.length}/8 名` : "选填",
      complete: form.teachers.length > 0,
    },
    {
      href: "#apply-members",
      title: "团队成员",
      meta: form.members.length > 0 ? `${form.members.length}/14 名` : "单人/待添",
      complete: form.members.length > 0,
    },
    {
      href: "#apply-work",
      title: "作品与材料",
      meta: `${progress.workDone}/${progress.workTotal}`,
      complete: progress.workDone === progress.workTotal,
    },
  ];

  return (
    <div className="relative space-y-5">
      {/* 吸顶完成度总览条：半透明宣纸白毛玻璃顶栏 + 宋体大号完成率 + GPU scaleX 进度轴 + 章节胶囊 + 胶囊操作按钮 */}
      <div
        aria-label="报名表填写完成度总览"
        className="sticky top-2 z-20 rounded-2xl border border-[#cfded5] bg-white/95 px-3.5 py-2.5 shadow-[0_8px_24px_-14px_rgba(17,87,64,0.18)] backdrop-blur-md sm:top-2.5 sm:px-4 sm:py-3.5"
      >
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
          <div className="min-w-0 lg:w-60 lg:shrink-0" aria-live="polite">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold leading-none tracking-tight text-[#115740] tabular-nums sm:text-[28px]">
                  {pct}%
                </span>
                <span className="text-xs font-medium text-[#43554d]">
                  必填 <strong className="font-semibold text-[#0f1d18] tabular-nums">{progress.done}</strong>/{progress.total}
                </span>
              </div>
              <span
                className={`text-xs font-medium ${
                  progress.done === progress.total ? "text-[#115740]" : "text-[#8a651b]"
                }`}
              >
                {progress.done === progress.total ? "必填项已齐备" : `尚差 ${progress.total - progress.done} 项`}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#e3ede7] sm:mt-2">
              <span
                className="block h-full w-full origin-left rounded-full bg-gradient-to-r from-[#115740] via-[#217256] to-[#c59b45] transition-transform duration-300 motion-reduce:transition-none"
                style={{ transform: `scaleX(${Math.max(0, Math.min(1, pct / 100))})` }}
              />
            </div>
          </div>

          <nav aria-label="报名章节导航" className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {sectionCapsules.map((item, idx) => (
              <a
                key={item.href}
                href={item.href}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/30 motion-reduce:active:scale-100 sm:px-3 ${
                  item.complete
                    ? "border-[#b8d4c5] bg-[#eef5f1] text-[#115740] hover:border-[#115740]"
                    : "border-[#d5e2db] bg-[#f8fbf9] text-[#43554d] hover:border-[#7f9384] hover:bg-[#eef5f1]/60"
                }`}
              >
                {item.complete ? (
                  <Check aria-hidden="true" className="text-[#115740]" size={12} />
                ) : (
                  <span className="font-display text-[11px] font-bold text-[#6c7e76] tabular-nums">0{idx + 1}</span>
                )}
                <span>{item.title}</span>
                <span className={`tabular-nums ${item.complete ? "text-[#115740]/80" : "text-[#6c7e76]"}`}>
                  {item.meta}
                </span>
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:justify-end lg:shrink-0">
            <Button
              type="button"
              variant="outline"
              className="h-10 min-w-0 flex-1 rounded-full border-[#7f9384] bg-white px-5 text-[#1b2e26] hover:border-[#115740] hover:bg-[#f4f9f6] active:scale-[0.98] focus-visible:ring-[#115740]/25 disabled:opacity-60 sm:flex-none"
              disabled={pendingAction !== null}
              loading={pendingAction === "draft"}
              onClick={() => void persist("draft")}
            >
              {pendingAction === "draft" ? "保存中…" : "保存草稿"}
            </Button>
            <Button
              type="button"
              className="h-10 min-w-0 flex-1 rounded-full bg-[#115740] px-6 text-white shadow-sm hover:bg-[#0d4633] active:scale-[0.98] active:bg-[#093526] focus-visible:ring-[#115740]/25 disabled:opacity-60 sm:flex-none"
              disabled={pendingAction !== null}
              loading={pendingAction === "submit"}
              onClick={() => void persist("submit")}
            >
              {pendingAction === "submit" ? "提交中…" : "提交报名"}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-5" onBlur={() => setValidationVisible(true)}>
        <BasicInfoCard
          student={student}
          value={form}
          competitions={resolvedOptions.competitions}
          dictionaries={resolvedOptions.dictionaries}
          onChange={updateBasic}
          onPayeeToggle={toggleLeaderPayee}
        />
        {payeeHint ? (
          <p role="status" className="rounded-xl border border-[#e6cf9e] bg-[#fdf8ee] p-4 text-sm text-[#785313]">
            {payeeHint}
          </p>
        ) : null}
        <TeacherSection
          teachers={form.teachers}
          onChange={(teachers: TeacherInput[]) => updateBasic({ teachers })}
        />
        <MemberSection
          members={form.members.map((member) => ({
            ...member,
            educationStage: labelFor(resolvedOptions.dictionaries.educationStages, member.educationStage),
            ethnicity: labelFor(resolvedOptions.dictionaries.ethnicities, member.ethnicity),
          }))}
          dictionaries={resolvedOptions.dictionaries}
          onChange={updateMembers}
          onPayeeToggle={toggleMemberPayee}
        />
        <WorkSection
          value={{
            ...form.work,
            form: labelFor(resolvedOptions.dictionaries.workForms, form.work.form),
            category: labelFor(resolvedOptions.dictionaries.categories, form.work.category),
            groupName: labelFor(resolvedOptions.dictionaries.groups, form.work.groupName),
          }}
          dictionaries={resolvedOptions.dictionaries}
          onChange={updateWork}
        />
        {validationVisible ? (
          <section
            className={`rounded-xl border p-4 text-sm ${
              errors.length
                ? "border-[#e6cf9e] bg-[#fdf8ee] text-[#785313]"
                : "border-[#b8d4c5] bg-[#eef5f1] text-[#115740]"
            }`}
          >
            <h2 className="font-semibold">台账填写核验</h2>
            {errors.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1.5">当前必填项与格式已通过前端核验，请点击顶部「保存草稿」或「提交报名」完成入库。</p>
            )}
          </section>
        ) : null}
        {requestError ? (
          <p role="alert" className="rounded-xl border border-[#e5b8bd] bg-[#fdf2f3] p-4 text-sm text-[#9e2a35]">
            {requestError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
