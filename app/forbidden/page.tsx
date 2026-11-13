import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "无权限访问",
  robots: { index: false, follow: false },
};

export default function ForbiddenPage({ searchParams }: { searchParams?: { reason?: string } }) {
  const reason = searchParams?.reason?.trim();
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-2xl" aria-hidden="true">
          🔒
        </div>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">无权限访问</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {reason || "当前身份没有访问该页面的权限。"}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          如果你同时拥有多个身份，可在「个人中心」确认当前身份，或退出后用另一个身份登录。
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            返回看板
          </Link>
          <Link
            href="/teams"
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            去组队广场
          </Link>
        </div>
      </section>
    </main>
  );
}
