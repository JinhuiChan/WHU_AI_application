import type { Metadata } from "next";
import { ArrowRight, Check, Plus } from "lucide-react";

export const metadata: Metadata = { title: "按钮样式实验室" };

// 第 5 种的边框流光：用 @property 动画化锥形渐变的角度。
// 直接把 CSS 写在 <style> 的 children 里会被 React 转义 <angle>，导致服务端与客户端文本不一致，
// 所以用常量 + dangerouslySetInnerHTML 注入（内容是本文件写死的，不接受外部输入）。
const ORBIT_CSS = `
@property --lab-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
@keyframes lab-border-spin { to { --lab-angle: 360deg; } }
.lab-orbit { background: #cbd5e1; }
.lab-orbit:hover, .lab-orbit:focus-within {
  background: conic-gradient(from var(--lab-angle), #1d4ed8, #93c5fd 25%, #1d4ed8 50%, #93c5fd 75%, #1d4ed8);
  animation: lab-border-spin 3s linear infinite;
}
.lab-orbit-solid { background: #1e40af; }
.lab-orbit-solid:hover, .lab-orbit-solid:focus-within {
  background: conic-gradient(from var(--lab-angle), #1e40af, #93c5fd 25%, #1e40af 50%, #93c5fd 75%, #1e40af);
  animation: lab-border-spin 3s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .lab-orbit:hover, .lab-orbit:focus-within,
  .lab-orbit-solid:hover, .lab-orbit-solid:focus-within { animation: none; }
}
`;


function Demo({
  index,
  name,
  en,
  note,
  where,
  recommended,
  children,
}: {
  index: number;
  name: string;
  en: string;
  note: string;
  where: string;
  recommended?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex flex-wrap items-center gap-2 text-base text-slate-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
            {index}
          </span>
          {name}
          <span className="text-xs font-normal text-slate-400">{en}</span>
          {recommended ? (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">推荐</span>
          ) : null}
        </h2>
        <span className="text-xs text-slate-500">{where}</span>
      </div>
      <p className="mt-2 text-xs leading-6 text-slate-500">{note}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-4">{children}</div>
    </section>
  );
}

