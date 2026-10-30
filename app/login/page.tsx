import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "登录",
};

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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
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
  );
}
