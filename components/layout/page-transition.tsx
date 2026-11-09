"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * 工作区页面切换时重挂载内容区，让 CSS 入场动画每次导航都重播。
 * Next App Router 的 layout 不随页面切换重挂载，所以需要这层客户端壳。
 * 只负责展示，不取数、不碰权限与业务状态。
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