export default function StyleLabPage() {
  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: ORBIT_CSS }} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">按钮样式实验室</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            八种按钮，鼠标移上去（或用 Tab 聚焦）看效果。选中的话告诉我编号，我把它套到全站对应位置。
          </p>
        </div>
        <span className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600">
          全部为纯 CSS，无新增依赖
        </span>
      </div>

      <Demo
        index={1}
        name="抬升"
        en="Lift"
        recommended
        where="主行动按钮"
        note="悬停时整个按钮浮起 2px，蓝色投影扩散；按下回落到原位并轻微收缩。最通用、最不容易出错的一种。"
      >
        <button className="inline-flex h-9 items-center rounded-full bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25 active:translate-y-0 active:scale-[0.98] motion-reduce:hover:translate-y-0">
          立即报名
        </button>
        <button className="inline-flex h-9 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-700 hover:shadow-md active:translate-y-0 active:scale-[0.98] motion-reduce:hover:translate-y-0">
          查看详情
        </button>
      </Demo>

      <Demo
        index={2}
        name="箭头滑入"
        en="Arrow Slide"
        recommended
        where="查看详情 / 去填写"
        note="静止时只有一个箭头的位置是空的，悬停时箭头从右侧展开推出来，按钮整体变宽一点点。比一直挂个箭头更干净。"
      >
        <button className="group inline-flex h-9 items-center gap-1 rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition duration-200 hover:border-blue-300 hover:text-blue-700">
          查看详情
          <span className="grid w-0 place-items-center overflow-hidden opacity-0 transition-all duration-200 group-hover:w-4 group-hover:opacity-100">
            <ArrowRight aria-hidden="true" size={14} />
          </span>
        </button>
        <button className="group inline-flex h-9 items-center gap-1 rounded-full bg-blue-600 px-4 text-sm font-medium text-white transition duration-200 hover:bg-blue-700">
          立即报名
          <span className="grid w-0 place-items-center overflow-hidden opacity-0 transition-all duration-200 group-hover:w-4 group-hover:opacity-100">
            <ArrowRight aria-hidden="true" size={14} />
          </span>
        </button>
      </Demo>

      <Demo
        index={3}
        name="填充扫过"
        en="Fill Sweep"
        where="次要按钮升级为主行动"
        note="白底描边，悬停时蓝色从左侧整块推进来把按钮填满，文字同时转白。视觉冲击比单纯变背景色强，但只适合一行里只有一个。"
      >
        <button className="group relative inline-flex h-9 items-center justify-center overflow-hidden rounded-full border border-blue-200 bg-white px-4 text-sm font-medium text-blue-700 transition-colors hover:border-blue-600">
          <span
            aria-hidden="true"
            className="absolute inset-0 -translate-x-full bg-blue-600 transition-transform duration-300 ease-out group-hover:translate-x-0 motion-reduce:transition-none"
          />
          <span className="relative transition-colors duration-200 group-hover:text-white">立即报名</span>
        </button>
        <button className="group relative inline-flex h-9 items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-slate-600">
          <span
            aria-hidden="true"
            className="absolute inset-0 -translate-x-full bg-slate-900 transition-transform duration-300 ease-out group-hover:translate-x-0 motion-reduce:transition-none"
          />
          <span className="relative transition-colors duration-200 group-hover:text-white">查看详情</span>
        </button>
      </Demo>

      <Demo
        index={4}
        name="光泽掠过"
        en="Sheen"
        recommended
        where="看板 CTA、报名按钮"
        note="悬停时一道半透明白光从左扫到右，扫完消失，不做循环。和登录页标题的光带同源，但只在交互时触发，不打扰。"
      >
        <button className="group relative inline-flex h-9 items-center justify-center overflow-hidden rounded-full bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full motion-reduce:hidden"
          />
          <span className="relative">立即报名</span>
        </button>
        <button className="group relative inline-flex h-9 items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-blue-100/80 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full motion-reduce:hidden"
          />
          <span className="relative">查看详情</span>
        </button>
      </Demo>

      <Demo
        index={5}
        name="流光边框"
        en="Border Orbit"
        where="边框按钮、卡片里的弱按钮"
        note="静止是 1.5px 灰边；悬停时一圈蓝光沿边框绕行。转的是渐变的角度，不是按钮本身（转元素会把胶囊拧成椭圆）。用 @property 动画化角度，浏览器不支持时降级成静态渐变。"
      >
        <span className="lab-orbit inline-flex rounded-full p-[1.5px]">
          <span className="inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-medium text-slate-700 transition-colors">
            查看详情
          </span>
        </span>
        <span className="lab-orbit-solid inline-flex rounded-full p-[1.5px]">
          <span className="inline-flex h-9 items-center rounded-full bg-blue-600 px-4 text-sm font-medium text-white">
            立即报名
          </span>
        </span>
      </Demo>

      <Demo
        index={6}
        name="下划线展开"
        en="Underline Grow"
        where="表格里的文字操作"
        note="保持文字链接的轻，但有一条 2px 蓝线从中间向两边长出来。比纯下划线更克制，适合一行里要放三四个操作的表格。"
      >
        <button className="group relative inline-flex h-9 items-center px-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-blue-700">
          查看详情
          <span
            aria-hidden="true"
            className="absolute bottom-1.5 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-blue-600 transition-all duration-300 group-hover:w-[calc(100%-0.75rem)] motion-reduce:transition-none"
          />
        </button>
        <button className="group relative inline-flex h-9 items-center px-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-blue-700">
          我的项目
          <span
            aria-hidden="true"
            className="absolute bottom-1.5 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-blue-600 transition-all duration-300 group-hover:w-[calc(100%-0.75rem)] motion-reduce:transition-none"
          />
        </button>
      </Demo>

      <Demo
        index={7}
        name="圆点生长"
        en="Dot Grow"
        where="状态类按钮、可切换项"
        note="左侧一个小圆点，悬停时圆点变大并向外扩一圈浅蓝光晕。适合「进行中 / 已开启」这种带状态的按钮，不靠颜色喊。"
      >
        <button className="group inline-flex h-9 items-center gap-2 rounded-full border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-blue-600 transition-all duration-300 group-hover:h-2 group-hover:w-2 group-hover:ring-4 group-hover:ring-blue-100"
          />
          报名中
        </button>
        <button className="group inline-flex h-9 items-center gap-2 rounded-full bg-blue-600 px-3.5 text-sm font-medium text-white">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-white transition-all duration-300 group-hover:h-2 group-hover:w-2 group-hover:ring-4 group-hover:ring-white/30"
          />
          已通过
        </button>
      </Demo>

      <Demo
        index={8}
        name="图标位移 + 按压回弹"
        en="Icon Nudge & Squish"
        where="带图标的动作按钮"
        note="悬停时图标向右挪 2px、按钮整体轻微上提；按下时缩到 0.96 再弹回，手感更实。适合「新建」「导入」这类一次性动作。"
      >
        <button className="group inline-flex h-9 items-center gap-1.5 rounded-full bg-blue-600 px-4 text-sm font-medium text-white transition duration-200 hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0 active:scale-[0.96] motion-reduce:hover:translate-y-0">
          <Plus aria-hidden="true" size={15} />
          新建报名
        </button>
        <button className="group inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-700 active:translate-y-0 active:scale-[0.96] motion-reduce:hover:translate-y-0">
          <Check aria-hidden="true" size={15} />
          批量通过
        </button>
      </Demo>

      <section className="rounded-xl border border-blue-100 bg-blue-50/70 p-5">
        <h2 className="text-sm font-semibold text-slate-900">组合建议</h2>
        <ul className="mt-2 space-y-1.5 text-xs leading-6 text-slate-600">
          <li>· 一行里只有一个主行动时：<strong className="text-slate-900">4 光泽掠过</strong> 或 <strong className="text-slate-900">1 抬升</strong>，后者更稳。</li>
          <li>· 表格操作列：<strong className="text-slate-900">2 箭头滑入</strong> 做主按钮 + <strong className="text-slate-900">6 下划线展开</strong> 放次要项，比现在三个实心胶囊更透气。</li>
          <li>· 需要「这按钮在转 / 在跑」的感觉：<strong className="text-slate-900">5 流光边框</strong>。</li>
          <li>· 四个里挑两个就够，同一屏出现三种以上动效会互相抢戏。</li>
        </ul>
      </section>
    </div>
  );
}
