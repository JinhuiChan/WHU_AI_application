import Link from "next/link";

type PaginationProps = {
  basePath: string;
  query: Record<string, string>;
  total: number;
  page: number;
  pageSize: number;
};

function pageHref(basePath: string, query: Record<string, string>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

export function Pagination({ basePath, query, total, page, pageSize }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <span>共 {total} 条，每页 {pageSize} 条</span>
      <div className="flex items-center gap-3">
        {page > 1 ? (
          <Link href={pageHref(basePath, query, page - 1)} className="rounded-md border border-slate-300 px-3 py-2 hover:bg-slate-50">
            上一页
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded-md border border-slate-200 px-3 py-2 text-slate-300">上一页</span>
        )}
        <span>第 {page} / {totalPages} 页</span>
        {page < totalPages ? (
          <Link href={pageHref(basePath, query, page + 1)} className="rounded-md border border-slate-300 px-3 py-2 hover:bg-slate-50">
            下一页
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded-md border border-slate-200 px-3 py-2 text-slate-300">下一页</span>
        )}
      </div>
    </div>
  );
}
