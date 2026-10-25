"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { awardLevelLabels } from "@/lib/presentation";
import type { ApiResponse } from "@/types/api";
import type { ImportCommitResult, ImportValidationReport } from "@/types/import";

const steps = ["下载并上传模板", "逐行校验", "确认入库"];

export function ImportWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [report, setReport] = useState<ImportValidationReport | null>(null);
  const [result, setResult] = useState<ImportCommitResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setStep(1);
    setFile(null);
    setReport(null);
    setResult(null);
    setError("");
    setInputKey((value) => value + 1);
  }

  async function validate() {
    if (!file) {
      setError("请先选择要上传的 Excel 文件");
      return;
    }
    setPending(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/import/validate", { method: "POST", body: formData });
      const result = (await response.json()) as ApiResponse<ImportValidationReport | null>;
      if (result.data) {
        setReport(result.data);
        setStep(2);
      }
      if (!response.ok || result.code !== 0) {
        if (result.data) return;
        throw new Error(result.message || "文件校验失败");
      }
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "文件校验失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  async function commit() {
    if (!file || !report) return;
    setPending(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("onlyValid", String(report.invalidRows > 0));
      const response = await fetch("/api/import/commit", { method: "POST", body: formData });
      const result = (await response.json()) as ApiResponse<ImportCommitResult | ImportValidationReport | null>;
      if (!response.ok || result.code !== 0) {
        if (result.data && "rows" in result.data) {
          setReport(result.data);
          setStep(2);
        }
        throw new Error(result.message || "确认导入失败");
      }
      if (!result.data || "rows" in result.data) {
        throw new Error("接口返回内容不正确");
      }
      setResult(result.data);
      setStep(3);
      router.refresh();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "确认导入失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <ol className="grid grid-cols-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {steps.map((label, index) => {
          const number = index + 1;
          const active = step === number;
          const completed = step > number;
          return (
            <li key={label} className="relative flex items-center justify-center gap-2 text-xs md:text-sm">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${active || completed ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                {number}
              </span>
              <span className={`hidden sm:inline ${active ? "font-medium text-blue-700" : "text-slate-500"}`}>{label}</span>
            </li>
          );
        })}
      </ol>

      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {step === 1 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="font-medium text-slate-900">上传获奖公示</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">仅支持 .xlsx，文件不超过 5MB、数据不超过 500 行。校验阶段不会写入数据库。</p>
            </div>
            <a href="/samples/获奖公示模板.xlsx" download className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-4 text-sm font-medium text-blue-700 hover:bg-blue-100">下载模板</a>
          </div>
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
            <label className="block text-sm font-medium text-slate-700" htmlFor="import-file">选择 Excel 文件</label>
            <input
              key={inputKey}
              id="import-file"
              type="file"
              accept=".xlsx"
              disabled={pending}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError("");
              }}
              className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-blue-700"
            />
            {file ? <p className="mt-3 text-xs text-slate-500">已选择：{file.name}（{(file.size / 1024).toFixed(1)} KB）</p> : null}
          </div>
          <div className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
            已有项目按“项目名称 + 赛年 + 学院”关联，负责人须与现有负责人一致；新项目会同时创建项目和一名负责人。负责人及成员须为 1–10 人，指导教师不超过 3 人。
          </div>
          <button type="button" disabled={pending || !file} onClick={validate} className="mt-5 h-10 rounded-md bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {pending ? "正在逐行校验…" : "上传并校验"}
          </button>
        </section>
      ) : null}

      {step === 2 && report ? (
        <>
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-medium text-slate-900">逐行校验结果</h2>
                <p className="mt-1 text-sm text-slate-500">{report.fileName}，此步骤尚未写入数据库。</p>
              </div>
              <button type="button" disabled={pending} onClick={reset} className="h-9 rounded-md border border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50">重新选择文件</button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-slate-50 p-4"><div className="text-xs text-slate-500">总行数</div><div className="mt-1 text-2xl font-semibold text-slate-900">{report.totalRows}</div></div>
              <div className="rounded-lg bg-green-50 p-4"><div className="text-xs text-green-700">有效行</div><div className="mt-1 text-2xl font-semibold text-green-700">{report.validRows}</div></div>
              <div className="rounded-lg bg-red-50 p-4"><div className="text-xs text-red-700">错误行</div><div className="mt-1 text-2xl font-semibold text-red-700">{report.invalidRows}</div></div>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">行号</th>
                    <th className="px-4 py-3 font-medium">项目 / 学院</th>
                    <th className="px-4 py-3 font-medium">赛事 / 赛年</th>
                    <th className="px-4 py-3 font-medium">奖项</th>
                    <th className="px-4 py-3 font-medium">负责人</th>
                    <th className="px-4 py-3 font-medium">校验结果</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.rows.map((row) => (
                    <tr key={row.rowNumber} className={row.errors.length ? "bg-red-50/40" : ""}>
                      <td className="px-4 py-4 text-slate-600">第 {row.rowNumber} 行</td>
                      <td className="max-w-xs px-4 py-4"><div className="font-medium text-slate-900">{row.projectName || "—"}</div><div className="mt-1 text-xs text-slate-500">{row.college || "—"}</div></td>
                      <td className="px-4 py-4 text-slate-600"><div>{row.competitionName || "—"}</div><div className="mt-1 text-xs text-slate-400">{row.year ?? "赛年无效"}</div></td>
                      <td className="px-4 py-4 text-slate-600">{row.awardLevel ? awardLevelLabels[row.awardLevel] : "—"}</td>
                      <td className="px-4 py-4 text-slate-600"><div>{row.leaderName || "—"}</div><div className="mt-1 text-xs text-slate-400">{row.leaderPersonNo || "—"}</div></td>
                      <td className="max-w-md px-4 py-4">
                        {row.errors.length ? (
                          <ul className="space-y-1 text-xs leading-5 text-red-700">
                            {row.errors.map((item, index) => <li key={`${item.field}-${index}`}><span className="font-medium">{item.field}</span>：{item.reason}</li>)}
                          </ul>
                        ) : <span className="inline-flex rounded-full bg-green-50 px-2 py-1 text-xs text-green-700">通过 · {row.newProject ? "新建项目" : "关联已有项目"}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <p className="text-sm leading-6 text-slate-500">
              {report.invalidRows ? `仅导入有效行时，将跳过 ${report.invalidRows} 个错误行，不会写入这些行的数据。` : "全部行已通过校验，确认后将在同一事务中入库并自动重算异常。"}
            </p>
            <button type="button" disabled={pending || !report.validRows} onClick={commit} className="h-10 shrink-0 rounded-md bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {pending ? "正在事务入库…" : report.invalidRows ? `仅导入有效行（${report.validRows} 行）` : "确认全部入库"}
            </button>
          </section>
        </>
      ) : null}

      {step === 3 && result ? (
        <section className="rounded-lg border border-green-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-green-700">导入完成</h2>
          <p className="mt-2 text-sm text-slate-500">有效数据已在事务中写入，ImportBatch、DataSource 和审计记录已保存，异常规则已自动重算。</p>
          <dl className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-4"><dt className="text-xs text-slate-500">总行数</dt><dd className="mt-1 text-xl font-semibold">{result.totalRows}</dd></div>
            <div className="rounded-lg bg-green-50 p-4"><dt className="text-xs text-green-700">成功行</dt><dd className="mt-1 text-xl font-semibold text-green-700">{result.successRows}</dd></div>
            <div className="rounded-lg bg-amber-50 p-4"><dt className="text-xs text-amber-700">跳过错误行</dt><dd className="mt-1 text-xl font-semibold text-amber-700">{result.failureRows}</dd></div>
            <div className="rounded-lg bg-blue-50 p-4"><dt className="text-xs text-blue-700">当前规则命中</dt><dd className="mt-1 text-xl font-semibold text-blue-700">{result.anomalyMatches}</dd></div>
          </dl>
          <p className="mt-4 break-all text-xs text-slate-400">导入批次：{result.batchId}</p>
          <div className="mt-5 flex gap-3">
            <Link href="/anomalies" className="inline-flex h-10 items-center rounded-md bg-blue-600 px-4 text-sm text-white hover:bg-blue-700">前往待核实池</Link>
            <button type="button" onClick={reset} className="h-10 rounded-md border border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50">继续导入</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
