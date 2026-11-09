'use client';

import { Check } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * 取自 React Bits 官方 Stepper（src/ts-tailwind/Components/Stepper/Stepper.tsx）
 * 的步骤指示条部分，做了三处项目适配：
 *   1. 只保留指示条，不引入它的内容视口与页脚 —— 官方视口是 overflow-hidden，
 *      会把导入预览里 1800px 的宽表裁掉，而这里的流程由页面自己的 step 状态控制。
 *   2. 主题变量映射到 app/globals.css 的语义 token，不再用官方写死的灰阶。
 *   3. 图标从 @hugeicons/core-free-icons 换成项目已有的 lucide-react，避免新增依赖。
 * 徽章语义也调整过：官方是「当前=描边、已完成=实心」，这里改成「当前=品牌实心、
 * 已完成=品牌浅底打勾」，因为中文后台里当前步骤需要最醒目。
 * 更新源码时请保留以上适配。
 */

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const SPRING =
  'linear(0, 0.0603, 0.2033, 0.3821, 0.5633, 0.7258, 0.8584, 0.9574, 1.0242, 1.0634, 1.0809, 1.0828, 1.0747, 1.0613, 1.046, 1.0313, 1.0186, 1.0085, 1.0012, 0.9965, 0.994, 0.9931, 0.9933, 0.9941, 0.9953, 0.9966, 0.9978, 0.9988, 1)';

const ease = () =>
  typeof CSS !== 'undefined' && CSS.supports?.('transition-timing-function', 'linear(0, 1)')
    ? SPRING
    : 'cubic-bezier(0.34, 1.4, 0.64, 1)';

const TITLE = 'overflow-hidden text-[13px] font-semibold leading-[1.2] [text-overflow:ellipsis] whitespace-nowrap transition-colors duration-200';

type Status = 'complete' | 'active' | 'upcoming';

const badgeClass = (status: Status) => {
  const base =
    'grid h-[22px] w-[22px] flex-none place-items-center rounded-full text-[11.5px] font-semibold leading-none tabular-nums transition-colors duration-150';
  if (status === 'active') return `${base} text-white [background:var(--brand)]`;
  if (status === 'complete') return `${base} [background:var(--brand-soft)] text-[color:var(--brand-strong)]`;
  return `${base} text-[color:var(--ink-faint)] [box-shadow:inset_0_0_0_1px_var(--border-strong)]`;
};

export interface StepperIndicatorProps {
  /** 步骤标题，按顺序排列 */
  steps: string[];
  /** 当前步骤，从 1 开始 */
  current: number;
  /** 传入后才可点击切换；不传则只做展示，行为与原来的静态步骤条一致 */
  onStepClick?: (step: number) => void;
  className?: string;
}

export default function StepperIndicator({ steps, current, onStepClick, className = '' }: StepperIndicatorProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const gliderRef = useRef<HTMLSpanElement>(null);
  const markerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const placedRef = useRef(false);
  const total = steps.length;
  const clickable = typeof onStepClick === 'function';

  useIsomorphicLayoutEffect(() => {
    const track = trackRef.current;
    const glider = gliderRef.current;
    if (!track || !glider) return;

    const place = (animate: boolean) => {
      const segment = markerRefs.current[Math.min(current, total) - 1];
      if (!segment) return;
      glider.style.transition = animate
        ? `transform 560ms ${ease()}, width 560ms ${ease()}, height 560ms ${ease()}, opacity 200ms ease`
        : 'opacity 200ms ease';
      glider.style.transform = `translate3d(${segment.offsetLeft}px, ${segment.offsetTop}px, 0)`;
      glider.style.width = `${segment.offsetWidth}px`;
      glider.style.height = `${segment.offsetHeight}px`;
      glider.style.opacity = '1';
    };

    place(placedRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    placedRef.current = true;

    // 只在轨道宽度真的变化时才重算位置。官方原版直接 place(false)，
    // 但 ResizeObserver 在 observe() 后必定回调一次，会把上面刚设好的
    // transform 过渡覆盖成 opacity-only，导致切换步骤变成瞬移。
    let lastWidth = track.offsetWidth;
    const observer = new ResizeObserver(() => {
      const width = track.offsetWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      place(false);
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, [current, total]);

  return (
    <div
      ref={trackRef}
      data-stepper-track=""
      className={`relative flex gap-1 rounded-[10px] p-1 [background:var(--surface-muted)] ${className}`.trim()}
    >
      <span
        ref={gliderRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 rounded-[6px] opacity-0 [background:linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] [box-shadow:inset_0_0_0_1px_var(--border),inset_0_1px_0_#ffffff,0_2px_6px_-3px_rgba(15,23,42,0.18)]"
      />
      {steps.map((label, index) => {
        const number = index + 1;
        const status: Status = number < current ? 'complete' : number === current ? 'active' : 'upcoming';
        return (
          <button
            key={label}
            ref={(element) => {
              markerRefs.current[index] = element;
            }}
            type="button"
            className="relative z-[1] flex h-10 min-w-0 flex-1 cursor-default items-center justify-center gap-2 rounded-[6px] px-2.5 [font:inherit] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand)] disabled:cursor-default [@media(hover:hover)]:enabled:hover:[background:rgba(15,23,42,0.035)]"
            aria-current={number === current ? 'step' : undefined}
            aria-label={`第 ${number} 步：${label}`}
            disabled={!clickable}
            onClick={clickable ? () => onStepClick?.(number) : undefined}
          >
            <span className={badgeClass(status)}>
              {status === 'complete' ? <Check aria-hidden="true" size={13} strokeWidth={3} /> : number}
            </span>
            <span className={`${TITLE} hidden sm:inline ${status === 'upcoming' ? 'text-[color:var(--ink-subtle)]' : 'text-[color:var(--ink)]'}`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
