import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/**
 * 赛道卡：深色渐变底 + 右侧 SVG 插画。
 *
 * 为什么单独做一套而不是复用 .card：
 * 全站 .card 是白底细线，靠边界区分区域；赛道卡要的是「一眼看出这是哪个赛道」，
 * 靠的是颜色编码 —— 成长蓝、就业绿、产业橙、专项酒红。它属于「强调块」，
 * 不是「内容容器」，两套语言不能混。
 *
 * 插画用内联 SVG 而不是图片：颜色全部是白色 + 透明度，
 * 换底色不需要重画，也不会多一次图片请求。
 */

type Scheme = {
  /** 纯色底色（与赛事卡语言拉齐：珞珈蓝 / 孔雀绿 / 斋舍绛朱 / 深青黛） */
  bg: string;
  art: "growth" | "chart" | "network";
};

const SCHEMES: Scheme[] = [
  { bg: "#002554", art: "growth" },
  { bg: "#115740", art: "chart" },
  { bg: "#8a2c36", art: "network" },
  { bg: "#17484f", art: "growth" },
];

/** 成长型：上升折线 + 旗子 + 山形，对应「一路往上走」 */
function GrowthArt() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 h-full w-[64%]"
      preserveAspectRatio="xMaxYMid meet"
      viewBox="0 0 260 180"
    >
      <circle cx="212" cy="38" fill="#fff" opacity="0.07" r="98" />
      <circle cx="212" cy="38" fill="#fff" opacity="0.09" r="56" />
      <polygon fill="#fff" opacity="0.11" points="118,180 198,70 262,180" />
      <polygon fill="#fff" opacity="0.15" points="176,180 232,102 262,180" />
      <polyline
        fill="none"
        opacity="0.85"
        points="64,152 106,120 148,134 186,96 214,70"
        stroke="#fff"
        strokeDasharray="6 6"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <circle cx="64" cy="152" fill="#fff" opacity="0.85" r="4" />
      <circle cx="148" cy="134" fill="#fff" opacity="0.85" r="4" />
      <circle cx="186" cy="96" fill="#fff" r="4.5" />
      <line opacity="0.95" stroke="#fff" strokeWidth="2.5" x1="186" x2="186" y1="96" y2="56" />
      <polygon fill="#fff" opacity="0.95" points="186,56 217,67 186,78" />
      <path d="M216 70 L238 46" opacity="0.75" stroke="#fff" strokeWidth="2" />
      <path
        d="M227 42 L240 40 L240 53"
        fill="none"
        opacity="0.75"
        stroke="#fff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

/** 就业型：柱状图 + 上升基线，对应「能力落地」 */
function ChartArt() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 h-full w-[64%]"
      preserveAspectRatio="xMaxYMid meet"
      viewBox="0 0 260 180"
    >
      <circle cx="206" cy="34" fill="#fff" opacity="0.07" r="94" />
      <circle cx="206" cy="34" fill="#fff" opacity="0.09" r="52" />
      <rect fill="#fff" opacity="0.1" height="46" rx="4" width="26" x="96" y="122" />
      <rect fill="#fff" opacity="0.16" height="74" rx="4" width="26" x="134" y="94" />
      <rect fill="#fff" opacity="0.24" height="104" rx="4" width="26" x="172" y="64" />
      <line opacity="0.5" stroke="#fff" strokeWidth="1.5" x1="86" x2="242" y1="168" y2="168" />
      <polyline fill="none" opacity="0.8" points="96,116 147,86 196,54 226,38" stroke="#fff" strokeLinecap="round" strokeWidth="2" />
      <circle cx="226" cy="38" fill="#fff" r="4.5" />
    </svg>
  );
}

/** 产业型：节点连线，对应「企业命题 / 多方协作」 */
function NetworkArt() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 h-full w-[64%]"
      preserveAspectRatio="xMaxYMid meet"
      viewBox="0 0 260 180"
    >
      <circle cx="208" cy="36" fill="#fff" opacity="0.07" r="94" />
      <circle cx="208" cy="36" fill="#fff" opacity="0.09" r="52" />
      <g opacity="0.45" stroke="#fff" strokeWidth="1.5">
        <line x1="104" x2="160" y1="128" y2="84" />
        <line x1="160" x2="212" y1="84" y2="112" />
        <line x1="160" x2="190" y1="84" y2="44" />
        <line x1="104" x2="138" y1="128" y2="152" />
      </g>
      <g fill="#fff">
        <circle cx="160" cy="84" opacity="0.95" r="6" />
        <circle cx="104" cy="128" opacity="0.7" r="4.5" />
        <circle cx="212" cy="112" opacity="0.7" r="4.5" />
        <circle cx="190" cy="44" opacity="0.7" r="4.5" />
        <circle cx="138" cy="152" opacity="0.55" r="4" />
      </g>
    </svg>
  );
}

const ART = { growth: GrowthArt, chart: ChartArt, network: NetworkArt };

type TrackCardProps = {
  name: string;
  /** 组别或类别的可读文案，没配就显示兜底句 */
  detail: string;
  /** 该赛道下的子赛道（如创意组、创业组），最多显示三个 */
  subTracks?: string[];
  /** 报名入口，指向赛事详情 */
  href: string;
  index: number;
};

export function TrackCard({ name, detail, subTracks, href, index }: TrackCardProps) {
  const scheme = SCHEMES[index % SCHEMES.length];
  const Art = ART[scheme.art];

  const trackLabel = `赛道 ${String(index + 1).padStart(2, "0")}`;

  return (
    <div
      className="on-dark relative isolate overflow-hidden rounded-2xl p-6 text-white ring-1 ring-inset ring-white/10"
      style={{ backgroundColor: scheme.bg }}
    >
      <Art />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: `linear-gradient(95deg, ${scheme.bg} 24%, ${scheme.bg}00 64%)` }}
      />

      <div className="relative flex h-full min-h-[168px] flex-col">
        <span className="inline-flex w-fit rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-white/95 tabular-nums">
          {trackLabel}
        </span>
        <h3 className="mt-2.5 max-w-[74%] font-display text-lg font-bold leading-snug">{name}</h3>
        <p className="mt-1.5 max-w-[72%] text-sm leading-6 text-white/80">{detail}</p>

        {subTracks?.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {subTracks.slice(0, 3).map((child) => (
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs text-white/90" key={child}>
                {child}
              </span>
            ))}
            {subTracks.length > 3 ? (
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/75">
                +{subTracks.length - 3}
              </span>
            ) : null}
          </div>
        ) : null}

        <Link
          className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-medium text-white/90 transition hover:text-white"
          href={href}
        >
          去报名
          <ArrowUpRight aria-hidden="true" size={15} />
        </Link>
      </div>
    </div>
  );
}
