import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
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
        // 将默认 Tailwind 荧光蓝重映射为沉稳克制的学院普鲁士蓝，消除全站「模板蓝」廉价感
        blue: {
          50: "#f1f5fa",
          100: "#e2eaf4",
          200: "#c6d6ea",
          300: "#9bb5d7",
          400: "#6387ba",
          500: "#2e5996",
          600: "#1e4278",
          700: "#163360",
          800: "#11274a",
          900: "#0c1c36",
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
