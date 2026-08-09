"use client";

import { NAV_ITEMS, type TabId } from "./nav-items";
import clsx from "clsx";

interface TopNavProps {
  activeTab: TabId;
  onChange: (t: TabId) => void;
}

/**
 * 桌機 / tablet: header 下方水平 nav,補上 SPEC §6.1 要求
 * "desktop 1440px 皆可完成主流程"。跟 BottomNav 共用 NAV_ITEMS。
 */
export function TopNav({ activeTab, onChange }: TopNavProps) {
  return (
    <nav
      aria-label="主導覽"
      className="hidden md:block border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-[57px] z-20"
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
                  "inline-flex items-center gap-1.5 px-4 py-3 text-sm border-b-2 transition-colors",
                  active
                    ? "border-brand-600 text-brand-600 dark:text-brand-500"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100",
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