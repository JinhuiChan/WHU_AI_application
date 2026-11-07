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
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition duration-[160ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.97] motion-reduce:active:scale-100 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
        outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100",
        destructive: "border border-red-300 bg-white text-red-700 hover:bg-red-50 active:bg-red-100",
        ghost: "bg-transparent text-blue-700 hover:bg-blue-50 active:bg-blue-100",
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
