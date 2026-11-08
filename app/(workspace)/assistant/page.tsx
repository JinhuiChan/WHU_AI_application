import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AssistantChat } from "@/components/data/assistant-chat";
import { AssistantWorkspace } from "@/components/data/assistant-workspace";
import { getActiveUser } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";
export const metadata: Metadata = { title: "赛事 AI 问答" };
export const dynamic = "force-dynamic";

type PageProps = { searchParams: { competitionId?: string } };

export default async function AssistantPage({ searchParams }: PageProps) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  const competitions = await prisma.competition.findMany({ where: { publishStatus: "PUBLISHED" }, select: { id: true, name: true, year: true }, orderBy: [{ year: "desc" }, { name: "asc" }] });
  const competition = searchParams.competitionId ? competitions.find(({ id }) => id === searchParams.competitionId) : undefined;
  if (searchParams.competitionId && !competition) notFound();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">赛事 AI 问答</h1>
        <p className="mt-1 text-sm text-slate-500">咨询全平台已发布赛事，根据赛事配置和通知提供可核对的回答。</p>
      </div>
      {user.role === "ADMIN" ? (
        <p className="text-sm text-slate-500">
          问答资料统一在赛事详情维护，这里不需要单独上传。<Link className="text-blue-600 hover:underline" href="/competitions">前往赛事</Link>
        </p>
      ) : null}
      <AssistantWorkspace key={competition?.id ?? "all"} competitionId={competition?.id} competitions={competitions} viewer={{ id: user.id, role: user.role }}>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><AssistantChat competitionId={competition?.id} /></section>
      </AssistantWorkspace>
    </div>
  );
}
