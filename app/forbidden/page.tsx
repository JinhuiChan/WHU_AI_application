import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "无权限访问",
  robots: { index: false, follow: false },
};

export default function ForbiddenPage({ searchParams }: { searchParams?: { reason?: string } }) {
  const labels: Record<string, string> = {
    admin: "无权限访问该页面",
    student: "该页面仅参赛学生可访问",
    teacher: "该页面仅指导教师可访问",
  };
  const value = searchParams?.reason?.trim();
  const reason = value ? labels[value] || value : undefined;
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#edf4ef] px-4 py-10">
      <section className="card w-full max-w-md border-amber-200/90 p-8 text-center">
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fdf6e7] text-amber-800 ring-1 ring-[#ead4a8]"
          aria-hidden="true"
        >
          <Lock size={21} />
        </div>
        <h1 className="t-page-title mt-4 font-display text-2xl font-bold text-[#0e1d17]">无权限访问</h1>
        <p className="mt-2 text-sm leading-6 text-[#54635d]">{reason || "当前身份没有访问该页面的权限。"}</p>
        <p className="mt-1.5 text-xs leading-5 text-slate-500">
          如果你同时拥有多个身份，可在「个人中心」确认当前身份，或退出后使用对应身份重新登录。
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#115740] px-5 text-sm font-medium text-white transition hover:bg-[#0d4633] active:scale-[0.98] motion-reduce:active:scale-100"
          >
            返回看板
          </Link>
          <Link
            href="/teams"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#7f9384] bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-[#657a6f] hover:bg-[#f7faf8] active:scale-[0.98] motion-reduce:active:scale-100"
          >
            去组队广场
          </Link>
        </div>
      </section>
    </main>
  );
}
