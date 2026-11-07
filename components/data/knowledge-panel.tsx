"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useKnowledgeDraft } from "@/components/data/assistant-workspace";
import type { KnowledgeChunk } from "@/lib/knowledge";
import type { ApiResponse } from "@/types/api";

type Attachment = { id: string; title: string; fileName: string; isSample?: boolean; unavailableReason?: string | null };
export type KnowledgeDocument = {
  id: string; title: string; fileName: string; sourceAttachmentId: string | null; status: string;
  effectiveLabel: string; isActive: boolean; canReplace: boolean; canRestore: boolean; filePath: string | null;
};
type Mode = "upload" | "attachment" | "manual";
const inputClass = "mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
const buttonClass = "rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50";
function OriginalText({ chunks }: { chunks: KnowledgeChunk[] }) {
  return <div className="mt-3 max-h-80 space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-3">
    {chunks.map((chunk, index) => <div key={index}>
      <p className="text-xs font-semibold text-slate-700">{chunk.section}{chunk.page ? ` · 第 ${chunk.page} 页` : ""}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{chunk.content}</p>
    </div>)}
  </div>;
}
export function KnowledgePanel({ competitionId, attachments, documents }: {
  competitionId: string; attachments: Attachment[]; documents: KnowledgeDocument[];
}) {
  const router = useRouter();
  const setDraft = useKnowledgeDraft()?.setDraft;
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("upload");
  const [attachmentId, setAttachmentId] = useState("");
  const [uploaded, setUploaded] = useState<Attachment[]>([]);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [replacesId, setReplacesId] = useState("");
  const [effectiveAt, setEffectiveAt] = useState("");
  const [preview, setPreview] = useState<KnowledgeChunk[]>([]);
  const [viewing, setViewing] = useState<{ title: string; chunks: KnowledgeChunk[] } | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const choices = [...new Map([...attachments, ...uploaded].map((item) => [item.id, item])).values()];
  const dirty = Boolean(title || text || file || attachmentId || replacesId || effectiveAt);
  useEffect(() => {
    setDraft?.({ dirty, busy: pending });
    return () => setDraft?.({ dirty: false, busy: false });
  }, [dirty, pending, setDraft]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  function reset() {
    setAttachmentId(""); setTitle(""); setText(""); setFile(null); setPreview([]); setReplacesId(""); setEffectiveAt("");
    if (fileInput.current) fileInput.current.value = "";
  }
  async function operate(work: () => Promise<void>) {
    if (pending) return;
    setPending(true); setMessage(""); setError("");
    try { await work(); } catch (caught) { setError(caught instanceof Error ? caught.message : "操作失败"); }
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
  function body(actionName: string, sourceId = attachmentId) {
    return { action: actionName, title, text: mode === "manual" ? text : "", attachmentId: mode === "manual" ? "" : sourceId,
      replacesId, effectiveAt: effectiveAt ? `${effectiveAt}:00+08:00` : "" };
  }
  async function extract() {
    let sourceId = attachmentId;
    if (mode === "upload" && !sourceId) {
      if (!file) throw new Error("请选择文件");
      const form = new FormData();
      form.set("file", file); form.set("title", title); form.set("kind", "NOTICE");
      const response = await fetch(`/api/admin/competitions/${competitionId}/attachments`, { method: "POST", body: form });
      const result = await response.json() as ApiResponse<Attachment>;
      if (!response.ok || result.code !== 0 || !result.data) throw new Error(result.message || "上传失败");
      sourceId = result.data.id;
      setUploaded((items) => [...items, result.data!]); setAttachmentId(sourceId); router.refresh();
    }
    const result = await action<{ chunks: KnowledgeChunk[] }>(body("preview", sourceId));
    setPreview(result.chunks); setMessage("正文已解析，请核对后发布。当前尚未用于问答。");
  }
  return <section id="knowledge" className="rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="font-semibold text-slate-900">管理本场赛事的问答资料</h2>
    <p className="mt-2 text-sm text-slate-500">先维护资料，再用下方测试问答核对效果。只有已生效的资料参与回答。</p>
    <h3 className="mt-5 text-sm font-semibold">资料库</h3>
    <ul className="mt-2 divide-y divide-slate-100">
      {!documents.length && <li className="py-3 text-sm text-slate-500">还没有发布问答资料。请在下方添加。</li>}
      {documents.map((doc) => <li key={doc.id} id={`document-${doc.id}`} className="py-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-medium">{doc.title} <span className="ml-2 rounded bg-slate-100 px-2 py-1 text-xs">{doc.status}</span></p>
            <p className="mt-2 text-xs text-slate-500">{doc.sourceAttachmentId ? `附件：${doc.fileName}` : "手工录入"} · 生效 {doc.effectiveLabel}</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonClass} disabled={pending} onClick={() => void operate(async () => {
              const result = await action<{ chunks: KnowledgeChunk[] }>({ action: "view", documentId: doc.id });
              setViewing({ title: doc.title, chunks: result.chunks });
            })}>查看正文</button>
            {doc.filePath && <a className={buttonClass} href={doc.filePath} target="_blank" rel="noreferrer">来源文件</a>}
            {doc.isActive && doc.status !== "已替换" && <button type="button" className={buttonClass} disabled={pending} onClick={() => {
              if (!window.confirm("下架后，新的问答将停止引用这份资料。确定下架？")) return;
              void operate(async () => { await action({ action: "withdraw", documentId: doc.id }); setMessage("资料已下架。"); router.refresh(); });
            }}>下架</button>}
            {doc.canRestore && <button type="button" className={buttonClass} disabled={pending} onClick={() => {
              if (!window.confirm("重新启用后，这份资料将立即参与新的问答。请确认内容仍然有效。")) return;
              void operate(async () => { await action({ action: "restore", documentId: doc.id }); setMessage("资料已重新启用。"); router.refresh(); });
            }}>重新启用</button>}
          </div>
        </div>
        {!doc.isActive && !doc.canRestore && <p className="mt-2 text-xs text-slate-500">涉及版本替换或来源已删除，请添加新版资料重新发布。</p>}
      </li>)}
    </ul>
    {viewing && <div className="mt-3 rounded-lg border border-slate-200 p-3">
      <div className="flex justify-between gap-3"><p className="text-sm font-medium">已保存正文：{viewing.title}</p><button type="button" className="text-sm text-blue-600" onClick={() => setViewing(null)}>关闭正文</button></div>
      <OriginalText chunks={viewing.chunks} />
    </div>}
    <h3 className="mt-6 text-sm font-semibold">添加问答资料</h3>
    <fieldset disabled={pending} className="mt-3 space-y-4">
      <legend className="sr-only">资料录入方式</legend>
      <div className="flex flex-wrap gap-3">
        {([ ["upload", "上传新文件"], ["attachment", "导入赛事附件"], ["manual", "手工录入"] ] as const).map(([value, label]) =>
          <label key={value} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <input type="radio" name="knowledge-mode" value={value} checked={mode === value} onChange={() => {
              if (dirty && !window.confirm("切换录入方式会清空本次编辑，已上传的附件仍会保留。确定切换？")) return;
              reset(); setMode(value); setMessage(""); setError("");
            }} />{label}
          </label>)}
      </div>
      {mode === "upload" && <div>
        <label className="block text-sm">赛事资料文件
          <input ref={fileInput} type="file" accept=".txt,.docx,.pdf" className={inputClass} onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            setFile(selected); setTitle(selected?.name.replace(/\.[^.]+$/, "").slice(0, 120) ?? ""); setAttachmentId(""); setPreview([]);
          }} />
        </label>
        <p className="mt-2 text-xs leading-5 text-slate-500">支持 TXT、DOCX、含文字的 PDF，单文件不超过20MB。上传会同时保存到赛事详情的公开附件列表；预览并发布后才用于问答。测试文件请在标题注明“模拟测试”。</p>
      </div>}
      {mode === "attachment" && <div>
        <label className="block text-sm">选择本场赛事的附件
          <select className={inputClass} value={attachmentId} onChange={(event) => {
            setAttachmentId(event.target.value); setTitle(choices.find((item) => item.id === event.target.value)?.title ?? ""); setPreview([]);
          }}>
            <option value="">请选择附件</option>
            {choices.map((item) => {
              const existing = documents.find((doc) => doc.sourceAttachmentId === item.id);
              return <option key={item.id} value={item.id} disabled={Boolean(existing || item.unavailableReason)}>
                {item.isSample ? "【演示附件】" : ""}{item.title} · {item.fileName}{existing ? `（已入库：${existing.status}，请在资料库管理）` : item.unavailableReason ? `（${item.unavailableReason}）` : ""}
              </option>;
            })}
          </select>
        </label>
        <p className="mt-2 text-xs text-slate-500">来自赛事详情页的文件或本页上传的附件。演示附件不代表正式规则；已入库文件请在上方查看或重新启用。</p>
      </div>}
      <label className="block text-sm">资料标题
        <input className={inputClass} value={title} maxLength={120} placeholder="例如：【模拟测试】2026校赛报名通知" onChange={(event) => { setTitle(event.target.value); setPreview([]); }} />
        <span className="mt-1 block text-xs text-slate-500">用于识别这份资料，可以修改；回答依据来自正文。</span>
      </label>
      {mode === "manual" && <label className="block text-sm">资料正文
        <textarea className={inputClass} value={text} rows={8} maxLength={120000} placeholder={"# 报名时间\n粘贴已核对的通知原文或问答规则"} onChange={(event) => { setText(event.target.value); setPreview([]); }} />
      </label>}
      {mode !== "manual" && <p className="text-xs text-slate-500">正文将从所选文件提取，无须重复填写。</p>}
      <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800" role="status">当前进度：{preview.length ? "正文已解析，待核对发布" : attachmentId ? "已选附件，待提取预览" : mode === "manual" ? "录入正文，待预览" : "待选择文件并提取"}</p>
      <button type="button" className={buttonClass} disabled={pending || !title.trim() || (mode === "manual" ? !text.trim() : mode === "upload" ? !file && !attachmentId : !attachmentId)} onClick={() => void operate(extract)}>{mode === "upload" && !attachmentId ? "上传并预览正文" : "预览正文"}</button>
      {preview.length > 0 && <div><p className="text-sm font-medium">待发布正文预览</p><OriginalText chunks={preview} /></div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">生效时间（北京时间，留空立即生效）
          <input type="datetime-local" value={effectiveAt} className={inputClass} onChange={(event) => setEffectiveAt(event.target.value)} />
        </label>
        <label className="text-sm">资料更新方式
          <select className={inputClass} value={replacesId} onChange={(event) => setReplacesId(event.target.value)}>
            <option value="">新增独立资料</option>
            {documents.filter(({ canReplace }) => canReplace).map((doc) => <option key={doc.id} value={doc.id}>完整替换：{doc.title}</option>)}
          </select>
        </label>
      </div>
      <p className="text-xs text-slate-500">新通知完整取代旧通知时请选择替换对象，避免两版规则同时生效。</p>
      <div className="flex gap-2">
        <button type="button" disabled={pending || !preview.length} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50" onClick={() => void operate(async () => {
          await action(body("publish")); reset(); setMessage("资料已发布；按设置的生效时间参与问答。"); router.refresh();
        })}>{pending ? "处理中…" : "确认正文并发布"}</button>
        <button type="button" className={buttonClass} disabled={pending || !dirty} onClick={() => { if (window.confirm("确定清空本次编辑？已上传的赛事附件会保留。")) reset(); }}>清空编辑</button>
      </div>
    </fieldset>
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    {message && <p role="status" className="mt-3 text-sm text-green-700">{message}</p>}
  </section>;
}
