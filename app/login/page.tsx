import type { Metadata } from "next";
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
      <LoginForm callbackUrl={callbackUrl} />
    </main>
  );
}
