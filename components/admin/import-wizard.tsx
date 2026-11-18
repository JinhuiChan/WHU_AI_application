"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import LatticeLoader from "@/components/react-bits/LatticeLoader";
import { Button } from "@/components/ui/button";
import { SectionHead } from "@/components/ui/section-head";
import type { ApiResponse } from "@/types/api";
import {
  importSystemFields,
  type ImportCommitResult,
  type ImportMapping,
  type ImportMappingSaveResult,
  type ImportParseResult,
  type ImportReviewedRow,
  type ImportStage,
  type ImportSystemFieldKey,
} from "@/types/import";

const steps = ["选择赛事并上传", "字段映射与预览", "入库报告"];
const maxFileSize = 20 * 1024 * 1024;
const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15";

type CompetitionOption = {
  id: string;
  name: string;
  year: number;
};

type ImportWizardProps = {
  competitions: CompetitionOption[];
};

type SystemField = (typeof importSystemFields)[number];

function mappedValue(row: string[], columns: string[], mapping: ImportMapping, field: ImportSystemFieldKey) {
  const column = mapping[field];
  const index = column ? columns.indexOf(column) : -1;
  return index >= 0 ? row[index] ?? "" : "";
}

function previewCellIssue(field: SystemField, value: string, mapped: boolean, continuation: boolean) {
  if (!mapped) return null;
  if (field.required && !continuation && !value) return "必填缺失";
  if (field.key === "leaderPersonNo" && value && !/^\d{6,20}$/.test(value)) return "类型错误";
  if ((field.key === "enrollmentYear" || field.key === "graduationYear") && value && !/^\d+$/.test(value)) return "类型错误";
  if (field.key === "phone" && value && !/^\d{11}$/.test(value)) return "类型错误";
  return null;
}

