import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { competitionYears, namedCompetition, publishedCompetitionContext } from "@/lib/competition-context";
import type { AssistantResult } from "@/types/assistant";

export const TEAM_HANDOFF_ANSWER = "目前没有符合条件的在招队伍，可以到组队广场发布或查看。";
const TEAM_INTENT = /组队|队友|队伍|招募|缺人|找队友|加队/;
const TEAM_RULE_QUESTION = /通知|规程|规则|资格|参赛条件|组队要求|人数上限|团队人数/;
const ALL_COMPETITIONS = /(?:所有|全部|各(?:场|个)?)(?:已发布)?(?:赛事|比赛)|(?:哪些|有哪些|有什么)(?:已发布)?(?:赛事|比赛)/;
const MAX_TEAM_POSTS = 8;

export function isTeamRecruitmentQuestion(question: string) {
  return TEAM_INTENT.test(question) && !TEAM_RULE_QUESTION.test(question);
}

const recruitingPostSelect = {
  id: true,
  title: true,
  skills: true,
  memberLimit: true,
  currentCount: true,
  author: { select: { name: true, college: true } },
  competition: { select: { id: true, name: true, year: true } },
  track: { select: { name: true } },
} satisfies Prisma.TeamPostSelect;

type RecruitingPost = Prisma.TeamPostGetPayload<{ select: typeof recruitingPostSelect }>;

function teamHandoff(): AssistantResult {
  return { answer: TEAM_HANDOFF_ANSWER, evidence: null, handoff: true, sources: [], mode: "no_evidence" };
}

function shanghaiDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function displayText(value: string | null, fallback: string) {
  return (value || "").replace(/[\r\n/]+/g, " ").replace(/\s+/g, " ").trim() || fallback;
}

function postSummary(post: RecruitingPost) {
  const competition = post.competition ? `${post.competition.year}年${post.competition.name}` : "未指定赛事";
  const track = post.track?.name || "未指定赛道";
  const missing = Math.max(0, post.memberLimit - post.currentCount);
  const author = `${displayText(post.author.name, "未填写姓名")}+${displayText(post.author.college, "未填写学院")}`;
  const summary = `${displayText(post.title, "未命名队伍")} / ${displayText(competition, "未指定赛事")}·${displayText(track, "未指定赛道")} / 还缺${missing}人 / ${displayText(post.skills, "未填写技能标签")} / ${author}`;
  return summary.length > 80 ? `${summary.slice(0, 79)}…` : summary;
}

async function questionCompetitions(question: string, competitionId?: string) {
  const all = await publishedCompetitionContext();
  const years = competitionYears(question);
  const pool = years.length ? all.filter(({ year }) => years.includes(year)) : all;
  let named = pool.filter((competition) => namedCompetition(question, competition));
  const context = competitionId ? pool.find(({ id }) => id === competitionId) : undefined;
  if (competitionId && !context) return [];
  if (!years.length && context && named.some((item) => item.id === context.id)) {
    const sameYear = named.filter((item) => item.year === context.year);
    if (new Set(sameYear.map((item) => item.seriesId)).size === new Set(named.map((item) => item.seriesId)).size) named = sameYear;
  }
  const global = !/赛事|比赛/.test(question) || ALL_COMPETITIONS.test(question);
  const selected = named.length ? named : context ? [context] : global ? pool : [];
  const ambiguousYear = !years.length && named.some((item) => named.some((other) => item.id !== other.id && item.seriesId === other.seriesId));
  return ambiguousYear ? [] : selected;
}

function modelEndpoint() {
  const url = process.env.LLM_BASE_URL?.trim() || "https://api.deepseek.com";
  return `${url.replace(/\/$/, "")}${url.endsWith("/chat/completions") ? "" : "/chat/completions"}`;
}

async function relevantPosts(question: string, context: string, posts: RecruitingPost[]) {
  if (!process.env.LLM_API_KEY?.trim()) return posts;
  try {
    const response = await fetch(modelEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.LLM_API_KEY.trim()}` },
      body: JSON.stringify({
        model: process.env.LLM_MODEL?.trim() || "deepseek-flash",
        thinking: { type: "disabled" },
        temperature: 0,
        max_tokens: 200,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "你只负责按问题筛选在招队伍。上下文按行给出队伍摘要，postIds 与这些行按顺序一一对应。只返回与问题匹配的 postIds，不得生成或修改任何队伍、人数、姓名、技能、联系方式。列举类问题返回所有匹配项，没有匹配则返回空数组。输出 JSON：{\"postIds\":[\"已提供的ID\"]}。",
          },
          { role: "user", content: JSON.stringify({ question, context, postIds: posts.map(({ id }) => id) }) },
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error("MODEL_UNAVAILABLE");
    const body = await response.json();
    const choice = body?.choices?.[0];
    if (choice?.finish_reason !== "stop" || typeof choice.message?.content !== "string") throw new Error("INVALID_COMPLETION");
    const result: unknown = JSON.parse(choice.message.content);
    if (!result || typeof result !== "object" || !("postIds" in result) || !Array.isArray(result.postIds)) throw new Error("INVALID_RESPONSE");
    const allowed = new Set(posts.map(({ id }) => id));
    const selected = new Set(result.postIds.filter((id): id is string => typeof id === "string" && allowed.has(id)));
    return posts.filter(({ id }) => selected.has(id));
  } catch {
    return posts;
  }
}

export async function answerTeamRecruitmentQuestion(question: string, competitionId?: string): Promise<AssistantResult> {
  const competitions = await questionCompetitions(question, competitionId);
  if (!competitions.length) return teamHandoff();
  const now = new Date();
  const posts = await prisma.teamPost.findMany({
    where: {
      status: "RECRUITING",
      expiresAt: { gt: now },
      removedBy: null,
      competitionId: { in: competitions.map(({ id }) => id) },
    },
    select: recruitingPostSelect,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: MAX_TEAM_POSTS + 1,
  });
  if (!posts.length) return teamHandoff();
  const hasMore = posts.length > MAX_TEAM_POSTS;
  const visible = posts.slice(0, MAX_TEAM_POSTS);
  const summaries = visible.map(postSummary);
  const date = shanghaiDate(now);
  const context = [`数据时间：截至 ${date}`, ...summaries.map((summary, index) => `${index + 1}. ${summary}`), ...(hasMore ? ["另有更多，请到组队广场查看"] : [])].join("\n");
  const selected = await relevantPosts(question, context, visible);
  if (!selected.length) return teamHandoff();
  const selectedSummaries = selected.map((post) => summaries[visible.indexOf(post)]);
  const answer = [
    `截至 ${date}，当前有以下在招队伍：`,
    ...selectedSummaries.map((summary, index) => `${index + 1}. ${summary}`),
    ...(hasMore ? ["另有更多，请到组队广场查看。"] : []),
    "以组队广场实时信息为准，请前往[组队广场](/teams)发布或查看。",
  ].join("\n");
  return { answer, evidence: null, handoff: false, sources: [], mode: "generated" };
}
