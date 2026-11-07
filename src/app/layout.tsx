import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";

const sans = localFont({
  src: "./fonts/geist-latin.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-geist",
  adjustFontFallback: "Arial",
});

const display = localFont({
  src: [
    { path: "./fonts/fraunces-latin.woff2", weight: "500", style: "normal" },
    { path: "./fonts/fraunces-latin.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-fraunces",
  adjustFontFallback: "Times New Roman",
});

export const metadata: Metadata = {
  title: "出海实验站",
  description:
    "短剧海外实验业务流程模拟：准入、策略、用户审批、监控、对账、反馈与下一轮策略。模拟数据，未连接真实业务。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
