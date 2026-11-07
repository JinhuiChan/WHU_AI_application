"use client";

import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";

type OptionView = { id: string; value: string; label: string; enabled: boolean; sortOrder: number };
type TrackNode = {
  id: string;
  parentId: string | null;
  name: string;
  kind: string;
  enabled: boolean;
  sortOrder: number;
  projectCount: number;
  groups: OptionView[];
  categories: OptionView[];
  children: TrackNode[];
};

const fieldClass = "mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm outline-none focus:border-blue-600";

function activeLabels(options: OptionView[]) {
  return options.filter((item) => item.enabled).sort((a, b) => a.sortOrder - b.sortOrder).map((item) => item.label);
}

export function TrackEditor({ competitionId }: { competitionId: string }) {
  const [tracks, setTracks] = useState<TrackNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [newTopName, setNewTopName] = useState("");
  const [childName, setChildName] = useState<Record<string, string>>({});
  const [groupDraft, setGroupDraft] = useState<Record<string, string>>({});
  const [categoryDraft, setCategoryDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/competitions/${competitionId}/tracks`, { cache: "no-store" });
      const result = await response.json() as { code: number; message: string; data: TrackNode[] };
      if (!response.ok || result.code !== 0) throw new Error(result.message || "读取赛道失败");
      setTracks(result.data);
      const groups: Record<string, string> = {};
      const categories: Record<string, string> = {};
      const walk = (nodes: TrackNode[]) => {
        for (const node of nodes) {
          groups[node.id] = activeLabels(node.groups).join("、");
          categories[node.id] = activeLabels(node.categories).join("、");
          walk(node.children);
        }
      };
      walk(result.data);
      setGroupDraft((current) => ({ ...groups, ...current }));
      setCategoryDraft((current) => ({ ...categories, ...current }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "读取赛道失败");
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => { void load(); }, [load]);

  async function call(url: string, options: RequestInit, success: string) {
    setPending(url);
    setError("");
    setMessage("");
    try {
      const response = await fetch(url, options);
      const result = await response.json() as { code: number; message: string };
      if (!response.ok || result.code !== 0) throw new Error(result.message || "操作失败");
      setMessage(success);
      await load();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "操作失败");
      return false;
    } finally {
      setPending("");
    }
  }

  async function addTrack(parentId: string | null, name: string) {
    const trimmed = name.trim();
    if (!trimmed) { setError("赛道名称不能为空"); return; }
    const ok = await call(`/api/admin/competitions/${competitionId}/tracks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: trimmed, parentId }),
    }, "赛道已添加");
    if (ok) {
      if (parentId) setChildName((current) => ({ ...current, [parentId]: "" }));
      else setNewTopName("");
    }
  }

  async function renameTrack(node: TrackNode, name: string) {
    if (!name.trim() || name.trim() === node.name) return;
    await call(`/api/admin/tracks/${node.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    }, "赛道名称已保存");
  }

  async function toggleTrack(node: TrackNode) {
    await call(`/api/admin/tracks/${node.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !node.enabled }),
    }, node.enabled ? "赛道已停用" : "赛道已启用");
  }

  async function removeTrack(node: TrackNode) {
    if (!window.confirm(`确定删除赛道「${node.name}」？该赛道下的组别/类别会一并删除。`)) return;
    await call(`/api/admin/tracks/${node.id}`, { method: "DELETE" }, "赛道已删除");
  }

  async function saveOptions(node: TrackNode, kind: "GROUP" | "CATEGORY") {
    const draft = kind === "GROUP" ? groupDraft[node.id] ?? "" : categoryDraft[node.id] ?? "";
    const labels = draft.split(/[、,，;；\n]/).map((item) => item.trim()).filter(Boolean);
    await call(`/api/admin/tracks/${node.id}/options`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, labels }),
    }, kind === "GROUP" ? "组别已保存" : "类别已保存");
  }

  function renderNode(node: TrackNode, depth: number) {
    return (
      <div key={node.id} className={`rounded-lg border border-slate-200 p-3 ${depth ? "ml-6 mt-2" : "mt-3"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="h-9 w-44 rounded-lg border border-slate-300 px-2 text-sm"
            defaultValue={node.name}
            onBlur={(event) => void renameTrack(node, event.target.value)}
            aria-label="赛道名称"
          />
          <span className="text-xs text-slate-500">{node.projectCount} 个项目 · {node.enabled ? "启用中" : "已停用"}</span>
          <Button variant="outline" size="sm" type="button" onClick={() => void toggleTrack(node)} >
            {node.enabled ? "停用" : "启用"}
          </Button>
          <Button variant="destructive" size="sm" type="button" onClick={() => void removeTrack(node)} >删除</Button>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <div>
            <label className="text-sm text-slate-600">组别（用「、」分隔）</label>
            <textarea
              className="mt-1 h-16 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
              value={groupDraft[node.id] ?? ""}
              onChange={(event) => setGroupDraft((current) => ({ ...current, [node.id]: event.target.value }))}
            />
            <Button variant="default" size="sm" type="button" disabled={pending !== ""} onClick={() => void saveOptions(node, "GROUP")} className="mt-1" >保存组别</Button>
          </div>
          <div>
            <label className="text-sm text-slate-600">类别（用「、」分隔）</label>
            <textarea
              className="mt-1 h-16 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
              value={categoryDraft[node.id] ?? ""}
              onChange={(event) => setCategoryDraft((current) => ({ ...current, [node.id]: event.target.value }))}
            />
            <Button variant="default" size="sm" type="button" disabled={pending !== ""} onClick={() => void saveOptions(node, "CATEGORY")} className="mt-1" >保存类别</Button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            className="h-9 w-44 rounded-lg border border-slate-300 px-2 text-sm"
            placeholder="子赛道名称"
            value={childName[node.id] ?? ""}
            onChange={(event) => setChildName((current) => ({ ...current, [node.id]: event.target.value }))}
          />
          <Button variant="outline" size="sm" type="button" onClick={() => void addTrack(node.id, childName[node.id] ?? "")} >添加子赛道</Button>
        </div>
        {node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">赛道与组别（管理员配置）</h2>
      <p className="mt-1 text-xs text-slate-500">赛道决定学生报名的赛道下拉；组别/类别按赛道生效。停用不会删除历史数据。</p>
      {error ? <p role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {message ? <p role="status" className="mt-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p> : null}
      {loading ? <p className="mt-3 text-sm text-slate-500">读取中…</p> : null}
      {!loading && !tracks.length ? <p className="mt-3 text-sm text-slate-500">尚未配置赛道，先在下面添加。</p> : null}
      {tracks.map((track) => renderNode(track, 0))}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <input className={`${fieldClass} !mt-0 max-w-64`} placeholder="新赛道名称（如 高教主赛道）" value={newTopName} onChange={(event) => setNewTopName(event.target.value)} />
        <Button variant="outline" size="default" type="button" disabled={pending !== ""} onClick={() => void addTrack(null, newTopName)} >添加赛道</Button>
      </div>
    </section>
  );
}
