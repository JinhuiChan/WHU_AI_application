import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "登录",
};

const LOGIN_HEADER_LINKS: { label: string; href: string }[] = [];

type LoginPageProps = {
  searchParams?: {
    callbackUrl?: string | string[];
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const rawCallback = Array.isArray(searchParams?.callbackUrl)
    ? searchParams.callbackUrl[0]
    : searchParams?.callbackUrl;
  const callbackUrl = rawCallback?.startsWith("/") && !rawCallback.startsWith("//") ? rawCallback : "/dashboard";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex w-full items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-start gap-3">
            <Image alt="" className="mt-0.5 h-8 w-8" height={32} src="/favicon.ico" width={32} />
            <div>
              <p className="text-base font-semibold text-slate-900">WHU 科创赛事平台</p>
              <p aria-hidden="true" className="min-h-[1rem] text-xs text-slate-500" />
            </div>
          </div>
          <nav aria-label="页头链接" className="flex items-center gap-4 text-sm text-slate-600">
            {LOGIN_HEADER_LINKS.map((link) => (
              <Link className="hover:text-blue-600" href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-4">
          <LoginForm callbackUrl={callbackUrl} />
          <p className="text-center text-sm text-slate-500">
            还没有账号？
            <Link className="ml-1 text-blue-600 hover:underline" href="/register">
              学生注册
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
