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
        // 400/500/600/700 覆盖 Tailwind 默认值，只改亮度不动色相。
        // 原因：hallmark 审计（2026-11-16）实测默认值对页面底色 #f1f5f9 不达标 ——
        //   默认 400 #94a3b8 = 2.34:1（要求 4.5）
        //   默认 500 #64748b = 4.34:1（差 0.16，正好卡在 AA 线上）
        //   默认 600 #475569 = 6.92:1
        // 改后（三底 #fff / #f1f5f9 / #eef2f7 的最小值）：
        //   400 #606c80 = 4.72   500 #4a5665 = 6.65   600 #38424f = 9.07   700 #2a3441 = 11.2
        // 层间落差保持 1.9 / 2.4，和原来 2.0 / 2.6 基本一致，主次关系不变。
        // 只覆盖这四个键：50-300 是背景与边框，不受文字对比度约束；
        // 800-950 已经足够深，改它们没有收益。
        slate: {
          400: "#606c80",
          500: "#4a5665",
          600: "#38424f",
          700: "#2a3441",
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
