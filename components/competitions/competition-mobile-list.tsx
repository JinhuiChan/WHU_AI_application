import Link from "next/link";
import { CompetitionDeleteButton } from "@/components/admin/competition-delete-button";
import { detailHref } from "@/components/data/list-link";
import { Button, ButtonArrow } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  competitionLevelLabels,
  formatDateTime,
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
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  WITHDRAWN: "bg-red-50 text-red-700",
  DRAFT: "bg-slate-100 text-slate-600",
};

/**
 * 赛事列表的小屏形态。
 *
 * 电脑端保留表格：管理员需要横向比对多列，卡片反而更难扫。
 * 窄屏换成卡片，因为表格 `min-w-[900px]`，在 390px 下只会露出三列，
 * 剩下的既看不到也没有滚动提示。两套渲染共用同一份数据与同一批按钮，
 * 只改展示，不动任何查询逻辑。
 */
export function CompetitionMobileList({ items, isStudent, from }: Props) {
  return (
    <ul className="divide-y divide-slate-100 lg:hidden">
      {items.map((competition) => {
        const registration = competition.registration;
        return (
          <li key={competition.id} className="p-4">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-500">{competition.year} 年</span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                {competitionLevelLabels[competition.level]}
              </span>
              {isStudent ? (
                registration?.windowEndAt ? (
                  registration.windowOpen ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">报名中</span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">已关闭</span>
                  )
                ) : null
              ) : (
                <span className={`rounded-full px-2 py-0.5 ${publishTone[competition.publishStatus] ?? "bg-slate-100 text-slate-600"}`}>
                  {publishStatusLabels[competition.publishStatus]}
                </span>
              )}
            </div>

            <h3 className="mt-2 text-sm font-semibold leading-6 text-slate-900">
              <Link href={detailHref("/competitions", competition.id, from)} className="hover:text-blue-600">
                {competition.name}
              </Link>
            </h3>

            <dl className="mt-2 space-y-1 text-xs">
              {isStudent ? (
                <>
                  <div className="flex gap-1.5">
                    <dt className="shrink-0 text-slate-500">报名截止</dt>
                    <dd className="min-w-0 text-slate-700">
                      {registration?.windowEndAt ? formatDateTime(registration.windowEndAt) : "未设置"}
                    </dd>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <dt className="shrink-0 text-slate-500">我的报名</dt>
                    <dd className="min-w-0">
                      {registration?.projectStatus ? (
                        <StatusBadge status={registration.projectStatus}>
                          {registrationStatusLabels[registration.projectStatus]}
                        </StatusBadge>
                      ) : (
                        <span className="text-slate-400">未报名</span>
                      )}
                    </dd>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex gap-1.5">
                    <dt className="shrink-0 text-slate-500">系列标识</dt>
                    <dd className="min-w-0 break-all text-slate-600">{competition.seriesId}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="shrink-0 text-slate-500">主办方</dt>
                    <dd className="min-w-0 text-slate-600">{competition.organizer ?? "—"}</dd>
                  </div>
                </>
              )}
            </dl>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button asChild size="sm" variant="outline" className="group h-9 px-3">
                <Link href={detailHref("/competitions", competition.id, from)}>
                  查看详情
                  <ButtonArrow />
                </Link>
              </Button>
              {isStudent && registration?.windowOpen && !registration.projectId ? (
                <Button asChild size="sm" variant="default" className="group h-9 px-3">
                  <Link href={`/apply?competitionId=${competition.id}`}>
                    立即报名
                    <ButtonArrow />
                  </Link>
                </Button>
              ) : null}
              {isStudent && registration?.projectStatus ? (
                <Button asChild size="sm" variant="ghost" className="h-9 px-3 text-slate-500 hover:bg-slate-100">
                  <Link href="/my">我的项目</Link>
                </Button>
              ) : null}
              {!isStudent ? (
                <CompetitionDeleteButton compact competitionId={competition.id} competitionName={competition.name} label="删除" />
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
