import Link from "next/link";
import { WhuGateEmblem } from "@/components/brand/whu-motifs";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#edf4ef] px-4">
      <section className="card w-full max-w-md p-8 text-center">
        <WhuGateEmblem className="mx-auto h-11 w-16 text-[#115740]/40" />
        <h1 className="mt-4 font-display text-2xl font-bold text-[#0e1d17]">页面或数据不存在</h1>
        <p className="mt-2 text-sm text-[#54635d]">请检查访问地址，或返回工作台看板继续操作。</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          返回看板
        </Link>
      </section>
    </main>
  );
}
