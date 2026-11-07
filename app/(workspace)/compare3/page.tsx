import type { Metadata } from "next";
import { AlertTriangle, Check, ChevronDown, Info, Lock, Upload } from "lucide-react";

export const metadata: Metadata = { title: "界面问题对照 · 第三组" };

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

const fieldBox = "h-7 rounded border border-slate-300 bg-white px-2 text-[11px] leading-7 text-slate-400";

export default function ComparePage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">界面问题对照 · 第三组</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          左边<strong className="text-slate-900">现在真实的样子</strong>，右边
          <strong className="text-slate-900">建议改成的样子</strong>。挑编号告诉我，改完这页删掉。
        </p>
      </div>

      <Case
        index={1}
        title="报名表单：看不出哪些必填、哪些不能改"
        cost="小，加标记和一行说明"
        pain="报名表有二十多个字段，一个必填标记都没有，填完点提交才被拦下来。另外「负责人学号」「负责人姓名」是灰底（从账号带出来的，不能改），其他是白底，但没有任何文字说明这个区别，用户会尝试点进去改。"
        gain="必填字段后面加红色星号，顶部写一句「带 * 为必填」；只读字段加锁图标和「来自账号，不可修改」。提交前就知道缺什么。"
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Side kind="now" label="现在">
            <div className="space-y-2">
              <div>
                <p className="mb-1 text-[11px] text-slate-600">负责人学号</p>
                <div className="h-7 rounded border border-slate-300 bg-slate-100 px-2 text-[11px] leading-7 text-slate-500">2026200001</div>
              </div>
              <div>
                <p className="mb-1 text-[11px] text-slate-600">项目名称</p>
                <div className={fieldBox}>　</div>
              </div>
              <p className="text-[11px] text-red-600">↑ 灰底和白底的区别没有解释；两个字段都没有必填标记</p>
            </div>
          </Side>
          <Side kind="next" label="建议">
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500">带 <span className="text-red-600">*</span> 为必填，其余可留空后补</p>
              <div>
                <p className="mb-1 flex items-center gap-1 text-[11px] text-slate-600">
                  负责人学号
                  <Lock size={10} className="text-slate-400" aria-hidden="true" />
                  <span className="text-[10px] text-slate-400">来自账号</span>
                </p>
                <div className="h-7 rounded border border-slate-200 bg-slate-100 px-2 text-[11px] leading-7 text-slate-500">2026200001</div>
              </div>
              <div>
                <p className="mb-1 text-[11px] text-slate-600">
                  项目名称 <span className="text-red-600">*</span>
                </p>
                <div className={fieldBox}>　</div>
              </div>
            </div>
          </Side>
        </div>
      </Case>

      <Case
        index={2}
        title="报名表单：二十个字段堆在一个标题下面"
        cost="中，要重排表单结构"
        pain="「项目基本信息」一个块里塞了负责人的学号、姓名、年级、性别、民族、专业、入学年份、毕业年份、手机号、邮箱，加上项目的赛道、组别、类别、申报单位、名称。找「申报单位」要一行行扫。"
        gain="拆成三段：负责人信息（只读）、项目信息、时间与备注。每段一个小标题，中间一条分割线。学生知道自己在填哪一块。"
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Side kind="now" label="现在">
            <div className="rounded border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-semibold text-slate-900">项目基本信息</p>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {["负责人学号", "负责人姓名", "年级", "性别", "培养阶段", "培养单位", "项目赛道", "项目组别", "项目类别", "申报单位", "民族", "项目名称"].map((f) => (
                  <div key={f} className="text-[10px] text-slate-500">{f}</div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-slate-400">……后面还有 8 个</p>
            </div>
            <p className="mt-1.5 text-[11px] text-red-600">↑ 个人信息和项目信息混在一起</p>
          </Side>
          <Side kind="next" label="建议">
            <div className="space-y-2 rounded border border-slate-200 bg-white p-3">
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-900">
                  <span className="h-3 w-0.5 rounded bg-blue-600" />
                  负责人信息
                  <span className="text-[10px] font-normal text-slate-400">自动带入</span>
                </p>
                <p className="mt-1 text-[10px] text-slate-500">学号 · 姓名 · 学院 · 专业 · 联系方式</p>
              </div>
              <div className="border-t border-slate-100 pt-2">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-900">
                  <span className="h-3 w-0.5 rounded bg-blue-600" />
                  项目信息
                </p>
                <p className="mt-1 text-[10px] text-slate-500">赛道 · 组别 · 类别 · 申报单位 · 项目名称</p>
              </div>
              <div className="border-t border-slate-100 pt-2">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-900">
                  <span className="h-3 w-0.5 rounded bg-blue-600" />
                  时间与备注
                </p>
                <p className="mt-1 text-[10px] text-slate-500">入学年份 · 毕业年份 · 备注</p>
              </div>
            </div>
          </Side>
        </div>
      </Case>

      <Case
        index={3}
        title="表单里留着一个「开发中」的灰框"
        cost="小，删掉或换文案"
        pain="报名表「作品与材料」里有一行「PPT 专区」，里面是个灰框写着「PPT 上传功能开发中」。学生看到了会以为这里要传东西，点又点不动。正式表单里不该出现这种占位。"
        gain="要么先不显示这一行，要么写清「本期不支持上传 PPT，请在作品文件中一并提交」。"
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Side kind="now" label="现在">
            <div className="space-y-2 rounded border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-[11px] text-slate-600">作品组别</span>
                <span className="flex h-7 flex-1 items-center justify-between rounded border border-slate-300 px-2 text-[11px] text-slate-400">
                  请选择 <ChevronDown size={11} aria-hidden="true" />
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-[11px] text-slate-600">PPT 专区</span>
                <span className="flex h-7 flex-1 items-center justify-center rounded border border-slate-200 bg-slate-100 text-[11px] text-slate-400">
                  PPT 上传功能开发中
                </span>
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-red-600">↑ 学生点了没反应</p>
          </Side>
          <Side kind="next" label="建议">
            <div className="space-y-2 rounded border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-[11px] text-slate-600">作品组别</span>
                <span className="flex h-7 flex-1 items-center justify-between rounded border border-slate-300 px-2 text-[11px] text-slate-400">
                  请选择 <ChevronDown size={11} aria-hidden="true" />
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-16 shrink-0 text-[11px] text-slate-600">PPT</span>
                <span className="flex-1 text-[11px] leading-7 text-slate-500">
                  本期不单独收 PPT，请并入「作品文件」上传
                </span>
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-emerald-700">↑ 不装作能传，直接说清楚</p>
          </Side>
        </div>
      </Case>

      <Case
        index={4}
        title="手机上看表格：右边整块被切掉"
        cost="大，要给表格做移动端形态"
        pain="390 像素宽的手机上，赛事表格只露出「赛年 / 赛事名称 / 操作」三列，项目名「中国国际大…」被硬切，剩下五列（等级、发布状态、报名状态、报名时间、主办方）完全看不到，也没有任何「可以左右滑」的提示。"
        gain="窄屏时把每一行变成一张卡片：项目名一行、状态一行、操作一行。手机上不用横滑，也不用猜右边还有什么。"
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Side kind="now" label="现在">
            <div className="mx-auto w-[210px] overflow-hidden rounded border border-slate-200 bg-white">
              <div className="flex bg-slate-50 text-[9px] text-slate-500">
                <span className="w-10 shrink-0 px-1 py-1">赛年</span>
                <span className="w-16 shrink-0 px-1 py-1">赛事名称</span>
                <span className="w-24 shrink-0 px-1 py-1">操作</span>
              </div>
              <div className="flex border-t border-slate-100 text-[9px] text-slate-700">
                <span className="w-10 shrink-0 px-1 py-2">2026</span>
                <span className="w-16 shrink-0 overflow-hidden px-1 py-2">中国国际大</span>
                <span className="w-24 shrink-0 px-1 py-2 text-blue-600">查看详情</span>
              </div>
            </div>
            <p className="mt-1.5 text-center text-[11px] text-red-600">↑ 右边还有五列被切在外面</p>
          </Side>
          <Side kind="next" label="建议">
            <div className="mx-auto w-[210px] space-y-2">
              <div className="rounded-lg border border-slate-200 bg-white p-2">
                <p className="text-[11px] font-medium text-slate-900">中国国际大学生创新大赛</p>
                <p className="mt-0.5 text-[10px] text-slate-500">2026 · 国赛</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 ring-1 ring-amber-200">待学院审核</span>
                  <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[9px] text-slate-700">查看详情</span>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2">
                <p className="text-[11px] font-medium text-slate-900">挑战杯</p>
                <p className="mt-0.5 text-[10px] text-slate-500">2026 · 省赛</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600 ring-1 ring-slate-200">未报名</span>
                  <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[9px] text-slate-700">查看详情</span>
                </div>
              </div>
            </div>
          </Side>
        </div>
      </Case>

      <Case
        index={5}
        title="审核详情：翻半天找不到「通过」"
        cost="中，加一条顶部操作栏"
        pain="点进一条待审项目，整页是批次、申报单位、负责人、成员、导师几大块信息，通过和驳回按钮在最底下。信息多的项目要滚两三屏，审完一条再划回顶部看下一条。"
        gain="标题行右边固定「通过」「驳回」两个按钮，随时可点；正文照旧往下看。审十条能少滚二十屏。"
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Side kind="now" label="现在">
            <div className="rounded border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="text-[11px] font-semibold text-slate-900">农业无人机精准作业平台</p>
                <p className="text-[10px] text-slate-500">百咖争创 · 校级 · 已提交 0 次</p>
              </div>
              <div className="space-y-1 px-3 py-3">
                {["基本信息", "指导老师（1）", "团队成员（3）", "作品与材料", "历史与审计"].map((b) => (
                  <div key={b} className="rounded bg-slate-50 px-2 py-1.5 text-[10px] text-slate-500">{b}</div>
                ))}
              </div>
              <div className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-400">
                通过 / 驳回 在最底下 ↓
              </div>
            </div>
          </Side>
          <Side kind="next" label="建议">
            <div className="rounded border border-slate-200 bg-white">
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-slate-900">农业无人机精准作业平台</p>
                  <p className="text-[10px] text-slate-500">百咖争创 · 校级</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="rounded-full border border-red-200 px-2 py-0.5 text-[10px] text-red-600">驳回</span>
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-medium text-white">通过</span>
                </div>
              </div>
              <div className="space-y-1 px-3 py-3">
                {["基本信息", "指导老师（1）", "团队成员（3）", "作品与材料", "历史与审计"].map((b) => (
                  <div key={b} className="rounded bg-slate-50 px-2 py-1.5 text-[10px] text-slate-500">{b}</div>
                ))}
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-emerald-700">↑ 按钮跟着标题走，滚到哪都能点</p>
          </Side>
        </div>
      </Case>

      <Case
        index={6}
        title="变更申请：唯一一处绿色的「通过」"
        cost="小，改配色 + 接徽章"
        pain="全站所有「通过」都是蓝的，只有变更申请这一页是绿色实心。同一屏里蓝绿并存，会以为是两种不同的操作。另外这页的状态列是纯文字，没接上一轮统一的状态徽章。"
        gain="通过改回蓝色，和审核工作台一致；状态列接同一套徽章，「待学院审核」自动变橙色。"
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Side kind="now" label="现在">
            <div className="rounded border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] text-slate-900">高精度北斗协同定位平台</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">李雨桐 · 项目名称</p>
                </div>
                <span className="shrink-0 text-[10px] text-slate-600">待学院审核</span>
              </div>
              <div className="mt-2 flex justify-end gap-1.5">
                <span className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-medium text-white">通过</span>
                <span className="rounded-full border border-red-200 px-3 py-1 text-[10px] text-red-600">驳回</span>
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-red-600">↑ 绿色通过 + 纯文字状态</p>
          </Side>
          <Side kind="next" label="建议">
            <div className="rounded border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] text-slate-900">高精度北斗协同定位平台</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">李雨桐 · 项目名称</p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 ring-1 ring-amber-200">待学院审核</span>
              </div>
              <div className="mt-2 flex justify-end gap-1.5">
                <span className="rounded-full bg-blue-600 px-3 py-1 text-[10px] font-medium text-white">通过</span>
                <span className="rounded-full border border-red-200 px-3 py-1 text-[10px] text-red-600">驳回</span>
              </div>
            </div>
            <p className="mt-1.5 text-[11px] text-emerald-700">↑ 和审核工作台同一套</p>
          </Side>
        </div>
      </Case>

      <Case
        index={7}
        title="详情页：二十多个字段平铺成三列"
        cost="中，要重排信息块"
        pain="学生项目详情和审核详情都是同一套写法：学号、姓名、年级、性别、民族、专业、入学年份、毕业年份、手机、邮箱、组别、类别、申报单位、培养单位、命题名称、命题企业……二十多个字段三列平铺，没有分组也没有分隔线。要确认「申报单位填对了没」得扫三遍。"
        gain="按「负责人 / 项目 / 时间」分三块，每块一张卡。空字段（如非产业赛道的命题名称）直接不显示，不占位。"
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Side kind="now" label="现在">
            <div className="rounded border border-slate-200 bg-white p-3">
              <p className="mb-2 text-[11px] font-semibold text-slate-900">项目基本信息</p>
              <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                {[
                  ["组别", "创意组"], ["类别", "科技创新"], ["申报单位", "计算机学院"],
                  ["培养单位", "计算机学院"], ["命题名称", "—"], ["命题企业", "—"],
                  ["负责人学号", "2026200001"], ["负责人姓名", "陈宇轩"], ["年级", "2022"],
                  ["性别", "男"], ["培养阶段", "本科"], ["民族", "汉族"],
                  ["专业", "计算机科学与技术"], ["入学年份", "2022"], ["毕业年份", "2026"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[9px] text-slate-400">{k}</p>
                    <p className="text-[10px] text-slate-800">{v}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-slate-400">……还有 9 个</p>
            </div>
          </Side>
          <Side kind="next" label="建议">
            <div className="space-y-2">
              <div className="rounded border border-slate-200 bg-white p-2.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-900">
                  <span className="h-3 w-0.5 rounded bg-blue-600" />负责人
                </p>
                <p className="mt-1 text-[10px] leading-5 text-slate-600">陈宇轩 · 2026200001 · 2022 级本科</p>
                <p className="text-[10px] leading-5 text-slate-600">计算机科学与技术 · 2022–2026</p>
              </div>
              <div className="rounded border border-slate-200 bg-white p-2.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-900">
                  <span className="h-3 w-0.5 rounded bg-blue-600" />项目
                </p>
                <p className="mt-1 text-[10px] leading-5 text-slate-600">创意组 · 科技创新 · 计算机学院</p>
              </div>
              <div className="rounded border border-slate-200 bg-white p-2.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-900">
                  <span className="h-3 w-0.5 rounded bg-blue-600" />时间
                </p>
                <p className="mt-1 text-[10px] leading-5 text-slate-600">提交 2026/03/10 · 修改 2026/11/01</p>
              </div>
            </div>
          </Side>
        </div>
      </Case>

      <Case
        index={8}
        title="驳回原因写了，但没有「去改」的按钮"
        cost="小，加一个按钮"
        pain="学生打开项目看到顶部红条「驳回原因：成员信息不完整」，然后呢？要改材料得自己回到右上角找「编辑」按钮。红条是整页最显眼的东西，却没给下一步。"
        gain="红条右边直接放「去补材料」，点进去就是编辑表单。原因和动作在同一条里。"
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Side kind="now" label="现在">
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">
              驳回原因：成员信息不完整，请补充后重新提交
            </div>
            <p className="mt-1.5 text-[11px] text-red-600">↑ 只有原因，没有入口</p>
          </Side>
          <Side kind="next" label="建议">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-red-200 bg-red-50 px-3 py-2">
              <span className="text-[11px] text-red-800">驳回原因：成员信息不完整，请补充后重新提交</span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-medium text-white">
                去补材料 <Upload size={10} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-emerald-700">↑ 原因和动作在同一条</p>
          </Side>
        </div>
      </Case>

      <Case
        index={9}
        title="表单里没有「填了多少、还差什么」"
        cost="中，要算一遍必填项"
        pain="报名表从上往下滚三屏，填到一半不知道进度。底部固定着「保存草稿 / 提交报名」，点提交才知道漏了什么，被拦回来还得自己找是哪一项。"
        gain="底部固定条右边显示「必填 18 / 24」，缺的项在提交时高亮并自动滚到第一个缺口。"
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Side kind="now" label="现在">
            <div className="flex gap-2 rounded border border-slate-200 bg-white p-2">
              <span className="flex-1 rounded-full border border-slate-300 py-1 text-center text-[10px] text-slate-700">保存草稿</span>
              <span className="flex-1 rounded-full bg-blue-600 py-1 text-center text-[10px] font-medium text-white">提交报名</span>
            </div>
            <p className="mt-1.5 text-[11px] text-red-600">↑ 点下去才知道缺什么</p>
          </Side>
          <Side kind="next" label="建议">
            <div className="flex items-center gap-2 rounded border border-slate-200 bg-white p-2">
              <span className="text-[10px] text-slate-500">必填 <strong className="text-slate-900">18</strong> / 24</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span className="block h-full w-3/4 rounded-full bg-blue-600" />
              </span>
              <span className="rounded-full border border-slate-300 px-2.5 py-1 text-[10px] text-slate-700">保存草稿</span>
              <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-medium text-white">提交报名</span>
            </div>
            <p className="mt-1.5 text-[11px] text-emerald-700">↑ 随时知道还差几项</p>
          </Side>
        </div>
      </Case>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-2 text-sm leading-6 text-amber-900">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            另外三条不是样式问题，是数据或产品口径，得先确认：
            <strong>①</strong> 审核详情写着「已提交 0 次」，但状态是「待校级终审」、提交时间有值，三项互相矛盾；
            <strong>②</strong> 变更申请的「变更内容」列是空的，理由列有内容，可能取错了字段；
            <strong>③</strong> 项目详情里非产业赛道的「命题名称 / 命题企业」永远显示「—」，属于不该出现的字段。
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start gap-2 text-sm leading-6 text-slate-600">
          <Info size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
          <span>临时对照页，不在产品里。挑编号告诉我，改完删。</span>
        </div>
      </div>
    </div>
  );
}
