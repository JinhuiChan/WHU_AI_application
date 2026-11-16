import type { ElementType, ReactNode } from "react";
import { cn } from "./cn";

/**
 * 全站卡片外壳。现在是 `card`，
 * 项目里有 100+ 处把这一串直接写在 className 里——改一次圆角要动 100 多个文件。
 *
 * 两种用法：
 * 1. `<Card>` —— 需要额外属性（aria-label 等）用这个
 * 2. `cardClass()` —— 标签不能用 Card 时（例如已经是 `<table>` 容器），取同一套类名
 *
 * `FRONTEND.md` 的 C2 约定（白底 / border-slate-200 / shadow-sm / rounded-xl / 不加更重阴影）
 * 就落在这里，改外观只改这个文件。
 */
export const CARD_BASE = "card";

/** 同一套外壳的类名，给不能渲染成 Card 的标签用 */
export function cardClass(extra?: string) {
  return cn(CARD_BASE, extra);
}

type CardProps = {
  as?: ElementType;
  className?: string;
  children?: ReactNode;
  [key: string]: unknown;
};

export function Card({ as: Tag = "div", className, children, ...rest }: CardProps) {
  const Component = Tag as ElementType;
  return (
    <Component className={cn(CARD_BASE, className)} {...rest}>
      {children}
    </Component>
  );
}
