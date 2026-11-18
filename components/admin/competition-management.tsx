"use client";

import { useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { SectionHead, SectionRule } from "@/components/ui/section-head";

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

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15";
const fileInputClass =
  "mt-1 block w-full text-sm file:mr-2.5 file:rounded-full file:border file:border-[#7f9384] file:bg-[#eef5f1] file:px-3.5 file:py-1.5 file:text-xs file:font-medium file:text-[#115740] hover:file:bg-[#e1ede6]";

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
  const [edit, setEdit] = useState({
    name: competition.name,
    organizer: competition.organizer ?? "",
    description: competition.description ?? "",
  });
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
      const result = (await response.json()) as { code: number; message: string };
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
    await request(
      `/api/admin/competitions/${competition.id}/window`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: new Date(windowForm.startAt).toISOString(),
          endAt: new Date(windowForm.endAt).toISOString(),
          enabled: windowForm.enabled,
        }),
      },
      "报名设置已保存并生效",
    );
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
      const response = await fetch(`/api/admin/competitions/${competition.id}/attachments`, {
        method: "POST",
        body: form,
      });
      const result = (await response.json()) as { code: number; message: string };
      if (!response.ok || result.code !== 0) {
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
    <div className="space-y-5">
      <section className="rounded-xl border border-[#badec9] bg-[#eef5f1] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#0e1d17]">管理员操作区</h2>
            <p className="mt-1 text-xs text-[#3f524a]">赛事信息、公开材料与报名窗口保存后立即生效。</p>
          </div>
          <Button
            type="button"
            size="sm"
            className="bg-[#115740] text-white hover:bg-[#0d4633]"
            onClick={() => setEditOpen(true)}
          >
            编辑赛事信息
          </Button>
        </div>
        {message ? <p className="mt-3 text-sm font-medium text-[#115740]">{message}</p> : null}
        {error ? (
          <p role="alert" className="mt-3 text-sm text-[#9e2a35]">
            {error}
          </p>
        ) : null}
      </section>

      <section className="card p-5">
        <SectionHead title="报名设置" sub="配置校内报名开放与截止节点" />
        <SectionRule className="my-3.5" />
        <div className="grid items-end gap-3 md:grid-cols-4">
          <label className="text-sm font-medium text-[#1b2b25]">
            开始时间
            <input
              type="datetime-local"
              className={fieldClass}
              value={windowForm.startAt}
              onChange={(event) => setWindowForm({ ...windowForm, startAt: event.target.value })}
            />
          </label>
          <label className="text-sm font-medium text-[#1b2b25]">
            截止时间
            <input
              type="datetime-local"
              className={fieldClass}
              value={windowForm.endAt}
              onChange={(event) => setWindowForm({ ...windowForm, endAt: event.target.value })}
            />
          </label>
          <label className="flex h-10 cursor-pointer items-center gap-2 text-sm text-[#162620]">
            <input
              type="checkbox"
              checked={windowForm.enabled}
              onChange={(event) => setWindowForm({ ...windowForm, enabled: event.target.checked })}
              className="h-4 w-4 rounded border-[#7f9384] accent-[#115740]"
            />
            开放报名（勾选后学生可报）
          </label>
          <Button
            type="button"
            size="default"
            className="h-10 bg-[#115740] text-white hover:bg-[#0d4633]"
            disabled={pending === "window"}
            onClick={() => void saveWindow()}
          >
            {pending === "window" ? "保存中…" : "保存报名设置"}
          </Button>
        </div>
        <p className="mt-2.5 text-xs text-[#54635d]">
          {windowForm.enabled
            ? "学生端状态：在所设时间段内将显示「报名中」并开放提交（提前或延后以时间段为准）。"
            : "学生端状态：当前显示「报名未开放」，需勾选「开放报名」并保存后学生方可报名。"}
        </p>
      </section>

      <section id="media" className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <SectionHead
            title="宣传片与赛事解读"
            sub="上传后将在赛事简介页 16:9 播放位直接播放；未上传时展示书院占位封面"
          />
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              video
                ? "bg-[#eef5f1] text-[#115740] ring-1 ring-[#cbe0d4]"
                : "bg-[#f1f5f3] text-[#54635d] ring-1 ring-[#d5e2db]"
            }`}
          >
            {video ? "已上传" : "未上传"}
          </span>
        </div>
        <SectionRule className="my-3.5" />

        {video ? (
          <div className="space-y-3">
            <video
              className="w-full max-w-2xl rounded-xl border border-[#d5e2db] bg-black"
              controls
              playsInline
              preload="metadata"
              src={video.filePath}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#0e1d17]">{video.title}</p>
                <p className="text-xs text-[#54635d]">{video.fileName}</p>
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
          <p className="inline-empty text-sm">还没有宣传片，学生端显示的是占位卡</p>
        )}

        <form
          className="mt-4 grid items-end gap-3 rounded-xl border border-[#dce8e1] bg-[#f8fbf9] p-4 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={uploadVideo}
        >
          <label className="text-sm font-medium text-[#1b2b25]">
            视频标题
            <input
              name="title"
              ref={videoTitleRef}
              className={fieldClass}
              required
              maxLength={120}
              placeholder="选择文件后自动填入文件名，可修改"
            />
          </label>
          <div className="min-w-0 text-sm font-medium text-[#1b2b25]">
            <label htmlFor="competition-video-file">视频文件</label>
            <FileDropZone label="视频文件">
              <input
                id="competition-video-file"
                ref={videoRef}
                name="file"
                type="file"
                required
                accept="video/mp4,video/webm,video/quicktime"
                disabled={pending === "video"}
                onChange={(event) => {
                  const picked = event.target.files?.[0];
                  if (picked && videoTitleRef.current && !videoTitleRef.current.value.trim()) {
                    videoTitleRef.current.value = picked.name.replace(/\.[^.]+$/, "");
                  }
                }}
                className={fileInputClass}
              />
            </FileDropZone>
          </div>
          <Button
            type="submit"
            size="default"
            className="h-10 bg-[#115740] text-white hover:bg-[#0d4633]"
            disabled={pending === "video"}
          >
            {pending === "video" ? "上传中…" : "上传宣传片"}
          </Button>
        </form>
        {videoHint ? (
          <p
            role="status"
            className="mt-2 rounded-xl border border-[#ead4a8] bg-[#fdf6e7] px-3.5 py-2.5 text-xs leading-6 text-[#854d0e]"
          >
            {videoHint}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-[#6c7e76]">建议 mp4（H.264），单文件不超过 20MB；超出请先压缩再上传。</p>
      </section>

      <section className="card p-5">
        <div id="competition-files">
          <SectionHead
            title="赛事文件与问答依据"
            sub="通知、规程上传后自动解析章节供智能问答引用；模板仅作填表说明。支持含文字的 PDF、DOCX 与 TXT。"
            meta={`${documents.length} 份文件`}
          />
        </div>
        <SectionRule className="my-3.5" />
        <form
          className="grid items-end gap-3 rounded-xl border border-[#dce8e1] bg-[#f8fbf9] p-4 md:grid-cols-[1fr_150px_1fr_1fr_auto]"
          onSubmit={async (event) => {
            event.preventDefault();
            const formElement = event.currentTarget;
            const form = new FormData(formElement);
            setPending("upload");
            const saved = await request(
              `/api/admin/competitions/${competition.id}/attachments`,
              { method: "POST", body: form },
              "文件已上传，请核对下方问答解析状态",
            );
            setPending("");
            if (saved) {
              formElement.reset();
              if (fileRef.current) fileRef.current.value = "";
            }
          }}
        >
          <label className="text-sm font-medium text-[#1b2b25]">
            标题
            <input
              name="title"
              ref={titleRef}
              className={fieldClass}
              required
              maxLength={120}
              placeholder="选择文件后自动填入文件名，可修改"
            />
          </label>
          <label className="text-sm font-medium text-[#1b2b25]">
            类型
            <select name="kind" className={fieldClass} defaultValue="NOTICE">
              <option value="NOTICE">通知</option>
              <option value="RULE">规程</option>
              <option value="TEMPLATE">模板</option>
            </select>
          </label>
          <div className="min-w-0 text-sm font-medium text-[#1b2b25]">
            <label htmlFor="competition-document-file">文件</label>
            <FileDropZone label="赛事文件">
              <input
                id="competition-document-file"
                ref={fileRef}
                name="file"
                type="file"
                required
                disabled={pending === "upload"}
                accept=".pdf,.docx,.doc,.xlsx,.jpg,.jpeg,.png,.txt"
                onChange={(event) => {
                  const picked = event.target.files?.[0];
                  if (picked && titleRef.current && !titleRef.current.value.trim()) {
                    titleRef.current.value = picked.name.replace(/\.[^.]+$/, "");
                  }
                }}
                className={fileInputClass}
              />
            </FileDropZone>
          </div>
          <label className="text-sm font-medium text-[#1b2b25]">
            完整替换旧版（可选）
            <select name="replacesAttachmentId" className={fieldClass} defaultValue="">
              <option value="">新增独立资料</option>
              {attachments
                .filter((item) => item.knowledgeStatus === "READY")
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
            </select>
          </label>
          <Button
            type="submit"
            size="default"
            className="h-10 bg-[#115740] text-white hover:bg-[#0d4633]"
            disabled={pending === "upload"}
          >
            {pending === "upload" ? "上传中…" : "上传文件"}
          </Button>
        </form>

        {documents.length ? (
          <ul className="mt-4 divide-y divide-[#eef4f0]">
            {documents.map((file) => (
              <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-[#eef5f1] px-2.5 py-0.5 text-xs font-medium text-[#115740]">
                      {attachmentKindLabels[file.kind] ?? file.kind}
                    </span>
                    <p className="text-sm font-medium text-[#0e1d17]">{file.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-[#5c6c65]">{file.fileName}</p>
                  <p className="mt-1 text-xs text-[#3f524a]">
                    问答解析状态：{knowledgeStatusLabels[file.knowledgeStatus ?? ""] ?? "待解析"}
                    {file.knowledgeError ? ` · ${file.knowledgeError}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {["PENDING", "ERROR"].includes(file.knowledgeStatus ?? "") ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending === `sync-${file.id}`}
                      onClick={async () => {
                        setPending(`sync-${file.id}`);
                        await request(
                          `/api/admin/competitions/${competition.id}/attachments/${file.id}`,
                          { method: "POST" },
                          "已重试解析，请查看状态",
                        );
                        setPending("");
                      }}
                    >
                      {pending === `sync-${file.id}` ? "解析中…" : "重新解析"}
                    </Button>
                  ) : null}
                  <a
                    href={file.filePath}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center rounded-full border border-[#7f9384] bg-white px-3.5 text-xs font-medium text-[#115740] transition-colors hover:border-[#115740] hover:bg-[#eef5f1]"
                  >
                    查看 / 下载
                  </a>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={pending === `delete-${file.id}`}
                    onClick={async () => {
                      if (!window.confirm(`确定删除“${file.title}”吗？`)) return;
                      setPending(`delete-${file.id}`);
                      await request(
                        `/api/admin/competitions/${competition.id}/attachments/${file.id}`,
                        { method: "DELETE" },
                        "文件已删除",
                      );
                      setPending("");
                    }}
                  >
                    删除
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 inline-empty text-sm">暂无赛事文件</p>
        )}
      </section>

      {editOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-50 bg-[#09211a]/40 backdrop-blur-[1px]">
              <button
                type="button"
                aria-label="关闭编辑"
                onClick={() => setEditOpen(false)}
                className="absolute inset-0 h-full w-full cursor-default"
              />
              <aside className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto border-l border-[#c9dad1] bg-white p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-[#0e1d17]">编辑赛事信息</h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setEditOpen(false)}
                  >
                    ×
                  </Button>
                </div>
                <form
                  className="mt-6 space-y-4"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    setPending("edit");
                    const saved = await request(
                      `/api/admin/competitions/${competition.id}`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(edit),
                      },
                      "赛事信息已保存",
                    );
                    setPending("");
                    if (saved) setEditOpen(false);
                  }}
                >
                  <label className="block text-sm font-medium text-[#1b2b25]">
                    名称
                    <input
                      className={fieldClass}
                      value={edit.name}
                      onChange={(event) => setEdit({ ...edit, name: event.target.value })}
                      required
                    />
                  </label>
                  <label className="block text-sm font-medium text-[#1b2b25]">
                    主办方
                    <input
                      className={fieldClass}
                      value={edit.organizer}
                      onChange={(event) => setEdit({ ...edit, organizer: event.target.value })}
                    />
                  </label>
                  <label className="block text-sm font-medium text-[#1b2b25]">
                    简介
                    <textarea
                      className="mt-1 min-h-40 w-full resize-y rounded-lg border border-[#7f9384] bg-white px-3 py-2 text-sm text-[#0f1d18] outline-none transition focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15"
                      value={edit.description}
                      onChange={(event) => setEdit({ ...edit, description: event.target.value })}
                    />
                  </label>
                  <div className="flex justify-end gap-2.5 pt-2">
                    <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                      取消
                    </Button>
                    <Button
                      type="submit"
                      disabled={pending === "edit"}
                      className="bg-[#115740] text-white hover:bg-[#0d4633]"
                    >
                      {pending === "edit" ? "保存中…" : "保存"}
                    </Button>
                  </div>
                </form>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
