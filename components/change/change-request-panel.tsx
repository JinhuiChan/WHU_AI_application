"use client";

import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CHANGE_FIELD_LABELS,
  CHANGE_STATUS_LABELS,
  CHANGE_TYPES,
  CHANGE_TYPE_LABELS,
  type ChangePanelData,
  type ChangeRequestView,
  type ChangeType,
} from "@/types/change";
import { formatDateTime } from "@/lib/presentation";

type Props = {
  projectId: string;
  data: ChangePanelData;
};

const fieldClass =
  "mt-1.5 h-10 w-full rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition-colors placeholder:text-[#7c8e85] focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 disabled:cursor-not-allowed disabled:border-[#c8d7cf] disabled:bg-[#f1f6f3] disabled:text-[#5c6c65]";

// 每个变更类型允许填写的字段（与 lib/change.ts 白名单保持一致）
const EDITABLE_FIELDS: Record<ChangeType, string[]> = {
  PROJECT_NAME: ["name"],
  TRACK: ["trackId", "groupName", "categoryName"],
  MEMBER: ["name", "personNo", "phone", "email", "major", "trainingUnit"],
  TEACHER: ["staffNo", "name", "unit", "title", "phone", "email"],
  CONTACT: ["phone", "email"],
  LEADER: [],
  PAYEE: [],
};

const SELECTOR_LABEL: Partial<Record<ChangeType, string>> = {
  MEMBER: "选择成员",
  TEACHER: "选择指导教师",
  CONTACT: "选择成员",
  LEADER: "选择新负责人",
  PAYEE: "选择新领款人",
};

function statusTone(status: ChangeRequestView["status"]) {
  if (status === "APPROVED") return "border border-[#cde0d5] bg-[#eef5f1] text-[#115740]";
  if (status === "REJECTED") return "border border-[#e5b8bd] bg-[#fdf2f3] text-[#9e2a35]";
  return "border border-[#ead7af] bg-[#fdf8ee] text-[#8a651b]";
}

