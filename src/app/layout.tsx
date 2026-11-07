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
    "短剧出海商业化试点的本地草稿台。名册可见，运行时未连接；不派发 Bot，不执行投放。",
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
