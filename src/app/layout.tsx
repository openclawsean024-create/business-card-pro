import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Inter (UI) + JetBrains Mono (numeric IDs) — industry CRM standard.
// ui-ux-pro-max MASTER.md v2 推薦 Cormorant Garamond (學術風格),
// 我們 override — CRM niche 用 Inter (Linear / Notion / Attio 都用 Inter)。
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "名片王 Pro — 台灣業務的人脈回訪清單",
  description:
    "以台灣 B2B 業務的小型回訪 queue 切入: 交換名片只是入口, 產品交付會議備註、下一步、提醒與 vCard/CSV 互通。",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-Hant"
      className={`${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}