import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * 拼出「当前列表的完整地址」，详情页拿它当返回目标。
 * 只保留有值的参数，避免出现 `?year=&level=` 这种空壳。
 */
export function listHref(basePath: string, query: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** 详情页链接：把来源地址一并带上，返回时筛选、页码、关键词都还在。 */
export function detailHref(basePath: string, id: string, from: string): string {
  return `${basePath}/${id}?from=${encodeURIComponent(from)}`;
}

/** 只接受站内相对路径，避免 from 被外部地址拿去当跳转跳板。 */
export function safeReturnTo(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

type BackLinkProps = {
  /** 列表页传过来的来源地址，通常来自 searchParams.from */
  to?: string;
  /** 没有来源时的兜底地址 */
  fallback: string;
  label: string;
};

/** 详情页顶部的返回链接，全站同一套样式。 */
export function BackLink({ to, fallback, label }: BackLinkProps) {
  return (
    <Link
      href={safeReturnTo(to, fallback)}
      className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-blue-600"
    >
      <ArrowLeft size={14} aria-hidden="true" />
      {label}
    </Link>
  );
}
