"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StatisticsSummary } from "@/types/statistics";

const colors = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626", "#0891b2", "#65a30d", "#db2777"];

export function StatisticsCharts({ byTrack, byStage, byAward }: Pick<StatisticsSummary, "byTrack" | "byStage" | "byAward">) {
  const hasTrackData = byTrack.some((item) => item.projectCount > 0);
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">赛道分布</h2>
        <p className="mt-1 text-xs text-slate-500">项目数与当前筛选内占比</p>
        <div className="mt-4 h-72" aria-label="赛道分布饼图">
          {hasTrackData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byTrack} dataKey="projectCount" nameKey="trackName" cx="50%" cy="45%" outerRadius={75} innerRadius={35} paddingAngle={2}>
                  {byTrack.map((item, index) => <Cell key={item.trackId ?? "UNASSIGNED"} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => [`${value} 项`, "项目数"]} />
                <Legend verticalAlign="bottom" height={60} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="flex h-full items-center justify-center text-sm text-slate-400">暂无赛道数据</div>}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">阶段分布</h2>
        <p className="mt-1 text-xs text-slate-500">校赛、省赛、国赛项目数</p>
        <div className="mt-4 h-72" aria-label="阶段分布柱状图">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byStage} margin={{ top: 12, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
              <Tooltip formatter={(value) => [`${value} 项`, "项目数"]} />
              <Bar dataKey="projectCount" name="项目数" fill="#2563eb" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">奖项分布</h2>
        <p className="mt-1 text-xs text-slate-500">Award 表中的金、银、铜与优秀奖</p>
        <div className="mt-4 h-72" aria-label="奖项分布柱状图">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byAward} margin={{ top: 12, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
              <Tooltip formatter={(value) => [`${value} 项`, "奖项数"]} />
              <Bar dataKey="count" name="奖项数" fill="#d97706" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
