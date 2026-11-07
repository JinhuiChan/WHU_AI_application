import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AssistantChat } from "@/components/data/assistant-chat";
import { KnowledgePanel } from "@/components/data/knowledge-panel";
import { AssistantWorkspace } from "@/components/data/assistant-workspace";
import { knowledgeAttachmentIssue } from "@/lib/knowledge";
import { getActiveUser } from "@/lib/auth.server";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "赛事 AI 问答" };
export const dynamic = "force-dynamic";

export default async function AssistantPage({ searchParams }: { searchParams: { competitionId?: string } }) {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  const admin = user.role === "ADMIN";
  const competitions = await prisma.competition.findMany({
    where: admin ? {} : { publishStatus: "PUBLISHED" },
    select: { id: true, name: true, year: true, publishStatus: true },
    orderBy: [{ year: "desc" }, { name: "asc" }],
  });
  const competition = searchParams.competitionId ? competitions.find(({ id }) => id === searchParams.competitionId) : competitions[0];
  if (searchParams.competitionId && !competition) notFound();
  const [attachments, documents] = admin && competition ? await Promise.all([
    prisma.competitionAttachment.findMany({
      where: { competitionId: competition.id },
      select: { id: true, title: true, fileName: true, filePath: true, competitionId: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.kbDocument.findMany({
      where: { competitionId: competition.id },
      select: { id: true, title: true, fileName: true, filePath: true, replacesId: true, isActive: true, effectiveAt: true, expiresAt: true, sourceAttachmentId: true },
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
      {competition ? <AssistantWorkspace key={competition.id} competitionId={competition.id} competitions={competitions} admin={admin} viewer={{ id: user.id, role: user.role }}>
        {admin && <KnowledgePanel
          key={competition.id} competitionId={competition.id}
          attachments={attachments.map((item) => ({ ...item, isSample: item.filePath.startsWith("/samples/"), unavailableReason: knowledgeAttachmentIssue(item) }))}
          documents={documents.map((doc) => ({
            id: doc.id, title: doc.title, fileName: doc.fileName, filePath: doc.filePath,
            isActive: doc.isActive, sourceAttachmentId: doc.sourceAttachmentId,
            effectiveLabel: doc.effectiveAt ? formatter.format(doc.effectiveAt) : "立即",
            canReplace: doc.isActive && !doc.expiresAt && (!doc.effectiveAt || doc.effectiveAt <= now),
            canRestore: !doc.isActive && !doc.expiresAt && !doc.replacesId
              && !documents.some((other) => other.replacesId === doc.id && other.isActive)
              && (doc.sourceAttachmentId ? attachments.some((item) => item.id === doc.sourceAttachmentId && !knowledgeAttachmentIssue(item)) : !doc.filePath),
            status: !doc.isActive ? "已下架" : doc.expiresAt && doc.expiresAt <= now ? "已替换" : doc.effectiveAt && doc.effectiveAt > now ? "待生效" : "生效中",
          }))}
        />}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-900">{admin ? "测试问答" : "问一问这场比赛"}</h2>
          {competition.publishStatus !== "PUBLISHED"
            ? <p className="text-sm text-amber-700">该赛事尚未发布，可以维护资料；赛事发布后开放问答。</p>
            : <AssistantChat key={competition.id} competitionId={competition.id} />}
        </section>
      </AssistantWorkspace> : <p className="text-sm text-slate-500">目前没有可咨询的赛事。</p>}
    </div>
  );
}
