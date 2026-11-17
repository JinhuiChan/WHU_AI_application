import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const notoSerifDisplay = localFont({
  src: "./fonts/NotoSerifSC-Subset.woff2",
  variable: "--font-serif-display",
  weight: "200 900",
});
const notoSansCN = localFont({
  src: "./fonts/NotoSansSC-Subset.woff2",
  variable: "--font-sans-cn",
  weight: "100 900",
});
const stKaiti = localFont({
  src: "./fonts/STKaiti-Subset.woff2",
  variable: "--font-kaiti-cn",
  weight: "400 700",
});

export const metadata: Metadata = {
  title: {
    default: "高校科创赛事综合管理服务平台",
    template: "%s | 科创赛事平台",
  },
  description: "高校科创赛事获奖、项目与材料综合管理工作台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable} ${notoSerifDisplay.variable} ${notoSansCN.variable} ${stKaiti.variable} antialiased`}>
        {children}
        <Toaster theme="light" position="top-right" richColors closeButton duration={3200} offset={76} />
      </body>
    </html>
  );
}
