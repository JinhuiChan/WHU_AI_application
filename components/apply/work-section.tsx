"use client";

import { Button } from "@/components/ui/button";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import type { ProjectFormInput } from "@/types/apply";
import type { ApplyOptions } from "./apply-form";

type WorkSectionProps = {
  value: ProjectFormInput["work"];
  dictionaries: ApplyOptions["dictionaries"];
  onChange: (patch: Partial<ProjectFormInput["work"]>) => void;
};

const fieldClass =
  "h-10 w-full rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition-colors placeholder:text-[#7c8e85] focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 disabled:cursor-not-allowed disabled:border-[#c8d7cf] disabled:bg-[#f1f6f3] disabled:text-[#5c6c65]";

// 作品文件目前只登记文件名，不传输文件本体；accept 放开到文档类，避免学生根本选不到自己的文件
const workAccept = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.7z,image/*";

export function WorkSection({ value, dictionaries, onChange }: WorkSectionProps) {
  return (
    <section id="apply-work" className="scroll-mt-28 card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#cde0d5] bg-[#eef5f1] font-display text-xs font-bold text-[#115740] tabular-nums">
            04
          </span>
          <div>
            <h2 className="text-base font-semibold text-[#0f1d18]">作品与材料</h2>
            <p className="mt-0.5 text-xs text-[#54635d]">登记作品形式、类别与附件外链；盖章扫描件可在保存草稿后进入详情页上传。</p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full border border-[#d5e2db] bg-[#f8fbf9] px-3 py-1 text-xs font-medium text-[#43554d]">
          成果材料台账
        </span>
      </div>
      <div aria-hidden="true" className="mt-4 h-px bg-[#d5e2db]/70" />

      <div className="mt-4 rounded-xl border border-[#e6cf9e] bg-[#fdf8ee] px-4 py-2.5 text-xs leading-5 text-[#785313]">
        当前版本仅登记作品文件名，<span className="font-semibold">文件本体不会直传服务器</span>。如需提交实体作品包或路演文档，请将网盘或在线文档链接填入「作品外链」。
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-4">
          <div className="grid gap-2 sm:grid-cols-[7.5rem_1fr] sm:items-start sm:gap-x-3">
            <label htmlFor="work-file" className="text-sm font-medium text-[#24362f] sm:pt-2">作品（单文件）</label>
            <div className="min-w-0">
              <FileDropZone label="作品文件" showSelection={false}>
                <span className="relative inline-flex h-10 items-center overflow-hidden rounded-full border border-[#7f9384] bg-white transition-colors hover:border-[#115740] hover:bg-[#eef5f1] focus-within:ring-2 focus-within:ring-[#115740]/25 active:scale-[0.98] motion-reduce:active:scale-100">
                  <input
                    id="work-file"
                    type="file"
                    accept={workAccept}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    onChange={(event) => onChange({ fileName: event.target.files?.[0]?.name })}
                  />
                  <span className="pointer-events-none px-4 text-sm font-medium text-[#1b2e26]">选择文件</span>
                </span>
              </FileDropZone>
              <span className="mt-1.5 block truncate text-xs text-[#54635d]">
                {value.fileName ? `已登记：${value.fileName}` : "尚未选择文件"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-4">
          <label className="grid gap-2 sm:grid-cols-[7.5rem_1fr] sm:items-center sm:gap-x-3">
            <span className="text-sm font-medium text-[#24362f]">作品外链</span>
            <input
              type="url"
              className={fieldClass}
              value={value.externalUrl ?? ""}
              onChange={(event) => onChange({ externalUrl: event.target.value })}
              placeholder="https://"
            />
          </label>
          <div className="grid gap-2 border-t border-[#dce7e1] pt-3 sm:grid-cols-[7.5rem_1fr] sm:items-start sm:gap-x-3">
            <span className="text-sm font-medium text-[#24362f] sm:pt-1.5">PPT 专区</span>
            <div>
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled
                className="w-full rounded-full border-[#7f9384]"
              >
                PPT 上传待接入
              </Button>
              <span className="mt-1 block text-xs text-[#5c6c65]">暂不支持直传，请将路演 PPT 放入网盘并填入上方「作品外链」。</span>
            </div>
          </div>
        </div>

        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-[#24362f]">作品形式</span>
          <select className={fieldClass} value={value.form} onChange={(event) => onChange({ form: event.target.value })} required>
            <option value="">请选择</option>
            {dictionaries.workForms.map((item) => <option key={item.value} value={item.label}>{item.label}</option>)}
          </select>
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
          <span className="text-sm font-medium text-[#24362f]">作品类别</span>
          <select className={fieldClass} value={value.category} onChange={(event) => onChange({ category: event.target.value })} required>
            <option value="">请选择</option>
            {dictionaries.categories.map((item) => <option key={item.value} value={item.label}>{item.label}</option>)}
          </select>
        </label>
        <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4 md:col-span-2">
          <span className="text-sm font-medium text-[#24362f]">作品组别</span>
          <select className={fieldClass} value={value.groupName} onChange={(event) => onChange({ groupName: event.target.value })} required>
            <option value="">请选择</option>
            {dictionaries.groups.map((item) => <option key={item.value} value={item.label}>{item.label}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}
