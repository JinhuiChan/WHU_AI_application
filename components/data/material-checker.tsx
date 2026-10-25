"use client";

import { FormEvent, useState } from "react";
import { FileCheck, ShieldAlert, Upload } from "lucide-react";
import type { ApiResponse } from "@/types/api";
import type { MaterialCheckResult } from "@/types/material";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function MaterialChecker() {
  const [file, setFile] = useState<File | null>(null);
  const [localOnly, setLocalOnly] = useState(true);
  const [result, setResult] = useState<MaterialCheckResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submitFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!file) {
      setError("请选择要检查的 PDF 或 DOCX 文件");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("文件大小不能超过 10MB");
      return;
    }

    setPending(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("localOnly", String(localOnly));
      const response = await fetch("/api/check/material", { method: "POST", body: formData });
      const payload = (await response.json()) as ApiResponse<MaterialCheckResult>;
      if (!response.ok || payload.code !== 0) {
        throw new Error(payload.message || "材料检查失败，请稍后重试");
      }
      if (!payload.data || !Array.isArray(payload.data.checks)) {
        throw new Error("接口返回内容不正确");
      }
      setResult(payload.data);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "材料检查失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submitFile} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <ShieldAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">上传前请确认</p>
            <p className="mt-1 leading-6">
              材料可能包含商业敏感信息，请确认有权用于本次检测。文件仅在内存中解析，原文不入库、不落盘，也不会发送给模型。
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="material-file" className="mb-2 block text-sm font-medium text-slate-700">
            选择材料
          </label>
          <input
            id="material-file"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setResult(null);
              setError("");
            }}
            className="block w-full cursor-pointer rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:border-blue-400"
          />
          <p className="mt-2 text-xs text-slate-500">仅支持 PDF / DOCX，单个文件不超过 10MB；扫描图片型 PDF 需先转换为含文本层的文件。</p>
          {file ? <p className="mt-2 break-all text-sm text-slate-700">已选择：{file.name}（{(file.size / 1024).toFixed(1)} KB）</p> : null}
        </div>

        <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={localOnly}
            onChange={(event) => setLocalOnly(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
          />
          <span>
            <span className="font-medium">仅本地检测、不入库</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              默认勾选。当前版本始终不保存原文，审计仅记录文件名、大小、类型与检测方式。
            </span>
          </span>
        </label>

        <button
          type="submit"
          disabled={pending || !file}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <FileCheck size={17} aria-hidden="true" /> : <Upload size={17} aria-hidden="true" />}
          {pending ? "正在解析与检查…" : "开始检查"}
        </button>
        {error ? <p role="alert" className="mt-3 text-sm text-red-600">{error}</p> : null}
      </form>

      {result ? (
        <section aria-live="polite" className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 md:px-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <FileCheck size={19} className="text-blue-600" aria-hidden="true" />
              检查清单
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{result.summary}</p>
          </div>
          <ol className="space-y-3 p-4 md:p-5">
            {result.checks.map((check) => (
              <li
                key={check.item}
                className={`rounded-lg border p-4 ${check.pass ? "border-green-200 bg-green-50/40" : "border-red-200 bg-red-50/40"}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${check.pass ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                  >
                    {check.pass ? "✓" : "✗"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{check.item}</h3>
                      <span className={`text-xs font-medium ${check.pass ? "text-green-700" : "text-red-700"}`}>
                        {check.pass ? "符合" : "需修改或复核"}
                      </span>
                    </div>
                    <dl className="mt-3 space-y-3 text-sm leading-6">
                      <div>
                        <dt className="text-xs font-medium text-slate-500">依据条款</dt>
                        <dd className="mt-1 text-slate-600">{check.basis}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500">修改建议</dt>
                        <dd className="mt-1 text-slate-700">{check.suggestion}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
