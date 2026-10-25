import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">页面或数据不存在</h1>
        <p className="mt-2 text-sm text-slate-500">请检查访问地址，或返回看板继续操作。</p>
        <Link href="/dashboard" className="mt-5 inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">返回看板</Link>
      </section>
    </main>
  );
}
