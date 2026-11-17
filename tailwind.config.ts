import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "PingFang SC", "HarmonyOS Sans SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", "sans-serif"],
        display: ["var(--font-serif-display)", "Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", "serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        whu: {
          blue: "#002554",
          green: "#115740",
          stone: "#f7f5f0",
          hairline: "#e5e0d5",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: {
          DEFAULT: "var(--surface)",
          subtle: "var(--surface-subtle)",
          muted: "var(--surface-muted)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--ink-muted)",
          subtle: "var(--ink-subtle)",
          faint: "var(--ink-faint)",
        },
        brand: {
          DEFAULT: "var(--brand)",
          strong: "var(--brand-strong)",
          soft: "var(--brand-soft)",
        },
        line: "var(--border)",
        // 将主蓝色系锚定为武汉大学官方 VI「珞珈蓝 #002554」（RGB 0, 37, 84）
        blue: {
          50: "#eef3f8",
          100: "#dae5f1",
          200: "#b8cbe3",
          300: "#89a8ce",
          400: "#4c75a8",
          500: "#174278",
          600: "#002554",
          700: "#001c42",
          800: "#001430",
          900: "#000c1f",
        },
        slate: {
          400: "#637083",
          500: "#4c5868",
          600: "#374151",
          700: "#26303d",
        },
      },
      // 只覆盖「边框」里的 slate-300，不动 colors 里的同名值。
      // 原因：121 处 border-slate-300 是输入框、下拉、次按钮的边界，
      // 对白卡只有约 1.5:1，过不了 WCAG 1.4.11 要求的 3:1；
      // 而 text-slate-300 那几处是「·」分隔符、箭头图标与禁用分页文字，
      // 它们变深反而变脏（禁用态本身不受对比度约束）。
      // borderColor 默认为 colors 的浅拷贝，extend 会深合并进 borderColor.slate，
      // 所以 border-slate-300 取新值、text-slate-300 仍取原值 #cbd5e1。
      // #8b96a8 对白 3.02:1、对卡内浅块 #f8fafc 2.92:1，取两者折中的观察值。
      borderColor: {
        slate: {
          300: "#8b96a8",
        },
      },
      borderRadius: {
        card: "var(--radius-card)",
        control: "var(--radius-control)",
      },
    },
  },
  plugins: [],
};
export default config;
