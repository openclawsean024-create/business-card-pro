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
    <header className="sticky top-0 z-30 glass-card border-b border-white/10 rounded-none">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">
            名片王 <span className="text-accent-500">Pro</span>
          </h1>
          <p className="text-xs text-slate-300 font-body">
            台灣業務的人脈回訪清單 · {activeCount} 位聯絡人
          </p>
        </div>
        <button
          aria-label={theme === "dark" ? "切換淺色主題" : "切換深色主題"}
          onClick={() => update({ theme: theme === "light" ? "dark" : "light" })}
          className="p-2 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}