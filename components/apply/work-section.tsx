"use client";

import type { ProjectFormInput } from "@/types/apply";
import type { ApplyOptions } from "./apply-form";

type WorkSectionProps = {
  value: ProjectFormInput["work"];
  dictionaries: ApplyOptions["dictionaries"];
  onChange: (patch: Partial<ProjectFormInput["work"]>) => void;
};

const fieldClass = "mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600";

export function WorkSection({ value, dictionaries, onChange }: WorkSectionProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">作品与材料</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-xs text-slate-600">作品（单文件）
          <input
            type="file"
            accept=".pdf,.zip,image/*"
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-blue-700"
            onChange={(event) => onChange({ fileName: event.target.files?.[0]?.name })}
          />
          <span className="mt-1 block text-xs text-slate-500">{value.fileName ? `已选择：${value.fileName}（仅本地选择，未上传）` : "尚未选择文件"}</span>
        </label>
        <label className="text-xs text-slate-600">作品外链
          <input type="url" className={fieldClass} value={value.externalUrl ?? ""} onChange={(event) => onChange({ externalUrl: event.target.value })} placeholder="https://" />
        </label>
        <label className="text-xs text-slate-600">作品形式
          <select className={fieldClass} value={value.form} onChange={(event) => onChange({ form: event.target.value })} required>
            <option value="">请选择</option>
            {dictionaries.workForms.map((item) => <option key={item.value} value={item.label}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-600">作品类别
          <select className={fieldClass} value={value.category} onChange={(event) => onChange({ category: event.target.value })} required>
            <option value="">请选择</option>
            {dictionaries.categories.map((item) => <option key={item.value} value={item.label}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-600">作品组别
          <select className={fieldClass} value={value.groupName} onChange={(event) => onChange({ groupName: event.target.value })} required>
            <option value="">请选择</option>
            {dictionaries.groups.map((item) => <option key={item.value} value={item.label}>{item.label}</option>)}
          </select>
        </label>
        <div className="text-xs text-slate-600">
          <span>PPT 专区</span>
          <button type="button" disabled className="mt-1 flex h-10 w-full items-center justify-center rounded-md border border-slate-300 bg-slate-100 px-3 text-sm text-slate-500">
            PPT 上传功能开发中
          </button>
        </div>
      </div>
    </section>
  );
}
