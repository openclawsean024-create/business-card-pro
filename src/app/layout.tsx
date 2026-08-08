import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "名片王 Pro — 台灣業務的人脈回訪清單",
  description:
    "以台灣 B2B 業務的小型回訪 queue 切入: 交換名片只是入口, 產品交付會議備註、下一步、提醒與 vCard/CSV 互通。",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}