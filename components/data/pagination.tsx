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
    <div className="flex flex-col gap-3 border-t border-[#dce7e0] px-4 py-3.5 text-xs text-[#54635d] tabular-nums sm:flex-row sm:items-center sm:justify-between">
      <span>
        共 <strong className="font-semibold text-[#0f1d18]">{total}</strong> 条，每页 {pageSize} 条
      </span>
      <div className="flex items-center gap-2.5">
        {page > 1 ? (
          <Link
            href={pageHref(basePath, query, page - 1)}
            className="inline-flex h-9 items-center justify-center rounded-full border border-[#7f9384] bg-white px-4 text-xs font-medium text-[#162620] transition-colors hover:border-[#115740] hover:bg-[#eef5f1] hover:text-[#115740] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/20 motion-reduce:active:scale-100"
          >
            上一页
          </Link>
        ) : (
          <span className="inline-flex h-9 cursor-not-allowed items-center justify-center rounded-full border border-[#dce7e0] bg-[#f8fbf9] px-4 text-xs text-[#95a59d]">
            上一页
          </span>
        )}
        <span className="inline-flex h-8 items-center rounded-full bg-[#eef5f1] px-3 text-xs font-semibold text-[#115740]">
          第 {page} / {totalPages} 页
        </span>
        {page < totalPages ? (
          <Link
            href={pageHref(basePath, query, page + 1)}
            className="inline-flex h-9 items-center justify-center rounded-full border border-[#7f9384] bg-white px-4 text-xs font-medium text-[#162620] transition-colors hover:border-[#115740] hover:bg-[#eef5f1] hover:text-[#115740] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/20 motion-reduce:active:scale-100"
          >
            下一页
          </Link>
        ) : (
          <span className="inline-flex h-9 cursor-not-allowed items-center justify-center rounded-full border border-[#dce7e0] bg-[#f8fbf9] px-4 text-xs text-[#95a59d]">
            下一页
          </span>
        )}
      </div>
    </div>
  );
}
