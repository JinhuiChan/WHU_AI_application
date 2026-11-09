/** 根级加载态：页面首次进入、服务端取数期间显示，避免白屏。 */
export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4" role="status" aria-live="polite">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600 motion-reduce:animate-none" aria-hidden="true" />
        <p className="mt-4 text-sm text-slate-500">正在加载页面…</p>
        <span className="sr-only">页面加载中</span>
      </div>
    </main>
  );
}
