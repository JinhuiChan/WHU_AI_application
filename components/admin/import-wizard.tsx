"use client";

import { Button } from "@/components/ui/button";
import LatticeLoader from "@/components/react-bits/LatticeLoader";
import StepperIndicator from "@/components/react-bits/StepperIndicator";
import Link from "next/link";
import { useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import type { ApiResponse } from "@/types/api";
import {
  importSystemFields,
  type ImportCommitResult,
  type ImportMapping,
  type ImportMappingSaveResult,
  type ImportParseResult,
  type ImportStage,
  type ImportSystemFieldKey,
  type ImportReviewedRow,
} from "@/types/import";

const steps = ["选择赛事并上传", "字段映射与预览", "入库报告"];
const maxFileSize = 20 * 1024 * 1024;
const fieldClass = "mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600";

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
  const visibleRows = aiRecognized ? reviewRows.slice(reviewPage * 20, reviewPage * 20 + 20) : (parseResult?.previewRows ?? []).map((values, index) => ({ values, rowNo: parseResult?.previewRowNumbers[index] ?? index + 2 }));

  function invalidateReview() {
    setConfirmed(false); setSavedBatchId(""); setCommitResult(null); setNotice("");
  }

  function editCell(rowNo: number, column: string, value: string) {
    const index = parseResult?.columns.indexOf(column) ?? -1;
    if (index < 0) return;
    setReviewRows((rows) => rows.map((row) => row.rowNo === rowNo ? { ...row, values: row.values.map((cell, at) => at === index ? value : cell) } : row));
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
    setPastedText(""); setFile(issue ? null : files[0]); setError(issue); setNotice("");
    setInputKey((value) => value + 1);
  }

  function chooseText(text: string) {
    if (pending !== null) return;
    if (text.trim() && text.trim().split(/\r?\n/).every((line) => /^(?:[A-Za-z]:[\\/]|file:\/\/).+\.(?:xlsx|docx|pdf|txt)\s*$/i.test(line.trim()))) {
      setError("剪贴板中只有文件路径，未包含文件内容。请将文件拖入，或复制文档里的报名文字。"); return;
    }
    setPastedText(text); setNotice("");
    const candidate = text.trim() ? new File([text], "粘贴报名资料.txt", { type: "text/plain;charset=utf-8" }) : null;
    const issue = text.length > 180000 ? "粘贴文字最多18万字符，请分批导入" : candidate ? fileIssue(candidate) : "";
    setFile(issue ? null : candidate); setError(issue);
  }

  function paste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.files);
    const items = files.length ? files : Array.from(event.clipboardData.items).filter((item) => item.kind === "file").map((item) => item.getAsFile()).filter((item): item is File => item !== null);
    if (items.length) { event.preventDefault(); chooseFiles(items); }
    else {
      event.preventDefault();
      const input = event.currentTarget;
      chooseText(input.value.slice(0, input.selectionStart) + event.clipboardData.getData("text/plain") + input.value.slice(input.selectionEnd));
    }
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); dragDepth.current = 0; setDragActive(false);
    if (pending !== null) return;
    const files = Array.from(event.dataTransfer.files);
    if (files.length) chooseFiles(files);
    else if (event.dataTransfer.getData("text/plain").trim()) chooseText(event.dataTransfer.getData("text/plain"));
    else setError("未收到可上传文件，请拖入单个文档，不支持文件夹");
  }

  function reset() {
    setStep(1);
    setFile(null);
    setPastedText(""); setDragActive(false); dragDepth.current = 0;
    setParseResult(null);
    setMapping({});
    setError("");
    setNotice("");
    setSavedBatchId("");
    setConfirmed(false);
    setCommitResult(null);
    setReviewRows([]); setReviewPage(0);
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
      setReviewRows(rows); setReviewPage(0); setConfirmed(false);
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
    if (aiRecognized && !reviewRows.length) { setError("请至少保留或补充一行数据"); return; }

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
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <StepperIndicator current={step} steps={steps} />
      </div>

      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {notice ? <div role="status" className="break-all rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</div> : null}

      {step === 1 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-medium text-slate-900">上传赛事报名数据</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">可选择、拖入或粘贴文件，也可直接粘贴报名文字。Word、PDF和文字由学校 AI 识别，先核对修改、再确认入库；Excel 沿用表格解析。单个文件不超过20MB，扫描件需先完成文字识别。</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              选择赛事
              <select value={competitionId} onChange={(event) => setCompetitionId(event.target.value)} disabled={pending !== null} className={fieldClass} required>
                {competitions.length ? null : <option value="">暂无赛事，请先创建赛事</option>}
                {competitions.map((competition) => (
                  <option key={competition.id} value={competition.id}>{competition.year} · {competition.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              导入阶段
              <select value={stage} onChange={(event) => setStage(event.target.value as ImportStage)} disabled={pending !== null} className={fieldClass}>
                <option value="SCHOOL">校赛</option>
                <option value="PROVINCE">省赛</option>
              </select>
            </label>
          </div>
          <div onDragEnter={(event) => { event.preventDefault(); if (pending === null) { dragDepth.current++; setDragActive(true); } }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = pending === null ? "copy" : "none"; }} onDragLeave={(event) => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragActive(false); }} onDrop={drop}
            className={`mt-5 rounded-xl border-2 border-dashed p-5 transition ${dragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50"}`}>
            <p className="font-medium text-slate-800">{dragActive ? "松开即可添加文件" : "把文件拖到这里，或在下方粘贴"}</p>
            {file ? <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm" aria-live="polite"><span className="break-all text-blue-700">已添加：{file.name}（{(file.size / 1024 / 1024).toFixed(2)} MB）</span><button type="button" disabled={pending !== null} className="text-slate-500 hover:text-red-600" onClick={() => { setFile(null); setPastedText(""); setError(""); setInputKey((value) => value + 1); }}>移除</button></div> : null}
            <p className="mt-1 text-xs leading-5 text-slate-500">支持 DOCX、PDF、XLSX、TXT，每次一份。粘贴文件需要剪贴板中包含文件，复制路径不会上传文件。</p>
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
            <Button type="button" variant="outline" size="sm" disabled={pending !== null} className="mt-3" onClick={() => fileInput.current?.click()}>选择文件</Button>
            <label htmlFor="import-paste" className="mb-2 mt-4 block text-sm font-medium text-slate-700">粘贴文件或报名文字</label>
            <textarea id="import-paste" value={pastedText} onPaste={paste} onChange={(event) => chooseText(event.target.value)} disabled={pending !== null} rows={5} maxLength={180000}
              placeholder="点击这里按 Ctrl+V：可粘贴剪贴板中的文件，也可粘贴 Word、Excel 里的报名文字，例如项目名称、负责人、学号、学院等。"
              className="w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          {pending === "parse" ? (
            <div className="mt-5 flex h-9 items-center">
              <LatticeLoader
                color="#2563eb"
                doneLabel="解析完成"
                errorLabel="解析失败"
                fontSize={13}
                label={file && /\.(docx|pdf|txt)$/i.test(file.name) ? "正在读取资料并识别报名数据…" : "正在解析文件"}
              />
            </div>
          ) : (
            <Button variant="default" size="sm"
              type="button"
              disabled={pending !== null || !file || !competitionId}
              onClick={parse}
              className="mt-5" >
              上传并解析
            </Button>
          )}
        </section>
      ) : null}

      {step === 2 && parseResult ? (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="font-medium text-slate-900">确认字段映射</h2>
                <p className="mt-1 text-sm text-slate-500">{parseResult.fileName} · {stage === "SCHOOL" ? "校赛" : "省赛"}，调整右侧文件列后预览会即时更新。</p>
              </div>
              <Button variant="outline" size="sm" type="button" disabled={pending !== null} onClick={reset} className="shrink-0" >重新选择文件</Button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-4"><div className="text-xs text-slate-500">识别列数</div><div className="mt-1 text-2xl font-semibold text-slate-900">{parseResult.columns.length}</div></div>
              <div className="rounded-lg bg-blue-50 p-4"><div className="text-xs text-blue-700">自动匹配字段</div><div className="mt-1 text-2xl font-semibold text-blue-700">{Object.keys(parseResult.suggestedMapping).length}</div></div>
              <div className="rounded-lg bg-slate-50 p-4"><div className="text-xs text-slate-500">{aiRecognized ? "待确认行数" : "数据总行数"}</div><div className="mt-1 text-2xl font-semibold text-slate-900">{aiRecognized ? reviewRows.length : parseResult.totalRows}</div></div>
              <div className="rounded-lg bg-slate-50 p-4"><div className="text-xs text-slate-500">{aiRecognized ? "分页核对全部数据" : "映射预览"}</div><div className="mt-1 text-2xl font-semibold text-slate-900">{aiRecognized ? `第 ${reviewPage + 1} 页` : `前 ${parseResult.previewRows.length} 行`}</div></div>
            </div>
            {parseResult.requiresConfirm ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                <p>识别结果尚未入库。请对照原文核对全部数据；可在下方修改、删除误识别行或补充遗漏行，修改后需重新确认。</p>
                <label className="mt-2 flex items-center gap-2 font-medium">
                  <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={pending !== null} />
                  我已核对全部识别行及其与原文的对应关系
                </label>
              </div>
            ) : null}
            {parseResult.recognition && <>
              {parseResult.recognition.warnings.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-800">{parseResult.recognition.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
              <details className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"><summary className="cursor-pointer text-blue-700">查看文档提取原文，核对是否有遗漏</summary><div className="mt-3 max-h-80 space-y-3 overflow-auto">{parseResult.recognition.blocks.map((block) => <div key={block.id}><p className="font-medium">{block.id}{block.page ? ` · 第 ${block.page} 页` : ""} · {block.section}</p><p className="whitespace-pre-wrap break-words text-slate-600">{block.text}</p></div>)}</div></details>
            </>}
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-medium text-slate-900">系统字段与文件列</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">带“必填”的系统字段必须完成映射；同一文件列不能重复选择。</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr><th className="px-5 py-3 font-medium">系统字段</th><th className="px-5 py-3 font-medium">文件列名</th><th className="px-5 py-3 font-medium">状态</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importSystemFields.map((field) => {
                    const selectedColumn = mapping[field.key] ?? "";
                    const duplicated = selectedColumn !== "" && duplicateColumns.includes(selectedColumn);
                    return (
                      <tr key={field.key}>
                        <td className="px-5 py-3 font-medium text-slate-800">
                          {field.label}
                          {field.required ? <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs font-normal text-red-600">必填</span> : <span className="ml-2 text-xs font-normal text-slate-400">可选</span>}
                        </td>
                        <td className="px-5 py-3">
                          <select aria-label={`${field.label}对应的文件列`} value={selectedColumn} onChange={(event) => updateMapping(field.key, event.target.value)} disabled={pending !== null} className="h-10 w-full min-w-64 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600">
                            <option value="">不映射</option>
                            {parseResult.columns.map((column) => <option key={column} value={column}>{column}</option>)}
                          </select>
                        </td>
                        <td className="px-5 py-3 text-xs">
                          {duplicated ? <span className="text-red-600">列重复</span> : field.required && !selectedColumn ? <span className="text-red-600">必填未映射</span> : selectedColumn ? <span className="text-green-700">已映射</span> : <span className="text-slate-400">不映射</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-medium text-slate-900">映射结果预览</h3>
              <p className="mt-1 text-xs text-slate-500">{aiRecognized ? "每页20行，可翻页核对和直接修改全部识别数据。" : "仅显示前20行。"}学号须为6–20位数字、手机号11位，入学/毕业年份须为数字；续行不重复校验项目必填项。</p>
              {aiRecognized && <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" size="sm" disabled={pending !== null || reviewPage === 0} onClick={() => setReviewPage((page) => page - 1)}>上一页</Button>
                <span className="text-xs text-slate-500">{reviewPage + 1} / {Math.max(1, Math.ceil(reviewRows.length / 20))}</span>
                <Button type="button" variant="outline" size="sm" disabled={pending !== null || (reviewPage + 1) * 20 >= reviewRows.length} onClick={() => setReviewPage((page) => page + 1)}>下一页</Button>
                <Button type="button" variant="outline" size="sm" disabled={pending !== null || reviewRows.length >= 1000} onClick={() => { const rowNo = nextReviewRow.current++; setReviewRows((rows) => [...rows, { rowNo, values: parseResult.columns.map(() => "") }]); setReviewPage(Math.floor(reviewRows.length / 20)); invalidateReview(); }}>补充一行</Button>
              </div>}
              {aiRecognized && <details className="mt-3 text-xs text-slate-500"><summary className="cursor-pointer">修改成员、指导老师的填写格式</summary><p className="mt-2">每人一行，英文逗号分隔，缺失项保留空位。成员：校内（是/否）,姓名,学号,培养阶段,培养单位,专业,性别,民族,入学年,毕业年,手机号,邮箱。指导老师：校内（是/否）,姓名,工号,性别,手机号,学校,单位,职称,邮箱。</p></details>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1800px] table-fixed text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="sticky left-0 z-10 w-32 bg-slate-50 px-3 py-3 font-medium">行号与原文</th>
                    {importSystemFields.map((field) => <th key={field.key} className="w-44 px-3 py-3 font-medium">{field.label}{field.required ? " *" : ""}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRows.map(({ values: row, rowNo }) => {
                    const continuation = !mappedValue(row, parseResult.columns, mapping, "projectName") && Boolean(
                      mappedValue(row, parseResult.columns, mapping, "members") || mappedValue(row, parseResult.columns, mapping, "teachers"),
                    );
                    return (
                      <tr key={rowNo} className="align-top">
                        <td className="sticky left-0 z-10 bg-white px-3 py-3 text-slate-500">{rowNo}
                          {aiRecognized && <><details className="mt-2"><summary className="cursor-pointer text-blue-700">原文</summary><div className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words">{(parseResult.recognition?.rowSources[String(rowNo)] ?? []).length ? parseResult.recognition?.blocks.filter((block) => parseResult.recognition?.rowSources[String(rowNo)]?.includes(block.id)).map((block) => <p key={block.id} className="mb-2">{block.id}{block.page ? ` 第${block.page}页` : ""}：{block.text}</p>) : "人工补充行，请自行对照原文。"}</div></details>
                          <button type="button" disabled={pending !== null} className="mt-2 text-red-600 hover:underline" onClick={() => { setReviewRows((rows) => rows.filter((item) => item.rowNo !== rowNo)); setReviewPage(Math.min(reviewPage, Math.max(0, Math.ceil((reviewRows.length - 1) / 20) - 1))); invalidateReview(); }}>删除此行</button></>}
                        </td>
                        {importSystemFields.map((field) => {
                          const column = mapping[field.key];
                          const value = mappedValue(row, parseResult.columns, mapping, field.key);
                          const issue = previewCellIssue(field, value, Boolean(column), continuation);
                          return (
                            <td key={field.key} className={`px-3 py-3 ${issue ? "bg-red-50 text-red-700" : "text-slate-700"}`}>
                              {aiRecognized && column ? <textarea aria-label={`第${rowNo}行${field.label}`} value={value} disabled={pending !== null} rows={field.key === "members" || field.key === "teachers" ? 3 : 2} maxLength={20000} onChange={(event) => editCell(rowNo, column, event.target.value)} className="w-full resize-y rounded border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none" /> : <div className="max-h-20 overflow-hidden whitespace-pre-wrap break-words">{column ? value || "—" : "未映射"}</div>}
                              {issue ? <div className="mt-1 font-medium text-red-600">{issue}{issue === "类型错误" ? "：数字格式不正确" : ""}</div> : null}
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

          <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <p className="text-sm leading-6 text-slate-500">保存会固定本次核对后的数据和映射，尚不写入报名记录；下一步确认后再入库。</p>
            <Button variant="default" size="sm" type="button" disabled={pending !== null || Boolean(savedBatchId)} onClick={saveMapping} className="shrink-0" >
              {pending === "save" ? "正在保存…" : savedBatchId ? "映射方案已保存" : "保存映射方案"}
            </Button>
          </section>
        </>
      ) : null}

      {step === 3 && parseResult ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-medium text-slate-900">{commitResult ? "入库完成" : "确认入库"}</h2>
          <p className="mt-1 break-all text-sm text-slate-500">{parseResult.fileName} · 批次号：{savedBatchId}</p>
          {!commitResult ? (
            <div className="mt-5">
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                将按映射结果识别项目和续行。同一批次只能入库一次；失败行会单独记录，不会导致已成功项目回滚。
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="default" size="sm" type="button" onClick={commit} disabled={pending !== null} >
                  {pending === "commit" ? "正在入库…" : "开始入库"}
                </Button>
                <Button variant="outline" size="sm" type="button" onClick={() => setStep(2)} disabled={pending !== null} >返回调整映射</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-4"><div className="text-xs text-slate-500">识别项目</div><div className="mt-1 text-2xl font-semibold text-slate-900">{commitResult.projectCount}</div></div>
                <div className="rounded-lg bg-blue-50 p-4"><div className="text-xs text-blue-700">续行</div><div className="mt-1 text-2xl font-semibold text-blue-700">{commitResult.continuationCount}</div></div>
                <div className="rounded-lg bg-green-50 p-4"><div className="text-xs text-green-700">成功项目</div><div className="mt-1 text-2xl font-semibold text-green-700">{commitResult.success}</div></div>
                <div className="rounded-lg bg-red-50 p-4"><div className="text-xs text-red-700">失败行</div><div className="mt-1 text-2xl font-semibold text-red-700">{commitResult.failed}</div></div>
              </div>
              <p className="mt-4 text-sm text-slate-600">识别到 {commitResult.projectCount} 个项目（含 {commitResult.continuationCount} 条续行），成功 {commitResult.success}、失败 {commitResult.failed}。</p>

              {commitResult.failures.length ? (
                <div className="mt-5 overflow-x-auto rounded-lg border border-red-100">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-red-50 text-xs text-red-700"><tr><th className="px-4 py-3 font-medium">原始行号</th><th className="px-4 py-3 font-medium">错误列</th><th className="px-4 py-3 font-medium">原因</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {commitResult.failures.map((failure, index) => (
                        <tr key={`${failure.rowNo}-${failure.field}-${index}`}><td className="px-4 py-3">{failure.rowNo}</td><td className="px-4 py-3">{failure.field}</td><td className="px-4 py-3 text-red-700">{failure.reason}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                {commitResult.failed > 0 ? <a href={`/api/import/failed?batchId=${encodeURIComponent(savedBatchId)}`} className="inline-flex h-10 items-center rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 hover:bg-red-100">下载失败行</a> : null}
                <Link href="/review" className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">前往审核工作台</Link>
              </div>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
