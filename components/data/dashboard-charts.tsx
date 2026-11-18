"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { WhuGateEmblem } from "@/components/brand/whu-motifs";

const RANK_TONES = ["#c59b45", "#115740", "#2a7b5f", "#3d6b58", "#528c74", "#6b9682", "#789d8b", "#8aa99a"];

const COLLEGE_SHORT_NAMES: Record<string, string> = {
  计算机学院: "计算机",
  电子信息学院: "电信",
  机械与动力学院: "机动",
  动力与机械学院: "动机",
  经济与管理学院: "经管",
  法学院: "法学",
  遥感信息工程学院: "遥感",
  生命科学学院: "生科",
  数学与统计学院: "数统",
  化学与分子科学学院: "化学",
  新闻与传播学院: "新传",
  信息管理学院: "信管",
  国家网络安全学院: "网安",
  测绘学院: "测绘",
  水利水电学院: "水电",
  电气与自动化学院: "电气",
  物理科学与技术学院: "物理",
  外国语言文学学院: "外语",
};

function formatCollegeTick(value: string) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  if (COLLEGE_SHORT_NAMES[trimmed]) return COLLEGE_SHORT_NAMES[trimmed];
  const stripped = trimmed.length > 3 ? trimmed.replace(/学院$/, "") : trimmed.replace(/院$/, "");
  return stripped.length > 3 ? `${stripped.slice(0, 3)}…` : stripped;
}

type TooltipPayloadItem = {
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: {
    year?: number;
    college?: string;
    fill?: string;
  };
};

function AcademyTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const heading =
    entry.payload?.college ??
    (entry.payload?.year !== undefined ? `${entry.payload.year} 赛年` : label !== undefined ? String(label) : "");
  const dot = entry.payload?.fill ?? entry.color ?? "#115740";

  return (
    <div className="rounded-xl border border-[#cfe0d7] bg-[#f8fbf9] px-3.5 py-2.5 shadow-[0_8px_20px_-8px_rgba(17,87,64,0.18)]">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-[#162620]">
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dot }} />
        <span>{heading}</span>
      </p>
      <p className="mt-1 flex items-baseline gap-2 text-xs text-[#54635d]">
        <span>{entry.name ?? "数值"}</span>
        <span className="font-display text-sm font-bold text-[#0f1d18] tabular-nums">
          {entry.value} {unit}
        </span>
      </p>
    </div>
  );
}

function EmptyPanel({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-[#d5e2db] bg-[#f8fbf9]/85 px-4 py-8 text-center">
      <WhuGateEmblem className="h-10 w-14 text-[#115740]/35" />
      <p className="mt-2.5 font-display text-sm font-semibold text-[#162620]">{title}</p>
      <p className="mt-1 max-w-[240px] text-xs leading-5 text-[#677770]">{hint}</p>
    </div>
  );
}

export function DashboardCharts({
  trend,
  rankings,
}: {
  trend: { year: number; awardCount: number }[];
  rankings: { college: string; score: number }[];
}) {
  const totalTrendAwards = trend.reduce((sum, item) => sum + item.awardCount, 0);
  const topScore = rankings.reduce((max, item) => Math.max(max, item.score), 0);
  const hasTrend = trend.length > 0 && totalTrendAwards > 0;
  const hasRankings = rankings.length > 0 && topScore > 0;

  const rankingData = rankings.map((item, index) => ({
    ...item,
    fill: RANK_TONES[index % RANK_TONES.length],
  }));

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="card flex flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-[#0f1d18]">近 5 年获奖趋势</h2>
            <p className="mt-0.5 text-xs text-[#5c6c65]">仅汇总已核验归档并发布的有效获奖记录</p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full bg-[#e3f0ea] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#115740] tabular-nums">
            累计 {totalTrendAwards} 项
          </span>
        </div>
        <div aria-hidden="true" className="mt-3.5 h-px bg-[#d5e2db]/60" />

        <div className="mt-4 h-72 w-full" aria-label="近 5 年获奖趋势折线图">
          {hasTrend ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 10, right: 16, bottom: 2, left: -8 }}>
                <CartesianGrid stroke="#dce7e0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="year"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12, fill: "#54635d" }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  tick={{ fontSize: 12, fill: "#54635d" }}
                />
                <Tooltip content={<AcademyTooltip unit="项" />} />
                <Line
                  type="monotone"
                  dataKey="awardCount"
                  name="获奖记录"
                  stroke="#115740"
                  strokeWidth={2.25}
                  dot={{ r: 3.5, fill: "#115740", stroke: "#ffffff", strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: "#2a7b5f", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyPanel title="暂无历年趋势数据" hint="当前赛年范围内尚无已核验发布的历年获奖台账" />
          )}
        </div>
      </section>

      <section className="card flex flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-[#0f1d18]">学院排行前 10</h2>
            <p className="mt-0.5 text-xs text-[#5c6c65]">按有效获奖折算积分由高到低排列</p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full bg-[#e3f0ea] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#115740] tabular-nums">
            共 {rankings.length} 个院系
          </span>
        </div>
        <div aria-hidden="true" className="mt-3.5 h-px bg-[#d5e2db]/60" />

        <div className="mt-4 h-72 w-full" aria-label="学院折算分排行柱状图">
          {hasRankings ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankingData} margin={{ top: 10, right: 16, bottom: 2, left: -8 }}>
                <CartesianGrid stroke="#dce7e0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="college"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  minTickGap={6}
                  tickFormatter={formatCollegeTick}
                  tick={{ fontSize: 11, fill: "#54635d" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  tick={{ fontSize: 12, fill: "#54635d" }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(17, 87, 64, 0.045)", radius: 6 }}
                  content={<AcademyTooltip unit="分" />}
                />
                <Bar dataKey="score" name="折算分" fill="#115740" maxBarSize={32} radius={[6, 6, 0, 0]}>
                  {rankingData.map((entry) => (
                    <Cell key={entry.college} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyPanel title="暂无院系积分排行" hint="待各学院获奖记录完成核验归档后自动计算排行" />
          )}
        </div>
      </section>
    </div>
  );
}
