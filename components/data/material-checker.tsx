"use client";

import { FormEvent, useState } from "react";
import { Check, FileCheck, RotateCcw, ShieldAlert, Upload, X } from "lucide-react";
import { WhuGateEmblem } from "@/components/brand/whu-motifs";
import { Button } from "@/components/ui/button";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import type { ApiResponse } from "@/types/api";
import type { MaterialCheckResult } from "@/types/material";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type FilterKey = "all" | "fail" | "pass";

export function MaterialChecker() {
  const [file, setFile] = useState<File | null>(null);
  const [localOnly, setLocalOnly] = useState(true);
  const [result, setResult] = useState<MaterialCheckResult | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submitFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    setFilter("all");
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

  function handleReset() {
    setFile(null);
    setResult(null);
    setFilter("all");
    setError("");
  }

  const totalChecks = result?.checks.length ?? 0;
  const passCount = result ? result.checks.filter((item) => item.pass).length : 0;
  const reviewCount = totalChecks - passCount;
  const passRatio = totalChecks > 0 ? passCount / totalChecks : 0;
  const passPercent = totalChecks > 0 ? Math.round(passRatio * 100) : 0;

  const visibleChecks = result
    ? result.checks.filter((item) => {
        if (filter === "fail") return !item.pass;
        if (filter === "pass") return item.pass;
        return true;
      })
    : [];

  return (
    <div className="space-y-5">
      <form onSubmit={submitFile} onReset={handleReset} className="card p-5 sm:p-6">
        {/* 顶部预检规格与隐私提示内层块（严禁 .card 套 .card，统一采用青瓷宣纸底） */}
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="flex items-start gap-3 rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-4 lg:col-span-7">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fbf3e2] text-[#9a6712] ring-1 ring-[#e8cf9d]"
            >
              <ShieldAlert size={17} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[#0f1d18]">上传前保密与授权确认</p>
                <span className="inline-flex items-center rounded-full bg-[#fbf3e2] px-2.5 py-0.5 text-[11px] font-semibold text-[#9a6712]">
                  商业敏感保护
                </span>
              </div>
              <p className="mt-1 text-xs leading-6 text-[#54635d]">
                申报材料可能包含未公开技术方案或商业数据，请确认已获团队授权。文件仅在服务端内存中完成文本结构核验，原文不入库、不落盘、不外发模型。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 lg:col-span-5">
            <div className="flex flex-col justify-between rounded-xl border border-[#d5e2db] bg-[#f8fbf9] px-3.5 py-3">
              <span className="text-[11px] font-medium text-[#5c6c65]">单文件上限</span>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="!font-display font-serif text-xl font-bold text-[#0f1d18] tabular-nums">10</span>
                <span className="text-xs font-medium text-[#54635d]">MB</span>
              </div>
              <span className="mt-1 inline-flex w-fit items-center rounded-full bg-[#e3f0ea] px-2 py-0.5 text-[10.5px] font-semibold text-[#115740]">
                含文本层
              </span>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-[#d5e2db] bg-[#f8fbf9] px-3.5 py-3">
              <span className="text-[11px] font-medium text-[#5c6c65]">支持格式</span>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="!font-display font-serif text-xl font-bold text-[#0f1d18] tabular-nums">2</span>
                <span className="text-xs font-medium text-[#54635d]">类文档</span>
              </div>
              <span className="mt-1 inline-flex w-fit items-center rounded-full bg-[#e3f0ea] px-2 py-0.5 text-[10.5px] font-semibold text-[#115740]">
                PDF / DOCX
              </span>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-[#d5e2db] bg-[#f8fbf9] px-3.5 py-3">
              <span className="text-[11px] font-medium text-[#5c6c65]">原文落盘</span>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="!font-display font-serif text-xl font-bold text-[#115740] tabular-nums">0</span>
                <span className="text-xs font-medium text-[#54635d]">字节</span>
              </div>
              <span className="mt-1 inline-flex w-fit items-center rounded-full bg-[#fbf3e2] px-2 py-0.5 text-[10.5px] font-semibold text-[#9a6712]">
                阅后即释
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="material-file" className="mb-2 block text-xs font-semibold text-[#33433d]">
            选择待预检材料
          </label>
          <FileDropZone label="检查材料" showSelection={false}>
            <input
              id="material-file"
              type="file"
              disabled={pending}
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setResult(null);
                setFilter("all");
                setError("");
              }}
              className="block w-full cursor-pointer rounded-xl border border-[#7f9384] bg-[#f8fbf9] px-3.5 py-3 text-sm text-[#33433d] transition-colors file:mr-3.5 file:cursor-pointer file:rounded-full file:border-0 file:bg-[#115740] file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:border-[#115740] hover:file:bg-[#0d4432] focus:border-[#115740] focus:outline-none focus:ring-2 focus:ring-[#115740]/15 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </FileDropZone>
          <p className="mt-2 text-xs text-[#5c6c65]">
            仅支持含可提取文本层的 PDF 与 DOCX 文档（上限 10MB）；纯图片扫描件请先完成文字识别转换后再行检测。
          </p>

          {file ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#d5e2db] bg-[#f8fbf9] px-3.5 py-2.5 text-xs">
              <div className="min-w-0 flex-1">
                <span className="font-medium text-[#0f1d18]">已选文件：{file.name}</span>
                <span className="ml-2 text-[#54635d]">
                  （<strong className="!font-display font-serif font-bold text-[#115740] tabular-nums">{(file.size / 1024).toFixed(1)}</strong> KB）
                </span>
              </div>
              <button
                type="reset"
                disabled={pending}
                className="inline-flex h-7 items-center gap-1 rounded-full border border-[#7f9384] bg-white px-3 text-xs font-medium text-[#33433d] transition-colors hover:border-[#115740] hover:bg-[#eef5f1] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw size={12} aria-hidden="true" />
                清空重选
              </button>
            </div>
          ) : null}
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[#d5e2db] bg-[#f8fbf9] px-4 py-3 text-sm text-[#162620]">
          <input
            type="checkbox"
            checked={localOnly}
            onChange={(event) => setLocalOnly(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#7f9384] text-[#115740] focus:ring-2 focus:ring-[#115740]/25"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-[#0f1d18]">仅本地内存检测、原文不入库</span>
            <span className="mt-0.5 block text-xs leading-5 text-[#54635d]">
              默认开启。系统始终不持久化材料正文，操作日志仅记录文件名、体积、扩展名与预检方式以供合规审计。
            </span>
          </span>
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            variant="default"
            type="submit"
            disabled={pending || !file}
            loading={pending}
            className="rounded-full bg-[#115740] px-6 text-white hover:bg-[#0d4432] active:bg-[#093325] focus-visible:ring-[#115740]/25"
          >
            {!pending ? <Upload size={16} aria-hidden="true" /> : null}
            {pending ? "正在解析与逐项核验…" : "开始预检"}
          </Button>
          {error ? (
            <p role="alert" className="text-sm font-medium text-[#b91c1c]">
              {error}
            </p>
          ) : null}
        </div>
      </form>

      {result ? (
        <section aria-live="polite" className="overflow-hidden card">
          <div className="flex flex-col gap-3 border-b border-[#dce7e0] bg-gradient-to-r from-[#f6faf8] via-white to-[#f3f8f5] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 font-display text-[17px] font-bold text-[#0e1d17]">
                <FileCheck size={18} className="text-[#115740]" aria-hidden="true" />
                检查清单
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#54635d]">{result.summary}</p>
            </div>
            <span
              className={`inline-flex w-fit shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold tabular-nums ${
                reviewCount === 0
                  ? "bg-[#e3f0ea] text-[#115740] ring-1 ring-[#bfd8cc]"
                  : "bg-[#fbf3e2] text-[#9a6712] ring-1 ring-[#e8cf9d]"
              }`}
            >
              {reviewCount === 0 ? `全部符合 · ${passPercent}%` : `待复核 ${reviewCount} 项 · 符合率 ${passPercent}%`}
            </span>
          </div>

          <div className="space-y-4 p-5 sm:p-6">
            {/* 预检统计概览块：宋体数字 + 青瓷/琥珀语义徽标 + scaleX 进度条 */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#d5e2db] bg-[#f8fbf9] px-4 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#5c6c65]">核验条款总数</span>
                  <span className="inline-flex items-center rounded-full bg-[#e3f0ea] px-2.5 py-0.5 text-[11px] font-semibold text-[#115740]">
                    全量扫描
                  </span>
                </div>
                <p className="mt-2 !font-display font-serif text-[28px] font-bold leading-none text-[#0f1d18] tabular-nums">
                  {totalChecks}
                </p>
              </div>

              <div className="rounded-xl border border-[#d5e2db] bg-[#f8fbf9] px-4 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#5c6c65]">已符合规范</span>
                  <span className="inline-flex items-center rounded-full bg-[#e3f0ea] px-2.5 py-0.5 text-[11px] font-semibold text-[#115740] tabular-nums">
                    占比 {passPercent}%
                  </span>
                </div>
                <p className="mt-2 !font-display font-serif text-[28px] font-bold leading-none text-[#115740] tabular-nums">
                  {passCount}
                </p>
              </div>

              <div className="rounded-xl border border-[#d5e2db] bg-[#f8fbf9] px-4 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#5c6c65]">待修改或复核</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      reviewCount > 0 ? "bg-[#fbf3e2] text-[#9a6712]" : "bg-[#e3f0ea] text-[#115740]"
                    }`}
                  >
                    {reviewCount > 0 ? "建议修订" : "无待办项"}
                  </span>
                </div>
                <p
                  className={`mt-2 !font-display font-serif text-[28px] font-bold leading-none tabular-nums ${
                    reviewCount > 0 ? "text-[#9a6712]" : "text-[#115740]"
                  }`}
                >
                  {reviewCount}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#d5e2db] bg-[#f8fbf9] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-medium text-[#33433d]">条款合规完成度</span>
                <span className="!font-display font-serif font-bold text-[#115740] tabular-nums">
                  {passCount} / {totalChecks} 项符合（{passPercent}%）
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#e2ece6]">
                <div
                  className="h-full w-full origin-left rounded-full bg-[#115740] transition-transform duration-300 ease-out motion-reduce:transition-none"
                  style={{ transform: `scaleX(${passRatio})` }}
                />
              </div>
            </div>

            {/* 胶囊筛选切换 */}
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="筛选检查结果">
              {([
                { key: "all", label: `全部条款（${totalChecks}）` },
                { key: "fail", label: `待复核（${reviewCount}）` },
                { key: "pass", label: `已符合（${passCount}）` },
              ] as const).map((tab) => {
                const active = filter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilter(tab.key)}
                    aria-pressed={active}
                    className={`inline-flex h-8 items-center rounded-full px-3.5 text-xs font-semibold tabular-nums transition-colors ${
                      active
                        ? "bg-[#115740] text-white"
                        : "border border-[#7f9384] bg-white text-[#33433d] hover:border-[#115740] hover:bg-[#f2f7f4]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {visibleChecks.length > 0 ? (
              <ol className="space-y-3">
                {visibleChecks.map((check, index) => (
                  <li
                    key={check.item}
                    className={`rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-4 ${
                      check.pass ? "border-l-[3px] border-l-[#115740]" : "border-l-[3px] border-l-[#c59b45]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          check.pass
                            ? "bg-[#e3f0ea] text-[#115740] ring-1 ring-[#bfd8cc]"
                            : "bg-[#fbf3e2] text-[#9a6712] ring-1 ring-[#e8cf9d]"
                        }`}
                      >
                        {check.pass ? <Check size={14} /> : <X size={14} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-[#0f1d18]">
                            <span className="mr-1.5 !font-display font-serif text-xs font-bold text-[#54635d] tabular-nums">
                              {index + 1}.
                            </span>
                            {check.item}
                          </h3>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              check.pass
                                ? "bg-[#e3f0ea] text-[#115740] ring-1 ring-[#bfd8cc]"
                                : "bg-[#fbf3e2] text-[#9a6712] ring-1 ring-[#e8cf9d]"
                            }`}
                          >
                            {check.pass ? "符合规范" : "需修改或复核"}
                          </span>
                        </div>

                        <dl className="mt-3 grid gap-3 border-t border-[#dce7e0] pt-3 text-xs leading-6 sm:grid-cols-2">
                          <div>
                            <dt className="font-semibold text-[#54635d]">依据条款</dt>
                            <dd className="mt-0.5 text-[#33433d]">{check.basis}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-[#54635d]">修改建议</dt>
                            <dd className="mt-0.5 text-[#0f1d18]">{check.suggestion}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#d5e2db] bg-[#f8fbf9] px-4 py-8 text-center">
                <WhuGateEmblem className="h-10 w-14 text-[#115740]/35" />
                <p className="mt-2.5 font-display text-sm font-semibold text-[#162620]">当前筛选下暂无对应条款</p>
                <p className="mt-1 text-xs text-[#677770]">可切换至「全部条款」查看完整预检报告</p>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
