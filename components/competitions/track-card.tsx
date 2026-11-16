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
  /** 渐变起止色 */
  from: string;
  to: string;
  /** 左上角英文标记，只标序号不标含义，避免编造官方口径 */
  eyebrow: string;
  art: "growth" | "chart" | "network";
};

const SCHEMES: Scheme[] = [
  { from: "#1a73e8", to: "#0b47b8", eyebrow: "TRACK 01", art: "growth" },
  { from: "#0e8a75", to: "#04604f", eyebrow: "TRACK 02", art: "chart" },
  { from: "#c2580f", to: "#8a3c08", eyebrow: "TRACK 03", art: "network" },
  { from: "#8c2b4d", to: "#5e1a33", eyebrow: "TRACK 04", art: "growth" },
];

/** 成长型：上升折线 + 旗子 + 山形，对应「一路往上走」 */
function GrowthArt() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 h-full w-[64%]"
      preserveAspectRatio="xMaxYMid slice"
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
      preserveAspectRatio="xMaxYMid slice"
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
      preserveAspectRatio="xMaxYMid slice"
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

  return (
    <div
      className="on-dark relative isolate overflow-hidden rounded-2xl p-6 text-white"
      style={{ backgroundImage: `linear-gradient(135deg, ${scheme.from}, ${scheme.to})` }}
    >
      <Art />

      {/* 文字遮罩：插画里的白线和白柱不透明度到 0.95，文字压上去会糊在一起。
          这层从左侧底色渐变到透明，保证文字区始终是纯色，插画只在右侧露出。
          用 scheme.from 起笔是因为卡片渐变从左上起，左侧本就是 from 色。 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: `linear-gradient(95deg, ${scheme.from} 22%, ${scheme.from}00 62%)` }}
      />

      <div className="relative flex h-full min-h-[168px] flex-col">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">{scheme.eyebrow}</p>
        <h3 className="mt-2.5 max-w-[72%] text-xl font-bold leading-snug">{name}</h3>
        <p className="mt-1.5 max-w-[70%] text-sm leading-6 text-white/80">{detail}</p>

        {subTracks?.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {subTracks.slice(0, 3).map((child) => (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] text-white/90" key={child}>
                {child}
              </span>
            ))}
            {subTracks.length > 3 ? (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
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
