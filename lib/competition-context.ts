import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AssistantSource } from "@/types/assistant";

export async function publishedCompetitionContext() {
  return prisma.competition.findMany({
    where: { publishStatus: "PUBLISHED" },
    include: { timeWindows: { orderBy: { stage: "asc" } }, tracks: { where: { enabled: true }, include: { dictOptions: { where: { enabled: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } } },
    orderBy: [{ year: "desc" }, { name: "asc" }],
  });
}
export type CompetitionContext = Prisma.PromiseReturnType<typeof publishedCompetitionContext>[number];
export const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, "");
export function competitionYears(question: string) {
  const years = new Set<number>();
  for (const match of question.matchAll(/20\d{2}(?:\s*[年届])?/g)) {
    const before = question.slice(Math.max(0, match.index! - 8), match.index);
    const after = question.slice(match.index! + match[0].length).trim();
    if (/出生|毕业|入学|注册|成立/.test(after.split(/[，,。？?]/)[0].slice(0, 14)) || /出生于|毕业于|注册于|成立于|生于/.test(before)) continue;
    if (/届$/.test(match[0]) || /^(?:的)?(?:报名|参赛|大赛|比赛|赛事|通知|赛程|选拔|国创|提交|截止|规则|要求|材料|费用|主办)/.test(after)
      || /^(?:和|与|、|及)/.test(after) || /(?:赛年|年份|届次|大赛|比赛|赛事|国创赛)[（(\s]*$/.test(before)) years.add(Number(match[0].slice(0, 4)));
  }
  if (!years.size) {
    const currentYear = Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Shanghai", year: "numeric" }).format(new Date()));
    if (/今年|本年度/.test(question)) years.add(currentYear);
    else if (/去年|上年度/.test(question)) years.add(currentYear - 1);
    else if (/明年|下一年度/.test(question)) years.add(currentYear + 1);
  }
  return [...years];
}
export function namedCompetition(question: string, competition: CompetitionContext) {
  const aliases = [competition.name, competition.seriesId];
  if (competition.seriesId === "china-innovation" || competition.name.includes("中国国际大学生创新大赛")) aliases.push("国创赛", "国创", "创新大赛", "互联网+");
  if (competition.name.includes("挑战杯")) aliases.push("挑战杯");
  if (competition.name.includes("百珈争创")) aliases.push("百珈争创");
  return aliases.some((alias) => normalize(alias).length >= 2 && normalize(question).includes(normalize(alias)));
}
export function activeTracks(competition: CompetitionContext) {
  return competition.tracks.filter((track) => {
    let parent = track.parentId;
    const seen = new Set<string>([track.id]);
    while (parent) {
      if (seen.has(parent)) return false;
      seen.add(parent);
      const ancestor = competition.tracks.find((item) => item.id === parent);
      if (!ancestor) return false;
      parent = ancestor.parentId;
    }
    return true;
  });
}
const stages: Record<string, string> = { SCHOOL: "校赛", PROVINCE: "省赛", NATIONAL: "国赛" };
const formatter = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short", hourCycle: "h23" });
export function windowStatus(window: CompetitionContext["timeWindows"][number] | undefined, now = new Date()) {
  return !window ? "未配置报名窗口" : !window.enabled ? "报名未开放" : now < window.startAt ? "报名尚未开始" : now > window.endAt ? "报名已截止" : "报名开放中";
}
export function stageFor(question: string) { return /省赛/.test(question) ? "PROVINCE" : /国赛|全国赛/.test(question) ? "NATIONAL" : "SCHOOL"; }
export function configurationSource(competition: CompetitionContext, id: number): AssistantSource {
  const tracks = activeTracks(competition);
  const lines = [
    `${competition.year}年${competition.name}。`,
    `主办方：${competition.organizer || "未配置"}。`,
    `赛事简介：${competition.description || "未配置"}。`,
    ...["SCHOOL", "PROVINCE", "NATIONAL"].map((stage) => {
      const window = competition.timeWindows.find((item) => item.stage === stage);
      return `${stages[stage]}报名：${window ? `开始 ${formatter.format(window.startAt)}，截止 ${formatter.format(window.endAt)}，开放开关${window.enabled ? "开启" : "关闭"}，` : ""}${windowStatus(window)}（北京时间）。`;
    }),
    `已启用赛道及组别：${tracks.map((track) => `${track.name}${track.dictOptions.length ? `（${track.dictOptions.map((option) => option.label).join("、")}）` : ""}`).join("；") || "未配置"}。`,
    "平台报名窗口用于判断系统是否开放提交；组队资格、必交材料等细则以通知原文为依据。",
  ];
  const quote = lines.join("\n");
  return { id, chunkId: `configuration:${competition.id}`, documentId: `configuration:${competition.id}`, fileName: "平台赛事配置",
    title: competition.name, section: "赛事信息、报名设置和赛道配置", page: null, year: competition.year, quote,
    fileUrl: `/competitions/${competition.id}`, competitionId: competition.id, competitionName: competition.name, kind: "configuration",
    snapshot: createHash("sha256").update(quote).digest("hex") };
}
