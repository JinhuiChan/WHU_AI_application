"use client";

import { useState } from "react";

export function PackageDownload({ filters }: { filters: Record<string, string> }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError("");
          setNotice("");
          try {
            const response = await fetch("/api/export/package", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(filters),
            });
            if (!response.ok) {
              const result = await response.json() as { message?: string };
              throw new Error(result.message || "打包下载失败");
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "盖章件.zip";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            const packaged = response.headers.get("X-Packaged-Count") ?? "0";
            const skipped = Number(response.headers.get("X-Skipped-Count") ?? "0");
            setNotice(`已打包 ${packaged} 个盖章件${skipped ? `，${skipped} 个无最终版项目未打包` : ""}`);
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "打包下载失败");
          } finally {
            setPending(false);
          }
        }}
        className="rounded-md border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
      >
        {pending ? "打包中…" : "打包下载"}
      </button>
      <p className="text-xs text-slate-400">按当前筛选结果，≤100 项且 ≤500MB</p>
      {error ? <p role="alert" className="max-w-md text-right text-xs text-red-600">{error}</p> : null}
      {notice ? <p role="status" className="text-xs text-emerald-600">{notice}</p> : null}
    </div>
  );
}
