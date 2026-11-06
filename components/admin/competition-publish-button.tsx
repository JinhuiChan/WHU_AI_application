"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  competitionId: string;
  status: "DRAFT" | "PUBLISHED" | "WITHDRAWN";
};

export function CompetitionPublishButton({ competitionId, status }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function run(action: "PUBLISH" | "WITHDRAW") {
    setError("");
    setMessage("");
    setPending(true);
    try {
      const response = await fetch(`/api/admin/competitions/${competitionId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json() as { code: number; message: string };
      if (!response.ok || result.code !== 0) throw new Error(result.message || "操作失败");
      setMessage(action === "PUBLISH" ? "赛事已发布，学生端已可见" : "赛事已下架，学生端已隐藏");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "操作失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {status !== "PUBLISHED" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void run("PUBLISH")}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {pending ? "处理中…" : "发布赛事"}
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("下架后学生端将看不到该赛事，已报名项目数据保留。确定下架吗？")) return;
            void run("WITHDRAW");
          }}
          className="rounded-md border border-amber-300 px-4 py-2 text-sm text-amber-700 disabled:opacity-60"
        >
          {pending ? "处理中…" : "下架赛事"}
        </button>
      )}
      {message ? <span className="text-sm text-emerald-700">{message}</span> : null}
      {error ? <span role="alert" className="text-sm text-red-600">{error}</span> : null}
    </div>
  );
}
