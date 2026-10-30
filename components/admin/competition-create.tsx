"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const fieldClass = "mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600";

export function CompetitionCreate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", year: new Date().getFullYear(), level: "SCHOOL", seriesId: "", organizer: "", description: "" });

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setError(""); }} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">新建赛事</button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label="新建赛事">
          <form
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
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
                router.push(`/competitions/${result.data.id}`);
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : "创建赛事失败");
              } finally {
                setPending(false);
              }
            }}
          >
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-900">新建赛事</h2><button type="button" onClick={() => setOpen(false)} className="text-2xl text-slate-500">×</button></div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-xs text-slate-600 md:col-span-2">赛事名称<input className={fieldClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
              <label className="text-xs text-slate-600">赛年<input type="number" min="2000" max="2100" className={fieldClass} value={form.year} onChange={(event) => setForm({ ...form, year: Number(event.target.value) })} required /></label>
              <label className="text-xs text-slate-600">等级<select className={fieldClass} value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}><option value="SCHOOL">校赛</option><option value="PROVINCE">省赛</option><option value="NATIONAL">国赛</option></select></label>
              <label className="text-xs text-slate-600">系列标识<input className={fieldClass} value={form.seriesId} onChange={(event) => setForm({ ...form, seriesId: event.target.value })} required /></label>
              <label className="text-xs text-slate-600">主办方<input className={fieldClass} value={form.organizer} onChange={(event) => setForm({ ...form, organizer: event.target.value })} /></label>
              <label className="text-xs text-slate-600 md:col-span-2">简介<textarea className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            </div>
            {error ? <p role="alert" className="mt-3 text-sm text-red-600">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm">取消</button><button type="submit" disabled={pending} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60">{pending ? "创建中…" : "创建赛事"}</button></div>
          </form>
        </div>
      ) : null}
    </>
  );
}
