import type { StaticImageData } from "next/image";
import whuArch from "../../public/images/whu/whu-arch.webp";
import whuCherryCampus from "../../public/images/whu/whu-cherry-campus.webp";
import whuGate from "../../public/images/whu/whu-gate.webp";
import whuOldLibrary from "../../public/images/whu/whu-old-library.webp";

/**
 * 武汉大学校园实景地标摄影图库（静态 import，绕过 middleware 对 /images/ 的拦截）。
 * 图片均源自 Wikimedia Commons（CC BY-SA 2.5 / 3.0 开源授权）。
 */
export const WHU_PHOTOS = {
  oldLibrary: {
    src: whuOldLibrary,
    alt: "武汉大学老图书馆",
    caption: "老图书馆 · 樱顶最高处地标",
  },
  gate: {
    src: whuGate,
    alt: "国立武汉大学校门牌坊",
    caption: "国立武汉大学牌坊",
  },
  cherryCampus: {
    src: whuCherryCampus,
    alt: "武汉大学樱顶与老斋舍飞檐",
    caption: "樱顶飞檐与樱花大道",
  },
  arch: {
    src: whuArch,
    alt: "武汉大学老斋舍拱门",
    caption: "老斋舍拱门与红窗",
  },
} as const satisfies Record<string, { src: StaticImageData; alt: string; caption: string }>;

export type CardThemeSpec = {
  /** 卡片底色块 */
  surface: string;
  /** 边框色 */
  border: string;
  /** 悬停边框色 */
  hoverBorder: string;
  /** 主标题颜色（高明度宝石色系，一眼拉开类型差异，不接近纯黑） */
  titleInk: string;
  /** 匹配赛事性格的展示字体类名（宋体 / 粗黑体 / 华文楷体） */
  titleFontClass: string;
  /** 眉题/次级强调字颜色 */
  accentInk: string;
  /** 实景建筑背景图 */
  photo: StaticImageData;
  /** 遮罩渐变（从左实色底平滑淡出，让右侧隐约露出校园建筑轮廓） */
  overlay: string;
};

/**
 * 按赛事等级区分的「背景色块 + 字体气质与色彩 + 武大建筑底图」完整视觉方案：
 * - 国赛：清透浅蓝块 + 皇家钴蓝粗思源宋体 + 老图书馆全景
 * - 省赛：清透翡翠浅绿 + 翡翠琉璃绿特粗思源黑体 + 国立武汉大学牌坊
 * - 校赛：清透丁香浅紫 + 华贵绛紫华文楷体 + 樱顶与樱花大道
 */
export function levelCardTheme(level?: string | null): CardThemeSpec {
  switch (level) {
    case "NATIONAL":
      return {
        surface: "#edf4fc",
        border: "#c7dcf5",
        hoverBorder: "#5c92db",
        titleInk: "#134eb8",
        titleFontClass: "font-display font-bold tracking-tight text-[22px]",
        accentInk: "#1d5fd1",
        photo: WHU_PHOTOS.oldLibrary.src,
        overlay:
          "linear-gradient(104deg, rgba(237,244,252,0.97) 0%, rgba(237,244,252,0.93) 48%, rgba(237,244,252,0.72) 78%, rgba(237,244,252,0.56) 100%)",
      };
    case "PROVINCE":
      return {
        surface: "#e9f6f1",
        border: "#bfe3d6",
        hoverBorder: "#44a083",
        titleInk: "#0a7456",
        titleFontClass: "font-editorial font-bold tracking-tight text-[22px]",
        accentInk: "#0e8563",
        photo: WHU_PHOTOS.gate.src,
        overlay:
          "linear-gradient(104deg, rgba(233,246,241,0.97) 0%, rgba(233,246,241,0.93) 48%, rgba(233,246,241,0.72) 78%, rgba(233,246,241,0.58) 100%)",
      };
    case "SCHOOL":
      return {
        surface: "#f4edfc",
        border: "#d9c6f5",
        hoverBorder: "#9670df",
        titleInk: "#6d28d9",
        titleFontClass: "font-kaiti font-semibold tracking-wide text-[25px]",
        accentInk: "#7c3aed",
        photo: WHU_PHOTOS.cherryCampus.src,
        overlay:
          "linear-gradient(104deg, rgba(244,237,252,0.97) 0%, rgba(244,237,252,0.93) 48%, rgba(244,237,252,0.74) 78%, rgba(244,237,252,0.58) 100%)",
      };
    default:
      return {
        surface: "#f4f7f5",
        border: "#dde5e0",
        hoverBorder: "#96aea2",
        titleInk: "#115740",
        titleFontClass: "font-display font-bold tracking-tight text-[22px]",
        accentInk: "#115740",
        photo: WHU_PHOTOS.arch.src,
        overlay:
          "linear-gradient(104deg, rgba(244,247,245,0.97) 0%, rgba(244,247,245,0.93) 48%, rgba(244,247,245,0.74) 78%, rgba(244,247,245,0.6) 100%)",
      };
  }
}

/** 分组表格/赛道区块用的多色块柔和配色（参考分类色块表：蓝/暖橘/青绿/雅紫） */
export const TRACK_BLOCK_TONES = [
  { bg: "#eef4fc", softBg: "#f6f9fe", text: "#1d4ed8", strong: "#002554", border: "#d6e4f7" },
  { bg: "#fdf2e6", softBg: "#fef8f1", text: "#b45309", strong: "#92400e", border: "#f5dec4" },
  { bg: "#ebf6f2", softBg: "#f4fbf8", text: "#0f766e", strong: "#115740", border: "#cbe8dd" },
  { bg: "#f4effa", softBg: "#faf7fd", text: "#6d28d9", strong: "#4c3575", border: "#dfd2f2" },
] as const;
