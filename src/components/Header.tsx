"use client";

import { useStore } from "@/lib/store";
import { Moon, Sun } from "lucide-react";

export function Header() {
  const theme = useStore((s) => s.theme);
  const update = useStore((s) => s.update);
  const activeCount = useStore(
    (s) => s.contacts.filter((c) => c.status === "active").length,
  );

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">名片王 Pro</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            台灣業務的人脈回訪清單 · {activeCount} 位聯絡人
          </p>
        </div>
        <button
          aria-label={theme === "dark" ? "切換淺色主題" : "切換深色主題"}
          onClick={() => update({ theme: theme === "light" ? "dark" : "light" })}
          className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}