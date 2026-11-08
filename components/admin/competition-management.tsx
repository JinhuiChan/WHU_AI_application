"use client";

import { Button } from "@/components/ui/button";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Attachment = {
  id: string;
  title: string;
  kind: string;
  fileName: string;
  filePath: string;
  knowledgeStatus?: string;
  knowledgeError?: string | null;
  replacesAttachmentId?: string | null;
};
type WindowValue = { startAt: string; endAt: string; enabled: boolean } | null;
type Props = {
  competition: { id: string; name: string; organizer: string | null; description: string | null };
  attachments: Attachment[];
  initialWindow: WindowValue;
};

const fieldClass = "mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600";

// 宣传片识别：kind 标了 VIDEO，或文件名本身就是视频后缀（兼容历史数据）
const VIDEO_FILE = /\.(mp4|webm|mov|m4v|ogv)$/i;
const attachmentKindLabels: Record<string, string> = {
  NOTICE: "通知",
  RULE: "规程",
  TEMPLATE: "模板",
  VIDEO: "宣传片",
};
const knowledgeStatusLabels: Record<string, string> = {
  READY: "已解析",
  PENDING: "待解析",
  ERROR: "解析失败",
  SKIPPED: "仅供下载",
  REPLACED: "已被新版替换",
};

function localInput(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function CompetitionManagement({ competition, attachments, initialWindow }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState({ name: competition.name, organizer: competition.organizer ?? "", description: competition.description ?? "" });
  const [windowForm, setWindowForm] = useState({
    startAt: localInput(initialWindow?.startAt),
    endAt: localInput(initialWindow?.endAt),
    enabled: initialWindow?.enabled ?? true,
  });
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [videoHint, setVideoHint] = useState("");
  const videoRef = useRef<HTMLInputElement>(null);
  const videoTitleRef = useRef<HTMLInputElement>(null);

  const video = attachments.find((file) => file.kind === "VIDEO" || VIDEO_FILE.test(file.fileName));
  const documents = attachments.filter((file) => file.id !== video?.id);

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

  async function uploadVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    form.set("kind", "VIDEO");
    setError("");
    setMessage("");
    setVideoHint("");
    setPending("video");
    try {
      const response = await fetch(`/api/admin/competitions/${competition.id}/attachments`, { method: "POST", body: form });
      const result = (await response.json()) as { code: number; message: string };
      if (!response.ok || result.code !== 0) {
        // 接口的类型白名单还没放开视频时，给一句能照着做的提示，而不是把校验文案原样抛出来
        if (response.status === 422 && /文件类型|仅支持|MIME/.test(result.message)) {
          setVideoHint(
            "接口暂未放开视频格式：需要把 VIDEO 加进附件上传的 kind 白名单，并把 mp4 / webm 加进扩展名与 MIME 白名单。接口放开后这个按钮直接可用，前端不需要再改。",
          );
        } else {
          setError(result.message || "上传失败");
        }
        return;
      }
      setMessage("宣传片已上传，学生端赛事简介页会直接显示播放器");
      formElement.reset();
      if (videoRef.current) videoRef.current.value = "";
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "上传失败");
    } finally {
      setPending("");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-blue-200 bg-blue-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-sm font-semibold text-slate-900">管理员操作区</h2><p className="mt-1 text-xs text-slate-600">赛事信息、公开材料和报名窗口保存后立即生效。</p></div>
          <Button type="button" variant="default" size="sm" onClick={() => setEditOpen(true)}>编辑赛事信息</Button>
        </div>
        {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p role="alert" className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">报名设置</h2>
        <div className="mt-4 grid items-end gap-3 md:grid-cols-4">
          <label className="text-sm text-slate-600">开始时间<input type="datetime-local" className={fieldClass} value={windowForm.startAt} onChange={(event) => setWindowForm({ ...windowForm, startAt: event.target.value })} /></label>
          <label className="text-sm text-slate-600">截止时间<input type="datetime-local" className={fieldClass} value={windowForm.endAt} onChange={(event) => setWindowForm({ ...windowForm, endAt: event.target.value })} /></label>
          <label className="flex h-10 items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={windowForm.enabled} onChange={(event) => setWindowForm({ ...windowForm, enabled: event.target.checked })} className="h-4 w-4" />开放报名（勾选后学生才可报名）</label>
          <Button type="button" variant="default" size="sm" disabled={pending === "window"} onClick={() => void saveWindow()}>{pending === "window" ? "保存中…" : "保存报名设置"}</Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {windowForm.enabled
            ? "学生端状态：在下方时间段内会显示「报名中」并可提交（提前/延后以时间段为准）。"
            : "学生端状态：会显示「报名未开放」——需要勾选「开放报名」并保存后学生才能报名。"}
        </p>
      </section>

      <section id="media" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">宣传片与赛事解读</h2>
            <p className="mt-1 text-xs text-slate-500">上传后会在赛事简介页的 16:9 播放位直接播放；没有视频时学生看到的是占位卡。</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              video ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            {video ? "已上传" : "未上传"}
          </span>
        </div>

        {video ? (
          <div className="mt-4 space-y-3">
            <video
              className="w-full max-w-2xl rounded-xl border border-slate-200 bg-black"
              controls
              playsInline
              preload="metadata"
              src={video.filePath}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-900">{video.title}</p>
                <p className="text-xs text-slate-500">{video.fileName}</p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={pending === `delete-${video.id}`}
                onClick={async () => {
                  if (!window.confirm(`确定删除宣传片「${video.title}」吗？学生端会变回占位卡。`)) return;
                  setPending(`delete-${video.id}`);
                  await request(
                    `/api/admin/competitions/${competition.id}/attachments/${video.id}`,
                    { method: "DELETE" },
                    "宣传片已删除",
                  );
                  setPending("");
                }}
              >
                删除宣传片
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500 inline-empty">还没有宣传片，学生端显示的是占位卡</p>
        )}

        <form
          className="mt-4 grid items-end gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={uploadVideo}
        >
          <label className="text-sm text-slate-600">视频标题
            <input
              name="title"
              ref={videoTitleRef}
              className={fieldClass}
              required
              maxLength={120}
              placeholder="选择文件后自动填入文件名，可修改"
            />
          </label>
          <label className="text-sm text-slate-600">视频文件
            <input
              ref={videoRef}
              name="file"
              type="file"
              required
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(event) => {
                const picked = event.target.files?.[0];
                if (picked && videoTitleRef.current && !videoTitleRef.current.value.trim()) {
                  videoTitleRef.current.value = picked.name.replace(/\.[^.]+$/, "");
                }
              }}
              className="mt-1 block w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-700"
            />
          </label>
          <Button type="submit" variant="default" size="sm" disabled={pending === "video"}>
            {pending === "video" ? "上传中…" : "上传宣传片"}
          </Button>
        </form>
        {videoHint ? (
          <p role="status" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-800">{videoHint}</p>
        ) : null}
        <p className="mt-2 text-xs text-slate-500">建议 mp4（H.264），单文件不超过 20MB；超过请先压缩再传。</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 id="competition-files" className="text-sm font-semibold text-slate-900">赛事文件与问答依据</h2>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          通知、规程上传后自动解析供问答使用，无须另行发布。模板和内置演示文件不作为规则依据；图片、扫描件及旧版 DOC 需换成含文字的 PDF、DOCX 或 TXT。
          替换旧版仅在新文件解析成功后生效。宣传片请用上面的独立入口。
        </p>
        <form
          className="mt-4 grid items-end gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-[1fr_150px_1fr_1fr_auto]"
          onSubmit={async (event) => {
            event.preventDefault();
            const formElement = event.currentTarget;
            const form = new FormData(formElement);
            setPending("upload");
            const saved = await request(`/api/admin/competitions/${competition.id}/attachments`, { method: "POST", body: form }, "文件已上传，请核对下方问答解析状态");
            setPending("");
            if (saved) {
              formElement.reset();
              if (fileRef.current) fileRef.current.value = "";
            }
          }}
        >
          <label className="text-sm text-slate-600">标题<input name="title" ref={titleRef} className={fieldClass} required maxLength={120} placeholder="选择文件后自动填入文件名，可修改" /></label>
          <label className="text-sm text-slate-600">类型<select name="kind" className={fieldClass} defaultValue="NOTICE"><option value="NOTICE">通知</option><option value="RULE">规程</option><option value="TEMPLATE">模板</option></select></label>
          <label className="text-sm text-slate-600">文件<input ref={fileRef} name="file" type="file" required accept=".pdf,.docx,.doc,.xlsx,.jpg,.jpeg,.png,.txt" onChange={(event) => { const picked = event.target.files?.[0]; if (picked && titleRef.current && !titleRef.current.value.trim()) { titleRef.current.value = picked.name.replace(/\.[^.]+$/, ""); } }} className="mt-1 block w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-700" /></label>
          <label className="text-sm text-slate-600">完整替换旧版（可选）
            <select name="replacesAttachmentId" className={fieldClass} defaultValue="">
              <option value="">新增独立资料</option>
              {attachments.filter((item) => item.knowledgeStatus === "READY").map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="default" size="sm" disabled={pending === "upload"}>{pending === "upload" ? "上传中…" : "上传文件"}</Button>
        </form>
        <ul className="mt-4 divide-y divide-slate-100">
          {documents.map((file) => (
            <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="text-sm text-slate-900">{file.title}</p>
                <p className="text-xs text-slate-500">{attachmentKindLabels[file.kind] ?? file.kind} · {file.fileName}</p>
                <p className="mt-1 text-xs text-slate-600">
                  问答状态：{knowledgeStatusLabels[file.knowledgeStatus ?? ""] ?? "待解析"}
                  {file.knowledgeError ? ` · ${file.knowledgeError}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["PENDING", "ERROR"].includes(file.knowledgeStatus ?? "") ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending === `sync-${file.id}`}
                    onClick={async () => {
                      setPending(`sync-${file.id}`);
                      await request(`/api/admin/competitions/${competition.id}/attachments/${file.id}`, { method: "POST" }, "已重试解析，请查看状态");
                      setPending("");
                    }}
                  >
                    {pending === `sync-${file.id}` ? "解析中…" : "重新解析"}
                  </Button>
                ) : null}
                <a href={file.filePath} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700">查看 / 下载</a>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={pending === `delete-${file.id}`}
                  onClick={async () => {
                    if (!window.confirm(`确定删除“${file.title}”吗？`)) return;
                    setPending(`delete-${file.id}`);
                    await request(`/api/admin/competitions/${competition.id}/attachments/${file.id}`, { method: "DELETE" }, "文件已删除");
                    setPending("");
                  }}
                >删除</Button>
              </div>
            </li>
          ))}
        </ul>
        {documents.length === 0 ? <p className="mt-4 text-sm text-slate-500 inline-empty">暂无赛事文件</p> : null}
      </section>

      {editOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-900/30">
          <button type="button" aria-label="关闭编辑" onClick={() => setEditOpen(false)} className="absolute inset-0 h-full w-full cursor-default" />
          <aside className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-900">编辑赛事信息</h2><Button type="button" variant="ghost" size="icon" onClick={() => setEditOpen(false)}>×</Button></div>
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
              <label className="block text-sm text-slate-600">名称<input className={fieldClass} value={edit.name} onChange={(event) => setEdit({ ...edit, name: event.target.value })} required /></label>
              <label className="block text-sm text-slate-600">主办方<input className={fieldClass} value={edit.organizer} onChange={(event) => setEdit({ ...edit, organizer: event.target.value })} /></label>
              <label className="block text-sm text-slate-600">简介<textarea className="mt-1 min-h-40 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={edit.description} onChange={(event) => setEdit({ ...edit, description: event.target.value })} /></label>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>取消</Button><Button type="submit" variant="default" size="sm" disabled={pending === "edit"}>{pending === "edit" ? "保存中…" : "保存"}</Button></div>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
