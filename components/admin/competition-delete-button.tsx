"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  competitionId: string;
  competitionName: string;
  /** 删除成功后跳转的地址；不传则只刷新当前页 */
  redirectTo?: string;
  label?: string;
  /** 表格操作列里用：压到 h-8，与同行的胶囊按钮对齐 */
  compact?: boolean;
};

export function CompetitionDeleteButton({ competitionId, competitionName, redirectTo, label = "删除赛事", compact = false }: Props) {
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
      <Button
        type="button"
        variant="outline"
        onClick={() => setConfirming(true)}
        className={`rounded-full border-red-200 text-xs text-red-600 hover:bg-red-50${compact ? " h-8 px-3" : ""}`}
      >
        {label}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-red-700">确认删除「{competitionName}」？删除后不可恢复；赛道、报名窗口与赛事文件会一并删除。</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => void remove()}
          className="rounded-full border-red-200 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          {pending ? "删除中…" : "确认删除"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => { setConfirming(false); setError(""); }}
          className="rounded-lg border-slate-200 text-xs"
        >
          取消
        </Button>
      </div>
      {error ? <p role="alert" className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
