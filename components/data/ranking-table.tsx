"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { awardLevelLabels, competitionLevelLabels } from "@/lib/presentation";
import { formatScore } from "@/lib/scoring";
import type { CollegeRanking } from "@/types/dashboard";

export function RankingTable({ items }: { items: CollegeRanking[] }) {
  const [expandedColleges, setExpandedColleges] = useState<string[]>([]);

  function toggle(college: string) {
    setExpandedColleges((current) =>
      current.includes(college) ? current.filter((item) => item !== college) : [...current, college],
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">学院</th>
              <th className="px-4 py-3 font-medium">折算分</th>
              <th className="px-4 py-3 font-medium">国赛数</th>
              <th className="px-4 py-3 font-medium">省赛数</th>
              <th className="px-4 py-3 font-medium">校赛数</th>
              <th className="px-4 py-3 font-medium">获奖明细</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => {
              const expanded = expandedColleges.includes(item.college);
              return (
                <Fragment key={item.college}>
                  <tr className="text-slate-700 hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">{index + 1}</span>
                        <span className="font-medium text-slate-900">{item.college}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-semibold text-blue-700">{formatScore(item.score)}</td>
                    <td className="px-4 py-4">{item.nationalCount}</td>
                    <td className="px-4 py-4">{item.provinceCount}</td>
                    <td className="px-4 py-4">{item.schoolCount}</td>
                    <td className="px-4 py-4">
                      <button type="button" aria-expanded={expanded} aria-controls={`ranking-${index}`} onClick={() => toggle(item.college)} className="rounded-md border border-slate-300 px-3 py-2 text-xs text-blue-600 hover:bg-blue-50">
                        {expanded ? "收起" : `展开（${item.awardCount}）`}
                      </button>
                    </td>
                  </tr>
                  {expanded ? (
                    <tr id={`ranking-${index}`} className="bg-slate-50/70">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                          <div className="border-b border-slate-200 px-4 py-3 text-xs text-slate-500">
                            {item.college} · 共 {item.awardCount} 条有效获奖 · 明细合计 {formatScore(item.details.reduce((sum, detail) => sum + detail.score, 0))} 分
                          </div>
                          {item.details.length ? (
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-500">
                                <tr><th className="px-4 py-2 font-medium">项目名</th><th className="px-4 py-2 font-medium">赛事</th><th className="px-4 py-2 font-medium">奖项</th><th className="px-4 py-2 font-medium">该条得分</th></tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {item.details.map((detail) => (
                                  <tr key={detail.awardId}>
                                    <td className="px-4 py-3"><Link href={`/projects/${detail.projectId}`} className="text-slate-700 hover:text-blue-600">{detail.projectName}</Link></td>
                                    <td className="px-4 py-3 text-slate-600">{detail.competitionName}<span className="ml-2 text-slate-400">{competitionLevelLabels[detail.competitionLevel]}</span></td>
                                    <td className="px-4 py-3 text-slate-600">{awardLevelLabels[detail.awardLevel]}</td>
                                    <td className="px-4 py-3 font-medium text-slate-900">{formatScore(detail.score)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : <p className="px-4 py-6 text-center text-xs text-slate-400">暂无有效获奖明细</p>}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {!items.length ? <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">该赛年暂无学院排行数据</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
