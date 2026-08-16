"use client";

import { NAV_ITEMS, type TabId } from "./nav-items";
import clsx from "clsx";

interface TopNavProps {
  activeTab: TabId;
  onChange: (t: TabId) => void;
}

/**
 * 桌機 / tablet: header 下方水平 nav,Minimalism 風格。
 * 對齊 CRM 業界 (Linear / Notion / Attio) — 用底線指示 active tab,不靠顏色塊。
 */
export function TopNav({ activeTab, onChange }: TopNavProps) {
  return (
    <nav
      aria-label="主導覽"
      className="hidden md:block sticky top-[57px] z-20 bg-white border-b border-slate-200"
    >
      <ul className="max-w-5xl mx-auto px-4 flex gap-0 overflow-x-auto">
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
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-slate-600 hover:text-slate-900",
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