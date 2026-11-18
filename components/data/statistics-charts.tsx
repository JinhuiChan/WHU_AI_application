"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { WhuGateEmblem } from "@/components/brand/whu-motifs";
import type { StatisticsAwardLevel, StatisticsStage, StatisticsSummary } from "@/types/statistics";

const TRACK_PALETTE = [
  "#115740",
  "#2a7b5f",
  "#c59b45",
  "#528c74",
  "#8a2c36",
  "#789d8b",
  "#a37c35",
  "#3d6b58",
];

const STAGE_TONE: Record<StatisticsStage, string> = {
  SCHOOL: "#2a7b5f",
  PROVINCE: "#115740",
  NATIONAL: "#c59b45",
};

const AWARD_TONE: Record<StatisticsAwardLevel, string> = {
  GOLD: "#c59b45",
  SILVER: "#2a7b5f",
  BRONZE: "#4d7c6a",
  EXCELLENT: "#789d8b",
};

type TooltipEntry = {
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: {
    trackName?: string;
    label?: string;
    percentage?: number;
    fill?: string;
  };
};

function CeladonTooltip({
  active,
  payload,
  label,
  unit = "项",
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const title = item.payload?.trackName ?? item.payload?.label ?? (label !== undefined ? String(label) : String(item.name ?? ""));
  const value = Number(item.value ?? 0);
  const share = item.payload?.percentage;
  const dotColor = item.payload?.fill ?? item.color ?? "#115740";

  return (
    <div className="rounded-xl border border-[#cfe0d7] bg-[#f8fbf9] px-3.5 py-2.5 shadow-[0_8px_20px_-8px_rgba(17,87,64,0.18)]">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-[#162620]">
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
        <span className="max-w-[180px] truncate">{title}</span>
      </p>
      <p className="mt-1 flex items-baseline gap-2 text-xs text-[#54635d]">
        <span>数量</span>
        <span className="font-display text-sm font-bold text-[#0f1d18] tabular-nums">
          {value} {unit}
        </span>
        {typeof share === "number" ? (
          <span className="text-[11px] text-[#677770] tabular-nums">（占 {share}%）</span>
        ) : null}
      </p>
    </div>
  );
}

function ChartEmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex h-full min-h-[18rem] flex-col items-center justify-center rounded-xl border border-dashed border-[#d5e2db] bg-[#f8fbf9]/85 px-4 py-7 text-center">
      <WhuGateEmblem className="h-10 w-14 text-[#115740]/35" />
      <p className="mt-2.5 font-display text-sm font-semibold text-[#162620]">{title}</p>
      <p className="mt-1 max-w-[220px] text-xs leading-5 text-[#677770]">{hint}</p>
    </div>
  );
}

export function StatisticsCharts({
  byTrack,
  byStage,
  byAward,
}: Pick<StatisticsSummary, "byTrack" | "byStage" | "byAward">) {
  const totalTrackProjects = byTrack.reduce((sum, item) => sum + item.projectCount, 0);
  const totalStageProjects = byStage.reduce((sum, item) => sum + item.projectCount, 0);
  const totalAwards = byAward.reduce((sum, item) => sum + item.count, 0);

  const mergedTracksMap = new Map<string, number>();
  for (const item of byTrack) {
    if (item.projectCount <= 0) continue;
    const name = item.trackName.trim() || "未设置赛道";
    mergedTracksMap.set(name, (mergedTracksMap.get(name) ?? 0) + item.projectCount);
  }

  const trackChartData = [...mergedTracksMap.entries()]
    .map(([trackName, projectCount]) => ({
      trackName,
      projectCount,
      percentage: totalTrackProjects > 0 ? Number(((projectCount / totalTrackProjects) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.projectCount - a.projectCount || a.trackName.localeCompare(b.trackName, "zh-CN"))
    .map((item, index) => ({
      ...item,
      fill: TRACK_PALETTE[index % TRACK_PALETTE.length],
    }));

  const hasTrackData = trackChartData.length > 0 && totalTrackProjects > 0;
  const hasStageData = byStage.length > 0 && totalStageProjects > 0;
  const hasAwardData = byAward.length > 0 && totalAwards > 0;

  const stageChartData = byStage.map((item) => ({
    ...item,
    fill: STAGE_TONE[item.stage] ?? "#115740",
  }));

  const awardChartData = byAward.map((item) => ({
    ...item,
    fill: AWARD_TONE[item.awardLevel] ?? "#c59b45",
  }));

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {/* 1. 赛道分布：左环右例 + 中央宋体项目总数 */}
      <section className="card flex flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-[#0f1d18]">赛道分布</h2>
            <p className="mt-0.5 text-xs text-[#5c6c65]">各参赛赛道立项数量与构成占比</p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full bg-[#e3f0ea] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#115740] tabular-nums">
            共 {totalTrackProjects} 项
          </span>
        </div>
        <div aria-hidden="true" className="mt-3.5 h-px bg-[#d5e2db]/60" />

        <div className="mt-4 flex min-h-[18rem] flex-1 flex-col justify-center" aria-label="赛道分布环形图">
          {hasTrackData ? (
            <div className="flex h-full flex-col items-center justify-between gap-2.5 sm:flex-row sm:items-center sm:gap-5 xl:flex-col xl:items-stretch xl:gap-2.5">
              <div className="relative mx-auto h-36 w-40 shrink-0 sm:mx-0 sm:h-48 sm:w-44 xl:mx-auto xl:h-[136px] xl:w-[148px]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center text-center"
                >
                  <span className="font-display text-[23px] font-bold leading-none tracking-tight text-[#0b1f18] tabular-nums sm:text-[26px] xl:text-[23px]">
                    {totalTrackProjects}
                  </span>
                  <span className="mt-1 text-[11px] font-medium text-[#5c6c65]">项目总数</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={trackChartData}
                      dataKey="projectCount"
                      nameKey="trackName"
                      cx="50%"
                      cy="50%"
                      innerRadius="58%"
                      outerRadius="86%"
                      paddingAngle={2}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    >
                      {trackChartData.map((item) => (
                        <Cell key={item.trackName} fill={item.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CeladonTooltip unit="项" />} wrapperStyle={{ zIndex: 20 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <ul aria-label="赛道数量与占比图例" className="w-full min-w-0 flex-1 space-y-1">
                {trackChartData.map((item) => (
                  <li
                    key={item.trackName}
                    className="flex items-center justify-between gap-2.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-[#f2f7f4]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="truncate font-medium text-[#162620]" title={item.trackName}>
                        {item.trackName}
                      </span>
                    </span>
                    <span className="shrink-0 whitespace-nowrap tabular-nums">
                      <span className="font-display font-bold text-[#0f1d18]">{item.projectCount}</span>
                      <span className="ml-0.5 text-[11px] text-[#5c6c65]">项</span>
                      <span className="ml-1.5 inline-block min-w-[40px] text-right text-[11px] text-[#677770]">
                        {item.percentage}%
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ChartEmptyState title="暂无赛道立项记录" hint="当前筛选范围内尚无已分配赛道的申报项目" />
          )}
        </div>
      </section>

      {/* 2. 阶段分布：书院绿青阶梯柱状图 */}
      <section className="card flex flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-[#0f1d18]">阶段分布</h2>
            <p className="mt-0.5 text-xs text-[#5c6c65]">校赛、省赛与国赛各阶段在库项目分布</p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full bg-[#e3f0ea] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#115740] tabular-nums">
            共 {totalStageProjects} 项
          </span>
        </div>
        <div aria-hidden="true" className="mt-3.5 h-px bg-[#d5e2db]/60" />

        <div className="mt-4 min-h-[18rem] flex-1" aria-label="阶段分布柱状图">
          {hasStageData ? (
            <ResponsiveContainer width="100%" height="100%" minHeight={288}>
              <BarChart data={stageChartData} margin={{ top: 12, right: 12, bottom: 2, left: -12 }}>
                <CartesianGrid stroke="#dce7e0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12, fill: "#54635d" }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  width={34}
                  tick={{ fontSize: 12, fill: "#54635d" }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(17, 87, 64, 0.045)", radius: 6 }}
                  content={<CeladonTooltip unit="项" />}
                />
                <Bar dataKey="projectCount" name="项目数" fill="#115740" maxBarSize={32} radius={[6, 6, 0, 0]}>
                  {stageChartData.map((entry) => (
                    <Cell key={entry.stage} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmptyState title="暂无阶段流转数据" hint="当前筛选范围内尚无处于校赛、省赛或国赛阶段的项目" />
          )}
        </div>
      </section>

      {/* 3. 奖项分布：清除数据库表名黑话 + 暖古金/青瓷绿柱状图 */}
      <section className="card flex flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-[#0f1d18]">奖项分布</h2>
            <p className="mt-0.5 text-xs text-[#5c6c65]">已核验归档的各等级获奖记录统计</p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full bg-[#e3f0ea] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#115740] tabular-nums">
            共 {totalAwards} 项
          </span>
        </div>
        <div aria-hidden="true" className="mt-3.5 h-px bg-[#d5e2db]/60" />

        <div className="mt-4 min-h-[18rem] flex-1" aria-label="奖项分布柱状图">
          {hasAwardData ? (
            <ResponsiveContainer width="100%" height="100%" minHeight={288}>
              <BarChart data={awardChartData} margin={{ top: 12, right: 12, bottom: 2, left: -12 }}>
                <CartesianGrid stroke="#dce7e0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12, fill: "#54635d" }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  width={34}
                  tick={{ fontSize: 12, fill: "#54635d" }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(197, 155, 69, 0.07)", radius: 6 }}
                  content={<CeladonTooltip unit="项" />}
                />
                <Bar dataKey="count" name="获奖记录" fill="#c59b45" maxBarSize={32} radius={[6, 6, 0, 0]}>
                  {awardChartData.map((entry) => (
                    <Cell key={entry.awardLevel} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmptyState title="暂无归档获奖记录" hint="待赛事评审结项并完成获奖核验归档后自动汇总" />
          )}
        </div>
      </section>
    </div>
  );
}
