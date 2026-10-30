"use client";

import { useState } from "react";
import type { ApiResponse } from "@/types/api";
import {
  importSystemFields,
  type ImportMapping,
  type ImportMappingSaveResult,
  type ImportParseResult,
  type ImportStage,
  type ImportSystemFieldKey,
} from "@/types/import";

const steps = ["选择赛事并上传", "字段映射与预览"];
const maxFileSize = 20 * 1024 * 1024;
const fieldClass = "mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600";

type CompetitionOption = {
  id: string;
  name: string;
  year: number;
};

type ImportWizardProps = {
  competitions: CompetitionOption[];
};

type SystemField = (typeof importSystemFields)[number];

function previewCellIssue(field: SystemField, value: string, mapped: boolean) {
  if (!mapped) return null;
  if (field.required && !value) return "必填缺失";
  if (field.key === "leaderPersonNo" && value && !/^\d{10}$/.test(value)) return "类型错误";
  return null;
}

export function ImportWizard({ competitions }: ImportWizardProps) {
  const [step, setStep] = useState(1);
  const [competitionId, setCompetitionId] = useState(competitions[0]?.id ?? "");
  const [stage, setStage] = useState<ImportStage>("SCHOOL");
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [pending, setPending] = useState<"parse" | "save" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savedBatchId, setSavedBatchId] = useState("");

  const missingRequired = importSystemFields.filter((field) => field.required && !mapping[field.key]);
  const mappedColumns = Object.values(mapping).filter((column): column is string => Boolean(column));
  const duplicateColumns = mappedColumns.filter((column, index) => mappedColumns.indexOf(column) !== index);

  function reset() {
    setStep(1);
    setFile(null);
    setParseResult(null);
    setMapping({});
    setError("");
    setNotice("");
    setSavedBatchId("");
    setInputKey((value) => value + 1);
  }

  function updateMapping(field: ImportSystemFieldKey, column: string) {
    setMapping((current) => {
      const next = { ...current };
      if (column) next[field] = column;
      else delete next[field];
      return next;
    });
    setSavedBatchId("");
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
    if (!extension || !["xlsx", "docx", "pdf"].includes(extension)) {
      setError("仅支持 .xlsx、.docx、.pdf 格式文件");
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
        }),
      });
      const result = (await response.json()) as ApiResponse<ImportMappingSaveResult | null>;
      if (!response.ok || result.code !== 0 || !result.data) {
        throw new Error(result.message || "保存映射方案失败");
      }
      setSavedBatchId(result.data.batchId);
      setNotice(`映射方案已保存，批次号：${result.data.batchId}。本阶段未写入报名数据。`);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "保存映射方案失败，请稍后重试");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-5">
      <ol className="grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {steps.map((label, index) => {
          const number = index + 1;
          const active = step === number;
          const completed = step > number;
          return (
            <li key={label} className="flex items-center justify-center gap-2 text-xs md:text-sm">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${active || completed ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                {number}
              </span>
              <span className={active ? "font-medium text-blue-700" : "text-slate-500"}>{label}</span>
            </li>
          );
        })}
      </ol>

      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {notice ? <div role="status" className="break-all rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</div> : null}

      {step === 1 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-medium text-slate-900">上传赛事报名数据</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">支持 xlsx、docx、pdf，单个文件不超过 20MB。上传后先解析和映射，不会直接写入报名数据。</p>
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
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
            <label className="block text-sm font-medium text-slate-700" htmlFor="import-file">选择报名数据文件</label>
            <input
              key={inputKey}
              id="import-file"
              type="file"
              accept=".xlsx,.docx,.pdf"
              disabled={pending !== null}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError("");
              }}
              className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-blue-700"
            />
            {file ? <p className="mt-3 text-xs text-slate-500">已选择：{file.name}（{(file.size / 1024 / 1024).toFixed(2)} MB）</p> : null}
          </div>
          <button
            type="button"
            disabled={pending !== null || !file || !competitionId}
            onClick={parse}
            className="mt-5 h-10 rounded-md bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending === "parse" ? "正在解析…" : "上传并解析"}
          </button>
        </section>
      ) : null}

      {step === 2 && parseResult ? (
        <>
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="font-medium text-slate-900">确认字段映射</h2>
                <p className="mt-1 text-sm text-slate-500">{parseResult.fileName} · {stage === "SCHOOL" ? "校赛" : "省赛"}，调整右侧文件列后预览会即时更新。</p>
              </div>
              <button type="button" disabled={pending !== null} onClick={reset} className="h-9 shrink-0 rounded-md border border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50">重新选择文件</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-4"><div className="text-xs text-slate-500">识别列数</div><div className="mt-1 text-2xl font-semibold text-slate-900">{parseResult.columns.length}</div></div>
              <div className="rounded-lg bg-blue-50 p-4"><div className="text-xs text-blue-700">自动匹配字段</div><div className="mt-1 text-2xl font-semibold text-blue-700">{Object.keys(parseResult.suggestedMapping).length}</div></div>
              <div className="rounded-lg bg-slate-50 p-4"><div className="text-xs text-slate-500">数据总行数</div><div className="mt-1 text-2xl font-semibold text-slate-900">{parseResult.totalRows}</div></div>
              <div className="rounded-lg bg-slate-50 p-4"><div className="text-xs text-slate-500">映射预览</div><div className="mt-1 text-2xl font-semibold text-slate-900">前 {parseResult.previewRows.length} 行</div></div>
            </div>
            {parseResult.requiresConfirm ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                此 Word/PDF 解析结果已标记为 <strong>requiresConfirm=true</strong>，后续入库前必须人工核对；当前仅保存字段映射。
              </div>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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
                          <select aria-label={`${field.label}对应的文件列`} value={selectedColumn} onChange={(event) => updateMapping(field.key, event.target.value)} disabled={pending !== null} className="h-10 w-full min-w-64 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600">
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

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-medium text-slate-900">映射结果预览</h3>
              <p className="mt-1 text-xs text-slate-500">仅显示前 20 行；红色单元格为必填缺失或负责人学号类型错误（须为 10 位数字）。</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1800px] table-fixed text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="w-16 px-3 py-3 font-medium">行号</th>
                    {importSystemFields.map((field) => <th key={field.key} className="w-44 px-3 py-3 font-medium">{field.label}{field.required ? " *" : ""}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parseResult.previewRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="align-top">
                      <td className="px-3 py-3 text-slate-500">{rowIndex + 2}</td>
                      {importSystemFields.map((field) => {
                        const column = mapping[field.key];
                        const columnIndex = column ? parseResult.columns.indexOf(column) : -1;
                        const value = columnIndex >= 0 ? row[columnIndex] ?? "" : "";
                        const issue = previewCellIssue(field, value, columnIndex >= 0);
                        return (
                          <td key={field.key} className={`px-3 py-3 ${issue ? "bg-red-50 text-red-700" : "text-slate-700"}`}>
                            <div className="max-h-20 overflow-hidden whitespace-pre-wrap break-words">{column ? value || "—" : "未映射"}</div>
                            {issue ? <div className="mt-1 font-medium text-red-600">{issue}{issue === "类型错误" ? "：学号须为 10 位数字" : ""}</div> : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <p className="text-sm leading-6 text-slate-500">保存仅写入 ImportBatch.mappingJson 与审计记录，不会创建或修改项目、成员、老师及奖项。</p>
            <button type="button" disabled={pending !== null || Boolean(savedBatchId)} onClick={saveMapping} className="h-10 shrink-0 rounded-md bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {pending === "save" ? "正在保存…" : savedBatchId ? "映射方案已保存" : "保存映射方案"}
            </button>
          </section>
        </>
      ) : null}
    </div>
  );
}
