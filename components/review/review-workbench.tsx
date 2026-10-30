"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RegistrationStatus, ReviewLevel } from "@prisma/client";
import { BatchActionBar } from "@/components/review/batch-action-bar";
import { RejectDialog } from "@/components/review/reject-dialog";
import { formatDateTime, registrationStatusLabels } from "@/lib/presentation";
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

function levelForStatus(status: RegistrationStatus): ReviewLevel | null {
  if (status === "PENDING") return "COLLEGE";
  if (status === "COLLEGE_REVIEW") return "SCHOOL";
  return null;
}

function show(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "—" : value;
}

function statusTone(status: RegistrationStatus) {
  if (status === "SCHOOL_FINAL") return "bg-emerald-50 text-emerald-700";
  if (status === "REJECTED") return "bg-red-100 text-red-700";
  if (status === "PENDING" || status === "COLLEGE_REVIEW") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

export function ReviewWorkbench({ data }: { data: ReviewListPage }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchLevel, setBatchLevel] = useState<ReviewLevel>("COLLEGE");
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState<ReviewBatchResult["failed"]>([]);
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
      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
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

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[5600px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="w-12 px-3 py-3">
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
                </th>
                <th className="px-3 py-3 font-medium">1. 提交时间</th>
                <th className="px-3 py-3 font-medium">2. 批次</th>
                <th className="px-3 py-3 font-medium">3. 申报单位</th>
                <th className="px-3 py-3 font-medium">4. 分组</th>
                <th className="px-3 py-3 font-medium">5. 负责人（学号）</th>
                <th className="px-3 py-3 font-medium">6. 负责人姓名</th>
                <th className="px-3 py-3 font-medium">7. 年级</th>
                <th className="px-3 py-3 font-medium">8. 入学年份</th>
                <th className="px-3 py-3 font-medium">9. 毕业年份</th>
                <th className="px-3 py-3 font-medium">10. 培养阶段</th>
                <th className="px-3 py-3 font-medium">11. 培养单位</th>
                <th className="px-3 py-3 font-medium">12. 性别</th>
                <th className="px-3 py-3 font-medium">13. 民族</th>
                <th className="px-3 py-3 font-medium">14. 奖金领款人</th>
                <th className="px-3 py-3 font-medium">15. 赛道</th>
                <th className="px-3 py-3 font-medium">16. 项目名称</th>
                <th className="px-3 py-3 font-medium">17. 作品</th>
                <th className="px-3 py-3 font-medium">18. 作品形式</th>
                <th className="px-3 py-3 font-medium">19. 作品类别</th>
                <th className="px-3 py-3 font-medium">20. 作品组别</th>
                <th className="px-3 py-3 font-medium">21. 申报者姓名（集体名称）</th>
                <th className="px-3 py-3 font-medium">22. 申请人手机号</th>
                <th className="px-3 py-3 font-medium">23. 申报者邮箱</th>
                <th className="px-3 py-3 font-medium">24. 评分（只读）</th>
                <th className="px-3 py-3 font-medium">25. 状态</th>
                <th className="px-3 py-3 font-medium">26. 指导老师（多人）</th>
                <th className="px-3 py-3 font-medium">27. 团队成员（多人）</th>
                <th className="px-3 py-3 font-medium">提交次数</th>
                <th className="px-3 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.list.map((item) => {
                const level = levelForStatus(item.status);
                return (
                  <tr
                    key={item.id}
                    title={item.hasUnconfirmedTeachers ? "存在未确认指导关系" : undefined}
                    className={`align-top ${item.hasUnconfirmedTeachers ? "bg-red-50 text-red-900 hover:bg-red-100/70" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    <td className="px-3 py-4">
                      <input
                        type="checkbox"
                        aria-label={`选择项目：${item.projectName}`}
                        checked={selectedIds.includes(item.id)}
                        disabled={pending}
                        onChange={(event) => setSelectedIds((current) => event.target.checked
                          ? [...current, item.id]
                          : current.filter((id) => id !== item.id))}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">{item.submittedAt ? formatDateTime(item.submittedAt) : "—"}</td>
                    <td className="px-3 py-4">{show(item.batchName)}</td>
                    <td className="min-w-40 px-3 py-4">{show(item.applicationUnit)}</td>
                    <td className="min-w-32 px-3 py-4">{show(item.groupName)}</td>
                    <td className="whitespace-nowrap px-3 py-4">{show(item.leaderStudentNo)}</td>
                    <td className="min-w-24 px-3 py-4">{show(item.leaderName)}</td>
                    <td className="px-3 py-4">{show(item.grade)}</td>
                    <td className="px-3 py-4">{show(item.enrollmentYear)}</td>
                    <td className="px-3 py-4">{show(item.graduationYear)}</td>
                    <td className="min-w-28 px-3 py-4">{show(item.educationStage)}</td>
                    <td className="min-w-40 px-3 py-4">{show(item.trainingUnit)}</td>
                    <td className="px-3 py-4">{show(item.gender)}</td>
                    <td className="px-3 py-4">{show(item.ethnicity)}</td>
                    <td className="min-w-24 px-3 py-4">{show(item.payeeName)}</td>
                    <td className="min-w-56 px-3 py-4">{item.trackDisplay}</td>
                    <td className="min-w-64 px-3 py-4">
                      <Link href={`/review/${item.id}`} className="font-medium text-blue-700 hover:underline">{item.projectName}</Link>
                      <span className="mt-1 block text-[11px] text-slate-400">{item.competitionName}</span>
                    </td>
                    <td className="min-w-48 max-w-64 break-all px-3 py-4">{show(item.workName)}</td>
                    <td className="min-w-28 px-3 py-4">{show(item.workForm)}</td>
                    <td className="min-w-28 px-3 py-4">{show(item.workCategory)}</td>
                    <td className="min-w-28 px-3 py-4">{show(item.workGroup)}</td>
                    <td className="min-w-32 px-3 py-4">{show(item.applicantName)}</td>
                    <td className="whitespace-nowrap px-3 py-4">{show(item.phone)}</td>
                    <td className="min-w-44 break-all px-3 py-4">{show(item.email)}</td>
                    <td className="px-3 py-4">{show(item.score)}</td>
                    <td className="min-w-32 px-3 py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 ${statusTone(item.status)}`}>{registrationStatusLabels[item.status]}</span>
                      {item.hasUnconfirmedTeachers ? <span className="mt-2 block font-medium text-red-700">指导关系未确认</span> : null}
                    </td>
                    <td className="px-3 py-4"><div className="max-h-36 min-w-80 overflow-y-auto whitespace-pre-line break-all leading-5">{show(item.teachers)}</div></td>
                    <td className="px-3 py-4"><div className="max-h-36 min-w-96 overflow-y-auto whitespace-pre-line break-all leading-5">{show(item.members)}</div></td>
                    <td className="px-3 py-4 text-center font-medium">{item.submissionCount}</td>
                    <td className="px-3 py-4">
                      {level ? (
                        <div className="flex min-w-36 flex-col gap-2">
                          <button type="button" disabled={pending} onClick={() => void approve(item)} className="rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
                            {level === "COLLEGE" ? "学院通过" : "校级通过"}
                          </button>
                          <button type="button" disabled={pending} onClick={() => setRejectTarget({ kind: "single", projectId: item.id, projectName: item.projectName, level })} className="rounded-md border border-red-300 bg-white px-3 py-2 text-red-700 hover:bg-red-50 disabled:opacity-50">驳回</button>
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                );
              })}
              {data.list.length === 0 ? <tr><td colSpan={30} className="px-4 py-12 text-center text-sm text-slate-500">暂无符合条件的项目</td></tr> : null}
            </tbody>
          </table>
        </div>
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
