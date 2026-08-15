import type { Metadata } from "next";
import { Caveat, Quicksand } from "next/font/google";
import "./globals.css";

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-caveat",
  display: "swap",
});

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-quicksand",
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
    <html lang="zh-Hant" className={`${caveat.variable} ${quicksand.variable}`} suppressHydrationWarning>
      <body className="font-body">{children}</body>
    </html>
  );
}