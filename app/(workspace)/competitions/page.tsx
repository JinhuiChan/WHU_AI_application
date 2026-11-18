import { Button, ButtonArrow } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CompetitionCreate } from "@/components/admin/competition-create";
import { CompetitionDeleteButton } from "@/components/admin/competition-delete-button";
import { CompetitionCards } from "@/components/competitions/competition-cards";
import { EventSwatch, LevelPill } from "@/components/competitions/event-tone";
import { DeadlinePill } from "@/components/ui/deadline-meter";
import { SectionHead } from "@/components/ui/section-head";
import { CompetitionMobileList } from "@/components/competitions/competition-mobile-list";
import { Pagination } from "@/components/data/pagination";
import { detailHref, listHref } from "@/components/data/list-link";
import { getActiveUser } from "@/lib/auth.server";
import { getCompetitionPage, listCompetitionYears } from "@/lib/competitions";
import {
  firstParam,
  optionalCompetitionLevel,
  optionalPublishStatus,
  optionalText,
  optionalYear,
  pageParams,
} from "@/lib/list-query";
import { publishStatusLabels, registrationStatusLabels } from "@/lib/presentation";

export const metadata: Metadata = { title: "赛事" };

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const filterControlClass =
  "h-10 rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition-colors focus:border-[#115740] focus-visible:ring-2 focus-visible:ring-[#115740]/20";

