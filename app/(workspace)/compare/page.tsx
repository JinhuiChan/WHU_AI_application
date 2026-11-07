import type { Metadata } from "next";
import { AlertTriangle, ArrowRight, Check, ChevronRight, Info } from "lucide-react";

export const metadata: Metadata = { title: "界面问题对照" };

/** 建议采用的四种状态色，先在这一页里定义，确认后再抽成正式组件。 */
const tones = {
  danger: "bg-red-50 text-red-700 ring-1 ring-red-200",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  info: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  neutral: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  warn: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
};

function Badge({ tone, children }: { tone: keyof typeof tones; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Case({
  index,
  title,
  pain,
  gain,
  cost,
  children,
}: {
  index: number;
  title: string;
  pain: string;
  gain: string;
  cost: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
          {index}
        </span>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{cost}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{pain}</p>
      {children}
      <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-emerald-700">
        <Check size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        {gain}
      </p>
    </section>
  );
}

function Side({ kind, label, children }: { kind: "now" | "next"; label: string; children: React.ReactNode }) {
  return (
    <div
      className={
        kind === "now"
          ? "rounded-lg border border-slate-200 bg-slate-50 p-3"
          : "rounded-lg border border-blue-200 bg-blue-50/40 p-3"
      }
    >
      <div className="mb-2 flex items-center gap-1.5">
        <span
          className={
            kind === "now"
              ? "rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600"
              : "rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white"
          }
        >
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

export default function ComparePage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">界面问题对照</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          每块左边是<strong className="text-slate-900">现在真实的样子</strong>，右边是
          <strong className="text-slate-900">建议改成的样子</strong>。看完告诉我改哪几个编号，改完这一页就删掉。
        </p>
      </div>

      <Case
        index={1}
        title="「驳回」看不出是驳回"
        cost="小，约 20 行代码 + 替换 3 处"
        pain="同一个「已驳回」，在三个页面有三种样子：我的项目里是蓝色药丸（和待审核一模一样），项目台账里是灰色小字（和审核中一模一样），报名审核里是橙色。管理员扫一屏，看不出哪条出了问题。"
        gain="统一成一套：红=驳回/异常，绿=通过，蓝=进行中，灰=草稿。颜色本身就是信息，不用逐行读字。"
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Side kind="now" label="现在">
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-[11px] text-slate-400">我的项目</p>
                <div className="flex gap-2">
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">已驳回</span>
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">待审核</span>
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">已通过</span>
                </div>
                <p className="mt-1 text-[11px] text-red-600">↑ 三个状态是同一种蓝</p>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] text-slate-400">项目台账</p>
                <div className="flex gap-3 text-xs text-slate-600">
                  <span>驳回</span>
                  <span>待审核</span>
                  <span>校内终审</span>
                </div>
                <p className="mt-1 text-[11px] text-red-600">↑ 纯文字，没有颜色</p>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] text-slate-400">报名审核</p>
                <div className="flex gap-3 text-xs">
                  <span className="text-amber-600">待学院审核</span>
                  <span className="text-amber-600">待校级终审</span>
                </div>
                <p className="mt-1 text-[11px] text-red-600">↑ 又是另一种橙</p>
              </div>
            </div>
          </Side>
          <Side kind="next" label="建议">
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-[11px] text-slate-400">我的项目</p>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="danger">已驳回</Badge>
                  <Badge tone="info">待审核</Badge>
                  <Badge tone="success">已通过</Badge>
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] text-slate-400">项目台账</p>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="danger">驳回</Badge>
                  <Badge tone="info">待审核</Badge>
                  <Badge tone="info">校内终审</Badge>
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] text-slate-400">报名审核</p>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="warn">待学院审核</Badge>
                  <Badge tone="warn">待校级终审</Badge>
                  <Badge tone="neutral">草稿</Badge>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">四个页面共用同一个徽章，颜色含义唯一。</p>
            </div>
          </Side>
        </div>
      </Case>

      <Case
        index={2}
        title="项目台账：表格比屏幕宽，操作列被顶到边上"
        cost="中，要动表格结构"
        pain="八列撑破了容器，页面底部有一条常驻的横向滚动条。最右边的「操作」列贴在容器边缘，横滚之后才完整。另外十行里「获奖记录」全是「暂无可见获奖」，占了一整列宽度却是零信息。"
        gain="操作列固定在右侧不跟着滚，其余列可以左右滑；「获奖记录」从独立一列收进项目名下面一行小字。表格不再溢出，操作永远看得见。"
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Side kind="now" label="现在">
            <div className="max-w-full overflow-x-auto rounded border border-slate-200 bg-white">
              <table className="w-[640px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5">项目</th>
                    <th className="px-2 py-1.5">赛事</th>
                    <th className="px-2 py-1.5">年份</th>
                    <th className="px-2 py-1.5">学院</th>
                    <th className="px-2 py-1.5">状态</th>
                    <th className="px-2 py-1.5">获奖记录</th>
                    <th className="px-2 py-1.5">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="px-2 py-1.5">低碳校园能源优化系统</td>
                    <td className="px-2 py-1.5">国创赛</td>
                    <td className="px-2 py-1.5">2026</td>
                    <td className="px-2 py-1.5">机械</td>
                    <td className="px-2 py-1.5">驳回</td>
                    <td className="px-2 py-1.5 text-slate-400">暂无可见获奖</td>
                    <td className="px-2 py-1.5 text-blue-600">查看全景</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1.5">复杂流域监测预警平台</td>
                    <td className="px-2 py-1.5">挑战杯</td>
                    <td className="px-2 py-1.5">2026</td>
                    <td className="px-2 py-1.5">法学</td>
                    <td className="px-2 py-1.5">待审核</td>
                    <td className="px-2 py-1.5 text-slate-400">暂无可见获奖</td>
                    <td className="px-2 py-1.5 text-blue-600">查看全景</td>
                  </tr>
                </tbody>
              </table>
              <div className="h-2 bg-slate-200" />
            </div>
            <p className="mt-1.5 text-[11px] text-red-600">↑ 底下的灰条是横向滚动条，「操作」列还藏在右边</p>
          </Side>
          <Side kind="next" label="建议">
            <div className="max-w-full rounded border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5">项目 / 获奖</th>
                    <th className="px-2 py-1.5">赛事</th>
                    <th className="px-2 py-1.5">状态</th>
                    <th className="sticky right-0 bg-slate-50 px-2 py-1.5">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="px-2 py-1.5">
                      低碳校园能源优化系统
                      <span className="block text-[10px] text-slate-400">暂无获奖</span>
                    </td>
                    <td className="px-2 py-1.5">国创赛</td>
                    <td className="px-2 py-1.5"><Badge tone="danger">驳回</Badge></td>
                    <td className="sticky right-0 bg-white px-2 py-1.5">
                      <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px]">查看</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1.5">
                      复杂流域监测预警平台
                      <span className="block text-[10px] text-slate-400">暂无获奖</span>
                    </td>
                    <td className="px-2 py-1.5">挑战杯</td>
                    <td className="px-2 py-1.5"><Badge tone="info">待审核</Badge></td>
                    <td className="sticky right-0 bg-white px-2 py-1.5">
                      <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px]">查看</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-1.5 text-[11px] text-emerald-700">↑ 没有横向滚动条，操作列一直在</p>
          </Side>
        </div>
      </Case>

      <Case
        index={3}
        title="报名审核：一张卡右边叠了四个按钮"
        cost="中，涉及审核操作的位置"
        pain="「展开信息」「查看详情」是白底描边，「校级通过」是蓝底实心，「驳回」是红字。四个按钮四种样式竖着堆，卡片高度被撑高。而且一屏里有两个蓝色实心的「通过」（校级、学院），主行动不唯一，容易点错。"
        gain="只保留两个动作：通过（实心）、驳回（红色描边）。「查看」变成标题行右侧的一个小链接。一行能放更多卡片，也不容易点错。"
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Side kind="now" label="现在">
            <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-900">农业无人机精准作业平台</p>
                <p className="mt-0.5 text-[11px] text-slate-500">百咖争创 · 创意组</p>
                <p className="mt-2 text-[11px] text-slate-500">负责人：郑明远　提交于 03/10</p>
              </div>
              <div className="grid shrink-0 gap-1.5">
                <span className="rounded-full border border-slate-300 px-3 py-1 text-center text-[11px] text-slate-600">展开信息</span>
                <span className="rounded-full border border-slate-300 px-3 py-1 text-center text-[11px] text-slate-600">查看详情</span>
                <span className="rounded-full bg-blue-600 px-3 py-1 text-center text-[11px] font-medium text-white">校级通过</span>
                <span className="rounded-full border border-red-200 px-3 py-1 text-center text-[11px] text-red-600">驳回</span>
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-red-600">↑ 四个按钮，三种样式</p>
          </Side>
          <Side kind="next" label="建议">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-medium text-slate-900">农业无人机精准作业平台</p>
                <span className="flex shrink-0 items-center gap-0.5 text-[11px] text-blue-700">
                  查看 <ChevronRight size={12} aria-hidden="true" />
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">百咖争创 · 创意组</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 text-[11px] text-slate-500">
                <span>负责人：郑明远</span>
                <span>提交：03/10</span>
                <Badge tone="warn">待校级终审</Badge>
              </p>
              <div className="mt-2 flex justify-end gap-2">
                <span className="rounded-full border border-red-200 px-3 py-1 text-[11px] text-red-600">驳回</span>
                <span className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-medium text-white">通过</span>
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-emerald-700">↑ 两个动作，一眼知道主次</p>
          </Side>
        </div>
      </Case>

      <Case
        index={4}
        title="我的项目：只有一条数据时，下面空掉半屏"
        cost="小，加一块提示"
        pain="学生大多只有一条项目。表格一行结束之后是 400 多像素的空白，没有任何说明「现在我该做什么」。被驳回的人尤其需要知道：在哪看原因、怎么重新提交。"
        gain="表格下面是当前状态的解释卡：一句话说清处在哪一步、下一步该点哪里。没有数据时也不会只剩一句「暂无」。"
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Side kind="now" label="现在">
            <div className="rounded border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-500">名称 / 状态 / 操作</div>
              <div className="px-3 py-2 text-xs text-slate-700">
                基于多模态感知的智能巡检系统
                <span className="ml-2 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">已驳回</span>
              </div>
            </div>
            <div className="mt-2 flex h-[150px] items-center justify-center rounded border border-dashed border-slate-300 text-[11px] text-slate-400">
              空白
            </div>
          </Side>
          <Side kind="next" label="建议">
            <div className="rounded border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-500">名称 / 状态 / 操作</div>
              <div className="px-3 py-2 text-xs text-slate-700">
                基于多模态感知的智能巡检系统
                <span className="ml-2 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] text-red-700">已驳回</span>
              </div>
            </div>
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                <AlertTriangle size={13} aria-hidden="true" />
                学院退回，需要补材料
              </p>
              <p className="mt-1 text-[11px] leading-5 text-amber-800">
                原因：成员信息不完整。补上团队成员的学号与学院后重新提交，会回到学院审核队列。
              </p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-900 px-3 py-1 text-[11px] font-medium text-white">
                补材料并重新提交 <ArrowRight size={12} aria-hidden="true" />
              </span>
            </div>
          </Side>
        </div>
      </Case>

      <Case
        index={5}
        title="操作列：三个页面还是蓝色文字链接"
        cost="中，四个页面各改一次"
        pain="赛事页已经是胶囊按钮了，但我的项目、项目台账、报名审核的操作列还是「查看全景」这种蓝色文字。同一套系统里两套点击样式，切换页面时会有「这是另一个系统」的错觉。"
        gain="全部换成同一套胶囊按钮：次要操作用白底描边，主行动用实心蓝，进入类带箭头。"
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Side kind="now" label="现在">
            <div className="space-y-2 rounded border border-slate-200 bg-white p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-700">低碳校园能源优化系统</span>
                <span className="text-blue-600">查看全景</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">复杂流域监测预警平台</span>
                <span className="text-blue-600">查看全景</span>
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-red-600">↑ 纯文字，没有可点的边界</p>
          </Side>
          <Side kind="next" label="建议">
            <div className="space-y-2 rounded border border-slate-200 bg-white p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-700">低碳校园能源优化系统</span>
                <span className="group inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-[11px] text-slate-700">
                  查看详情
                  <span className="-ml-1.5 grid w-3.5 -translate-x-1 place-items-center opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                    <ArrowRight size={12} aria-hidden="true" />
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">复杂流域监测预警平台</span>
                <span className="group inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-[11px] text-slate-700">
                  查看详情
                  <span className="-ml-1.5 grid w-3.5 -translate-x-1 place-items-center opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                    <ArrowRight size={12} aria-hidden="true" />
                  </span>
                </span>
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-emerald-700">↑ 和赛事页同一套按钮（可悬停看箭头）</p>
          </Side>
        </div>
      </Case>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="flex items-start gap-2 text-sm leading-6 text-slate-600">
          <Info size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
          这一页是临时对照用的，不在产品里。告诉我要改哪几个编号，改完我就把它和之前的按钮实验室一起删掉。
        </p>
      </div>
    </div>
  );
}
