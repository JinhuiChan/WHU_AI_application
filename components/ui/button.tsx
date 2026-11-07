"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
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
  };

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
    />
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, type = "button", loading = false, disabled, children, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  if (asChild) {
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
        {children}
      </Comp>
    );
  }
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </Comp>
  );
});

export { buttonVariants };
