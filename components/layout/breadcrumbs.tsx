"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { ChevronRight } from "lucide-react";

const pageNames: Record<string, string> = {
  "/dashboard": "看板",
  "/competitions": "赛事",
  "/intro": "赛事简介",
  "/projects": "项目",
  "/my": "我的项目",
  "/profile": "我的资料",
  "/apply": "报名表",
  "/teacher": "指导项目",
  "/review": "报名审核",
  "/review/changes": "变更申请",
  "/import": "数据导入",
  "/anomalies": "异常核实",
  "/assistant": "赛事 AI 问答",
  "/check": "材料检查",
  "/rankings": "学院排行",
  "/admin/users": "用户管理",
  "/admin/awards": "奖项录入",
  "/admin/logs": "审计日志",
};

const detailSections: { prefix: string; parent?: { href: string; label: string }; current: string }[] = [
  { prefix: "/competitions/", parent: { href: "/competitions", label: "赛事" }, current: "赛事详情" },
  { prefix: "/intro/", parent: { href: "/intro", label: "赛事简介" }, current: "赛事介绍" },
  { prefix: "/projects/", parent: { href: "/projects", label: "项目" }, current: "项目全貌" },
  { prefix: "/my/", parent: { href: "/my", label: "我的项目" }, current: "项目详情" },
  { prefix: "/review/", parent: { href: "/review", label: "报名审核" }, current: "审核项目详情" },
  { prefix: "/u/", current: "个人主页" },
];

// 详情页用真实名称覆盖「XX详情」：客户端共享状态，BreadcrumbTitle 挂载写入、卸载清空
let detailTitle: string | null = null;
const titleSubscribers = new Set<() => void>();

function subscribeTitle(onChange: () => void) {
  titleSubscribers.add(onChange);
  return () => {
    titleSubscribers.delete(onChange);
  };
}

function getTitleSnapshot() {
  return detailTitle;
}

function writeDetailTitle(value: string | null) {
  if (detailTitle === value) return;
  detailTitle = value;
  for (const onChange of titleSubscribers) onChange();
}

export function BreadcrumbTitle({ label }: { label: string }) {
  useEffect(() => {
    writeDetailTitle(label);
    return () => {
      if (detailTitle === label) writeDetailTitle(null);
    };
  }, [label]);
  return null;
}

export function Breadcrumbs() {
  const pathname = usePathname() ?? "";
  const override = useSyncExternalStore(subscribeTitle, getTitleSnapshot, () => null);
  const detail = detailSections.find((item) => pathname.startsWith(item.prefix));
  const current = override ?? pageNames[pathname] ?? detail?.current ?? "页面详情";
  const parent: { label: string; href?: string } | null = pathname.startsWith("/admin")
    ? { label: "管理" }
    : detail?.parent ?? null;

  return (
    <nav aria-label="面包屑" className="min-w-0">
      <ol className="flex items-center gap-1 text-sm">
        <li>
          <Link href="/dashboard" className="text-slate-500 hover:text-blue-600">
            首页
          </Link>
        </li>
        {parent ? (
          <li className="flex items-center gap-1">
            <ChevronRight size={14} className="text-slate-400" aria-hidden="true" />
            {parent.href ? (
              <Link href={parent.href} className="text-slate-500 hover:text-blue-600">{parent.label}</Link>
            ) : <span className="text-slate-500">{parent.label}</span>}
          </li>
        ) : null}
        <li className="flex min-w-0 items-center gap-1">
          <ChevronRight size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
          <span className="truncate font-medium text-slate-900" aria-current="page">
            {current}
          </span>
        </li>
      </ol>
    </nav>
  );
}
