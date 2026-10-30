"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/presentation";
import type { ApiResponse } from "@/types/api";
import type { SealedFileView } from "@/types/sealed";

function fileSize(sizeBytes: number) {
  return sizeBytes >= 1024 * 1024 ? `${(sizeBytes / 1024 / 1024).toFixed(2)} MB` : `${(sizeBytes / 1024).toFixed(1)} KB`;
}

function reviewLabel(value: string) {
  if (value === "APPROVED") return "已通过";
  if (value === "REJECTED") return "已驳回";
  if (value === "PENDING") return "待审核";
  return value;
}

export function SealedPanel({ projectId, files, currentFileId, canExportSensitive }: { projectId: string; files: SealedFileView[]; currentFileId: string | null; canExportSensitive: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const currentFile = files.find((file) => file.id === currentFileId) ?? null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">报名表与盖章件</h2>
          <p className="mt-1 text-xs text-slate-500">下载后打印签字盖章；上传新版本会替换当前最终版，旧版本保留。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canExportSensitive ? (
            <a href={`/api/export/form?projectId=${encodeURIComponent(projectId)}&full=1`} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">下载报名表（交学院核验）</a>
          ) : (
            <button type="button" disabled title="仅项目负责人、第二/第三负责人或管理员可下载完整报名表" className="rounded-md bg-slate-200 px-4 py-2 text-sm text-slate-500">下载报名表（交学院核验）</button>
          )}
          <a href={`/api/export/form?projectId=${encodeURIComponent(projectId)}&full=0`} className="rounded-md border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50">下载报名表（脱敏留存）</a>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-medium text-slate-800">当前最终版</h3>
        {currentFile ? (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-700">第 {currentFile.versionNo} 版 · {currentFile.fileName}</span>
            <a href={`/api/sealed/download?fileId=${encodeURIComponent(currentFile.id)}`} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">下载最终版</a>
          </div>
        ) : <p className="mt-2 text-sm text-slate-500">尚未上传可用的盖章件</p>}
      </div>

      <form
        ref={formRef}
        className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const input = form.elements.namedItem("file");
          if (!(input instanceof HTMLInputElement) || !input.files?.[0]) {
            setError("请选择上传文件");
            return;
          }
          if (input.files[0].size > 20 * 1024 * 1024) {
            setError("文件不能超过 20MB");
            return;
          }
          setPending(true);
          setError("");
          setNotice("");
          try {
            const body = new FormData();
            body.set("projectId", projectId);
            body.set("file", input.files[0]);
            const response = await fetch("/api/sealed/upload", { method: "POST", body });
            const result = await response.json() as ApiResponse<SealedFileView | null>;
            if (!response.ok || result.code !== 0 || !result.data) throw new Error(result.message || "上传失败");
            setNotice(result.message);
            form.reset();
            router.refresh();
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "上传失败");
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="flex-1 text-sm text-slate-600">
          <span className="sr-only">上传盖章件</span>
          <input name="file" type="file" required disabled={pending} accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:text-slate-700 hover:file:bg-slate-200" />
        </label>
        <button type="submit" disabled={pending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{pending ? "上传中…" : "上传盖章件"}</button>
      </form>
      <p className="mt-2 text-xs text-slate-400">支持 PDF/JPG/PNG，单文件不超过 20MB。</p>
      {error ? <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {notice ? <p role="status" className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}

      <div className="mt-5">
        <h3 className="text-sm font-medium text-slate-800">历史版本（{files.length}）</h3>
        {files.length ? (
          <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {files.map((file) => (
              <article key={file.id} className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">第 {file.versionNo} 版 · {file.fileName}</span>
                    {file.id === currentFileId ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">当前最终版</span> : null}
                    <span className={`rounded-full px-2 py-0.5 text-xs ${file.reviewResult === "REJECTED" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>{reviewLabel(file.reviewResult)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{file.uploaderName} · {formatDateTime(file.uploadedAt)} · {fileSize(file.sizeBytes)}{file.reviewNote ? ` · ${file.reviewNote}` : ""}</p>
                </div>
                <a href={`/api/sealed/download?fileId=${encodeURIComponent(file.id)}`} className="shrink-0 text-sm text-blue-600 hover:underline">下载此版本</a>
              </article>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-slate-500">暂无历史版本</p>}
      </div>
    </section>
  );
}
