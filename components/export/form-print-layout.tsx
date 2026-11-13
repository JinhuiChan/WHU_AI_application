"use client";

import { Fragment, useState } from "react";
import type { FormCell, RegistrationFormData } from "@/lib/form-export";

function cellValue(value: FormCell) {
  return value === "" ? " " : value;
}

export function FormPrintLayout({ projectId, full, form }: { projectId: string; full: boolean; form: RegistrationFormData }) {
  const [confirmFull, setConfirmFull] = useState(false);
  return (
    <div className="bg-slate-100 px-4 py-6 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center gap-3 print:hidden">
        <button type="button" onClick={() => window.print()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">打印 / 另存为 PDF</button>
        {!full ? (
          <button type="button" onClick={() => setConfirmFull(true)} className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50">完整报名表（交学院核验）</button>
        ) : (
          <a href={`/my/${projectId}/print?full=0`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">查看脱敏版</a>
        )}
      </div>
      {!full && confirmFull ? (
        <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 print:hidden">
          <span>将查看含完整身份证号、银行卡号的报名表（带水印，系统留痕）。确认继续？</span>
          <a href={`/my/${projectId}/print?full=1`} className="rounded bg-amber-600 px-3 py-1 font-medium text-white hover:bg-amber-700">确认查看</a>
          <button type="button" onClick={() => setConfirmFull(false)} className="rounded border border-amber-300 px-3 py-1">取消</button>
        </div>
      ) : null}
      {full ? <div className="no-print mx-auto mb-4 max-w-[210mm] rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 print:hidden">当前为完整报名表，含完整身份证号、银行卡号；页面已带水印并记录敏感访问。</div> : null}

      <article className="mx-auto min-h-[297mm] w-[210mm] bg-white p-[12mm] text-black shadow print:min-h-0 print:w-full print:p-0 print:shadow-none">
        <table className="w-full border-collapse text-[10pt] leading-5" style={{ fontFamily: 'SimSun, "Songti SC", "Noto Serif CJK SC", serif' }}>
          <thead>
            <tr><th colSpan={2} className="border border-black p-3 text-center text-xl font-bold">{form.title}</th></tr>
          </thead>
          <tbody>
            {full ? <tr><td colSpan={2} className="border border-black p-2 text-left text-[9pt]">{form.watermarkText}</td></tr> : null}
            {form.sections.map((section) => (
              <Fragment key={section.title}>
                <tr><th colSpan={2} className="border border-black bg-slate-100 p-2 text-left text-[11pt] font-bold">{section.title}</th></tr>
                {section.kind === "fields" ? section.pairs.map(([label, value]) => (
                  <tr key={label}>
                    <th className="w-[32%] border border-black p-2 text-left font-normal">{label}</th>
                    <td className="border border-black p-2 text-left">{cellValue(value)}</td>
                  </tr>
                )) : null}
                {section.kind === "table" && !section.records.length ? <tr><td colSpan={2} className="border border-black p-2 text-left">{section.emptyLabel}</td></tr> : null}
                {section.kind === "table" ? section.records.map((record, recordIndex) => (
                  <Fragment key={`${section.title}-${recordIndex}`}>
                    <tr><th colSpan={2} className="border border-black bg-slate-50 p-1.5 text-left font-normal">记录 {recordIndex + 1}</th></tr>
                    {record.map((value, valueIndex) => section.headers[valueIndex] ? (
                      <tr key={`${section.title}-${recordIndex}-${valueIndex}`}>
                        <th className="w-[32%] border border-black p-2 text-left font-normal">{section.headers[valueIndex]}</th>
                        <td className="border border-black p-2 text-left">{cellValue(value)}</td>
                      </tr>
                    ) : null)}
                  </Fragment>
                )) : null}
              </Fragment>
            ))}
            <tr className="break-inside-avoid">
              <td colSpan={2} className="border border-black p-0">
                <div className="grid grid-cols-4">
                  {form.signatures.map((label) => <div key={label} className="h-24 border-r border-black p-2 text-left last:border-r-0">{label}</div>)}
                </div>
              </td>
            </tr>
            <tr><td colSpan={2} className="border border-black p-2 text-left text-[9pt]">{form.exportNumber}</td></tr>
          </tbody>
        </table>
      </article>
    </div>
  );
}
