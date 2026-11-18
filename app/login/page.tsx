import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { WhuCrest } from "@/components/layout/brand-mark";
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
    <div className="grid min-h-[100dvh] bg-[#edf4ef] text-slate-900 lg:min-h-[100dvh] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <section className="relative hidden overflow-hidden bg-[#0d3b2e] px-12 py-9 lg:flex lg:flex-col">
        <Image
          alt="武汉大学校园建筑"
          aria-hidden="true"
          className="pointer-events-none select-none object-cover"
          fill
          priority
          src={loginHero}
          style={{ objectPosition: "50% 34%" }}
          unoptimized
        />
        {/* 深孔雀绿渐变护字层：上透出校园屋檐，下压稳深绿底保证阅读对比度 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(13,59,46,0.16) 0%, rgba(13,59,46,0.48) 32%, rgba(10,47,37,0.88) 58%, rgba(10,47,37,0.96) 78%, rgba(9,41,32,0.98) 100%)",
          }}
        />

        <div className="relative flex items-center gap-3.5 text-white">
          <WhuCrest framed size={42} />
          <span>
            <span className="block font-display text-[17px] font-bold leading-tight text-white">珞珈科创</span>
            <span className="mt-0.5 block text-xs text-[#b5d4c6]">武汉大学大学生创新创业竞赛平台</span>
          </span>
        </div>

        {/* 上半部留给建筑，文字沉到底部 */}
        <div aria-hidden="true" className="flex-1" />

        <div className="relative">
          <div className="max-w-xl">
            <h1 className="login-fade-up font-display text-[32px] font-bold leading-[1.38] tracking-tight text-white" style={{ animationDelay: "100ms" }}>
              从校赛业务管理到国赛数据存档，
              <br />
              让每一次变更都有依据。
            </h1>
            <p className="login-fade-up mt-4 max-w-lg text-sm leading-7 text-[#d5e7de]" style={{ animationDelay: "170ms" }}>
              报名在第二课堂、大创网与双创网完成；本平台管理校赛进程、材料版本与一致性核对。
            </p>
            <div className="login-fade-up mt-5 space-y-2.5 text-sm" style={{ animationDelay: "230ms" }}>
              <div className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7fd3b2]" />
                <p className="leading-6 text-[#cde1d7]">
                  <span className="font-medium text-white">本平台负责</span>：校赛进程、材料版本、一致性核对与数据存档。
                </p>
              </div>
              <div className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/40" />
                <p className="leading-6 text-[#cde1d7]">
                  <span className="font-medium text-white">本平台不负责</span>：站内报名与在线评分，报名在外部平台完成。
                </p>
              </div>
            </div>
          </div>

          <div className="login-fade-up mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-white/15 pt-4" style={{ animationDelay: "300ms" }}>
            <p className="text-xs text-[#b7d3c6]">报名入口：第二课堂（校赛）· 大创网（官方报名）· 双创网（省赛）</p>
            <p className="text-xs tracking-widest text-[#95baa8]">自强 · 弘毅 · 求是 · 拓新</p>
          </div>
        </div>
      </section>

      <main className="flex items-center justify-center bg-[#edf4ef] px-6 py-12 sm:px-10">
        <div className="w-full max-w-[440px] rounded-2xl border border-[#d5e2db] bg-white p-7 sm:p-9">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <WhuCrest size={38} />
            <span>
              <span className="block font-display text-base font-bold leading-tight text-[#0e1d17]">珞珈科创</span>
              <span className="mt-0.5 block text-xs text-[#5b6a64]">武汉大学竞赛平台</span>
            </span>
          </div>

          <LoginForm callbackUrl={callbackUrl} />

          <div className="mt-7 border-t border-[#e5ede8] pt-6 text-center">
            <p className="mb-3 text-sm text-slate-500">还没有账号？</p>
            <Link
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-[#7f9384] bg-white text-sm font-medium text-slate-700 transition duration-[160ms] hover:bg-[#f7faf8] active:scale-[0.97] motion-reduce:active:scale-100"
              href="/register"
            >
              注册
            </Link>
          </div>

          <div className="mt-6 rounded-lg border border-dashed border-[#c6d6cd] bg-[#f7faf8] px-4 py-3">
            <p className="text-xs font-medium text-[#115740]">角色速览 · 只读，不触发登录</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              学生 / 指导老师 / 管理员；身份需与账号匹配，权限一律以服务端校验为准。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
