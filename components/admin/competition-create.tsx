"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDialogA11y } from "@/components/ui/use-dialog-a11y";

const fieldClass =
  "h-10 w-full rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15";
const labelClass = "grid gap-1 text-sm font-medium text-[#1b2b25] sm:grid-cols-[6rem_1fr] sm:items-center";

export function CompetitionCreate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    year: new Date().getFullYear(),
    level: "SCHOOL",
    seriesId: "",
    organizer: "",
    description: "",
  });
  const dialogRef = useDialogA11y(open, () => setOpen(false), !pending);

  return (
    <>
      <Button
        type="button"
        className="h-10 bg-[#115740] px-5 text-white hover:bg-[#0d4633]"
        onClick={() => {
          setOpen(true);
          setError("");
        }}
      >
        新建赛事
      </Button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={dialogRef}
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#09211a]/45 p-4 backdrop-blur-[1px]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="competition-create-title"
            >
              <form
                className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#c9dad1] bg-white p-6 shadow-[0_18px_48px_-14px_rgba(9,33,26,0.28)]"
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
                    const result = (await response.json()) as { code: number; message: string; data?: { id: string } };
                    if (!response.ok || result.code !== 0 || !result.data) {
                      throw new Error(result.message || "创建赛事失败");
                    }
                    toast.success("赛事已创建");
                    router.push(`/competitions/${result.data.id}`);
                  } catch (caught) {
                    setError(caught instanceof Error ? caught.message : "创建赛事失败");
                  } finally {
                    setPending(false);
                  }
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 id="competition-create-title" className="font-display text-lg font-bold text-[#0e1d17]">
                      新建赛事
                    </h2>
                    <p className="mt-0.5 text-xs text-[#54635d]">创建后默认处于草稿态，配置完规程与赛道后再发布</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    aria-label="关闭新建赛事弹窗"
                    className="h-8 w-8 p-0"
                    onClick={() => setOpen(false)}
                  >
                    ×
                  </Button>
                </div>

                <div className="mt-5 grid gap-4">
                  <label className={labelClass}>
                    <span>赛事名称</span>
                    <input
                      className={fieldClass}
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      required
                    />
                  </label>
                  <label className={labelClass}>
                    <span>赛年</span>
                    <input
                      type="number"
                      min="2000"
                      max="2100"
                      className={fieldClass}
                      value={form.year}
                      onChange={(event) => setForm({ ...form, year: Number(event.target.value) })}
                      required
                    />
                  </label>
                  <label className={labelClass}>
                    <span>等级</span>
                    <select
                      className={fieldClass}
                      value={form.level}
                      onChange={(event) => setForm({ ...form, level: event.target.value })}
                    >
                      <option value="SCHOOL">校赛</option>
                      <option value="PROVINCE">省赛</option>
                      <option value="NATIONAL">国赛</option>
                    </select>
                  </label>
                  <label className={labelClass}>
                    <span>系列标识</span>
                    <input
                      className={fieldClass}
                      placeholder="例如 internet-plus"
                      value={form.seriesId}
                      onChange={(event) => setForm({ ...form, seriesId: event.target.value })}
                      required
                    />
                  </label>
                  <label className={labelClass}>
                    <span>主办方</span>
                    <input
                      className={fieldClass}
                      value={form.organizer}
                      onChange={(event) => setForm({ ...form, organizer: event.target.value })}
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-[#1b2b25] sm:grid-cols-[6rem_1fr] sm:items-start">
                    <span className="sm:pt-2">简介</span>
                    <textarea
                      className="min-h-28 w-full resize-y rounded-lg border border-[#7f9384] bg-white px-3 py-2 text-sm text-[#0f1d18] outline-none transition focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15"
                      value={form.description}
                      onChange={(event) => setForm({ ...form, description: event.target.value })}
                    />
                  </label>
                </div>

                {error ? (
                  <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {error}
                  </p>
                ) : null}

                <div className="mt-5 flex justify-end gap-2.5">
                  <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
                    取消
                  </Button>
                  <Button
                    type="submit"
                    disabled={pending}
                    className="bg-[#115740] text-white hover:bg-[#0d4633]"
                  >
                    {pending ? "创建中…" : "创建赛事"}
                  </Button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
