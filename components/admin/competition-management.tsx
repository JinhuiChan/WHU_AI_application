"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Attachment = { id: string; title: string; kind: string; fileName: string; filePath: string };
type WindowValue = { startAt: string; endAt: string; enabled: boolean } | null;
type Props = {
  competition: { id: string; name: string; organizer: string | null; description: string | null };
  attachments: Attachment[];
  initialWindow: WindowValue;
};

const fieldClass = "mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600";

function localInput(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function CompetitionManagement({ competition, attachments, initialWindow }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState({ name: competition.name, organizer: competition.organizer ?? "", description: competition.description ?? "" });
  const [windowForm, setWindowForm] = useState({
    startAt: localInput(initialWindow?.startAt),
    endAt: localInput(initialWindow?.endAt),
    enabled: initialWindow?.enabled ?? false,
  });
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function request(url: string, options: RequestInit, success: string) {
    setError("");
    setMessage("");
    try {
      const response = await fetch(url, options);
      const result = await response.json() as { code: number; message: string };
      if (!response.ok || result.code !== 0) throw new Error(result.message || "操作失败");
      setMessage(success);
      router.refresh();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "操作失败");
      return false;
    }
  }

  async function saveWindow() {
    if (!windowForm.startAt || !windowForm.endAt) {
      setError("请选择开始时间和截止时间");
      return;
    }
    setPending("window");
    await request(`/api/admin/competitions/${competition.id}/window`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startAt: new Date(windowForm.startAt).toISOString(),
        endAt: new Date(windowForm.endAt).toISOString(),
        enabled: windowForm.enabled,
      }),
    }, "报名设置已保存并生效");
    setPending("");
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-blue-200 bg-blue-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-sm font-semibold text-slate-900">管理员操作区</h2><p className="mt-1 text-xs text-slate-600">赛事信息、公开材料和报名窗口保存后立即生效。</p></div>
          <button type="button" onClick={() => setEditOpen(true)} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white">编辑赛事信息</button>
        </div>
        {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p role="alert" className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">报名设置</h2>
        <div className="mt-4 grid items-end gap-3 md:grid-cols-4">
          <label className="text-xs text-slate-600">开始时间<input type="datetime-local" className={fieldClass} value={windowForm.startAt} onChange={(event) => setWindowForm({ ...windowForm, startAt: event.target.value })} /></label>
          <label className="text-xs text-slate-600">截止时间<input type="datetime-local" className={fieldClass} value={windowForm.endAt} onChange={(event) => setWindowForm({ ...windowForm, endAt: event.target.value })} /></label>
          <label className="flex h-10 items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={windowForm.enabled} onChange={(event) => setWindowForm({ ...windowForm, enabled: event.target.checked })} className="h-4 w-4" />{windowForm.enabled ? "开放报名" : "关闭报名"}</label>
          <button type="button" disabled={pending === "window"} onClick={() => void saveWindow()} className="h-10 rounded-md bg-blue-600 px-4 text-sm text-white disabled:opacity-60">{pending === "window" ? "保存中…" : "保存报名设置"}</button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">赛事文件</h2>
        <form
          className="mt-4 grid items-end gap-3 rounded-md bg-slate-50 p-4 md:grid-cols-[1fr_160px_1fr_auto]"
          onSubmit={async (event) => {
            event.preventDefault();
            const formElement = event.currentTarget;
            const form = new FormData(formElement);
            setPending("upload");
            const saved = await request(`/api/admin/competitions/${competition.id}/attachments`, { method: "POST", body: form }, "文件上传成功");
            setPending("");
            if (saved) {
              formElement.reset();
              if (fileRef.current) fileRef.current.value = "";
            }
          }}
        >
          <label className="text-xs text-slate-600">标题<input name="title" className={fieldClass} required maxLength={120} /></label>
          <label className="text-xs text-slate-600">类型<select name="kind" className={fieldClass} defaultValue="NOTICE"><option value="NOTICE">通知</option><option value="RULE">规程</option><option value="TEMPLATE">模板</option></select></label>
          <label className="text-xs text-slate-600">文件<input ref={fileRef} name="file" type="file" required accept=".pdf,.docx,.doc,.xlsx,.jpg,.jpeg,.png,.txt" className="mt-1 block w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-700" /></label>
          <button type="submit" disabled={pending === "upload"} className="h-10 rounded-md bg-blue-600 px-4 text-sm text-white disabled:opacity-60">{pending === "upload" ? "上传中…" : "上传文件"}</button>
        </form>
        <ul className="mt-4 divide-y divide-slate-100">
          {attachments.map((file) => (
            <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div><p className="text-sm text-slate-900">{file.title}</p><p className="text-xs text-slate-500">{file.kind} · {file.fileName}</p></div>
              <div className="flex gap-2">
                <a href={file.filePath} target="_blank" rel="noreferrer" className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700">查看 / 下载</a>
                <button
                  type="button"
                  disabled={pending === `delete-${file.id}`}
                  onClick={async () => {
                    if (!window.confirm(`确定删除“${file.title}”吗？`)) return;
                    setPending(`delete-${file.id}`);
                    await request(`/api/admin/competitions/${competition.id}/attachments/${file.id}`, { method: "DELETE" }, "文件已删除");
                    setPending("");
                  }}
                  className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 disabled:opacity-60"
                >删除</button>
              </div>
            </li>
          ))}
        </ul>
        {attachments.length === 0 ? <p className="mt-4 text-sm text-slate-500">暂无赛事文件</p> : null}
      </section>

      {editOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-900/30">
          <button type="button" aria-label="关闭编辑" onClick={() => setEditOpen(false)} className="absolute inset-0 h-full w-full cursor-default" />
          <aside className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-900">编辑赛事信息</h2><button type="button" onClick={() => setEditOpen(false)} className="text-2xl text-slate-500">×</button></div>
            <form
              className="mt-6 space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setPending("edit");
                const saved = await request(`/api/admin/competitions/${competition.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(edit),
                }, "赛事信息已保存");
                setPending("");
                if (saved) setEditOpen(false);
              }}
            >
              <label className="block text-xs text-slate-600">名称<input className={fieldClass} value={edit.name} onChange={(event) => setEdit({ ...edit, name: event.target.value })} required /></label>
              <label className="block text-xs text-slate-600">主办方<input className={fieldClass} value={edit.organizer} onChange={(event) => setEdit({ ...edit, organizer: event.target.value })} /></label>
              <label className="block text-xs text-slate-600">简介<textarea className="mt-1 min-h-40 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={edit.description} onChange={(event) => setEdit({ ...edit, description: event.target.value })} /></label>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditOpen(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm">取消</button><button type="submit" disabled={pending === "edit"} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60">{pending === "edit" ? "保存中…" : "保存"}</button></div>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
