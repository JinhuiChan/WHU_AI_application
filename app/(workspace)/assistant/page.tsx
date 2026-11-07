import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AssistantChat } from "@/components/data/assistant-chat";
import { KnowledgePanel } from "@/components/data/knowledge-panel";
import { getActiveUser } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "赛事 AI 问答" };
export const dynamic = "force-dynamic";

export default async function AssistantPage({ searchParams }: { searchParams: { competitionId?: string } }) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  const admin = user.roles.includes("ADMIN");
  const competitions = await prisma.competition.findMany({
    where: admin ? {} : { publishStatus: "PUBLISHED" },
    select: { id: true, name: true, year: true, publishStatus: true },
    orderBy: [{ year: "desc" }, { name: "asc" }],
  });
  const competition = competitions.find(({ id }) => id === searchParams.competitionId) ?? competitions[0];
  const [attachments, documents] = admin && competition ? await Promise.all([
    prisma.competitionAttachment.findMany({
      where: { competitionId: competition.id },
      select: { id: true, title: true, fileName: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.kbDocument.findMany({
      where: { competitionId: competition.id },
      select: { id: true, title: true, isActive: true, effectiveAt: true, expiresAt: true, sourceAttachmentId: true },
      orderBy: { createdAt: "desc" },
    }),
  ]) : [[], []];
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short", hourCycle: "h23",
  });
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-slate-900">赛事 AI 问答</h1>
        <p className="mt-2 text-sm text-slate-500">根据本场赛事资料回答问题，并提供可核对的出处。</p>
      </header>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        {competition ? <>
          <form action="/assistant" className="mb-5 flex flex-wrap items-end gap-2">
            <label className="flex-1 text-sm font-medium">咨询赛事
              <select name="competitionId" defaultValue={competition.id} key={competition.id} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2">
                {competitions.map((item) => <option key={item.id} value={item.id}>{item.year} · {item.name}</option>)}
              </select>
            </label>
            <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm">切换赛事</button>
          </form>
          {competition.publishStatus !== "PUBLISHED" && <p className="mb-3 text-sm text-amber-700">该赛事尚未发布，问答会在发布后开放。</p>}
          <AssistantChat key={competition.id} competitionId={competition.id} />
        </> : <p className="text-sm text-slate-500">目前没有可咨询的赛事。</p>}
      </section>
      {admin && competition && <KnowledgePanel
        key={competition.id} competitionId={competition.id}
        attachments={attachments.filter(({ fileName }) => /\.(txt|docx|pdf)$/i.test(fileName))}
        documents={documents.map((doc) => ({
          id: doc.id, title: doc.title, isActive: doc.isActive, sourceAttachmentId: doc.sourceAttachmentId,
          effectiveLabel: doc.effectiveAt ? formatter.format(doc.effectiveAt) : "立即",
          canReplace: doc.isActive && !doc.expiresAt && (!doc.effectiveAt || doc.effectiveAt <= now),
          status: !doc.isActive ? "已下架" : doc.expiresAt && doc.expiresAt <= now ? "已替换" : doc.effectiveAt && doc.effectiveAt > now ? "待生效" : "生效中",
        }))}
      />}
    </div>
  );
}
