"use client";

import { Button, ButtonArrow } from "@/components/ui/button";
import { detailHref } from "@/components/data/list-link";
import { StatusBadge } from "@/components/ui/status-badge";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { RegistrationStatus, ReviewLevel } from "@prisma/client";
import { BatchActionBar } from "@/components/review/batch-action-bar";
import { RejectDialog } from "@/components/review/reject-dialog";
import { formatDateTime, registrationStatusLabels } from "@/lib/presentation";
import type { AuditPreflightIssue } from "@/lib/review";
import type { ApiResponse } from "@/types/api";
import type {
  ReviewBatchResult,
  ReviewListItem,
  ReviewListPage,
  ReviewOperationResult,
} from "@/types/review";

type RejectTarget =
  | { kind: "single"; projectId: string; projectName: string; level: ReviewLevel }
  | { kind: "batch" };

type PreflightState = {
  loading: boolean;
  items: AuditPreflightIssue[];
  error: string;
};

type CardTone = {
  shell: string;
  title: string;
  metaBox: string;
};

const CARD_TONE_BY_KEY = {
  danger: {
    shell: "border-[#f0c7c9] border-l-[4px] border-l-red-600 bg-[#fef4f4] hover:border-[#e3a3a7]",
    title: "text-[#991b1b] hover:text-[#7f1d1d]",
    metaBox: "bg-white/80 ring-1 ring-[#efd0d2]/75",
  },
  pending: {
    shell: "border-[#ecd9b0] border-l-[4px] border-l-[#d97706] bg-[#fefaf0] hover:border-[#d9bc80]",
    title: "text-[#92400e] hover:text-[#78350f]",
    metaBox: "bg-white/80 ring-1 ring-[#ead8b4]/75",
  },
  college: {
    shell: "border-[#c6dbf6] border-l-[4px] border-l-[#1d4ed8] bg-[#f2f7fe] hover:border-[#9dc0ef]",
    title: "text-[#002554] hover:text-[#1d4ed8]",
    metaBox: "bg-white/85 ring-1 ring-[#c8dcf6]/80",
  },
  approved: {
    shell: "border-[#bde0cd] border-l-[4px] border-l-[#115740] bg-[#eef8f3] hover:border-[#8dc5a8]",
    title: "text-[#115740] hover:text-[#0b3e2d]",
    metaBox: "bg-white/85 ring-1 ring-[#bfe0cf]/80",
  },
  muted: {
    shell: "border-[#d2e2d8] border-l-[4px] border-l-slate-400 bg-[#f5faf7] hover:border-[#b4cbbd]",
    title: "text-slate-900 hover:text-[#115740]",
    metaBox: "bg-white/85 ring-1 ring-[#d2e2d8]",
  },
} satisfies Record<string, CardTone>;

/** 按审核状态与指导关系核验状态给出卡片柔彩底色（统一从色表取值） */
function cardToneFor(status: RegistrationStatus, hasUnconfirmedTeachers: boolean): CardTone {
  if (hasUnconfirmedTeachers || status === "REJECTED") return CARD_TONE_BY_KEY.danger;
  if (status === "PENDING") return CARD_TONE_BY_KEY.pending;
  if (status === "COLLEGE_REVIEW") return CARD_TONE_BY_KEY.college;
  if (status === "SCHOOL_FINAL" || status === "PROVINCE_ADVANCED" || status === "NATIONAL_ADVANCED") {
    return CARD_TONE_BY_KEY.approved;
  }
  return CARD_TONE_BY_KEY.muted;
}

const EXPANDED_TONES = {
  emerald: { box: "border-[#c7e3d4] bg-[#eef8f2]", heading: "text-[#115740]" },
  blue: { box: "border-[#cadcf6] bg-[#f1f6fe]", heading: "text-[#002554]" },
  amber: { box: "border-[#eedcb8] bg-[#fef9ee]", heading: "text-[#92400e]" },
  violet: { box: "border-[#dcd1f6] bg-[#f6f2fd]", heading: "text-[#5b21b6]" },
  teal: { box: "border-[#c5e2e5] bg-[#edf7f8]", heading: "text-[#0f5e6e]" },
} as const;

/** 展开区信息分组色块卡片：以柔和填充色区分报名/负责人/作品/师生信息 */
function DetailSectionCard({
  title,
  tone,
  children,
}: {
  title: string;
  tone: keyof typeof EXPANDED_TONES;
  children: ReactNode;
}) {
  const palette = EXPANDED_TONES[tone];
  return (
    <div className={`rounded-xl border px-4 py-3.5 ${palette.box}`}>
      <h3 className={`text-xs font-semibold tracking-wide ${palette.heading}`}>{title}</h3>
      {children}
    </div>
  );
}

