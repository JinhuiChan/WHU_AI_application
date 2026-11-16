import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { BrandMark } from "@/components/layout/brand-mark";
import { getActiveUser } from "@/lib/auth.server";
// 静态 import 而非 /images 绝对路径：middleware 的 matcher 只豁免 /_next，
// public 下的图片会被重定向到登录页。静态 import 走 /_next/static/media，能正常加载。
import loginHero from "../../public/images/login-hero.webp";

export const metadata: Metadata = {
  title: "登录",
};

type LoginPageProps = {
  searchParams?: {
    callbackUrl?: string | string[];
  };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // 只有数据库里仍然有效的会话才自动进工作台；失效 cookie 留在 /login 重新登录。
  const user = await getActiveUser();
  if (user) redirect("/dashboard");
  const rawCallback = Array.isArray(searchParams?.callbackUrl)
    ? searchParams.callbackUrl[0]
    : searchParams?.callbackUrl;
  const callbackUrl = rawCallback?.startsWith("/") && !rawCallback.startsWith("//") ? rawCallback : "/dashboard";

  return (
    <div className="grid min-h-screen bg-white text-slate-900 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <section className="relative hidden overflow-hidden bg-[#0b1d33] px-12 py-12 lg:flex lg:flex-col">
        <Image
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none object-cover"
          fill
          priority
          src={loginHero}
          style={{ objectPosition: "50% 34%" }}
          unoptimized
        />
        {/* 遮罩：上淡下浓。建筑屋顶留出来，文字区压到近实色，保证白色正文可读。 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(0,18,38,0.10) 0%, rgba(0,18,38,0.42) 28%, rgba(0,18,38,0.86) 54%, rgba(0,18,38,0.96) 74%, rgba(0,18,38,0.98) 100%)",
          }}
        />

        <div className="relative flex items-center gap-3 text-white">
          <BrandMark className="h-9 w-9" />
          <span>
            <span className="block text-base font-semibold leading-tight">珞珈科创</span>
            <span className="mt-0.5 block text-[10px] tracking-[0.2em] text-white/55">WUHAN UNIVERSITY</span>
          </span>
        </div>

        {/* 上半部留给建筑，文字全部沉到底部：遮罩在这里最浓，白字才稳 */}
        <div aria-hidden="true" className="flex-1" />

        <div className="relative">
          <div className="max-w-xl">
            <p className="login-fade-up text-[11px] font-medium tracking-[0.2em] text-[#f0aeaf]" style={{ animationDelay: "40ms" }}>
              武汉大学 · 科创赛事
            </p>
            <h1 className="login-fade-up mt-4 text-[30px] font-semibold leading-[1.42] tracking-[-0.3px] text-white" style={{ animationDelay: "120ms" }}>
              从校赛业务管理到国赛数据存档，
              <br />
              让每一次变更都有依据。
            </h1>
            <p className="login-fade-up mt-4 max-w-lg text-sm leading-7 text-white/70" style={{ animationDelay: "190ms" }}>
              报名在第二课堂、大创网与双创网完成；本平台管理校赛进程、材料版本与一致性核对。
            </p>
            <div className="login-fade-up mt-5 space-y-2.5 text-sm" style={{ animationDelay: "250ms" }}>
              <div className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7fc9d8]" />
                <p className="leading-6 text-white/70">
                  <span className="font-medium text-white">本平台负责</span>：校赛进程、材料版本、一致性核对与数据存档。
                </p>
              </div>
              <div className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/35" />
                <p className="leading-6 text-white/70">
                  <span className="font-medium text-white">本平台不负责</span>：站内报名与在线评分，报名在外部平台完成。
                </p>
              </div>
            </div>
          </div>

          <div className="login-fade-up mt-8 space-y-1.5 border-t border-white/10 pt-5" style={{ animationDelay: "330ms" }}>
            <p className="text-xs text-white/55">报名入口：第二课堂（校赛）· 大创网（官方报名）· 双创网（省赛）</p>
            <p className="text-[11px] text-white/35">高校科创赛事综合管理服务平台 · 真实账号登录</p>
          </div>
        </div>
      </section>

      <main className="flex items-center justify-center bg-white px-6 py-12 sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark className="h-9 w-9 text-[#002554]" />
            <span>
              <span className="block text-base font-semibold leading-tight text-slate-900">珞珈科创</span>
              <span className="mt-0.5 block text-[10px] tracking-[0.2em] text-slate-400">WUHAN UNIVERSITY</span>
            </span>
          </div>

          <LoginForm callbackUrl={callbackUrl} />

          <div className="mt-8 border-t border-slate-100 pt-6 text-center">
            <p className="mb-3 text-sm text-slate-500">还没有账号？</p>
            <Link
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-medium text-slate-700 transition duration-[160ms] hover:bg-slate-50 active:scale-[0.97] motion-reduce:active:scale-100"
              href="/register"
            >
              注册
            </Link>
          </div>

          <div className="mt-6 rounded-lg border border-dashed border-slate-300 px-4 py-3">
            <p className="text-xs font-medium text-blue-600">角色速览 · 只读，不触发登录</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              学生 / 指导老师 / 管理员；身份需与账号匹配，权限一律以服务端校验为准。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
