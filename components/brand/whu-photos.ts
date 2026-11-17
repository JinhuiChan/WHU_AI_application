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
  /** 主标题颜色（源自武大校园建筑三正色：珞珈蓝 / 孔雀绿 / 斋舍绛朱） */
  titleInk: string;
  /** 统一采用稳重展示宋体，通过颜色区分层级 */
  titleFontClass: string;
  /** 次级强调字颜色 */
  accentInk: string;
  /** 实景建筑背景图 */
  photo: StaticImageData;
  /** 图片alt与署名角注 */
  photoCaption: string;
  /** 详情页横幅遮罩渐变 */
  overlay: string;
};

/**
 * 按赛事等级区分的「武大建筑实景 + 校园正色」视觉方案：
 * - 国赛：清透蓝底 + 珞珈蓝 #002554 + 老图书馆全景
 * - 省赛：清透青绿 + 孔雀绿 #115740 + 国立武汉大学牌坊
 * - 校赛：清透茜粉 + 老斋舍绛朱 #8a2c36 + 樱顶与樱花大道
 */
export function levelCardTheme(level?: string | null): CardThemeSpec {
  switch (level) {
    case "NATIONAL":
      return {
        surface: "#edf4fc",
        border: "#c5daf4",
        hoverBorder: "#7aa6df",
        titleInk: "#002554",
        titleFontClass: "font-display font-bold tracking-tight text-[21px]",
        accentInk: "#002554",
        photo: WHU_PHOTOS.oldLibrary.src,
        photoCaption: WHU_PHOTOS.oldLibrary.caption,
        overlay:
          "linear-gradient(104deg, rgba(237,244,252,0.97) 0%, rgba(237,244,252,0.93) 48%, rgba(237,244,252,0.72) 78%, rgba(237,244,252,0.56) 100%)",
      };
    case "PROVINCE":
      return {
        surface: "#eaf5ef",
        border: "#bfe0cd",
        hoverBorder: "#6db38f",
        titleInk: "#115740",
        titleFontClass: "font-display font-bold tracking-tight text-[21px]",
        accentInk: "#115740",
        photo: WHU_PHOTOS.gate.src,
        photoCaption: WHU_PHOTOS.gate.caption,
        overlay:
          "linear-gradient(104deg, rgba(234,245,239,0.97) 0%, rgba(234,245,239,0.93) 48%, rgba(234,245,239,0.72) 78%, rgba(234,245,239,0.58) 100%)",
      };
    case "SCHOOL":
      return {
        surface: "#fcf1f2",
        border: "#ecc9cd",
        hoverBorder: "#cf8e96",
        titleInk: "#8a2c36",
        titleFontClass: "font-display font-bold tracking-tight text-[21px]",
        accentInk: "#8a2c36",
        photo: WHU_PHOTOS.cherryCampus.src,
        photoCaption: WHU_PHOTOS.cherryCampus.caption,
        overlay:
          "linear-gradient(104deg, rgba(252,241,242,0.97) 0%, rgba(252,241,242,0.93) 48%, rgba(252,241,242,0.74) 78%, rgba(252,241,242,0.58) 100%)",
      };
    default:
      return {
        surface: "#f4f7f5",
        border: "#d5e2db",
        hoverBorder: "#96aea2",
        titleInk: "#115740",
        titleFontClass: "font-display font-bold tracking-tight text-[21px]",
        accentInk: "#115740",
        photo: WHU_PHOTOS.arch.src,
        photoCaption: WHU_PHOTOS.arch.caption,
        overlay:
          "linear-gradient(104deg, rgba(244,247,245,0.97) 0%, rgba(244,247,245,0.93) 48%, rgba(244,247,245,0.74) 78%, rgba(244,247,245,0.6) 100%)",
      };
  }
}

/** 分组表格/赛道区块用的多色块柔和配色（参考分类色块表：珞珈蓝/暖金/孔雀绿/绛朱） */
export const TRACK_BLOCK_TONES = [
  { bg: "#eef4fc", softBg: "#f6f9fe", text: "#002554", strong: "#002554", border: "#c5daf4" },
  { bg: "#fdf2e6", softBg: "#fef8f1", text: "#b45309", strong: "#92400e", border: "#f0d9b8" },
  { bg: "#ebf6f2", softBg: "#f4fbf8", text: "#115740", strong: "#115740", border: "#bfe0cd" },
  { bg: "#fcf1f2", softBg: "#fef7f8", text: "#8a2c36", strong: "#8a2c36", border: "#ecc9cd" },
] as const;
