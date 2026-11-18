import Link from "next/link";
import { Lock } from "lucide-react";

export function WorkspaceForbidden({ message }: { message?: string }) {
  return (
    <section className="card mx-auto max-w-lg px-6 py-10 text-center">
      <div
        aria-hidden="true"
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fbf3e2] text-[#9a6712] ring-1 ring-[#e8cf9d]"
      >
        <Lock size={20} />
      </div>
      <h1 className="mt-4 font-display text-xl font-bold text-[#0e1d17]">403 无权限</h1>
      <p className="mt-2 text-sm leading-6 text-[#54635d]">
        {message ?? "当前登录身份没有访问该管理模块的权限。"}
      </p>
      <div className="mt-6 flex justify-center">
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center justify-center rounded-full bg-[#115740] px-5 text-xs font-medium text-white transition-colors hover:bg-[#0d4633] active:bg-[#093325] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/20 focus-visible:ring-offset-2"
        >
          返回看板
        </Link>
      </div>
    </section>
  );
}
