"use client";

import { Button } from "@/components/ui/button";
import type { ProjectFormInput } from "@/types/apply";
import type { ApplyOptions } from "./apply-form";

type WorkSectionProps = {
  value: ProjectFormInput["work"];
  dictionaries: ApplyOptions["dictionaries"];
  onChange: (patch: Partial<ProjectFormInput["work"]>) => void;
};

const fieldClass = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-600";

// 作品文件目前只登记文件名，不传输文件本体；accept 放开到文档类，避免学生根本选不到自己的文件
const workAccept = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.7z,image/*";

export function WorkSection({ value, dictionaries, onChange }: WorkSectionProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
      <h2 className="text-base font-semibold text-slate-900">作品与材料</h2>
      <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
        当前版本只登记文件名，<span className="font-semibold">文件本体不会上传到服务器</span>。要提交实体文件，请把网盘或在线文档链接填到右侧「作品外链」。
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-start sm:gap-x-4">
          <span className="text-sm font-medium text-slate-700 sm:pt-2">作品（单文件）</span>
          <div>
            <span className="relative inline-flex h-10 items-center overflow-hidden rounded-full border border-slate-300 bg-white">
              <input
                type="file"
                accept={workAccept}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                onChange={(event) => onChange({ fileName: event.target.files?.[0]?.name })}
              />
              <span className="pointer-events-none px-4 text-sm font-medium text-slate-700">选择文件</span>
            </span>
            <span className="mt-1 block text-xs text-slate-500">{value.fileName ? `已登记：${value.fileName}` : "尚未选择文件"}</span>
          </div>
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-slate-700">作品外链</span>
          <input type="url" className={fieldClass} value={value.externalUrl ?? ""} onChange={(event) => onChange({ externalUrl: event.target.value })} placeholder="https://" />
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-slate-700">作品形式</span>
          <select className={fieldClass} value={value.form} onChange={(event) => onChange({ form: event.target.value })} required>
            <option value="">请选择</option>
            {dictionaries.workForms.map((item) => <option key={item.value} value={item.label}>{item.label}</option>)}
          </select>
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-slate-700">作品类别</span>
          <select className={fieldClass} value={value.category} onChange={(event) => onChange({ category: event.target.value })} required>
            <option value="">请选择</option>
            {dictionaries.categories.map((item) => <option key={item.value} value={item.label}>{item.label}</option>)}
          </select>
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-slate-700">作品组别</span>
          <select className={fieldClass} value={value.groupName} onChange={(event) => onChange({ groupName: event.target.value })} required>
            <option value="">请选择</option>
            {dictionaries.groups.map((item) => <option key={item.value} value={item.label}>{item.label}</option>)}
          </select>
        </label>
        <div className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-start sm:gap-x-4">
          <span className="text-sm font-medium text-slate-700 sm:pt-2">PPT 专区</span>
          <div>
            <Button variant="outline" size="sm" type="button" disabled className="w-full" >
              PPT 上传待接入
            </Button>
            <span className="mt-1 block text-xs text-slate-500">暂不支持直传，请把 PPT 放进网盘并填「作品外链」。</span>
          </div>
        </div>
      </div>
    </section>
  );
}
