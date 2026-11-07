/** 工作区加载骨架：结构与看板一致，切换页面时不跳版。 */
function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 motion-reduce:animate-none ${className}`} aria-hidden="true" />;
}

export default function WorkspaceLoading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <span className="sr-only">内容加载中</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={i}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-8 w-16" />
            <Skeleton className="mt-4 h-3 w-full" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <Skeleton className="h-5 w-32" />
        <div className="mt-5 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton className="h-9 w-full" key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