export default async function CompetitionsPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");

  const year = firstParam(searchParams?.year);
  const level = firstParam(searchParams?.level);
  const publishStatus = firstParam(searchParams?.publishStatus);
  const q = firstParam(searchParams?.q);
  const rawPageSize = firstParam(searchParams?.pageSize);
  const { page, pageSize } = pageParams(firstParam(searchParams?.page), rawPageSize);
  const [data, years] = await Promise.all([
    getCompetitionPage(
      {
        year: optionalYear(year),
        level: optionalCompetitionLevel(level),
        publishStatus: user.role === "ADMIN" ? optionalPublishStatus(publishStatus) : undefined,
        q: optionalText(q),
        page,
        pageSize,
      },
      { studentId: user.role === "STUDENT" ? user.id : undefined, isAdmin: user.role === "ADMIN" },
    ),
    listCompetitionYears(),
  ]);
  const isStudent = user.role === "STUDENT";
  // 详情页的返回目标：带上当前筛选与页码，回来时不用重新选一遍
  const from = listHref("/competitions", {
    year,
    level,
    publishStatus,
    q,
    page: page > 1 ? String(page) : "",
    pageSize: String(pageSize),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="t-page-title font-display text-[26px] font-bold tracking-tight text-[#0e1d17] sm:text-[28px]">
            {user.role === "STUDENT" ? "可报名赛事" : "赛事管理"}
          </h1>
          <p className="mt-1.5 text-sm text-[#54635d]">
            {user.role === "STUDENT"
              ? "点进赛事查看报名通知与参赛规程，确认赛道与组别后再报名。"
              : "按赛年、等级和关键词查找赛事，进入详情查看获奖名单。"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user.role === "ADMIN" ? <CompetitionCreate /> : null}
          <Link
            href="/intro"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#7f9384] bg-white px-5 text-sm font-medium text-[#24362f] transition duration-150 ease-out hover:border-[#115740] hover:bg-[#f2f8f4] active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
          >
            赛事简介
          </Link>
          {user.role === "STUDENT" ? (
            <Link
              href="/my"
              className="inline-flex h-10 items-center justify-center rounded-full border border-[#7f9384] bg-white px-5 text-sm font-medium text-[#24362f] transition duration-150 ease-out hover:border-[#115740] hover:bg-[#f2f8f4] active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
            >
              我的项目
            </Link>
          ) : null}
        </div>
      </div>

      {/* 入口页第一眼要能分清「有哪几场比赛」。表格承载筛选与明细，但认不出赛事本体，
          所以首屏先给一排彩色赛事卡，颜色按等级、插画按 seriesId 对赛事本体。
          翻页之后不再出现：第二页起是「继续找」，不需要再认一遍。 */}
      {page === 1 ? <CompetitionCards from={from} isStudent={isStudent} items={data.list} /> : null}

      <section className="card p-4 sm:p-5">
        <form action="/competitions" method="get" className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-[#33433d]">
            <span className="mb-1.5 block text-xs font-medium text-[#4a5c54]">赛年</span>
            <select name="year" defaultValue={year} className={`${filterControlClass} min-w-28`}>
              <option value="">全部赛年</option>
              {years.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-[#33433d]">
            <span className="mb-1.5 block text-xs font-medium text-[#4a5c54]">赛事等级</span>
            <select name="level" defaultValue={level} className={`${filterControlClass} min-w-28`}>
              <option value="">全部等级</option>
              <option value="SCHOOL">校赛</option>
              <option value="PROVINCE">省赛</option>
              <option value="NATIONAL">国赛</option>
            </select>
          </label>
          {user.role === "ADMIN" ? (
            <label className="text-sm text-[#33433d]">
              <span className="mb-1.5 block text-xs font-medium text-[#4a5c54]">发布状态</span>
              <select name="publishStatus" defaultValue={publishStatus} className={`${filterControlClass} min-w-28`}>
                <option value="">全部状态</option>
                <option value="DRAFT">草稿</option>
                <option value="PUBLISHED">已发布</option>
                <option value="WITHDRAWN">已下架</option>
              </select>
            </label>
          ) : null}
          <label className="min-w-52 flex-1 text-sm text-[#33433d]">
            <span className="mb-1.5 block text-xs font-medium text-[#4a5c54]">关键词</span>
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder={isStudent ? "赛事名称或主办方" : "赛事名称、主办方或系列标识"}
              className={`${filterControlClass} w-full`}
            />
          </label>
          <label className="text-sm text-[#33433d]">
            <span className="mb-1.5 block text-xs font-medium text-[#4a5c54]">每页条数</span>
            <select name="pageSize" defaultValue={String(pageSize)} className={filterControlClass}>
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size} 条
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              className="h-10 rounded-full bg-[#115740] px-5 text-white hover:bg-[#0d4633] active:bg-[#093426] focus-visible:ring-[#115740]/30"
            >
              筛选
            </Button>
            <Link
              href="/competitions"
              className="inline-flex h-10 items-center justify-center rounded-full border border-[#7f9384] bg-white px-5 text-sm font-medium text-[#24362f] transition duration-150 ease-out hover:border-[#115740] hover:bg-[#f2f8f4] active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
            >
              重置
            </Link>
          </div>
        </form>
      </section>

      <section className="overflow-hidden card">
        <div className="px-5 pt-5">
          <SectionHead
            meta={`共 ${data.total} 场`}
            sub={isStudent ? "点赛事名查看通知与规程；截止时间按剩余天数标色" : "点赛事名查看详情与获奖名单"}
            title="赛事明细"
          />
        </div>
        <div aria-hidden="true" className="mx-5 mt-4 h-px bg-[#d5e2db]/60" />
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="t-thead bg-[#f5faf7] text-xs text-[#4d5e57]">
              <tr>
                <th className="w-[8%] whitespace-nowrap px-4 py-3 font-medium">赛年</th>
                <th className={isStudent ? "w-[30%] px-4 py-3 font-medium" : "w-[26%] px-4 py-3 font-medium"}>
                  赛事名称
                </th>
                <th className="w-[9%] whitespace-nowrap px-3.5 py-3 font-medium">等级</th>
                {isStudent ? (
                  <>
                    <th className="w-[19%] whitespace-nowrap px-4 py-3 font-medium">报名截止</th>
                    <th className="w-[13%] whitespace-nowrap px-4 py-3 font-medium">我的报名</th>
                  </>
                ) : (
                  <>
                    <th className="w-[10%] whitespace-nowrap px-3.5 py-3 font-medium">发布状态</th>
                    <th className="w-[14%] px-3.5 py-3 font-medium">系列标识</th>
                    <th className="w-[16%] px-3.5 py-3 font-medium">主办方</th>
                  </>
                )}
                <th
                  className={
                    isStudent
                      ? "w-[21%] min-w-[196px] whitespace-nowrap px-4 py-3 font-medium"
                      : "w-[17%] min-w-[168px] whitespace-nowrap px-4 py-3 font-medium"
                  }
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaf1ed]">
              {data.list.map((competition) => (
                <tr key={competition.id} className="text-[#24362f] hover:bg-[#f7faf8]">
                  <td className="whitespace-nowrap px-4 py-4 tabular-nums">{competition.year}</td>
                  <td className="px-4 py-4 font-medium text-[#0f1d18]">
                    <span className="flex items-center gap-2">
                      {/* 与顶部赛事卡同色，扫一眼就能把行和卡对上 */}
                      <EventSwatch level={competition.level} />
                      <Link
                        href={detailHref("/competitions", competition.id, from)}
                        className="rounded-sm transition-colors hover:text-[#115740] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
                      >
                        {competition.name}
                      </Link>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3.5 py-4">
                    {/* 等级胶囊与色标同色系，行首色块、卡片底色、胶囊三者一致 */}
                    <LevelPill level={competition.level} />
                  </td>
                  {isStudent ? (
                    <>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-[#4a5c54]">
                        {competition.registration?.windowEndAt ? (
                          <DeadlinePill
                            endAt={competition.registration.windowEndAt}
                            startAt={competition.registration.windowStartAt}
                          />
                        ) : (
                          <span className="text-[#7c8e85]">未设置报名窗口</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs">
                        {competition.registration?.projectStatus ? (
                          <StatusBadge status={competition.registration.projectStatus}>
                            {registrationStatusLabels[competition.registration.projectStatus]}
                          </StatusBadge>
                        ) : (
                          <span className="text-[#7c8e85]">未报名</span>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="whitespace-nowrap px-3.5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            competition.publishStatus === "PUBLISHED"
                              ? "border border-[#c5d9ce] bg-[#eef5f1] text-[#115740]"
                              : competition.publishStatus === "WITHDRAWN"
                                ? "border border-red-200 bg-red-50 text-red-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {publishStatusLabels[competition.publishStatus]}
                        </span>
                      </td>
                      <td className="max-w-[160px] truncate px-3.5 py-4 text-xs text-[#5c6c65]">
                        {competition.seriesId}
                      </td>
                      <td className="max-w-[190px] truncate px-3.5 py-4 text-xs text-[#33433d]">
                        {competition.organizer || "未填写"}
                      </td>
                    </>
                  )}
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="group h-8 rounded-full border-[#7f9384] px-3 text-[#24362f] hover:border-[#115740] hover:bg-[#f2f8f4]"
                      >
                        <Link href={detailHref("/competitions", competition.id, from)}>
                          查看详情
                          <ButtonArrow />
                        </Link>
                      </Button>
                      {isStudent && competition.registration?.windowOpen && !competition.registration.projectId ? (
                        <Button
                          asChild
                          size="sm"
                          className="group h-8 rounded-full bg-[#115740] px-3 text-white hover:bg-[#0d4633] active:bg-[#093426] focus-visible:ring-[#115740]/30"
                        >
                          <Link href={`/apply?competitionId=${competition.id}`}>
                            立即报名
                            <ButtonArrow />
                          </Link>
                        </Button>
                      ) : null}
                      {isStudent && competition.registration?.projectStatus ? (
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-full px-3 text-[#4a5c54] hover:bg-[#eef5f1] hover:text-[#115740]"
                        >
                          <Link href="/my">我的项目</Link>
                        </Button>
                      ) : null}
                      {user.role === "ADMIN" ? (
                        <CompetitionDeleteButton
                          compact
                          competitionId={competition.id}
                          competitionName={competition.name}
                          label="删除"
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {data.list.length === 0 ? (
                <tr>
                  <td colSpan={isStudent ? 6 : 7}>
                    <EmptyState
                      title="还没有符合条件的赛事"
                      description="试试放宽赛年、状态或关键字，也可以重置筛选查看全部赛事。"
                      action={{ href: "/competitions", label: "清除筛选" }}
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {data.list.length === 0 ? (
          <div className="lg:hidden">
            <EmptyState
              title="还没有符合条件的赛事"
              description="试试放宽赛年、状态或关键字，也可以重置筛选查看全部赛事。"
              action={{ href: "/competitions", label: "清除筛选" }}
            />
          </div>
        ) : (
          <CompetitionMobileList items={data.list} isStudent={isStudent} from={from} />
        )}
        <Pagination
          basePath="/competitions"
          query={{ year, level, publishStatus, q, pageSize: String(pageSize) }}
          total={data.total}
          page={data.page}
          pageSize={data.pageSize}
        />
      </section>
    </div>
  );
}
