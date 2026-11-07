"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useDialogA11y } from "@/components/ui/use-dialog-a11y";
import { toast } from "sonner";

const fieldClass = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600";
const labelClass = "grid gap-1 text-sm text-slate-700 sm:grid-cols-[6rem_1fr] sm:items-center";

export function CompetitionCreate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", year: new Date().getFullYear(), level: "SCHOOL", seriesId: "", organizer: "", description: "" });
  const dialogRef = useDialogA11y(open, () => setOpen(false), !pending);

  return (
    <>
      <Button type="button" onClick={() => { setOpen(true); setError(""); }}>新建赛事</Button>
      {open ? (
        <div ref={dialogRef} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label="新建赛事">
          <form
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            onSubmit={async (event) => {
              event.preventDefault();
              setPending(true);
              setError("");
              try {
                const response = await fetch("/api/admin/competitions", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(form),
                });
                const result = await response.json() as { code: number; message: string; data?: { id: string } };
                if (!response.ok || result.code !== 0 || !result.data) throw new Error(result.message || "创建赛事失败");
                toast.success("赛事已创建");
                router.push(`/competitions/${result.data.id}`);
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : "创建赛事失败");
              } finally {
                setPending(false);
              }
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">新建赛事</h2>
              <Button variant="outline" size="sm" type="button" onClick={() => setOpen(false)} >×</Button>
            </div>
            <div className="mt-5 grid gap-4">
              <label className={labelClass}>
                <span>赛事名称</span>
                <input className={fieldClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              </label>
              <label className={labelClass}>
                <span>赛年</span>
                <input type="number" min="2000" max="2100" className={fieldClass} value={form.year} onChange={(event) => setForm({ ...form, year: Number(event.target.value) })} required />
              </label>
              <label className={labelClass}>
                <span>等级</span>
                <select className={fieldClass} value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}><option value="SCHOOL">校赛</option><option value="PROVINCE">省赛</option><option value="NATIONAL">国赛</option></select>
              </label>
              <label className={labelClass}>
                <span>系列标识</span>
                <input className={fieldClass} value={form.seriesId} onChange={(event) => setForm({ ...form, seriesId: event.target.value })} required />
              </label>
              <label className={labelClass}>
                <span>主办方</span>
                <input className={fieldClass} value={form.organizer} onChange={(event) => setForm({ ...form, organizer: event.target.value })} />
              </label>
              <label className="grid gap-1 text-sm text-slate-700 sm:grid-cols-[6rem_1fr] sm:items-start">
                <span className="sm:pt-2">简介</span>
                <textarea className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </label>
            </div>
            {error ? <p role="alert" className="mt-3 text-sm text-red-600">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
              <Button type="submit" disabled={pending}>{pending ? "创建中…" : "创建赛事"}</Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
