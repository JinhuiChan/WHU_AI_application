import Link from "next/link";
import { WhuGateEmblem } from "@/components/brand/whu-motifs";

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#edf4ef] px-4 py-10">
      <section className="card w-full max-w-md border-[#c9dad1] p-8 text-center">
        <WhuGateEmblem className="mx-auto h-11 w-16 text-[#115740]/45" />
        <h1 className="t-page-title mt-4 font-display text-2xl font-bold text-[#0e1d17]">页面或数据不存在</h1>
        <p className="mt-2 text-sm leading-6 text-[#54635d]">请检查访问地址，或返回工作台统计看板继续操作。</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-[#115740] px-6 text-sm font-medium text-white transition hover:bg-[#0d4633] active:scale-[0.98] motion-reduce:active:scale-100"
        >
          返回看板
        </Link>
      </section>
    </main>
  );
}
