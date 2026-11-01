"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function DashboardCharts({
  trend,
  rankings,
}: {
  trend: { year: number; awardCount: number }[];
  rankings: { college: string; score: number }[];
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="font-medium text-slate-900">近 5 年获奖趋势</h2>
          <p className="mt-1 text-xs text-slate-500">仅统计已核验、已发布的有效获奖记录</p>
        </div>
        <div className="mt-5 h-80 w-full" aria-label="近 5 年获奖趋势折线图">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} width={36} />
              <Tooltip />
              <Line type="monotone" dataKey="awardCount" name="获奖数" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="font-medium text-slate-900">学院排行前 10</h2>
          <p className="mt-1 text-xs text-slate-500">按折算分从高到低排列</p>
        </div>
        <div className="mt-5 h-80 w-full" aria-label="学院折算分排行柱状图">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rankings} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="college" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} width={36} />
              <Tooltip />
              <Bar dataKey="score" name="折算分" fill="#2563eb" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