export function ImportWizard({ competitions }: ImportWizardProps) {
  const [step, setStep] = useState(1);
  const [competitionId, setCompetitionId] = useState(competitions[0]?.id ?? "");
  const [stage, setStage] = useState<ImportStage>("SCHOOL");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [inputKey, setInputKey] = useState(0);
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [pending, setPending] = useState<"parse" | "save" | "commit" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savedBatchId, setSavedBatchId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [commitResult, setCommitResult] = useState<ImportCommitResult | null>(null);
  const [reviewRows, setReviewRows] = useState<ImportReviewedRow[]>([]);
  const [reviewPage, setReviewPage] = useState(0);
  const nextReviewRow = useRef(1);
  const aiRecognized = parseResult?.recognition?.mode === "ai";
  const visibleRows = aiRecognized
    ? reviewRows.slice(reviewPage * 20, reviewPage * 20 + 20)
    : (parseResult?.previewRows ?? []).map((values, index) => ({
        values,
        rowNo: parseResult?.previewRowNumbers[index] ?? index + 2,
      }));

  function invalidateReview() {
    setConfirmed(false);
    setSavedBatchId("");
    setCommitResult(null);
    setNotice("");
  }

  function editCell(rowNo: number, column: string, value: string) {
    const index = parseResult?.columns.indexOf(column) ?? -1;
    if (index < 0) return;
    setReviewRows((rows) =>
      rows.map((row) =>
        row.rowNo === rowNo ? { ...row, values: row.values.map((cell, at) => (at === index ? value : cell)) } : row,
      ),
    );
    invalidateReview();
  }

  const missingRequired = importSystemFields.filter((field) => field.required && !mapping[field.key]);
  const mappedColumns = Object.values(mapping).filter((column): column is string => Boolean(column));
  const duplicateColumns = mappedColumns.filter((column, index) => mappedColumns.indexOf(column) !== index);

  function fileIssue(candidate: File) {
    if (!/\.(xlsx|docx|pdf|txt)$/i.test(candidate.name)) return "仅支持 .xlsx、.docx、.pdf、.txt 格式文件";
    if (!candidate.size) return "文件不能为空";
    if (candidate.size > maxFileSize) return "文件不能超过 20MB";
    return "";
  }

  function chooseFiles(files: File[]) {
    if (pending !== null || !files.length) return;
    const issue = files.length > 1 ? "每次请拖入或粘贴一个文件，完成本批后再添加下一份" : fileIssue(files[0]);
    setPastedText("");
    setFile(issue ? null : files[0]);
    setError(issue);
    setNotice("");
    setInputKey((value) => value + 1);
  }

  function chooseText(text: string) {
    if (pending !== null) return;
    if (
      text.trim() &&
      text
        .trim()
        .split(/\r?\n/)
        .every((line) => /^(?:[A-Za-z]:[\\/]|file:\/\/).+\.(?:xlsx|docx|pdf|txt)\s*$/i.test(line.trim()))
    ) {
      setError("剪贴板中只有文件路径，未包含文件内容。请将文件拖入，或复制文档里的报名文字。");
      return;
    }
    setPastedText(text);
    setNotice("");
    const candidate = text.trim() ? new File([text], "粘贴报名资料.txt", { type: "text/plain;charset=utf-8" }) : null;
    const issue = text.length > 180000 ? "粘贴文字最多 18 万字符，请分批导入" : candidate ? fileIssue(candidate) : "";
    setFile(issue ? null : candidate);
    setError(issue);
  }

  function paste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.files);
    const items = files.length
      ? files
      : Array.from(event.clipboardData.items)
          .filter((item) => item.kind === "file")
          .map((item) => item.getAsFile())
          .filter((item): item is File => item !== null);
    if (items.length) {
      event.preventDefault();
      chooseFiles(items);
    } else {
      event.preventDefault();
      const input = event.currentTarget;
      chooseText(
        input.value.slice(0, input.selectionStart) +
          event.clipboardData.getData("text/plain") +
          input.value.slice(input.selectionEnd),
      );
    }
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    if (pending !== null) return;
    const files = Array.from(event.dataTransfer.files);
    if (files.length) chooseFiles(files);
    else if (event.dataTransfer.getData("text/plain").trim()) chooseText(event.dataTransfer.getData("text/plain"));
    else setError("未收到可上传文件，请拖入单个文档，不支持文件夹");
  }

  function reset() {
    setStep(1);
    setFile(null);
    setPastedText("");
    setDragActive(false);
    dragDepth.current = 0;
    setParseResult(null);
    setMapping({});
    setError("");
    setNotice("");
    setSavedBatchId("");
    setConfirmed(false);
    setCommitResult(null);
    setReviewRows([]);
    setReviewPage(0);
    setInputKey((value) => value + 1);
  }

  function updateMapping(field: ImportSystemFieldKey, column: string) {
    setConfirmed(false);
    setMapping((current) => {
      const next = { ...current };
      if (column) next[field] = column;
      else delete next[field];
      return next;
    });
    setSavedBatchId("");
    setCommitResult(null);
    setNotice("");
    setError("");
  }

  async function parse() {
    if (!competitionId) {
      setError("请选择赛事");
      return;
    }
    if (!file) {
      setError("请先选择要上传的文件");
      return;
    }
    const extension = file.name.toLowerCase().split(".").pop();
    if (!extension || !["xlsx", "docx", "pdf", "txt"].includes(extension)) {
      setError("仅支持 .xlsx、.docx、.pdf、.txt 格式文件");
      return;
    }
    if (file.size > maxFileSize) {
      setError("文件不能超过 20MB");
      return;
    }

    setPending("parse");
    setError("");
    setNotice("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/import/parse", { method: "POST", body: formData });
      const result = (await response.json()) as ApiResponse<ImportParseResult | null>;
      if (!response.ok || result.code !== 0 || !result.data) {
        throw new Error(result.message || "文件解析失败");
      }
      setParseResult(result.data);
      setMapping(result.data.suggestedMapping);
      const rows = result.data.draftRows ?? [];
      setReviewRows(rows);
      setReviewPage(0);
      setConfirmed(false);
      nextReviewRow.current = Math.max(0, ...rows.map((row) => row.rowNo)) + 1;
      setSavedBatchId("");
      setStep(2);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "文件解析失败，请稍后重试");
    } finally {
      setPending(null);
    }
  }

  async function saveMapping() {
    if (!parseResult) return;
    if (missingRequired.length) {
      setError(`必填字段未映射：${missingRequired.map((field) => field.label).join("、")}`);
      return;
    }
    if (duplicateColumns.length) {
      setError(`文件列不能重复映射：${[...new Set(duplicateColumns)].join("、")}`);
      return;
    }
    if (parseResult.requiresConfirm && !confirmed) {
      setError("请先核对识别结果并勾选确认");
      return;
    }
    if (aiRecognized && !reviewRows.length) {
      setError("请至少保留或补充一行数据");
      return;
    }

    setPending("save");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/import/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitionId,
          stage,
          fileName: parseResult.fileName,
          totalRows: parseResult.totalRows,
          mapping,
          sourceKey: parseResult.sourceKey,
          confirmed,
          ...(aiRecognized ? { reviewedRows: reviewRows } : {}),
        }),
      });
      const result = (await response.json()) as ApiResponse<ImportMappingSaveResult | null>;
      if (!response.ok || result.code !== 0 || !result.data) {
        throw new Error(result.message || "保存映射方案失败");
      }
      setSavedBatchId(result.data.batchId);
      setCommitResult(null);
      setNotice(`映射方案已保存，批次号：${result.data.batchId}。确认后可开始入库。`);
      setStep(3);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "保存映射方案失败，请稍后重试");
    } finally {
      setPending(null);
    }
  }

  async function commit() {
    if (!savedBatchId) return;
    setPending("commit");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: savedBatchId }),
      });
      const result = (await response.json()) as ApiResponse<ImportCommitResult | null>;
      if (!response.ok || result.code !== 0 || !result.data) {
        throw new Error(result.message || "导入入库失败");
      }
      setCommitResult(result.data);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "导入入库失败，请稍后重试");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-5">
      <nav aria-label="导入流程步骤" className="card p-3 sm:p-4">
        <ol className="grid gap-2 sm:grid-cols-3">
          {steps.map((label, index) => {
            const number = index + 1;
            const active = number === step;
            const complete = number < step;
            return (
              <li
                key={label}
                aria-current={active ? "step" : undefined}
                className={`flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm transition-colors duration-150 ${
                  active
                    ? "border-[#a8ccb9] bg-[#eef5f1] font-semibold text-[#115740]"
                    : complete
                      ? "border-[#d5e2db] bg-[#f8fbf9] font-medium text-[#162620]"
                      : "border-transparent bg-[#f4f8f6] text-[#687971]"
                }`}
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums ${
                    active
                      ? "bg-[#115740] text-white"
                      : complete
                        ? "bg-[#dbece2] text-[#115740]"
                        : "border border-[#7f9384] bg-white text-[#5c6c65]"
                  }`}
                >
                  {complete ? <Check aria-hidden="true" size={13} strokeWidth={2.75} /> : number}
                </span>
                <span className="truncate">{label}</span>
              </li>
            );
          })}
        </ol>
      </nav>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div
          role="status"
          className="break-all rounded-xl border border-[#badec9] bg-[#eef5f1] px-4 py-3 text-sm text-[#115740]"
        >
          {notice}
        </div>
      ) : null}

      {step === 1 ? (
        <section className="card p-5">
          <SectionHead
            title="上传赛事报名数据"
            sub="支持选择、拖入或粘贴文件，也可直接粘贴报名文字。Word、PDF 与文字将自动识别并供逐行核对，Excel 沿用表格解析。"
            meta="单文件 ≤ 20MB"
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-[#1b2b25]">
              选择赛事
              <select
                value={competitionId}
                onChange={(event) => setCompetitionId(event.target.value)}
                disabled={pending !== null}
                className={fieldClass}
                required
              >
                {competitions.length ? null : <option value="">暂无赛事，请先创建赛事</option>}
                {competitions.map((competition) => (
                  <option key={competition.id} value={competition.id}>
                    {competition.year} · {competition.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-[#1b2b25]">
              导入阶段
              <select
                value={stage}
                onChange={(event) => setStage(event.target.value as ImportStage)}
                disabled={pending !== null}
                className={fieldClass}
              >
                <option value="SCHOOL">校赛</option>
                <option value="PROVINCE">省赛</option>
              </select>
            </label>
          </div>
          <div
            onDragEnter={(event) => {
              event.preventDefault();
              if (pending === null) {
                dragDepth.current++;
                setDragActive(true);
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = pending === null ? "copy" : "none";
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              dragDepth.current = Math.max(0, dragDepth.current - 1);
              if (!dragDepth.current) setDragActive(false);
            }}
            onDrop={drop}
            className={`mt-5 rounded-xl border-2 border-dashed p-5 transition-colors duration-150 ${
              dragActive ? "border-[#115740] bg-[#eef5f1]" : "border-[#7f9384] bg-[#f8fbf9]"
            }`}
          >
            <p className="font-medium text-[#0e1d17]">
              {dragActive ? "松开即可添加文件" : "把文件拖到这里，或在下方粘贴"}
            </p>
            {file ? (
              <div
                className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#badec9] bg-[#eef5f1] px-3.5 py-2.5 text-sm"
                aria-live="polite"
              >
                <span className="break-all font-medium text-[#115740]">
                  已添加：{file.name}（{(file.size / 1024 / 1024).toFixed(2)} MB）
                </span>
                <button
                  type="button"
                  disabled={pending !== null}
                  className="inline-flex h-7 items-center rounded-full border border-[#7f9384] bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                  onClick={() => {
                    setFile(null);
                    setPastedText("");
                    setError("");
                    setInputKey((value) => value + 1);
                  }}
                >
                  移除
                </button>
              </div>
            ) : null}
            <p className="mt-1.5 text-xs leading-5 text-[#54635d]">
              支持 DOCX、PDF、XLSX、TXT，每次一份。粘贴文件需剪贴板中包含文件本体，仅复制路径无法上传。
            </p>
            <input
              key={inputKey}
              ref={fileInput}
              id="import-file"
              type="file"
              accept=".xlsx,.docx,.pdf,.txt"
              disabled={pending !== null}
              onChange={(event) => chooseFiles(Array.from(event.target.files ?? []))}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending !== null}
              className="mt-3"
              onClick={() => fileInput.current?.click()}
            >
              选择文件
            </Button>
            <label htmlFor="import-paste" className="mb-2 mt-4 block text-sm font-medium text-[#1b2b25]">
              粘贴文件或报名文字
            </label>
            <textarea
              id="import-paste"
              value={pastedText}
              onPaste={paste}
              onChange={(event) => chooseText(event.target.value)}
              disabled={pending !== null}
              rows={5}
              maxLength={180000}
              placeholder="点击这里按 Ctrl+V：可粘贴剪贴板中的文件，也可粘贴 Word、Excel 里的报名文字，例如项目名称、负责人、学号、学院等。"
              className="w-full resize-y rounded-lg border border-[#7f9384] bg-white p-3 text-sm text-[#0f1d18] outline-none transition focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15"
            />
          </div>
          {pending === "parse" ? (
            <div className="mt-5 flex h-10 items-center">
              <LatticeLoader
                color="#115740"
                doneLabel="解析完成"
                errorLabel="解析失败"
                fontSize={13}
                label={file && /\.(docx|pdf|txt)$/i.test(file.name) ? "正在读取资料并识别报名数据…" : "正在解析文件"}
              />
            </div>
          ) : (
            <Button
              type="button"
              disabled={pending !== null || !file || !competitionId}
              onClick={() => void parse()}
              className="mt-5 bg-[#115740] text-white hover:bg-[#0d4633]"
            >
              上传并解析
            </Button>
          )}
        </section>
      ) : null}

      {step === 2 && parseResult ? (
        <>
          <section className="card p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <SectionHead
                title="确认字段映射"
                sub={`${parseResult.fileName} · ${stage === "SCHOOL" ? "校赛" : "省赛"}，调整右侧文件列后下方预览即时同步。`}
              />
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={pending !== null}
                onClick={reset}
                className="shrink-0"
              >
                重新选择文件
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-4">
                <div className="t-label text-xs text-[#54635d]">识别列数</div>
                <div className="mt-1 font-serif text-2xl font-semibold text-[#0e1d17] tabular-nums">
                  {parseResult.columns.length}
                </div>
              </div>
              <div className="rounded-xl border border-[#badec9] bg-[#eef5f1] p-4">
                <div className="text-xs font-medium text-[#115740]">自动匹配字段</div>
                <div className="mt-1 font-serif text-2xl font-semibold text-[#115740] tabular-nums">
                  {Object.keys(parseResult.suggestedMapping).length}
                </div>
              </div>
              <div className="rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-4">
                <div className="t-label text-xs text-[#54635d]">{aiRecognized ? "待确认行数" : "数据总行数"}</div>
                <div className="mt-1 font-serif text-2xl font-semibold text-[#0e1d17] tabular-nums">
                  {aiRecognized ? reviewRows.length : parseResult.totalRows}
                </div>
              </div>
              <div className="rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-4">
                <div className="t-label text-xs text-[#54635d]">{aiRecognized ? "分页核对全部数据" : "映射预览"}</div>
                <div className="mt-1 font-serif text-2xl font-semibold text-[#0e1d17] tabular-nums">
                  {aiRecognized ? `第 ${reviewPage + 1} 页` : `前 ${parseResult.previewRows.length} 行`}
                </div>
              </div>
            </div>
            {parseResult.requiresConfirm ? (
              <div className="mt-4 rounded-xl border border-[#ead4a8] bg-[#fdf6e7] px-4 py-3 text-sm leading-6 text-[#854d0e]">
                <p>识别结果尚未入库。请对照原文核对全部数据；可在下方修改、删除误识别行或补充遗漏行，修改后需重新确认。</p>
                <label className="mt-2 flex cursor-pointer items-center gap-2 font-medium text-[#162620]">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                    disabled={pending !== null}
                    className="h-4 w-4 rounded border-[#7f9384] text-[#115740] focus:ring-[#115740]/20"
                  />
                  我已核对全部识别行及其与原文的对应关系
                </label>
              </div>
            ) : null}
            {parseResult.recognition ? (
              <>
                {parseResult.recognition.warnings.length > 0 ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#9a5b13]">
                    {parseResult.recognition.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
                <details className="mt-3 rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-3.5 text-sm">
                  <summary className="cursor-pointer font-medium text-[#115740]">
                    查看文档提取原文，核对是否有遗漏
                  </summary>
                  <div className="mt-3 max-h-80 space-y-3 overflow-auto">
                    {parseResult.recognition.blocks.map((block) => (
                      <div key={block.id} className="border-l-2 border-[#115740]/40 pl-3">
                        <p className="font-medium text-[#0e1d17]">
                          {block.id}
                          {block.page ? ` · 第 ${block.page} 页` : ""} · {block.section}
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-xs leading-5 text-[#4d5e57]">
                          {block.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              </>
            ) : null}
          </section>

          <section className="overflow-hidden card">
            <div className="border-b border-[#e2ece6] px-5 py-4">
              <SectionHead
                title="系统字段与文件列"
                sub="标注「必填」的系统字段须完成映射，同一文件列不可重复选择。"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="t-thead bg-[#f5faf7] text-xs text-[#4d5e57]">
                  <tr>
                    <th className="px-5 py-3 font-medium">系统字段</th>
                    <th className="px-5 py-3 font-medium">文件列名</th>
                    <th className="px-5 py-3 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef4f0]">
                  {importSystemFields.map((field) => {
                    const selectedColumn = mapping[field.key] ?? "";
                    const duplicated = selectedColumn !== "" && duplicateColumns.includes(selectedColumn);
                    return (
                      <tr key={field.key}>
                        <td className="px-5 py-3 font-medium text-[#0e1d17]">
                          {field.label}
                          {field.required ? (
                            <span className="ml-2 rounded-full bg-[#faeaea] px-2 py-0.5 text-xs font-medium text-[#9e2a35]">
                              必填
                            </span>
                          ) : (
                            <span className="ml-2 text-xs font-normal text-[#6c7e76]">可选</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <select
                            aria-label={`${field.label}对应的文件列`}
                            value={selectedColumn}
                            onChange={(event) => updateMapping(field.key, event.target.value)}
                            disabled={pending !== null}
                            className="h-10 w-full min-w-64 rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15"
                          >
                            <option value="">不映射</option>
                            {parseResult.columns.map((column) => (
                              <option key={column} value={column}>
                                {column}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-3 text-xs">
                          {duplicated ? (
                            <span className="inline-flex rounded-full bg-[#faeaea] px-2.5 py-0.5 font-medium text-[#9e2a35]">
                              列重复
                            </span>
                          ) : field.required && !selectedColumn ? (
                            <span className="inline-flex rounded-full bg-[#faeaea] px-2.5 py-0.5 font-medium text-[#9e2a35]">
                              必填未映射
                            </span>
                          ) : selectedColumn ? (
                            <span className="inline-flex rounded-full bg-[#eef5f1] px-2.5 py-0.5 font-medium text-[#115740]">
                              已映射
                            </span>
                          ) : (
                            <span className="text-[#6c7e76]">不映射</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden card">
            <div className="border-b border-[#e2ece6] px-5 py-4">
              <SectionHead
                title="映射结果预览"
                sub={`${
                  aiRecognized ? "每页 20 行，可翻页核对并直接修改全部识别数据。" : "仅展示前 20 行供核对。"
                }学号须为 6 至 20 位数字、手机号 11 位，入学与毕业年份须为数字；续行不重复校验项目必填项。`}
              />
              {aiRecognized ? (
                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending !== null || reviewPage === 0}
                    onClick={() => setReviewPage((page) => page - 1)}
                  >
                    上一页
                  </Button>
                  <span className="text-xs font-medium text-[#54635d] tabular-nums">
                    {reviewPage + 1} / {Math.max(1, Math.ceil(reviewRows.length / 20))}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending !== null || (reviewPage + 1) * 20 >= reviewRows.length}
                    onClick={() => setReviewPage((page) => page + 1)}
                  >
                    下一页
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending !== null || reviewRows.length >= 1000}
                    onClick={() => {
                      const rowNo = nextReviewRow.current++;
                      setReviewRows((rows) => [...rows, { rowNo, values: parseResult.columns.map(() => "") }]);
                      setReviewPage(Math.floor(reviewRows.length / 20));
                      invalidateReview();
                    }}
                  >
                    补充一行
                  </Button>
                </div>
              ) : null}
              {aiRecognized ? (
                <details className="mt-3 text-xs text-[#54635d]">
                  <summary className="cursor-pointer font-medium text-[#115740]">
                    修改成员、指导老师的填写格式说明
                  </summary>
                  <p className="mt-2 leading-5">
                    每人一行，英文逗号分隔，缺失项保留空位。成员：校内（是/否）,姓名,学号,培养阶段,培养单位,专业,性别,民族,入学年,毕业年,手机号,邮箱。指导老师：校内（是/否）,姓名,工号,性别,手机号,学校,单位,职称,邮箱。
                  </p>
                </details>
              ) : null}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1800px] table-fixed text-left text-xs">
                <thead className="bg-[#f5faf7] text-[#4d5e57]">
                  <tr>
                    <th className="sticky left-0 z-10 w-32 bg-[#f5faf7] px-3 py-3 font-medium">行号与原文</th>
                    {importSystemFields.map((field) => (
                      <th key={field.key} className="w-44 px-3 py-3 font-medium">
                        {field.label}
                        {field.required ? " *" : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef4f0]">
                  {visibleRows.map(({ values: row, rowNo }) => {
                    const continuation =
                      !mappedValue(row, parseResult.columns, mapping, "projectName") &&
                      Boolean(
                        mappedValue(row, parseResult.columns, mapping, "members") ||
                          mappedValue(row, parseResult.columns, mapping, "teachers"),
                      );
                    return (
                      <tr key={rowNo} className="align-top">
                        <td className="sticky left-0 z-10 bg-white px-3 py-3 text-[#54635d] tabular-nums">
                          {rowNo}
                          {aiRecognized ? (
                            <>
                              <details className="mt-2">
                                <summary className="cursor-pointer font-medium text-[#115740]">原文</summary>
                                <div className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words">
                                  {(parseResult.recognition?.rowSources[String(rowNo)] ?? []).length
                                    ? parseResult.recognition?.blocks
                                        .filter((block) =>
                                          parseResult.recognition?.rowSources[String(rowNo)]?.includes(block.id),
                                        )
                                        .map((block) => (
                                          <p key={block.id} className="mb-2">
                                            {block.id}
                                            {block.page ? ` 第${block.page}页` : ""}：{block.text}
                                          </p>
                                        ))
                                    : "人工补充行，请自行对照原文。"}
                                </div>
                              </details>
                              <button
                                type="button"
                                disabled={pending !== null}
                                className="mt-2 inline-flex rounded-full border border-red-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-50"
                                onClick={() => {
                                  setReviewRows((rows) => rows.filter((item) => item.rowNo !== rowNo));
                                  setReviewPage(
                                    Math.min(reviewPage, Math.max(0, Math.ceil((reviewRows.length - 1) / 20) - 1)),
                                  );
                                  invalidateReview();
                                }}
                              >
                                删除此行
                              </button>
                            </>
                          ) : null}
                        </td>
                        {importSystemFields.map((field) => {
                          const column = mapping[field.key];
                          const value = mappedValue(row, parseResult.columns, mapping, field.key);
                          const issue = previewCellIssue(field, value, Boolean(column), continuation);
                          return (
                            <td
                              key={field.key}
                              className={`px-3 py-3 ${issue ? "bg-red-50 text-red-700" : "text-[#26342e]"}`}
                            >
                              {aiRecognized && column ? (
                                <textarea
                                  aria-label={`第${rowNo}行${field.label}`}
                                  value={value}
                                  disabled={pending !== null}
                                  rows={field.key === "members" || field.key === "teachers" ? 3 : 2}
                                  maxLength={20000}
                                  onChange={(event) => editCell(rowNo, column, event.target.value)}
                                  className="w-full resize-y rounded-lg border border-[#7f9384] bg-white p-2 text-xs text-[#0f1d18] outline-none focus:border-[#115740]"
                                />
                              ) : (
                                <div className="max-h-20 overflow-hidden whitespace-pre-wrap break-words">
                                  {column ? value || "未填" : "未映射"}
                                </div>
                              )}
                              {issue ? (
                                <div className="mt-1 font-medium text-red-600">
                                  {issue}
                                  {issue === "类型错误" ? "：数字格式不正确" : ""}
                                </div>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex flex-col gap-3 card p-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm leading-6 text-[#54635d]">
              保存会固定本次核对后的数据与映射方案，尚不写入报名台账；下一步确认后再正式入库。
            </p>
            <Button
              type="button"
              disabled={pending !== null || Boolean(savedBatchId)}
              onClick={() => void saveMapping()}
              className="shrink-0 bg-[#115740] text-white hover:bg-[#0d4633]"
            >
              {pending === "save" ? "正在保存…" : savedBatchId ? "映射方案已保存" : "保存映射方案"}
            </Button>
          </section>
        </>
      ) : null}

      {step === 3 && parseResult ? (
        <section className="card p-5">
          <SectionHead
            title={commitResult ? "入库完成" : "确认入库"}
            sub={`${parseResult.fileName} · 批次号：${savedBatchId}`}
          />
          {!commitResult ? (
            <div className="mt-5">
              <div className="rounded-xl border border-[#ead4a8] bg-[#fdf6e7] px-4 py-3 text-sm leading-6 text-[#854d0e]">
                将按映射结果识别项目与续行。同一批次仅可入库一次；失败行将单独记录原因，不会导致已成功项目回滚。
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => void commit()}
                  disabled={pending !== null}
                  className="bg-[#115740] text-white hover:bg-[#0d4633]"
                >
                  {pending === "commit" ? "正在入库…" : "开始入库"}
                </Button>
                <Button variant="outline" type="button" onClick={() => setStep(2)} disabled={pending !== null}>
                  返回调整映射
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-4">
                  <div className="t-label text-xs text-[#54635d]">识别项目</div>
                  <div className="mt-1 font-serif text-2xl font-semibold text-[#0e1d17] tabular-nums">
                    {commitResult.projectCount}
                  </div>
                </div>
                <div className="rounded-xl border border-[#badec9] bg-[#eef5f1] p-4">
                  <div className="text-xs font-medium text-[#115740]">续行记录</div>
                  <div className="mt-1 font-serif text-2xl font-semibold text-[#115740] tabular-nums">
                    {commitResult.continuationCount}
                  </div>
                </div>
                <div className="rounded-xl border border-[#badec9] bg-[#eef5f1] p-4">
                  <div className="text-xs font-medium text-[#115740]">成功项目</div>
                  <div className="mt-1 font-serif text-2xl font-semibold text-[#115740] tabular-nums">
                    {commitResult.success}
                  </div>
                </div>
                <div className="rounded-xl border border-[#eccacd] bg-[#faeaea] p-4">
                  <div className="text-xs font-medium text-[#9e2a35]">失败行</div>
                  <div className="mt-1 font-serif text-2xl font-semibold text-[#9e2a35] tabular-nums">
                    {commitResult.failed}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm text-[#33433d] tabular-nums">
                共识别到 {commitResult.projectCount} 个项目（含 {commitResult.continuationCount} 条续行），成功入库{" "}
                {commitResult.success} 项、失败 {commitResult.failed} 行。
              </p>

              {commitResult.failures.length ? (
                <div className="mt-5 overflow-x-auto rounded-xl border border-[#eccacd]">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-[#faeaea] text-xs text-[#9e2a35]">
                      <tr>
                        <th className="px-4 py-3 font-medium">原始行号</th>
                        <th className="px-4 py-3 font-medium">错误列</th>
                        <th className="px-4 py-3 font-medium">原因</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef4f0]">
                      {commitResult.failures.map((failure, index) => (
                        <tr key={`${failure.rowNo}-${failure.field}-${index}`}>
                          <td className="px-4 py-3 tabular-nums">{failure.rowNo}</td>
                          <td className="px-4 py-3">{failure.field}</td>
                          <td className="px-4 py-3 text-[#9e2a35]">{failure.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                {commitResult.failed > 0 ? (
                  <a
                    href={`/api/import/failed?batchId=${encodeURIComponent(savedBatchId)}`}
                    className="inline-flex h-10 items-center rounded-full border border-[#eccacd] bg-[#faeaea] px-5 text-sm font-medium text-[#9e2a35] transition-colors hover:bg-red-100"
                  >
                    下载失败行
                  </a>
                ) : null}
                <Link
                  href="/review"
                  className="inline-flex h-10 items-center rounded-full bg-[#115740] px-5 text-sm font-medium text-white transition-colors hover:bg-[#0d4633]"
                >
                  前往审核工作台
                </Link>
              </div>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
