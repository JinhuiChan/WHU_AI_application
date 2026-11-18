import Link from "next/link";
import { CompetitionDeleteButton } from "@/components/admin/competition-delete-button";
import { EventSwatch, LevelPill } from "@/components/competitions/event-tone";
import { detailHref } from "@/components/data/list-link";
import { Button, ButtonArrow } from "@/components/ui/button";
import { DeadlinePill } from "@/components/ui/deadline-meter";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  publishStatusLabels,
  registrationStatusLabels,
} from "@/lib/presentation";
import type { CompetitionListItem } from "@/types/competition";

type Props = {
  items: CompetitionListItem[];
  /** 与表格同一套口径：学生看报名相关信息，其余角色看管理与发布信息 */
  isStudent: boolean;
  /** 列表页当前地址，详情页用它当返回目标 */
  from: string;
};

const publishTone: Record<string, string> = {
  PUBLISHED: "border border-[#c5d9ce] bg-[#eef5f1] text-[#115740]",
  WITHDRAWN: "border border-red-200 bg-red-50 text-red-700",
  DRAFT: "bg-slate-100 text-slate-600",
};

/**
 * 赛事列表的小屏形态。
 *
 * 电脑端保留表格：管理员需要横向比对多列，卡片反而更难扫。
 * 窄屏换成卡片，因为表格 `min-w-[880px]`，在 390px 下只会露出三列，
 * 剩下的既看不到也没有滚动提示。两套渲染共用同一份数据与同一批按钮，
 * 只改展示，不动任何查询逻辑。
 */
export function CompetitionMobileList({ items, isStudent, from }: Props) {
  return (
    <ul className="divide-y divide-[#eaf1ed] lg:hidden">
      {items.map((competition) => {
        const registration = competition.registration;
        return (
          <li key={competition.id} className="p-4">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <EventSwatch level={competition.level} />
              <span className="tabular-nums text-[#5c6c65]">{competition.year} 年</span>
              <LevelPill className="px-2 py-0.5 text-[11px]" level={competition.level} />
              {isStudent ? (
                registration?.windowEndAt ? (
                  registration.windowOpen ? (
                    <span className="rounded-full border border-[#c5d9ce] bg-[#eef5f1] px-2 py-0.5 font-medium text-[#115740]">
                      报名中
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">已关闭</span>
                  )
                ) : null
              ) : (
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    publishTone[competition.publishStatus] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {publishStatusLabels[competition.publishStatus]}
                </span>
              )}
            </div>

            <h3 className="mt-2 text-sm font-semibold leading-6 text-[#0f1d18]">
              <Link
                href={detailHref("/competitions", competition.id, from)}
                className="rounded-sm transition-colors hover:text-[#115740] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#115740]"
              >
                {competition.name}
              </Link>
            </h3>

            <dl className="mt-2 space-y-1 text-xs">
              {isStudent ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <dt className="shrink-0 text-[#5c6c65]">报名截止</dt>
                    <dd className="min-w-0 text-[#24362f]">
                      {registration?.windowEndAt ? (
                        <DeadlinePill endAt={registration.windowEndAt} startAt={registration.windowStartAt} />
                      ) : (
                        <span className="text-[#7c8e85]">未设置</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <dt className="shrink-0 text-[#5c6c65]">我的报名</dt>
                    <dd className="min-w-0">
                      {registration?.projectStatus ? (
                        <StatusBadge status={registration.projectStatus}>
                          {registrationStatusLabels[registration.projectStatus]}
                        </StatusBadge>
                      ) : (
                        <span className="text-[#7c8e85]">未报名</span>
                      )}
                    </dd>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex gap-1.5">
                    <dt className="shrink-0 text-[#5c6c65]">系列标识</dt>
                    <dd className="min-w-0 break-all text-[#33433d]">{competition.seriesId}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="shrink-0 text-[#5c6c65]">主办方</dt>
                    <dd className="min-w-0 text-[#33433d]">{competition.organizer || "未填写"}</dd>
                  </div>
                </>
              )}
            </dl>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="group h-9 rounded-full border-[#7f9384] px-3.5 text-[#24362f] hover:border-[#115740] hover:bg-[#f2f8f4] active:scale-[0.98] motion-reduce:active:scale-100"
              >
                <Link href={detailHref("/competitions", competition.id, from)}>
                  查看详情
                  <ButtonArrow />
                </Link>
              </Button>
              {isStudent && registration?.windowOpen && !registration.projectId ? (
                <Button
                  asChild
                  size="sm"
                  className="group h-9 rounded-full bg-[#115740] px-3.5 text-white hover:bg-[#0d4633] active:bg-[#093426] active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:ring-[#115740]/30"
                >
                  <Link href={`/apply?competitionId=${competition.id}`}>
                    立即报名
                    <ButtonArrow />
                  </Link>
                </Button>
              ) : null}
              {isStudent && registration?.projectStatus ? (
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="h-9 rounded-full px-3.5 text-[#4a5c54] hover:bg-[#eef5f1] hover:text-[#115740] active:scale-[0.98] motion-reduce:active:scale-100"
                >
                  <Link href="/my">我的项目</Link>
                </Button>
              ) : null}
              {!isStudent ? (
                <CompetitionDeleteButton
                  compact
                  competitionId={competition.id}
                  competitionName={competition.name}
                  label="删除"
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
