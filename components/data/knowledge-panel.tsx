"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { KnowledgeChunk } from "@/lib/knowledge";
import type { ApiResponse } from "@/types/api";

type Attachment = { id: string; title: string; fileName: string };
export type KnowledgeDocument = {
  id: string; title: string; sourceAttachmentId: string | null; status: string;
  effectiveLabel: string; isActive: boolean; canReplace: boolean;
};
const inputClass = "mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
const buttonClass = "rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50";

export function KnowledgePanel({ competitionId, attachments, documents }: {
  competitionId: string; attachments: Attachment[]; documents: KnowledgeDocument[];
}) {
  const router = useRouter();
  const [attachmentId, setAttachmentId] = useState("");
  const [uploaded, setUploaded] = useState<Attachment[]>([]);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [replacesId, setReplacesId] = useState("");
  const [effectiveAt, setEffectiveAt] = useState("");
  const [preview, setPreview] = useState<KnowledgeChunk[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const choices = [...new Map([...attachments, ...uploaded].map((item) => [item.id, item])).values()];

  async function operate(work: () => Promise<void>) {
    if (pending) return;
    setPending(true);
    setMessage("");
    setError("");
    try { await work(); } catch (error) { setError(error instanceof Error ? error.message : "操作失败"); }
    finally { setPending(false); }
  }
  async function action<T>(body: Record<string, string>) {
    const response = await fetch(`/api/admin/knowledge/${competitionId}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const result = await response.json() as ApiResponse<T>;
    if (!response.ok || result.code !== 0) throw new Error(result.message || "操作失败");
    return result.data as T;
  }
  function body(actionName: string) {
    return { action: actionName, title, text, attachmentId, replacesId, effectiveAt: effectiveAt ? `${effectiveAt}:00+08:00` : "" };
  }
  async function upload() {
    if (!file) throw new Error("请选择文件");
    const form = new FormData();
    form.set("file", file);
    form.set("title", title || file.name);
    form.set("kind", "NOTICE");
    const response = await fetch(`/api/admin/competitions/${competitionId}/attachments`, { method: "POST", body: form });
    const result = await response.json() as ApiResponse<Attachment>;
    if (!response.ok || result.code !== 0 || !result.data) throw new Error(result.message || "上传失败");
    const attachment = result.data;
    setUploaded((items) => [...items, attachment]);
    setAttachmentId(attachment.id);
    setTitle(attachment.title);
    setPreview([]);
    setMessage("文件已上传，请预览后发布到问答资料库。");
    router.refresh();
  }

  return (
    <details id="knowledge" className="rounded-xl border border-slate-200 bg-white p-5">
      <summary className="cursor-pointer font-semibold text-slate-800">管理本场赛事的问答资料</summary>
      <p className="mt-3 text-sm text-slate-500">上传或录入资料，核对原文后发布。生效时间按北京时间填写。</p>
      <fieldset disabled={pending} className="mt-4 space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex-1 text-sm">上传官方资料
            <input type="file" accept=".txt,.docx,.pdf" className={inputClass}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          <button type="button" className={buttonClass} disabled={!file || pending} onClick={() => void operate(upload)}>上传文件</button>
        </div>
        <label className="block text-sm">资料来源
          <select className={inputClass} value={attachmentId} onChange={(event) => {
            setAttachmentId(event.target.value);
            setTitle(choices.find(({ id }) => id === event.target.value)?.title ?? "");
            setPreview([]);
          }}>
            <option value="">手工录入通知或 FAQ</option>
            {choices.map((item) => <option key={item.id} value={item.id}
              disabled={documents.some((doc) => doc.sourceAttachmentId === item.id)}>{item.title} · {item.fileName}</option>)}
          </select>
        </label>
        <label className="block text-sm">标题
          <input className={inputClass} value={title} maxLength={120} onChange={(event) => { setTitle(event.target.value); setPreview([]); }} />
        </label>
        {!attachmentId && <label className="block text-sm">正文
          <textarea className={inputClass} value={text} rows={6} maxLength={120000} placeholder={"# 报名时间\n填写已核对的规则原文"}
            onChange={(event) => { setText(event.target.value); setPreview([]); }} />
        </label>}
        <button type="button" className={buttonClass} disabled={pending || !title.trim() || (!attachmentId && !text.trim())}
          onClick={() => void operate(async () => { const result = await action<{ chunks: KnowledgeChunk[] }>(body("preview")); setPreview(result.chunks); })}>提取并预览原文</button>
        {preview.length > 0 && (
          <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-3">
            {preview.map((chunk, index) => <div key={index}>
              <p className="text-xs font-semibold text-slate-700">{chunk.section}{chunk.page ? ` · 第 ${chunk.page} 页` : ""}</p>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-slate-600">{chunk.content}</p>
            </div>)}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">生效时间（留空立即生效）
            <input type="datetime-local" value={effectiveAt} className={inputClass} onChange={(event) => setEffectiveAt(event.target.value)} />
          </label>
          <label className="text-sm">完整替换旧版（可选）
            <select className={inputClass} value={replacesId} onChange={(event) => setReplacesId(event.target.value)}>
              <option value="">新增独立资料</option>
              {documents.filter(({ canReplace }) => canReplace).map((doc) => <option key={doc.id} value={doc.id}>{doc.title}</option>)}
            </select>
          </label>
        </div>
        <button type="button" disabled={pending || !preview.length} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          onClick={() => void operate(async () => {
            await action(body("publish"));
            setPreview([]); setTitle(""); setText(""); setAttachmentId(""); setReplacesId(""); setEffectiveAt("");
            setMessage("资料已发布。"); router.refresh();
          })}>{pending ? "处理中…" : "确认原文并发布"}</button>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      {message && <p role="status" className="mt-3 text-sm text-green-700">{message}</p>}
      <ul className="mt-5 divide-y divide-slate-100">
        {!documents.length && <li className="text-sm text-slate-500">还没有发布问答资料。</li>}
        {documents.map((doc) => <li key={doc.id} className="flex items-center justify-between gap-3 py-3 text-sm">
          <div><p>{doc.title} · {doc.status}</p><p className="mt-1 text-xs text-slate-500">生效 {doc.effectiveLabel}</p></div>
          {doc.isActive && doc.status !== "已替换" && <button type="button" className={buttonClass} disabled={pending} onClick={() => {
            if (!window.confirm("下架后，新的问答将停止引用这份资料。确定下架？")) return;
            void operate(async () => { await action({ action: "withdraw", documentId: doc.id }); setMessage("资料已下架。"); router.refresh(); });
          }}>下架</button>}
        </li>)}
      </ul>
    </details>
  );
}
