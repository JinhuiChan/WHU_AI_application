"use client";

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
  "mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-blue-600";

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
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-700";
  if (status === "REJECTED") return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
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
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">变更申请</h2>
        <span className="text-xs text-slate-500">
          {data.canRequest ? "当前不在自主修改窗口，需提交申请由管理员审核" : "当前处于可自主修改窗口，请直接编辑，无需申请"}
        </span>
      </div>

      {data.canRequest ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-xs text-slate-600">
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
            <label className="text-xs text-slate-600">
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
            <label className="text-xs text-slate-600">
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
              <label key={field} className="text-xs text-slate-600">
                {CHANGE_FIELD_LABELS[field] ?? field}
                <input
                  className={fieldClass}
                  value={values[field] ?? ""}
                  placeholder={field === "name" && type === "PROJECT_NAME" ? data.current.name : ""}
                  onChange={(event) => setValues((prev) => ({ ...prev, [field]: event.target.value }))}
                />
              </label>
            ))}

          <label className="text-xs text-slate-600 md:col-span-3">
            变更理由（必填，不超过 200 字）
            <textarea
              className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-blue-600"
              value={reason}
              maxLength={200}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>

          {error ? <p className="text-xs text-red-600 md:col-span-3">{error}</p> : null}

          <div className="md:col-span-3">
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "提交中…" : "提交变更申请"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <h3 className="text-xs font-medium text-slate-500">申请记录（{data.requests.length}）</h3>
        {data.requests.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">暂无变更申请</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {data.requests.map((item) => (
              <li key={item.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900">{CHANGE_TYPE_LABELS[item.type as ChangeType] ?? item.type}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusTone(item.status)}`}>{CHANGE_STATUS_LABELS[item.status]}</span>
                  <span className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">理由：{item.reason}</p>
                {item.collegeReason || item.schoolReason ? (
                  <p className="mt-1 text-xs text-red-700">驳回理由：{item.schoolReason || item.collegeReason}</p>
                ) : null}
                {item.cooldownUntil ? (
                  <p className="mt-1 text-xs text-amber-700">该字段可再次提交时间：{formatDateTime(item.cooldownUntil)}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