function levelForStatus(status: RegistrationStatus): ReviewLevel | null {
  if (status === "PENDING") return "COLLEGE";
  if (status === "COLLEGE_REVIEW") return "SCHOOL";
  return null;
}

function show(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "—" : value;
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="t-label text-[11px] font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-all font-medium text-slate-800">{show(value)}</dd>
    </div>
  );
}

export function ReviewWorkbench({ data, from }: { data: ReviewListPage; from: string }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [batchLevel, setBatchLevel] = useState<ReviewLevel>("COLLEGE");
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState<ReviewBatchResult["failed"]>([]);
  const [preflights, setPreflights] = useState<Record<string, PreflightState>>({});
  const visibleIds = data.list.map((item) => item.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  async function approve(item: ReviewListItem) {
    const level = levelForStatus(item.status);
    if (!level) return;
    setPending(true);
    setError("");
    setNotice("");
    setFailed([]);
    try {
      const response = await fetch("/api/review/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: item.id, level }),
      });
      const result = await response.json() as ApiResponse<ReviewOperationResult | null>;
      if (!response.ok || result.code !== 0 || !result.data) throw new Error(result.message || "审核操作失败");
      setNotice(result.message);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "审核操作失败");
    } finally {
      setPending(false);
    }
  }

  async function rejectSingle(projectId: string, level: ReviewLevel, reason: string) {
    setPending(true);
    setError("");
    setNotice("");
    setFailed([]);
    try {
      const response = await fetch("/api/review/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, level, reason }),
      });
      const result = await response.json() as ApiResponse<ReviewOperationResult | null>;
      if (!response.ok || result.code !== 0 || !result.data) throw new Error(result.message || "驳回操作失败");
      setNotice(result.message);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "驳回操作失败");
    } finally {
      setPending(false);
    }
  }

  async function runBatch(action: "APPROVE" | "REJECT", reason?: string) {
    if (!selectedIds.length) return;
    setPending(true);
    setError("");
    setNotice("");
    setFailed([]);
    try {
      const response = await fetch("/api/review/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectIds: selectedIds, level: batchLevel, action, reason }),
      });
      const result = await response.json() as ApiResponse<ReviewBatchResult | null>;
      if (!response.ok || result.code !== 0 || !result.data) throw new Error(result.message || "批量审核失败");
      setNotice(result.message);
      setFailed(result.data.failed);
      setSelectedIds([]);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "批量审核失败");
    } finally {
      setPending(false);
    }
  }

  function confirmReject(reason: string) {
    if (!rejectTarget) return;
    const target = rejectTarget;
    setRejectTarget(null);
    if (target.kind === "single") {
      void rejectSingle(target.projectId, target.level, reason);
    } else {
      void runBatch("REJECT", reason);
    }
  }

  async function runPreflight(projectId: string) {
    setPreflights((current) => ({
      ...current,
      [projectId]: { loading: true, items: [], error: "" },
    }));
    try {
      const response = await fetch(`/api/review/${encodeURIComponent(projectId)}/preflight`, { cache: "no-store" });
      const result = await response.json() as ApiResponse<AuditPreflightIssue[] | null>;
      const items = result.data;
      if (!response.ok || result.code !== 0 || !items) throw new Error(result.message || "预检失败，请稍后重试");
      setPreflights((current) => ({
        ...current,
        [projectId]: { loading: false, items, error: "" },
      }));
    } catch (caught) {
      setPreflights((current) => ({
        ...current,
        [projectId]: {
          loading: false,
          items: [],
          error: caught instanceof Error ? caught.message : "预检失败，请稍后重试",
        },
      }));
    }
  }

  return (
    <div className="space-y-4">
      <BatchActionBar
        selectedCount={selectedIds.length}
        level={batchLevel}
        pending={pending}
        onLevelChange={setBatchLevel}
        onApprove={() => void runBatch("APPROVE")}
        onReject={() => setRejectTarget({ kind: "batch" })}
      />
      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>重试</Button>
        </div>
      ) : null}
      {notice ? <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}
      {failed.length ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <h2 className="font-medium">以下项目未处理</h2>
          <ul className="mt-2 space-y-1 text-xs leading-5">
            {failed.map((item) => (
              <li key={item.projectId}><span className="font-mono">{item.projectId}</span>：{item.message}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d2e2d8] bg-[#f5faf7] px-4 py-2.5">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              aria-label="全选当前页"
              checked={allVisibleSelected}
              disabled={!visibleIds.length || pending}
              onChange={(event) => {
                const checked = event.target.checked;
                setSelectedIds((current) => checked
                  ? [...new Set([...current, ...visibleIds])]
                  : current.filter((id) => !visibleIds.includes(id)));
              }}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            全选当前页
          </label>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>
              本页共 <span className="font-mono font-semibold text-[#115740] tabular-nums">{data.total}</span> 项
              <span className="mx-1.5 text-slate-300">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="inline-block h-2.5 w-[3px] rounded-full bg-red-600" />
                红框红线标示指导关系未确认，其余按状态着色
              </span>
            </span>
            {selectedIds.length ? (
              <Button variant="ghost" size="sm" type="button" onClick={() => setSelectedIds([])} >
                清除已选 {selectedIds.length} 项
              </Button>
            ) : null}
          </div>
        </div>

        {data.list.map((item) => {
          const level = levelForStatus(item.status);
          const open = expanded.includes(item.id);
          const preflight = preflights[item.id];
          const tone = cardToneFor(item.status, item.hasUnconfirmedTeachers);
          return (
            <article
              key={item.id}
              className={`overflow-hidden rounded-xl border shadow-sm transition duration-150 ${tone.shell}`}
            >
              <div className="flex flex-wrap items-start gap-3.5 px-5 py-4">
                <input
                  type="checkbox"
                  aria-label={`选择项目：${item.projectName}`}
                  checked={selectedIds.includes(item.id)}
                  disabled={pending}
                  onChange={(event) => setSelectedIds((current) => event.target.checked
                    ? [...current, item.id]
                    : current.filter((id) => id !== item.id))}
                  className="mt-1.5 h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={detailHref("/review", item.id, from)}
                      className={`font-display text-[17px] font-bold tracking-tight transition-colors ${tone.title}`}
                    >
                      {item.projectName}
                    </Link>
                    <StatusBadge status={item.status}>{registrationStatusLabels[item.status]}</StatusBadge>
                    {item.hasUnconfirmedTeachers ? (
                      <span className="rounded-full bg-red-100/80 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">指导关系未确认</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{item.competitionName} · {item.trackDisplay}</p>
                  <dl className={`mt-3 grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg px-3.5 py-2.5 text-xs md:grid-cols-4 ${tone.metaBox}`}>
                    <div>
                      <dt className="t-label text-[11px] text-slate-500">负责人</dt>
                      <dd className="mt-0.5 font-medium text-slate-800">{show(item.leaderName)} <span className="font-mono font-normal text-slate-500">({show(item.leaderStudentNo)})</span></dd>
                    </div>
                    <div>
                      <dt className="t-label text-[11px] text-slate-500">申报单位</dt>
                      <dd className="mt-0.5 font-medium text-slate-800">{show(item.applicationUnit)}</dd>
                    </div>
                    <div>
                      <dt className="t-label text-[11px] text-slate-500">提交时间</dt>
                      <dd className="mt-0.5 font-mono text-slate-700 tabular-nums">{item.submittedAt ? formatDateTime(item.submittedAt) : "—"}</dd>
                    </div>
                    <div>
                      <dt className="t-label text-[11px] text-slate-500">提交次数 / 批次</dt>
                      <dd className="mt-0.5 text-slate-700"><span className="font-mono font-medium tabular-nums">{item.submissionCount}</span> 次 · {show(item.batchName)}</dd>
                    </div>
                  </dl>
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:w-44">
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button variant="outline" size="sm" type="button" className="h-8 px-2.5 text-xs" disabled={preflight?.loading} onClick={() => void runPreflight(item.id)}>
                      {preflight?.loading ? "预检中…" : "重新预检"}
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs"
                      type="button"
                      onClick={() => setExpanded((current) => open ? current.filter((id) => id !== item.id) : [...current, item.id])} >
                      {open ? "收起信息" : "展开信息"}
                    </Button>
                  </div>
                  <Button asChild variant="outline" size="sm" className="group h-8 text-xs">
                    <Link href={detailHref("/review", item.id, from)}>
                      查看详情
                      <ButtonArrow />
                    </Link>
                  </Button>
                  {level ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button variant="default" size="sm" type="button" className="h-8 px-2.5 text-xs" disabled={pending} onClick={() => void approve(item)} >
                        {level === "COLLEGE" ? "学院通过" : "校级通过"}
                      </Button>
                      <Button variant="destructive" size="sm" type="button" className="h-8 px-2.5 text-xs" disabled={pending} onClick={() => setRejectTarget({ kind: "single", projectId: item.id, projectName: item.projectName, level })} >
                        驳回
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>

              {preflight && !preflight.loading ? (
                <div className="space-y-2 border-t border-slate-100 px-4 py-3">
                  {preflight.error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{preflight.error}</div> : null}
                  {!preflight.error && preflight.items.length === 0 ? <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">预检未发现问题</div> : null}
                  {preflight.items.map((issue) => (
                    <div
                      key={issue.code}
                      role={issue.level === "error" ? "alert" : "status"}
                      className={`rounded-lg border px-3 py-2 text-xs ${issue.level === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
                    >
                      <span className="mr-2 font-medium">{issue.level === "error" ? "错误" : "提醒"}</span>
                      {issue.message}
                    </div>
                  ))}
                </div>
              ) : null}

              {open ? (
                <div className="space-y-3 border-t border-[#d2e2d8] bg-[#f7fbf9] px-5 py-4 text-xs">
                  <DetailSectionCard title="报名信息" tone="emerald">
                    <dl className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
                      <Field label="批次" value={item.batchName} />
                      <Field label="分组" value={item.groupName} />
                      <Field label="赛道" value={item.trackDisplay} />
                      <Field label="申报单位" value={item.applicationUnit} />
                      <Field label="提交时间" value={item.submittedAt ? formatDateTime(item.submittedAt) : "—"} />
                      <Field label="提交次数" value={`${item.submissionCount} 次`} />
                      <Field label="赛事" value={item.competitionName} />
                      <Field label="状态" value={registrationStatusLabels[item.status]} />
                    </dl>
                  </DetailSectionCard>
                  <DetailSectionCard title="负责人信息" tone="blue">
                    <dl className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
                      <Field label="姓名" value={item.leaderName} />
                      <Field label="学号" value={item.leaderStudentNo} />
                      <Field label="年级" value={item.grade} />
                      <Field label="入学年份" value={item.enrollmentYear} />
                      <Field label="毕业年份" value={item.graduationYear} />
                      <Field label="培养阶段" value={item.educationStage} />
                      <Field label="培养单位" value={item.trainingUnit} />
                      <Field label="性别" value={item.gender} />
                      <Field label="民族" value={item.ethnicity} />
                      <Field label="手机号" value={item.phone} />
                      <Field label="邮箱" value={item.email} />
                      <Field label="奖金领款人" value={item.payeeName} />
                    </dl>
                  </DetailSectionCard>
                  <DetailSectionCard title="作品信息" tone="amber">
                    <dl className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
                      <Field label="作品" value={item.workName} />
                      <Field label="作品形式" value={item.workForm} />
                      <Field label="作品类别" value={item.workCategory} />
                      <Field label="作品组别" value={item.workGroup} />
                      <Field label="申报者姓名（集体名称）" value={item.applicantName} />
                      <Field label="评分（只读）" value={item.score} />
                    </dl>
                  </DetailSectionCard>
                  <div className="grid gap-3 md:grid-cols-2">
                    <DetailSectionCard title="指导老师（多人）" tone="violet">
                      <p className="mt-2 whitespace-pre-line break-all leading-6 text-slate-700">{show(item.teachers)}</p>
                    </DetailSectionCard>
                    <DetailSectionCard title="团队成员（多人）" tone="teal">
                      <p className="mt-2 whitespace-pre-line break-all leading-6 text-slate-700">{show(item.members)}</p>
                    </DetailSectionCard>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
        {data.list.length === 0 ? (
          <div className="card px-4 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">当前筛选条件下没有待审项目</p>
            <p className="mt-2 text-sm text-slate-500">可以清除筛选条件，或等新的报名提交后再来核对。</p>
            <Link href="/review" className="mt-4 inline-flex h-9 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-xs text-slate-700 hover:bg-slate-50">清除筛选</Link>
          </div>
        ) : null}
      </section>

      {rejectTarget ? (
        <RejectDialog
          title={rejectTarget.kind === "single" ? `驳回项目：${rejectTarget.projectName}` : `批量驳回 ${selectedIds.length} 个项目`}
          pending={pending}
          onCancel={() => setRejectTarget(null)}
          onConfirm={confirmReject}
        />
      ) : null}
    </div>
  );
}
