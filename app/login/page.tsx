import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import BlurText from "@/components/react-bits/BlurText";

export const metadata: Metadata = {
  title: "登录",
};

type LoginPageProps = {
  searchParams?: {
    callbackUrl?: string | string[];
  };
};

const CAPABILITIES = ["校赛进程", "材料版本", "一致性核对", "全流程留痕"];

export default function LoginPage({ searchParams }: LoginPageProps) {
  const rawCallback = Array.isArray(searchParams?.callbackUrl)
    ? searchParams.callbackUrl[0]
    : searchParams?.callbackUrl;
  const callbackUrl = rawCallback?.startsWith("/") && !rawCallback.startsWith("//") ? rawCallback : "/dashboard";

  return (
    <div className="grid min-h-screen bg-white text-slate-900 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <section className="hidden flex-col justify-between gap-12 border-r border-slate-200 bg-slate-50 px-12 py-12 lg:flex">
        <div className="flex items-center gap-3">
          <Image alt="" className="h-9 w-9" height={36} src="/favicon.ico" width={36} />
          <span className="text-base font-medium text-slate-900">WHU 科创赛事平台</span>
        </div>

        <div className="max-w-xl">
          <p className="login-fade-up text-xs font-medium tracking-[0.18em] text-blue-600" style={{ animationDelay: "40ms" }}>
            武汉大学 · 科创赛事
          </p>
          <h1 className="font-rounded mt-5 text-3xl font-medium leading-snug text-slate-900">
            <span className="block">
              <BlurText text="从校赛业务管理到国赛数据存档，" animateBy="letters" delay={26} stepDuration={0.4} blur={8} distance={10} trigger="load" />
            </span>
            <span className="block">
              <BlurText text="让每一次变更都有依据。" animateBy="letters" delay={26} stepDuration={0.4} blur={8} distance={10} trigger="load" />
            </span>
          </h1>
          <p className="login-fade-up mt-5 max-w-lg text-sm leading-7 text-slate-500" style={{ animationDelay: "170ms" }}>
            报名在第二课堂、大创网与双创网完成；本平台管理校赛进程、材料版本与一致性核对。
          </p>
          <div className="login-fade-up mt-6 space-y-2 text-sm" style={{ animationDelay: "240ms" }}>
            <div className="flex gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
              <p className="leading-6 text-slate-600">
                <span className="font-medium text-slate-900">本平台负责</span>：校赛进程、材料版本、一致性核对与数据存档。
              </p>
            </div>
            <div className="flex gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <p className="leading-6 text-slate-600">
                <span className="font-medium text-slate-900">本平台不负责</span>：站内报名与在线评分，报名在外部平台完成。
              </p>
            </div>
          </div>
          <div className="login-fade-up mt-8 flex flex-wrap gap-2" style={{ animationDelay: "310ms" }}>
            {CAPABILITIES.map((item) => (
              <span
                className="rounded-md border border-slate-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="login-fade-up space-y-2" style={{ animationDelay: "380ms" }}>
          <p className="text-xs text-slate-500">报名入口：第二课堂（校赛）· 大创网（官方报名）· 双创网（省赛）</p>
          <p className="text-xs text-slate-400">高校科创赛事综合管理服务平台 · 真实账号登录</p>
        </div>
      </section>

      <main className="flex items-center justify-center bg-white px-6 py-12 sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Image alt="" className="h-9 w-9" height={36} src="/favicon.ico" width={36} />
            <span className="text-base font-medium text-slate-900">WHU 科创赛事平台</span>
          </div>

          <LoginForm callbackUrl={callbackUrl} />

          <div className="mt-8 border-t border-slate-100 pt-6 text-center">
            <p className="mb-3 text-sm text-slate-500">还没有账号？</p>
            <Link
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-medium text-slate-700 transition duration-[160ms] hover:bg-slate-50 active:scale-[0.97] motion-reduce:active:scale-100"
              href="/register"
            >
              学生注册
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
