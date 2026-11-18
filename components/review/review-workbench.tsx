"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RegistrationStatus, ReviewLevel } from "@prisma/client";
import { detailHref } from "@/components/data/list-link";
import { BatchActionBar } from "@/components/review/batch-action-bar";
import { RejectDialog } from "@/components/review/reject-dialog";
import { Button, ButtonArrow } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
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

const REVIEW_CARD_SURFACE = {
  abnormal: "border-[#eccacd] bg-[#fdf4f5] hover:border-[#dcadb1]",
  pending: "border-[#e8d5ad] bg-[#fdf8ee] hover:border-[#d5bb82]",
  collegeReview: "border-[#badec9] bg-[#eef5f1] hover:border-[#8ec5a5]",
  approved: "border-[#cfe3d8] bg-[#f7fbf8] hover:border-[#a7cbb7]",
  muted: "border-[#d5e2db] bg-[#f3f7f5] hover:border-[#b5c9be]",
} as const;

function reviewCardClasses(status: RegistrationStatus, hasUnconfirmedTeachers: boolean): string {
  if (hasUnconfirmedTeachers) {
    return `${REVIEW_CARD_SURFACE.abnormal} border-l-[3px] border-l-[#9e2a35]`;
  }
  if (status === "REJECTED") return REVIEW_CARD_SURFACE.abnormal;
  if (status === "PENDING") return REVIEW_CARD_SURFACE.pending;
  if (status === "COLLEGE_REVIEW") return REVIEW_CARD_SURFACE.collegeReview;
  if (status === "SCHOOL_FINAL" || status === "PROVINCE_ADVANCED" || status === "NATIONAL_ADVANCED") {
    return REVIEW_CARD_SURFACE.approved;
  }
  return REVIEW_CARD_SURFACE.muted;
}

function levelForStatus(status: RegistrationStatus): ReviewLevel | null {
  if (status === "PENDING") return "COLLEGE";
  if (status === "COLLEGE_REVIEW") return "SCHOOL";
  return null;
}

