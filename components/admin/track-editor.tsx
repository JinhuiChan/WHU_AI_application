"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionHead, SectionRule } from "@/components/ui/section-head";

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

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15";
const compactInputClass =
  "h-9 rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15";
const areaClass =
  "mt-1 h-16 w-full resize-y rounded-lg border border-[#7f9384] bg-white px-3 py-1.5 text-sm text-[#0f1d18] outline-none transition focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15";

function activeLabels(options: OptionView[]) {
  return options
    .filter((item) => item.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => item.label);
}

function parseLabels(draft: string): string[] {
  return draft
    .split(/[、,，;；\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function LabelPreview({ labels }: { labels: string[] }) {
  if (!labels.length) return null;
  return (
    <p className="mt-1 text-xs text-[#54635d]">
      将保存为 {labels.length} 项：{labels.slice(0, 8).join(" / ")}
      {labels.length > 8 ? ` 等 ${labels.length} 项` : ""}
    </p>
  );
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
      const result = (await response.json()) as { code: number; message: string; data: TrackNode[] };
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

  useEffect(() => {
    void load();
  }, [load]);

  async function call(url: string, options: RequestInit, success: string) {
    setPending(url);
    setError("");
    setMessage("");
    try {
      const response = await fetch(url, options);
      const result = (await response.json()) as { code: number; message: string };
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
    if (!trimmed) {
      setError("赛道名称不能为空");
      return;
    }
    const ok = await call(
      `/api/admin/competitions/${competitionId}/tracks`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed, parentId }),
      },
      "赛道已添加",
    );
    if (ok) {
      if (parentId) setChildName((current) => ({ ...current, [parentId]: "" }));
      else setNewTopName("");
    }
  }

  async function renameTrack(node: TrackNode, name: string) {
    if (!name.trim() || name.trim() === node.name) return;
    await call(
      `/api/admin/tracks/${node.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      },
      "赛道名称已保存",
    );
  }

  async function toggleTrack(node: TrackNode) {
    await call(
      `/api/admin/tracks/${node.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !node.enabled }),
      },
      node.enabled ? "赛道已停用" : "赛道已启用",
    );
  }

  async function removeTrack(node: TrackNode) {
    if (!window.confirm(`确定删除赛道「${node.name}」？该赛道下的组别/类别会一并删除。`)) return;
    await call(`/api/admin/tracks/${node.id}`, { method: "DELETE" }, "赛道已删除");
  }

  async function saveOptions(node: TrackNode, kind: "GROUP" | "CATEGORY") {
    const draft = kind === "GROUP" ? groupDraft[node.id] ?? "" : categoryDraft[node.id] ?? "";
    const labels = parseLabels(draft);
    await call(
      `/api/admin/tracks/${node.id}/options`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, labels }),
      },
      kind === "GROUP" ? "组别已保存" : "类别已保存",
    );
  }

  function renderNode(node: TrackNode, depth: number) {
    const groupLabels = parseLabels(groupDraft[node.id] ?? "");
    const categoryLabels = parseLabels(categoryDraft[node.id] ?? "");
    return (
      <div
        key={node.id}
        className={`rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-4 ${depth ? "ml-5 mt-2.5 bg-white" : "mt-3"}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`${compactInputClass} w-48`}
            defaultValue={node.name}
            onBlur={(event) => void renameTrack(node, event.target.value)}
            aria-label="赛道名称"
          />
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${
              node.enabled ? "bg-[#eef5f1] text-[#115740]" : "bg-[#f1f5f3] text-[#6c7e76]"
            }`}
          >
            {node.projectCount} 个项目 · {node.enabled ? "启用中" : "已停用"}
          </span>
          <Button variant="outline" size="sm" type="button" onClick={() => void toggleTrack(node)}>
            {node.enabled ? "停用" : "启用"}
          </Button>
          <Button variant="destructive" size="sm" type="button" onClick={() => void removeTrack(node)}>
            删除
          </Button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-[#3f524a]">组别（一行一个，或用顿号 / 逗号分隔）</label>
            <textarea
              className={areaClass}
              value={groupDraft[node.id] ?? ""}
              onChange={(event) => setGroupDraft((current) => ({ ...current, [node.id]: event.target.value }))}
            />
            <LabelPreview labels={groupLabels} />
            <Button
              size="sm"
              type="button"
              disabled={pending !== ""}
              onClick={() => void saveOptions(node, "GROUP")}
              className="mt-2 bg-[#115740] text-white hover:bg-[#0d4633]"
            >
              保存组别
            </Button>
          </div>
          <div>
            <label className="text-xs font-medium text-[#3f524a]">类别（一行一个，或用顿号 / 逗号分隔）</label>
            <textarea
              className={areaClass}
              value={categoryDraft[node.id] ?? ""}
              onChange={(event) => setCategoryDraft((current) => ({ ...current, [node.id]: event.target.value }))}
            />
            <LabelPreview labels={categoryLabels} />
            <Button
              size="sm"
              type="button"
              disabled={pending !== ""}
              onClick={() => void saveOptions(node, "CATEGORY")}
              className="mt-2 bg-[#115740] text-white hover:bg-[#0d4633]"
            >
              保存类别
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className={`${compactInputClass} w-48`}
            placeholder="子赛道名称"
            value={childName[node.id] ?? ""}
            onChange={(event) => setChildName((current) => ({ ...current, [node.id]: event.target.value }))}
          />
          <Button variant="outline" size="sm" type="button" onClick={() => void addTrack(node.id, childName[node.id] ?? "")}>
            添加子赛道
          </Button>
        </div>
        {node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <section className="card p-5">
      <SectionHead
        title="赛道与组别（管理员配置）"
        sub="赛道决定学生报名时的赛道下拉项，组别与类别按赛道生效；停用赛道不会删除历史项目数据。"
        meta={tracks.length ? `${tracks.length} 个主赛道` : undefined}
      />
      <SectionRule className="my-3.5" />
      {error ? (
        <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="mb-3 rounded-xl border border-[#badec9] bg-[#eef5f1] px-3.5 py-2.5 text-sm text-[#115740]">
          {message}
        </p>
      ) : null}
      {loading ? <p className="text-sm text-[#54635d]">正在读取赛道配置…</p> : null}
      {!loading && !tracks.length ? (
        <p className="inline-empty text-sm">尚未配置赛道，请先在下方添加主赛道。</p>
      ) : null}
      {tracks.map((track) => renderNode(track, 0))}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#e5ede8] pt-4">
        <input
          className={`${fieldClass} !mt-0 max-w-64`}
          placeholder="新赛道名称（如 高教主赛道）"
          value={newTopName}
          onChange={(event) => setNewTopName(event.target.value)}
        />
        <Button
          variant="outline"
          size="default"
          type="button"
          className="h-10"
          disabled={pending !== ""}
          onClick={() => void addTrack(null, newTopName)}
        >
          添加赛道
        </Button>
      </div>
    </section>
  );
}
