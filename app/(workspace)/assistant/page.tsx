import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AssistantChat } from "@/components/data/assistant-chat";
import { AssistantWorkspace } from "@/components/data/assistant-workspace";
import { getActiveUser } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";
export const metadata: Metadata = { title: "赛事 AI 问答" };
export const dynamic = "force-dynamic";
export default async function AssistantPage({ searchParams }: { searchParams: { competitionId?: string } }) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  const competitions = await prisma.competition.findMany({ where: { publishStatus: "PUBLISHED" }, select: { id: true, name: true, year: true }, orderBy: [{ year: "desc" }, { name: "asc" }] });
  const competition = searchParams.competitionId ? competitions.find(({ id }) => id === searchParams.competitionId) : undefined;
  if (searchParams.competitionId && !competition) notFound();
  return <div className="mx-auto max-w-4xl space-y-5">
    <header><h1 className="text-xl font-semibold text-slate-900">赛事 AI 问答</h1>
      <p className="mt-2 text-sm text-slate-500">咨询全平台已发布赛事，根据赛事配置和通知提供可核对的回答。</p>
      {user.role === "ADMIN" && <p className="mt-2 text-sm text-slate-600">资料统一在赛事栏维护，无须在这里上传。 <Link className="text-blue-600 underline" href="/competitions">前往赛事栏</Link></p>}
    </header>
    <AssistantWorkspace key={competition?.id ?? "all"} competitionId={competition?.id} competitions={competitions} viewer={{ id: user.id, role: user.role }}>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><AssistantChat competitionId={competition?.id} /></section>
    </AssistantWorkspace>
  </div>;
}