function show(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "未填" : value;
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="t-label text-xs text-[#64746e]">{label}</dt>
      <dd className="mt-0.5 break-all text-xs text-[#162620]">{show(value)}</dd>
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
      const result = (await response.json()) as ApiResponse<ReviewOperationResult | null>;
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
      const result = (await response.json()) as ApiResponse<ReviewOperationResult | null>;
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
      const result = (await response.json()) as ApiResponse<ReviewBatchResult | null>;
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
      const result = (await response.json()) as ApiResponse<AuditPreflightIssue[] | null>;
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
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>
            重试
          </Button>
        </div>
      ) : null}
      {notice ? (
        <div
          role="status"
          className="rounded-xl border border-[#badec9] bg-[#eef5f1] px-4 py-3 text-sm text-[#115740]"
        >
          {notice}
        </div>
      ) : null}
      {failed.length ? (
        <section className="rounded-xl border border-[#ead4a8] bg-[#fdf6e7] px-4 py-3 text-sm text-[#854d0e]">
          <h2 className="font-medium">以下项目未处理</h2>
          <ul className="mt-2 space-y-1 text-xs leading-5">
            {failed.map((item) => (
              <li key={item.projectId}>
                <span className="font-mono">{item.projectId}</span>：{item.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-0.5 text-xs text-[#54635d]">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#1b2b25]">
            <input
              type="checkbox"
              aria-label="全选当前页"
              checked={allVisibleSelected}
              disabled={!visibleIds.length || pending}
              onChange={(event) => {
                const checked = event.target.checked;
                setSelectedIds((current) =>
                  checked
                    ? [...new Set([...current, ...visibleIds])]
                    : current.filter((id) => !visibleIds.includes(id)),
                );
              }}
              className="h-4 w-4 rounded border-[#7f9384] text-[#115740] focus:ring-[#115740]/20"
            />
            全选当前页
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <span>
              共 <span className="font-semibold text-[#0e1d17] tabular-nums">{data.total}</span> 项
              <span className="mx-1.5 text-[#9fb0a7]">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="inline-block h-2.5 w-[3px] rounded-full bg-[#9e2a35]" />
                朱砂竖线标示指导关系未确认
              </span>
            </span>
            {selectedIds.length ? (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="h-8 px-3 text-[#115740] hover:bg-[#eef5f1]"
                onClick={() => setSelectedIds([])}
              >
                清除已选 {selectedIds.length} 项
              </Button>
            ) : null}
          </div>
        </div>

        {data.list.map((item) => {
          const level = levelForStatus(item.status);
          const open = expanded.includes(item.id);
          const preflight = preflights[item.id];
          return (
            <article
              key={item.id}
              className={`rounded-xl border transition-colors duration-150 ${reviewCardClasses(item.status, item.hasUnconfirmedTeachers)}`}
            >
              <div className="px-5 pb-3 pt-4">
                <div className="flex flex-wrap items-start gap-3.5">
                  <input
                    type="checkbox"
                    aria-label={`选择项目：${item.projectName}`}
                    checked={selectedIds.includes(item.id)}
                    disabled={pending}
                    onChange={(event) =>
                      setSelectedIds((current) =>
                        event.target.checked
                          ? [...current, item.id]
                          : current.filter((id) => id !== item.id),
                      )
                    }
                    className="mt-1.5 h-4 w-4 rounded border-[#7f9384] text-[#115740] focus:ring-[#115740]/20"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={detailHref("/review", item.id, from)}
                        className="font-display text-[17px] font-bold tracking-tight text-[#0e1d17] transition-colors hover:text-[#115740]"
                      >
                        {item.projectName}
                      </Link>
                      <StatusBadge status={item.status}>{registrationStatusLabels[item.status]}</StatusBadge>
                      {item.hasUnconfirmedTeachers ? (
                        <span className="rounded-full bg-[#faeaea] px-2.5 py-0.5 text-xs font-medium text-[#9e2a35] ring-1 ring-[#eccacd]">
                          指导关系未确认
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[#54635d]">
                      {item.competitionName} · {item.trackDisplay}
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs md:grid-cols-4">
                      <div>
                        <dt className="t-label text-xs text-[#64746e]">负责人</dt>
                        <dd className="mt-0.5 font-medium text-[#162620]">
                          {show(item.leaderName)}{" "}
                          <span className="font-normal text-[#5b6a64] tabular-nums">({show(item.leaderStudentNo)})</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="t-label text-xs text-[#64746e]">申报单位</dt>
                        <dd className="mt-0.5 font-medium text-[#162620]">{show(item.applicationUnit)}</dd>
                      </div>
                      <div>
                        <dt className="t-label text-xs text-[#64746e]">提交时间</dt>
                        <dd className="mt-0.5 text-[#162620] tabular-nums">
                          {item.submittedAt ? formatDateTime(item.submittedAt) : "未提交"}
                        </dd>
                      </div>
                      <div>
                        <dt className="t-label text-xs text-[#64746e]">提交次数 / 批次</dt>
                        <dd className="mt-0.5 text-[#162620] tabular-nums">
                          {item.submissionCount} 次 · {show(item.batchName)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  {level ? (
                    <div className="flex shrink-0 items-center gap-2 pt-0.5">
                      <Button
                        size="sm"
                        type="button"
                        className="h-8 bg-[#115740] px-4 text-xs text-white hover:bg-[#0d4633]"
                        disabled={pending}
                        onClick={() => void approve(item)}
                      >
                        {level === "COLLEGE" ? "学院通过" : "校级通过"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        type="button"
                        className="h-8 border-red-200/90 bg-white/90 px-3.5 text-xs"
                        disabled={pending}
                        onClick={() =>
                          setRejectTarget({
                            kind: "single",
                            projectId: item.id,
                            projectName: item.projectName,
                            level,
                          })
                        }
                      >
                        驳回
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="ml-7 mt-3 flex flex-wrap items-center gap-3 border-t border-black/[0.06] pt-2.5 text-xs font-medium text-[#3f524a]">
                  <button
                    type="button"
                    disabled={preflight?.loading}
                    onClick={() => void runPreflight(item.id)}
                    className="inline-flex h-7 items-center rounded-full px-2.5 transition-colors hover:bg-white/80 hover:text-[#115740] disabled:opacity-50"
                  >
                    {preflight?.loading ? "预检中…" : "重新预检"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((current) =>
                        open ? current.filter((id) => id !== item.id) : [...current, item.id],
                      )
                    }
                    className="inline-flex h-7 items-center rounded-full px-2.5 transition-colors hover:bg-white/80 hover:text-[#115740]"
                  >
                    {open ? "收起信息 ▴" : "展开信息 ▾"}
                  </button>
                  <Link
                    href={detailHref("/review", item.id, from)}
                    className="group ml-auto inline-flex h-7 items-center gap-1 rounded-full px-2.5 font-semibold text-[#115740] transition-colors hover:bg-white/80 hover:underline"
                  >
                    查看详情
                    <ButtonArrow />
                  </Link>
                </div>
              </div>

              {preflight && !preflight.loading ? (
                <div className="space-y-2 border-t border-black/[0.06] bg-white/70 px-4 py-3">
                  {preflight.error ? (
                    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {preflight.error}
                    </div>
                  ) : null}
                  {!preflight.error && preflight.items.length === 0 ? (
                    <div role="status" className="rounded-lg border border-[#badec9] bg-[#eef5f1] px-3 py-2 text-xs text-[#115740]">
                      预检未发现问题
                    </div>
                  ) : null}
                  {preflight.items.map((issue) => (
                    <div
                      key={issue.code}
                      role={issue.level === "error" ? "alert" : "status"}
                      className={`rounded-lg border px-3 py-2 text-xs ${
                        issue.level === "error"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-[#ead4a8] bg-[#fdf6e7] text-[#854d0e]"
                      }`}
                    >
                      <span className="mr-2 font-medium">{issue.level === "error" ? "错误" : "提醒"}</span>
                      {issue.message}
                    </div>
                  ))}
                </div>
              ) : null}

              {open ? (
                <div className="space-y-5 rounded-b-xl border-t border-black/[0.06] bg-white/85 px-5 py-4 text-xs">
                  <div>
                    <h3 className="font-semibold text-[#0e1d17]">报名信息</h3>
                    <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
                      <Field label="批次" value={item.batchName} />
                      <Field label="分组" value={item.groupName} />
                      <Field label="赛道" value={item.trackDisplay} />
                      <Field label="申报单位" value={item.applicationUnit} />
                      <Field label="提交时间" value={item.submittedAt ? formatDateTime(item.submittedAt) : "未提交"} />
                      <Field label="提交次数" value={`${item.submissionCount} 次`} />
                      <Field label="赛事" value={item.competitionName} />
                      <Field label="状态" value={registrationStatusLabels[item.status]} />
                    </dl>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#0e1d17]">负责人信息</h3>
                    <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
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
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#0e1d17]">作品信息</h3>
                    <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
                      <Field label="作品" value={item.workName} />
                      <Field label="作品形式" value={item.workForm} />
                      <Field label="作品类别" value={item.workCategory} />
                      <Field label="作品组别" value={item.workGroup} />
                      <Field label="申报者姓名（集体名称）" value={item.applicantName} />
                      <Field label="评分（只读）" value={item.score} />
                    </dl>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="font-semibold text-[#0e1d17]">指导老师（多人）</h3>
                      <p className="mt-2 whitespace-pre-line break-all leading-6 text-[#33433d]">{show(item.teachers)}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#0e1d17]">团队成员（多人）</h3>
                      <p className="mt-2 whitespace-pre-line break-all leading-6 text-[#33433d]">{show(item.members)}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
        {data.list.length === 0 ? (
          <div className="card">
            <EmptyState
              title="当前筛选条件下没有待审项目"
              description="可以清除筛选条件，或等待新的报名提交后再来核对。"
              action={{ href: "/review", label: "清除筛选" }}
            />
          </div>
        ) : null}
      </section>

      {rejectTarget ? (
        <RejectDialog
          title={
            rejectTarget.kind === "single"
              ? `驳回项目：${rejectTarget.projectName}`
              : `批量驳回 ${selectedIds.length} 个项目`
          }
          pending={pending}
          onCancel={() => setRejectTarget(null)}
          onConfirm={confirmReject}
        />
      ) : null}
    </div>
  );
}
