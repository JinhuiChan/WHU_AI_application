import type { Metadata } from "next";
import { ArrowDown, ArrowUpDown, Check, Info } from "lucide-react";

export const metadata: Metadata = { title: "界面问题对照 · 第四组" };

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
  children?: React.ReactNode;
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
      <div className="mb-2">
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

function Pair({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 grid gap-3 md:grid-cols-2">{children}</div>;
}

export default function ComparePage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">界面问题对照 · 第四组</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          这一组不是挑某一张页面，是
          <strong className="text-slate-900">同一种东西在项目里有两三套写法</strong>
          。左边是现在真实的样子，右边是建议统一成什么样。挑编号告诉我。
        </p>
      </div>

      <Case
        index={1}
        title="所有列表都不能排序，表头是死的"
        pain="赛事、项目台账、报名审核、审计日志，表头全是纯文字，点不动。三十多条数据只能按后端默认顺序一条条看，想找「最近提交的」或者「还没审的」只能自己扫。整份代码里没有任何排序逻辑。"
        gain="表头点一下按该列排序，再点一下反向，当前排序列有箭头。代价是后端要接受 sort 参数——前端只在当前页排序会骗人（翻到第二页顺序又乱了），所以这条得跟做后端的同学一起做。"
        cost="中，且需要后端配合"
      >
        <Pair>
          <Side kind="now" label="现在">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-500">
                <tr>
                  <th className="px-2 py-1.5 font-medium">项目名称</th>
                  <th className="px-2 py-1.5 font-medium">状态</th>
                  <th className="px-2 py-1.5 font-medium">提交时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                <tr>
                  <td className="px-2 py-1.5">低碳校园能源优化系统</td>
                  <td className="px-2 py-1.5">待审核</td>
                  <td className="px-2 py-1.5">11/03</td>
                </tr>
                <tr>
                  <td className="px-2 py-1.5">复杂流域监测预警平台</td>
                  <td className="px-2 py-1.5">已驳回</td>
                  <td className="px-2 py-1.5">10/28</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-red-600">↑ 表头没有箭头，点了没反应</p>
          </Side>
          <Side kind="next" label="建议">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-500">
                <tr>
                  <th className="px-2 py-1.5 font-medium">
                    <span className="inline-flex items-center gap-1">项目名称 <ArrowUpDown size={10} aria-hidden="true" /></span>
                  </th>
                  <th className="px-2 py-1.5 font-medium">
                    <span className="inline-flex items-center gap-1">状态 <ArrowUpDown size={10} aria-hidden="true" /></span>
                  </th>
                  <th className="px-2 py-1.5 font-medium text-slate-900">
                    <span className="inline-flex items-center gap-1">
                      提交时间
                      <ArrowDown size={10} aria-hidden="true" />
                      <span className="text-[10px] font-normal text-slate-500">最新</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                <tr>
                  <td className="px-2 py-1.5">低碳校园能源优化系统</td>
                  <td className="px-2 py-1.5">待审核</td>
                  <td className="px-2 py-1.5">11/03</td>
                </tr>
                <tr>
                  <td className="px-2 py-1.5">复杂流域监测预警平台</td>
                  <td className="px-2 py-1.5">已驳回</td>
                  <td className="px-2 py-1.5">10/28</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-slate-500">↑ 当前按提交时间倒序</p>
          </Side>
        </Pair>
      </Case>

      <Case
        index={2}
        title="出错时三种提示方式并存，其中一种读屏听不到"
        pain="同一个系统里有三种报错：表单上方的红字条、右上角弹一下就没的提示、还有浏览器原生的确认框。全站 56 处红字里，只有 20 处带了 role=alert——剩下 36 处，用读屏的人根本不会被告知出错了。"
        gain="定两条规则：填错的字段就在字段旁边或表单上方说，并且加 role=alert；跨页面的结果（保存成功、提交失败）用右上角提示。危险操作不用原生确认框，用现有的自定义弹窗。"
        cost="小到中，36 处补属性"
      >
        <Pair>
          <Side kind="now" label="现在">
            <div className="space-y-2">
              <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-[11px] text-red-700">
                项目名称不能为空
                <span className="ml-1 text-[10px] text-slate-400">（无 role=alert）</span>
              </div>
              <div className="rounded-lg border border-slate-300 bg-white p-2 text-[11px] text-slate-700 shadow">
                删除成功
                <span className="ml-1 text-[10px] text-slate-400">（右上角，2 秒消失）</span>
              </div>
              <div className="rounded border border-slate-400 bg-slate-200 p-2 text-[11px] text-slate-800">
                <div className="mb-1">此页面显示</div>
                <div className="rounded bg-white p-1.5">确定要删除这个赛事吗？</div>
                <div className="mt-1 flex justify-end gap-1 text-[10px]">
                  <span className="rounded border border-slate-400 bg-slate-100 px-2 py-0.5">确定</span>
                  <span className="rounded border border-slate-400 bg-slate-100 px-2 py-0.5">取消</span>
                </div>
              </div>
            </div>
          </Side>
          <Side kind="next" label="建议">
            <div className="space-y-2">
              <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-[11px] text-red-700" role="status">
                <span className="font-medium">项目名称不能为空</span>
                <span className="ml-1 text-[10px] text-red-500">（role=alert，读屏会念）</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2 text-[11px] text-slate-700 shadow">
                <span className="font-medium text-emerald-700">已保存</span>
                <span className="ml-1 text-[10px] text-slate-400">（跨页结果走提示）</span>
              </div>
              <div className="rounded-lg border border-red-200 bg-white p-2 text-[11px]">
                <div className="font-medium text-slate-900">删除赛事</div>
                <div className="mt-0.5 text-slate-600">删除后无法恢复，已有报名也会失去归属。</div>
                <div className="mt-1.5 flex justify-end gap-1">
                  <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px]">取消</span>
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] text-white">删除</span>
                </div>
              </div>
            </div>
          </Side>
        </Pair>
      </Case>

      <Case
        index={3}
        title="日期有两种写法：2026/12/31 和 2026-11-07"
        pain="大部分页面走统一的格式化函数，输出带斜杠的 2026/12/31；但用户管理页是自己截字符串，出来是带横杠的 2026-11-07。同一个人在同一屏里看到两种日期写法，会下意识觉得哪里不对。"
        gain="全部走 formatDate / formatDateTime。只有两处要改，改完整个系统只有一种日期写法。"
        cost="小，两处"
      >
        <Pair>
          <Side kind="now" label="现在">
            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">赛事报名截止</span>
                <span className="tabular-nums">2026/12/31 23:59</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">用户注册时间</span>
                <span className="tabular-nums">2026-11-07</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">审核通过时间</span>
                <span className="tabular-nums">2026-11-07</span>
              </div>
            </div>
          </Side>
          <Side kind="next" label="建议">
            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">赛事报名截止</span>
                <span className="tabular-nums">2026/12/31 23:59</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">用户注册时间</span>
                <span className="tabular-nums">2026/11/07</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">审核通过时间</span>
                <span className="tabular-nums">2026/11/07</span>
              </div>
            </div>
          </Side>
        </Pair>
      </Case>

      <Case
        index={4}
        title="按钮有四个高度，同一屏里能撞上两个"
        pain="全站按钮高度有四档：h-11 用了 18 次、h-10 用了 56 次、h-9 用了 26 次、h-8 用了 10 次。同一页里经常是「大按钮 44px、下面表单里的 40px、表格里 32px」,排在一起像没对齐。"
        gain="定三档语义，不再随手写高度：页面级主行动 40px、卡片与表单内 36px、表格行内 32px。44px 那一档取消——它只在移动端触摸时才需要，而移动端本来就该单独适配。"
        cost="中，约 90 处，要判断层级"
      >
        <Pair>
          <Side kind="now" label="现在">
            <div className="flex flex-wrap items-end gap-2">
              <span className="flex h-11 items-center rounded-full bg-blue-600 px-4 text-xs font-medium text-white">新建赛事</span>
              <span className="flex h-10 items-center rounded-full bg-blue-600 px-4 text-xs font-medium text-white">筛选</span>
              <span className="flex h-9 items-center rounded-full border border-slate-300 bg-white px-3 text-xs text-slate-700">保存</span>
              <span className="flex h-8 items-center rounded-full border border-slate-300 bg-white px-3 text-xs text-slate-700">查看</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">44 / 40 / 36 / 32 —— 底部没对齐</p>
          </Side>
          <Side kind="next" label="建议">
            <div className="flex flex-wrap items-end gap-2">
              <span className="flex h-10 items-center rounded-full bg-blue-600 px-4 text-xs font-medium text-white">新建赛事</span>
              <span className="flex h-10 items-center rounded-full bg-blue-600 px-4 text-xs font-medium text-white">筛选</span>
              <span className="flex h-9 items-center rounded-full border border-slate-300 bg-white px-3 text-xs text-slate-700">保存</span>
              <span className="flex h-8 items-center rounded-full border border-slate-300 bg-white px-3 text-xs text-slate-700">查看</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">40 / 40 / 36 / 32 —— 同一层级同一高度</p>
          </Side>
        </Pair>
      </Case>

      <Case
        index={5}
        title="小字号有 10px 和 11px 两套，肉眼分不出但不齐"
        pain="标记、角标、辅助说明这类小字，有 43 处写 10px、54 处写 11px。差 1 像素谁也看不出来，但两行并排时会觉得基线不在一条线上，说不清哪里别扭。"
        gain="统一成 11px。10px 在中文字体下已经接近糊掉的边缘，11px 是这类辅助文字的下限。"
        cost="小，但换完要看行高"
      >
        <Pair>
          <Side kind="now" label="现在">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">国赛</span>
                <span className="text-[10px] text-slate-500">10px · 系列标识</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">省赛</span>
                <span className="text-[11px] text-slate-500">11px · 系列标识</span>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">看起来差不多，但两个标签宽度不同</p>
          </Side>
          <Side kind="next" label="建议">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">国赛</span>
                <span className="text-[11px] text-slate-500">11px · 系列标识</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">省赛</span>
                <span className="text-[11px] text-slate-500">11px · 系列标识</span>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">两个标签一样宽，左右能对齐</p>
          </Side>
        </Pair>
      </Case>

      <Case
        index={6}
        title="从详情返回列表，筛选条件全丢"
        pain="在赛事列表筛了「2026 年 · 省赛 · 挑战杯」，点进一个赛事看详情，再点左上角的「返回赛事列表」——回到的是没筛过的全量列表，得重新选三个下拉框。详情页那个返回链接写死成了 /competitions，没带来源参数。"
        gain="返回链接带上来源地址，回去时筛选、页码、关键词都还在。几个详情页都是同一个改法。"
        cost="小，四处返回链接"
      >
        <Pair>
          <Side kind="now" label="现在">
            <div className="space-y-2 text-[11px]">
              <div className="text-slate-500">首页 &gt; 赛事 &gt; 赛事详情</div>
              <span className="inline-flex h-7 items-center rounded-full border border-slate-300 bg-white px-3 text-slate-700">
                ← 返回赛事列表
              </span>
              <div className="rounded border border-slate-200 bg-white p-2">
                <div className="mb-1 flex gap-1">
                  <span className="rounded border border-slate-300 px-1.5 py-0.5 text-slate-400">全部赛年 ▾</span>
                  <span className="rounded border border-slate-300 px-1.5 py-0.5 text-slate-400">全部等级 ▾</span>
                </div>
                <div className="text-red-600">↑ 筛过的条件被清空了</div>
              </div>
            </div>
          </Side>
          <Side kind="next" label="建议">
            <div className="space-y-2 text-[11px]">
              <div className="text-slate-500">首页 &gt; 赛事 &gt; 赛事详情</div>
              <span className="inline-flex h-7 items-center rounded-full border border-slate-300 bg-white px-3 text-slate-700">
                ← 返回赛事列表
              </span>
              <div className="rounded border border-slate-200 bg-white p-2">
                <div className="mb-1 flex gap-1">
                  <span className="rounded border border-blue-300 bg-blue-50 px-1.5 py-0.5 text-blue-700">2026 ▾</span>
                  <span className="rounded border border-blue-300 bg-blue-50 px-1.5 py-0.5 text-blue-700">省赛 ▾</span>
                </div>
                <div className="text-emerald-700">↑ 回到刚才那一页，条件还在</div>
              </div>
            </div>
          </Side>
        </Pair>
      </Case>

      <Case
        index={7}
        title="卡片内边距也有三档"
        pain="同样是「白底、灰边、圆角」的卡片，内边距有 20px（36 处）、16px（19 处）、24px（16 处）三种。并排摆的时候，卡片里的标题不在一条水平线上。"
        gain="区块卡统一 20px；表格外的密集小卡用 16px；只有赛事简介那种大展示卡才用 24px。"
        cost="小到中，需按卡片类型判断"
      >
        <Pair>
          <Side kind="now" label="现在">
            <div className="flex items-start gap-2">
              <div className="flex-1 rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-[10px] text-slate-400">p-4</div>
                <div className="text-[11px] font-medium text-slate-900">赛事文件</div>
              </div>
              <div className="flex-1 rounded-lg border border-slate-200 bg-white p-5">
                <div className="text-[10px] text-slate-400">p-5</div>
                <div className="text-[11px] font-medium text-slate-900">赛事文件</div>
              </div>
              <div className="flex-1 rounded-lg border border-slate-200 bg-white p-6">
                <div className="text-[10px] text-slate-400">p-6</div>
                <div className="text-[11px] font-medium text-slate-900">赛事文件</div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-red-600">↑ 三张卡标题不在一条线上</p>
          </Side>
          <Side kind="next" label="建议">
            <div className="flex items-start gap-2">
              <div className="flex-1 rounded-lg border border-slate-200 bg-white p-5">
                <div className="text-[10px] text-slate-400">p-5</div>
                <div className="text-[11px] font-medium text-slate-900">赛事文件</div>
              </div>
              <div className="flex-1 rounded-lg border border-slate-200 bg-white p-5">
                <div className="text-[10px] text-slate-400">p-5</div>
                <div className="text-[11px] font-medium text-slate-900">赛事文件</div>
              </div>
              <div className="flex-1 rounded-lg border border-slate-200 bg-white p-5">
                <div className="text-[10px] text-slate-400">p-5</div>
                <div className="text-[11px] font-medium text-slate-900">赛事文件</div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-emerald-700">↑ 三张卡一样高、标题对齐</p>
          </Side>
        </Pair>
      </Case>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start gap-2 text-sm leading-6 text-slate-600">
          <Info size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
          <span>
            这一页是临时对照用的，不在产品里。第 1 条要后端配合，其余六条我都能独立做完。
            告诉我编号，改完和 /compare3 一起删。
          </span>
        </div>
      </div>
    </div>
  );
}
