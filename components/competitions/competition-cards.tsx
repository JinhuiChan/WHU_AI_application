import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { detailHref } from "@/components/data/list-link";
import type { CompetitionListItem } from "@/types/competition";
import { competitionLevelLabels, formatDateTime, publishStatusLabels, registrationStatusLabels } from "@/lib/presentation";

/**
 * 赛事强调卡：入口页顶部的彩色卡，用颜色和插画快速区分「是哪一个赛事」。
 *
 * 和赛道卡（track-card）的区别：
 *   赛道卡按赛道序号轮转配色，插画是通用形状（折线、柱状、节点）；
 *   赛事卡按赛事**等级**定色（国赛蓝 / 省赛绿 / 校赛橙），插画按 seriesId 对上赛事本体 ——
 *   国创赛（原互联网+）画笔记本电脑、挑战杯画奖杯、百珈争创画珞珈山争顶。
 *   对不上的赛事走通用「印信」插画，不硬套。
 *
 * 颜色在这里承担的是「同一个赛事永远是同一种颜色」的识别功能，
 * 不表示状态好坏；状态一律用胶囊文字表达，不靠色相。
 */

type Scheme = {
  from: string;
  to: string;
  /** 等级英文标记，与参考版式一致（COLLEGE ROUND / NATIONAL ROUND） */
  eyebrow: string;
  art: ArtKind;
};

type ArtKind = "device" | "cup" | "summit" | "seal";

const SCHEMES: Record<string, Scheme> = {
  NATIONAL: { from: "#1a73e8", to: "#0b47b8", eyebrow: "NATIONAL ROUND", art: "device" },
  PROVINCE: { from: "#0e8a75", to: "#04604f", eyebrow: "PROVINCIAL ROUND", art: "cup" },
  SCHOOL: { from: "#c2580f", to: "#8a3c08", eyebrow: "COLLEGE ROUND", art: "summit" },
  FALLBACK: { from: "#8c2b4d", to: "#5e1a33", eyebrow: "COMPETITION", art: "seal" },
};

/** seriesId → 插画，认不出来就用兜底 */
const SERIES_ART: Record<string, ArtKind> = {
  "china-innovation": "device",
  "challenge-cup": "cup",
  "baijia-striving": "summit",
};

/* 插画整体驻留在右上 3/4 区域：卡片右下角要放圆形箭头，
   插画一旦触底就会和箭头挤在一起（挑战杯的底座尤其明显）。
   用 g transform 上移，而不是改 viewBox —— 改 viewBox 会把图形一起缩小。 */
const svgClass = "pointer-events-none absolute inset-y-0 right-0 h-full w-[68%]";

/** 国创赛（原「互联网+」）：画一台笔记本电脑，屏幕里一条上升折线。
    赛事本体就是「互联网 + 各行业」，电脑比抽象图形更好认。 */
function DeviceArt() {
  return (
    <svg aria-hidden="true" className={svgClass} preserveAspectRatio="xMaxYMid meet" viewBox="0 0 260 180">
      <g transform="translate(0,-22)">
        <circle cx="214" cy="40" fill="#fff" opacity="0.07" r="96" />
        <circle cx="214" cy="40" fill="#fff" opacity="0.09" r="54" />

        {/* 机身：屏幕 + 折角底座 */}
        <rect fill="#fff" height="64" opacity="0.92" rx="6" width="98" x="150" y="46" />
        <rect fill="#1a73e8" height="52" opacity="0.22" rx="3" width="86" x="156" y="52" />
        <path d="M144 112 L254 112 L250 122 L148 122 Z" fill="#fff" opacity="0.92" />
        <rect fill="#1a73e8" height="3" opacity="0.25" rx="1.5" width="34" x="182" y="115" />

        {/* 屏幕内的上升折线 + 终点 */}
        <polyline
          fill="none"
          opacity="0.95"
          points="166,94 184,80 198,88 214,70 228,60"
          stroke="#fff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.6"
        />
        <circle cx="228" cy="60" fill="#fff" r="3.6" />
      </g>
    </svg>
  );
}

/** 挑战杯：「杯」就是奖杯 —— 杯身、双耳、底座、一颗顶星 */
function CupArt() {
  return (
    <svg aria-hidden="true" className={svgClass} preserveAspectRatio="xMaxYMid meet" viewBox="0 0 260 180">
      <g transform="translate(0,-22)">
      <circle cx="210" cy="38" fill="#fff" opacity="0.07" r="96" />
      <circle cx="210" cy="38" fill="#fff" opacity="0.09" r="54" />
      {/* 杯身 */}
      <path d="M168 62 L228 62 L222 96 A30 26 0 0 1 174 96 Z" fill="#fff" opacity="0.9" />
      {/* 双耳 */}
      <path d="M168 68 L156 68 A12 14 0 0 0 168 92" fill="none" opacity="0.65" stroke="#fff" strokeWidth="2.4" />
      <path d="M228 68 L240 68 A12 14 0 0 1 228 92" fill="none" opacity="0.65" stroke="#fff" strokeWidth="2.4" />
      {/* 杯柄与底座 */}
      <rect fill="#fff" height="18" opacity="0.9" width="7" x="194.5" y="118" />
      <rect fill="#fff" height="8" opacity="0.9" rx="3" width="34" x="181" y="136" />
      {/* 顶星 */}
      <path d="M198 34 L201.6 43.4 L211 47 L201.6 50.6 L198 60 L194.4 50.6 L185 47 L194.4 43.4 Z" fill="#fff" opacity="0.95" />
      </g>
    </svg>
  );
}

