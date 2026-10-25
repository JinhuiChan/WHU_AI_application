import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "看板",
};

export default function DashboardPage() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">数据看板</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        欢迎使用高校科创赛事综合管理服务平台。登录、权限与全局导航已就绪，看板数据将在后续阶段接入。
      </p>
    </section>
  );
}