export function ChangeRequestPanel({ projectId, data }: Props) {
  const router = useRouter();
  const [type, setType] = useState<ChangeType | "">("");
  const [selector, setSelector] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const needsSelector = type ? Boolean(SELECTOR_LABEL[type]) : false;
  const editableFields = type ? EDITABLE_FIELDS[type] : [];

  const selectorOptions = useMemo(() => {
    if (type === "TEACHER") return data.teachers.map((item) => ({ id: item.id, label: `${item.name}（${item.staffNo || "无工号"}）` }));
    if (type === "MEMBER" || type === "CONTACT" || type === "LEADER" || type === "PAYEE") {
      return data.members.map((item) => ({ id: item.id, label: `${item.name}（${item.personNo || "无学号"}）` }));
    }
    return [];
  }, [type, data.members, data.teachers]);

  function resetForm() {
    setType("");
    setSelector("");
    setValues({});
    setReason("");
    setError("");
  }

  function onSelectorChange(nextId: string) {
    setSelector(nextId);
    if (type === "TEACHER") {
      const teacher = data.teachers.find((item) => item.id === nextId);
      setValues(teacher ? { staffNo: teacher.staffNo, name: teacher.name, unit: teacher.unit, title: teacher.title, phone: teacher.phone, email: teacher.email } : {});
    } else if (type === "MEMBER" || type === "CONTACT") {
      const member = data.members.find((item) => item.id === nextId);
      setValues(member ? { name: member.name, personNo: member.personNo, phone: member.phone, email: member.email, major: member.major, trainingUnit: member.trainingUnit } : {});
    }
  }

  async function submit() {
    setError("");
    if (!type) {
      setError("请选择变更类型");
      return;
    }
    if (needsSelector && !selector) {
      setError(`请${SELECTOR_LABEL[type] ?? "选择对象"}`);
      return;
    }
    if (reason.trim().length === 0) {
      setError("请填写变更理由");
      return;
    }
    const newValues: Record<string, string> = { ...values };
    if (type === "MEMBER" || type === "TEACHER") newValues[type === "MEMBER" ? "memberId" : "teacherId"] = selector;
    if (type === "CONTACT") newValues.memberId = selector;
    if (type === "LEADER" || type === "PAYEE") newValues.memberId = selector;

    setSubmitting(true);
    try {
      const response = await fetch("/api/change/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, type, newValues, reason: reason.trim() }),
      });
      const result = (await response.json()) as { code: number; message: string };
      if (!response.ok || result.code !== 0) {
        setError(result.message || "提交失败");
        return;
      }
      resetForm();
      router.refresh();
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-[#0f1d18]">变更申请</h2>
          <p className="mt-0.5 text-xs text-[#54635d]">
            {data.canRequest
              ? "当前不在自主修改窗口，调整核心信息需提交申请由管理员审核"
              : "当前处于可自主修改窗口，请直接点击顶部「编辑报名表」，无需提交申请"}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
            data.canRequest
              ? "border border-[#ead7af] bg-[#fdf8ee] text-[#8a651b]"
              : "border border-[#cde0d5] bg-[#eef5f1] text-[#115740]"
          }`}
        >
          {data.canRequest ? "审批变更模式" : "自主修订窗口"}
        </span>
      </div>
      <div aria-hidden="true" className="mt-4 h-px bg-[#d5e2db]/70" />

      {data.canRequest ? (
        <div className="mt-4 grid gap-4 rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-4 md:grid-cols-3">
          <label className="text-sm font-medium text-[#24362f]">
            变更类型
            <select
              className={fieldClass}
              value={type}
              onChange={(event) => {
                setType(event.target.value as ChangeType | "");
                setSelector("");
                setValues({});
              }}
            >
              <option value="">请选择</option>
              {CHANGE_TYPES.map((item) => (
                <option key={item} value={item}>{CHANGE_TYPE_LABELS[item]}</option>
              ))}
            </select>
          </label>

          {needsSelector ? (
            <label className="text-sm font-medium text-[#24362f]">
              {SELECTOR_LABEL[type as ChangeType]}
              <select className={fieldClass} value={selector} onChange={(event) => onSelectorChange(event.target.value)}>
                <option value="">请选择</option>
                {selectorOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </label>
          ) : null}

          {type === "TRACK" ? (
            <label className="text-sm font-medium text-[#24362f]">
              新赛道
              <select
                className={fieldClass}
                value={values.trackId ?? ""}
                onChange={(event) => setValues((prev) => ({ ...prev, trackId: event.target.value }))}
              >
                <option value="">请选择</option>
                {data.tracks.map((track) => (
                  <option key={track.id} value={track.id}>{track.name}</option>
                ))}
              </select>
            </label>
          ) : null}

          {editableFields
            .filter((field) => !(type === "TRACK" && field === "trackId"))
            .map((field) => (
              <label key={field} className="text-sm font-medium text-[#24362f]">
                {CHANGE_FIELD_LABELS[field] ?? field}
                <input
                  className={fieldClass}
                  value={values[field] ?? ""}
                  placeholder={field === "name" && type === "PROJECT_NAME" ? data.current.name : ""}
                  onChange={(event) => setValues((prev) => ({ ...prev, [field]: event.target.value }))}
                />
              </label>
            ))}

          <label className="text-sm font-medium text-[#24362f] md:col-span-3">
            变更理由（必填，不超过 200 字）
            <textarea
              className="mt-1.5 min-h-20 w-full rounded-lg border border-[#7f9384] bg-white px-3 py-2 text-sm text-[#0f1d18] outline-none transition-colors placeholder:text-[#7c8e85] focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25"
              value={reason}
              maxLength={200}
              placeholder="请简明说明申请调整的具体事由"
              onChange={(event) => setReason(event.target.value)}
            />
          </label>

          {error ? <p role="alert" className="text-xs font-medium text-[#9e2a35] md:col-span-3">{error}</p> : null}

          <div className="md:col-span-3">
            <Button
              variant="default"
              size="default"
              type="button"
              onClick={submit}
              disabled={submitting}
              className="rounded-full bg-[#115740] px-6 text-white hover:bg-[#0d4633] active:scale-[0.98] active:bg-[#093526] focus-visible:ring-[#115740]/25 disabled:opacity-60"
            >
              {submitting ? "提交中…" : "提交变更申请"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-5">
        <h3 className="t-label text-xs font-semibold text-[#54635d]">申请记录（{data.requests.length}）</h3>
        {data.requests.length === 0 ? (
          <p className="mt-2.5 text-sm text-[#5c6c65] inline-empty">暂无变更申请</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {data.requests.map((item) => (
              <li key={item.id} className="rounded-xl border border-[#d5e2db] bg-[#f8fbf9] px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#0f1d18]">
                      {CHANGE_TYPE_LABELS[item.type as ChangeType] ?? item.type}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusTone(item.status)}`}>
                      {CHANGE_STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  <span className="text-xs text-[#6c7e76] tabular-nums">{formatDateTime(item.createdAt)}</span>
                </div>
                <p className="mt-1.5 text-xs text-[#43554d]">变更理由：{item.reason}</p>
                {item.collegeReason || item.schoolReason ? (
                  <p className="mt-1 text-xs font-medium text-[#9e2a35]">驳回理由：{item.schoolReason || item.collegeReason}</p>
                ) : null}
                {item.cooldownUntil ? (
                  <p className="mt-1 text-xs text-[#8a651b] tabular-nums">该字段可再次提交时间：{formatDateTime(item.cooldownUntil)}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
