"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { WhuGateEmblem } from "@/components/brand/whu-motifs";
import { Button } from "@/components/ui/button";
import { awardLevelLabels, competitionLevelLabels } from "@/lib/presentation";
import { formatScore } from "@/lib/scoring";
import type { CollegeRanking } from "@/types/dashboard";

function rankBadgeStyle(index: number) {
  if (index === 0) return "bg-[#f6efe0] text-[#8f681c] ring-1 ring-[#dfc58b]";
  if (index === 1) return "bg-[#e3f0ea] text-[#115740] ring-1 ring-[#bfd8cc]";
  if (index === 2) return "bg-[#eef5f1] text-[#2a7b5f] ring-1 ring-[#cfe0d7]";
  return "bg-[#f2f7f4] text-[#54635d]";
}

export function RankingTable({ items }: { items: CollegeRanking[] }) {
  const [expandedColleges, setExpandedColleges] = useState<string[]>([]);

  function toggle(college: string) {
    setExpandedColleges((current) =>
      current.includes(college) ? current.filter((item) => item !== college) : [...current, college],
    );
  }

  return (
    <section className="overflow-hidden card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="t-thead bg-[#f5faf7] text-xs text-[#4d5e57]">
            <tr>
              <th className="px-4 py-3 font-medium">学院</th>
              <th className="px-4 py-3 font-medium">折算分</th>
              <th className="px-4 py-3 font-medium">国赛数</th>
              <th className="px-4 py-3 font-medium">省赛数</th>
              <th className="px-4 py-3 font-medium">校赛数</th>
              <th className="px-4 py-3 text-right font-medium">获奖明细</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef4f0]">
            {items.map((item, index) => {
              const expanded = expandedColleges.includes(item.college);
              return (
                <Fragment key={item.college}>
                  <tr className="text-[#33433d] transition-colors hover:bg-[#f7faf8]">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold tabular-nums ${rankBadgeStyle(index)}`}
                        >
                          {index + 1}
                        </span>
                        <span className="font-semibold text-[#0f1d18]">{item.college}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-display text-[15px] font-bold text-[#115740] tabular-nums">
                      {formatScore(item.score)}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums">{item.nationalCount}</td>
                    <td className="px-4 py-3.5 tabular-nums">{item.provinceCount}</td>
                    <td className="px-4 py-3.5 tabular-nums">{item.schoolCount}</td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={`ranking-${index}`}
                        onClick={() => toggle(item.college)}
                        className="rounded-full border-[#7f9384] text-[#162620] hover:border-[#115740] hover:bg-[#f2f7f4]"
                      >
                        {expanded ? "收起明细" : `展开（${item.awardCount}）`}
                      </Button>
                    </td>
                  </tr>
                  {expanded ? (
                    <tr id={`ranking-${index}`} className="bg-[#f7faf8]/80">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="overflow-hidden rounded-xl border border-[#d5e2db] bg-[#f8fbf9]">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d5e2db] px-4 py-2.5 text-xs text-[#54635d]">
                            <span className="font-medium text-[#162620]">{item.college}</span>
                            <span className="tabular-nums">
                              共 <strong className="font-display font-bold text-[#115740]">{item.awardCount}</strong> 条有效获奖 · 明细合计{" "}
                              <strong className="font-display font-bold text-[#0f1d18]">
                                {formatScore(item.details.reduce((sum, detail) => sum + detail.score, 0))}
                              </strong>{" "}
                              分
                            </span>
                          </div>
                          {item.details.length ? (
                            <table className="w-full text-left text-xs">
                              <thead className="bg-[#eef5f1]/80 text-[#4d5e57]">
                                <tr>
                                  <th className="px-4 py-2 font-medium">项目名称</th>
                                  <th className="px-4 py-2 font-medium">所属赛事</th>
                                  <th className="px-4 py-2 font-medium">获奖等级</th>
                                  <th className="px-4 py-2 text-right font-medium">折算得分</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#e3ede7]">
                                {item.details.map((detail) => (
                                  <tr key={detail.awardId} className="bg-white/70 hover:bg-white">
                                    <td className="px-4 py-2.5 font-medium">
                                      <Link
                                        href={`/projects/${detail.projectId}`}
                                        className="text-[#0f1d18] transition-colors hover:text-[#115740] hover:underline"
                                      >
                                        {detail.projectName}
                                      </Link>
                                    </td>
                                    <td className="px-4 py-2.5 text-[#33433d]">
                                      {detail.competitionName}
                                      <span className="ml-2 rounded-full bg-[#e3f0ea] px-2 py-0.5 text-[11px] font-medium text-[#115740]">
                                        {competitionLevelLabels[detail.competitionLevel]}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-[#33433d]">{awardLevelLabels[detail.awardLevel]}</td>
                                    <td className="px-4 py-2.5 text-right font-display font-bold text-[#115740] tabular-nums">
                                      {formatScore(detail.score)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="inline-empty m-3 text-center text-xs">暂无已核验获奖明细</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {!items.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <WhuGateEmblem className="h-10 w-14 text-[#115740]/35" />
                    <p className="mt-2.5 font-display text-sm font-semibold text-[#162620]">该赛年暂无学院排行数据</p>
                    <p className="mt-1 text-xs text-[#677770]">待赛事获奖台账核验发布后自动生成院系折算排行</p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
