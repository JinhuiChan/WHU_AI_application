"use client";

import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
const DraftContext = createContext<{ setDraft: (draft: { dirty: boolean; busy: boolean }) => void } | null>(null);
export function useKnowledgeDraft() { return useContext(DraftContext); }
export function AssistantWorkspace({ competitionId, competitions, admin, children }: {
  competitionId: string; competitions: { id: string; name: string; year: number }[]; admin: boolean; children: ReactNode;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState({ dirty: false, busy: false });
  const [pending, startTransition] = useTransition();
  const current = competitions.find((item) => item.id === competitionId)!;
  return <DraftContext.Provider value={{ setDraft }}>
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <label className="block text-sm font-medium">{admin ? "管理赛事" : "咨询赛事"}
        <select value={competitionId} disabled={pending || draft.busy} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50" onChange={(event) => {
          const next = event.target.value;
          if (next === competitionId) return;
          event.currentTarget.value = competitionId;
          if (draft.dirty && !window.confirm("当前资料尚未发布，切换赛事会丢弃本次编辑。确定切换？")) return;
          startTransition(() => router.push(`/assistant?competitionId=${encodeURIComponent(next)}`));
        }}>
          {competitions.map((item) => <option key={item.id} value={item.id}>{item.year} · {item.name}</option>)}
        </select>
      </label>
      <p className="mt-3 text-sm text-slate-600" role="status">{pending ? "正在切换赛事…" : `当前赛事：${current.year} · ${current.name}`}</p>
    </section>
    <div aria-busy={pending} className={pending ? "pointer-events-none space-y-5 opacity-60" : "space-y-5"}>{children}</div>
  </DraftContext.Provider>;
}
