import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "无权限访问",
  robots: { index: false, follow: false },
};

export default function ForbiddenPage({ searchParams }: { searchParams?: { reason?: string } }) {
  const labels: Record<string, string> = { admin: "无权限访问该页面", student: "该页面仅参赛学生可访问", teacher: "该页面仅指导教师可访问" };
  const value = searchParams?.reason?.trim();
  const reason = value ? labels[value] || value : undefined;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#edf4ef] px-4">
      <section className="w-full max-w-md rounded-xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700" aria-hidden="true">
          <Lock size={22} />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-[#0e1d17]">无权限访问</h1>
        <p className="mt-2 text-sm leading-6 text-[#54635d]">
          {reason || "当前身份没有访问该页面的权限。"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
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
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#7f9384] bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-[#657a6f] hover:bg-[#f7faf8]"
          >
            去组队广场
          </Link>
        </div>
      </section>
    </main>
  );
}
