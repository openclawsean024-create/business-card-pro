"use client";

import { NAV_ITEMS, type TabId } from "./nav-items";
import clsx from "clsx";

interface TopNavProps {
  activeTab: TabId;
  onChange: (t: TabId) => void;
}

/**
 * 桌機 / tablet: header 下方水平 nav,玻璃效果。
 */
export function TopNav({ activeTab, onChange }: TopNavProps) {
  return (
    <nav
      aria-label="主導�"
      className="hidden md:block sticky top-[73px] z-20 glass-card border-b border-white/10 rounded-none"
    >
      <ul className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
        {NAV_ITEMS.map((it) => {
          const Icon = it.icon;
          const active = activeTab === it.id;
          return (
            <li key={it.id}>
              <button
                onClick={() => onChange(it.id)}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer",
                  active
                    ? "border-accent-500 text-accent-500"
                    : "border-transparent text-slate-300 hover:text-white",
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{it.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}