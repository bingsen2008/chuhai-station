import type { Metadata } from "next";
import { Fraunces, Geist } from "next/font/google";

import "./globals.css";

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const display = Fraunces({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-fraunces",
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
