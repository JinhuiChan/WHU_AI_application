'use client';

import { Check } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * 取自 React Bits 官方 Stepper（src/ts-tailwind/Components/Stepper/Stepper.tsx）
 * 的步骤指示条部分，适配珞珈书院深绿（#115740）与青瓷宣纸配色，并严格仅对
 * transform 与 opacity 执行 GPU 合成过渡（零 width/height 过渡动画）。
 */

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const SPRING =
  'linear(0, 0.0603, 0.2033, 0.3821, 0.5633, 0.7258, 0.8584, 0.9574, 1.0242, 1.0634, 1.0809, 1.0828, 1.0747, 1.0613, 1.046, 1.0313, 1.0186, 1.0085, 1.0012, 0.9965, 0.994, 0.9931, 0.9933, 0.9941, 0.9953, 0.9966, 0.9978, 0.9988, 1)';

const ease = () =>
  typeof CSS !== 'undefined' && CSS.supports?.('transition-timing-function', 'linear(0, 1)')
    ? SPRING
    : 'cubic-bezier(0.34, 1.4, 0.64, 1)';

const TITLE =
  'overflow-hidden text-[13px] font-semibold leading-[1.2] [text-overflow:ellipsis] whitespace-nowrap transition-colors duration-200';

type Status = 'complete' | 'active' | 'upcoming';

const badgeClass = (status: Status) => {
  const base =
    'grid h-[22px] w-[22px] flex-none place-items-center rounded-full text-[11.5px] font-semibold leading-none tabular-nums transition-colors duration-150';
  if (status === 'active') return `${base} bg-[#115740] text-white`;
  if (status === 'complete') return `${base} border border-[#b8d4c5] bg-[#eef5f1] text-[#115740]`;
  return `${base} border border-[#b8cbc0] bg-white/80 text-[#6c7e76]`;
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
        ? `transform 520ms ${ease()}, opacity 200ms ease`
        : 'opacity 200ms ease';
      glider.style.width = `${segment.offsetWidth}px`;
      glider.style.height = `${segment.offsetHeight}px`;
      glider.style.transform = `translate3d(${segment.offsetLeft}px, ${segment.offsetTop}px, 0)`;
      glider.style.opacity = '1';
    };

    place(placedRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    placedRef.current = true;

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
      className={`relative flex gap-1 rounded-full border border-[#d5e2db] bg-[#eef5f1]/80 p-1 ${className}`.trim()}
    >
      <span
        ref={gliderRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 rounded-full bg-white opacity-0 shadow-[0_2px_8px_-3px_rgba(17,87,64,0.18),inset_0_0_0_1px_#cde0d5]"
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
            className="relative z-[1] flex h-10 min-w-0 flex-1 cursor-default items-center justify-center gap-2 rounded-full px-3 transition-colors duration-150 [font:inherit] enabled:cursor-pointer enabled:hover:bg-[#115740]/[0.05] enabled:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/30 disabled:cursor-default motion-reduce:enabled:active:scale-100"
            aria-current={number === current ? 'step' : undefined}
            aria-label={`第 ${number} 步：${label}`}
            disabled={!clickable}
            onClick={clickable ? () => onStepClick?.(number) : undefined}
          >
            <span className={badgeClass(status)}>
              {status === 'complete' ? <Check aria-hidden="true" size={13} strokeWidth={3} /> : number}
            </span>
            <span className={`${TITLE} hidden sm:inline ${status === 'upcoming' ? 'text-[#5c6c65]' : 'text-[#0f1d18]'}`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
