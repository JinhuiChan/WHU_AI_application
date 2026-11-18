/** 根级加载态：页面首次进入、服务端取数期间显示，避免白屏。 */
export default function Loading() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#edf4ef] px-4" role="status" aria-live="polite">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#cfe0d7] border-t-[#115740] motion-reduce:animate-none" aria-hidden="true" />
        <p className="mt-3.5 text-sm text-[#54635d]">正在加载页面…</p>
        <span className="sr-only">页面加载中</span>
      </div>
    </main>
  );
}
