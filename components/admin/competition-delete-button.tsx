"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  competitionId: string;
  competitionName: string;
  /** 删除成功后跳转的地址；不传则只刷新当前页 */
  redirectTo?: string;
  label?: string;
};

export function CompetitionDeleteButton({ competitionId, competitionName, redirectTo, label = "删除赛事" }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/competitions/${encodeURIComponent(competitionId)}`, { method: "DELETE" });
      const result = await response.json() as { code: number; message: string };
      if (!response.ok || result.code !== 0) throw new Error(result.message || "删除失败");
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "删除失败");
    } finally {
      setPending(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-red-700">确认删除「{competitionName}」？删除后不可恢复；赛道、报名窗口与赛事文件会一并删除。</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => void remove()}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? "删除中…" : "确认删除"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => { setConfirming(false); setError(""); }}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs"
        >
          取消
        </button>
      </div>
      {error ? <p role="alert" className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
