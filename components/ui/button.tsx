"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowRight } from "lucide-react";
import { cn } from "./cn";

/**
 * shadcn/ui 风格的 Button 源码，按 Tailwind 3 + React 18 兼容写法落地。
 * 保留项目已锁定的 B2 胶囊形状与 K3 按压缩放，不自带 w-full（由调用方传入）。
 * loading 只负责转圈、禁用与 aria-busy；文案仍由调用方给，避免重复。
 */
/**
 * 交互统一采用「抬升」：悬停上浮 2px + 同色投影扩散，按下回落并轻缩。
 * translate 不参与布局，表格里密集排列也不会把行高撑开。
 * ghost 是透明底，抬起来只剩一圈阴影反而脏，所以显式抵消掉。
 */
const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition duration-[160ms] ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25 active:bg-blue-800",
        outline:
          "border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:shadow-md hover:shadow-slate-900/10 active:bg-slate-100",
        destructive:
          "border border-red-300 bg-white text-red-700 shadow-sm hover:bg-red-50 hover:shadow-md hover:shadow-red-600/15 active:bg-red-100",
        ghost:
          "bg-transparent text-blue-700 hover:translate-y-0 hover:bg-blue-50 hover:shadow-none active:bg-blue-100",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-xs",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
    /**
     * 悬停时从右侧滑出一个箭头，按钮同时微微变宽。
     * 只给「进入 / 继续 / 提交前进」这类按钮开；取消、重置、删除、导出不要开，
     * 箭头会暗示"点了会走下一步"，与实际行为不符。
     * asChild 模式不生效（Slot 只接受单个子元素），需要调用方自己在子元素里写箭头。
     */
    arrow?: boolean;
  };

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
    />
  );
}

/**
 * 箭头槽位。宽度固定 14px、只做淡入与 4px 内移，所以按钮的宽度在悬停前后完全一致，
 * 表格里一排按钮不会互相推挤。`-ml-1.5` 抵掉一部分父级 gap，让静止时右侧不会空太多。
 * asChild 的调用点直接用它：`<Link>文案<ButtonArrow /></Link>`，父元素记得带 `group`。
 */
export function ButtonArrow() {
  return (
    <span
      aria-hidden="true"
      className="-ml-1.5 grid w-3.5 -translate-x-1 place-items-center overflow-hidden opacity-0 transition-all duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none"
    >
      <ArrowRight size={14} className="shrink-0" />
    </span>
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, type = "button", loading = false, arrow = false, disabled, children, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  const classes = cn(buttonVariants({ variant, size }), arrow && !asChild && "group", className);
  if (asChild) {
    return (
      <Comp className={classes} ref={ref} {...props}>
        {children}
      </Comp>
    );
  }
  return (
    <Comp
      className={classes}
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
      {arrow && !loading ? <ButtonArrow /> : null}
    </Comp>
  );
});

export { buttonVariants };