/** 百珈争创：「珈」指珞珈山 —— 双峰、登山虚线、峰顶一颗星 */
function SummitArt() {
  return (
    <svg aria-hidden="true" className={svgClass} preserveAspectRatio="xMaxYMid meet" viewBox="0 0 260 180">
      <g transform="translate(0,-22)">
      <circle cx="206" cy="36" fill="#fff" opacity="0.07" r="94" />
      <circle cx="206" cy="36" fill="#fff" opacity="0.09" r="52" />
      <polygon fill="#fff" opacity="0.1" points="112,180 186,74 252,180" />
      <polygon fill="#fff" opacity="0.16" points="170,180 220,104 260,180" />
      <polyline
        fill="none"
        opacity="0.85"
        points="86,158 126,132 158,140 186,104 206,84"
        stroke="#fff"
        strokeDasharray="6 6"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <circle cx="126" cy="132" fill="#fff" opacity="0.7" r="3.6" />
      <circle cx="158" cy="140" fill="#fff" opacity="0.7" r="3.6" />
      <circle cx="206" cy="84" fill="#fff" r="4.4" />
      <path d="M206 78 L208.6 72 L211.2 78 L217 78 L212.4 81.6 L214.2 87 L209 83.6 L203.8 87 L205.6 81.6 L201 78 Z" fill="#fff" opacity="0.95" />
      </g>
    </svg>
  );
}

/** 兜底：一枚印信 —— 方形边框加内里折角，不指代任何具体赛事 */
function SealArt() {
  return (
    <svg aria-hidden="true" className={svgClass} preserveAspectRatio="xMaxYMid meet" viewBox="0 0 260 180">
      <g transform="translate(0,-22)">
      <circle cx="208" cy="38" fill="#fff" opacity="0.07" r="94" />
      <rect fill="none" height="86" opacity="0.55" rx="10" stroke="#fff" strokeWidth="2.2" width="86" x="150" y="52" />
      <path d="M172 112 L172 90 L192 90 L192 78" fill="none" opacity="0.8" stroke="#fff" strokeLinecap="round" strokeWidth="2.2" />
      <rect fill="#fff" height="34" opacity="0.16" rx="6" width="34" x="186" y="104" />
      </g>
    </svg>
  );
}

const ART = { device: DeviceArt, cup: CupArt, summit: SummitArt, seal: SealArt };

function schemeFor(item: CompetitionListItem): Scheme {
  const base = SCHEMES[item.level] ?? SCHEMES.FALLBACK;
  const art = SERIES_ART[item.seriesId];
  return art ? { ...base, art } : base;
}

type CompetitionCardsProps = {
  items: CompetitionListItem[];
  isStudent: boolean;
  /** 详情页的返回目标，带当前筛选与页码 */
  from: string;
};

export function CompetitionCards({ items, isStudent, from }: CompetitionCardsProps) {
  // 只取前三场：这一排是「一眼认出是哪场比赛」的入口提示，
  // 完整名单在下方表格里，超过三张就变成第二份列表，反而没人看。
  const featured = items.slice(0, 3);
  if (!featured.length) return null;

  return (
    <div className={`grid gap-4 md:grid-cols-2 ${featured.length >= 3 ? "xl:grid-cols-3" : ""}`}>
      {featured.map((item) => {
        const scheme = schemeFor(item);
        const Art = ART[scheme.art];
        const registration = item.registration;
        const status = isStudent
          ? registration?.projectStatus
            ? registrationStatusLabels[registration.projectStatus]
            : registration?.windowOpen
              ? "可报名"
              : "未报名"
          : publishStatusLabels[item.publishStatus];
        const statusTone = isStudent
          ? registration?.projectStatus
            ? "bg-white/20 text-white"
            : registration?.windowOpen
              ? "bg-white/95 text-slate-900"
              : "bg-white/15 text-white/80"
          : item.publishStatus === "PUBLISHED"
            ? "bg-white/95 text-slate-900"
            : "bg-white/15 text-white/80";
        const deadline = registration?.windowEndAt ? `截止 ${formatDateTime(registration.windowEndAt)}` : "未设置报名窗口";

        return (
          <Link
            aria-label={`${item.name}，查看详情`}
            className="on-dark group relative isolate flex flex-col overflow-hidden rounded-2xl p-6 text-white transition duration-[160ms] ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 motion-reduce:hover:translate-y-0"
            href={detailHref("/competitions", item.id, from)}
            key={item.id}
            style={{ backgroundImage: `linear-gradient(135deg, ${scheme.from}, ${scheme.to})` }}
          >
            <Art />

            {/* 文字遮罩：插画里的白线不透明度到 0.95，字压上去会糊成一片。
                这层从左上底色渐变到透明，保证文字区是纯色，插画只在右侧露出。 */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ backgroundImage: `linear-gradient(100deg, ${scheme.from} 26%, ${scheme.from}00 64%)` }}
            />

            <div className="relative flex h-full min-h-[170px] flex-col">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/65">{scheme.eyebrow}</p>
              <h3 className="mt-2.5 max-w-[74%] text-xl font-bold leading-snug">{item.name}</h3>
              <p className="mt-1.5 max-w-[72%] text-[13px] leading-6 text-white/75">
                {item.year} 年 · {competitionLevelLabels[item.level]} · {item.organizer ?? "主办方待补充"}
              </p>

              <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                <div className="min-w-0">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone}`}>{status}</span>
                  <p className="mt-2 truncate text-[11px] text-white/70">{deadline}</p>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white/25">
                  <ArrowUpRight aria-hidden="true" size={16} />
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
