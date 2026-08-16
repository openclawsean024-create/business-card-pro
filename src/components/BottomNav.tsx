"use client";

import { NAV_ITEMS, type TabId } from "./nav-items";
import clsx from "clsx";

interface BottomNavProps {
  activeTab: TabId;
  onChange: (t: TabId) => void;
}

/**
 * mobile-only bottom nav(< md)。桌機 / tablet 由 TopNav 取代。
 */
export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <nav
      aria-label="主導覽"
      className="sticky bottom-0 z-30 md:hidden bg-white border-t border-slate-200"
    >
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map((it) => {
          const Icon = it.icon;
          const active = activeTab === it.id;
          return (
            <li key={it.id}>
              <button
                onClick={() => onChange(it.id)}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "w-full flex flex-col items-center gap-1 py-2 text-[10px] cursor-pointer transition-colors",
                  active
                    ? "text-brand-600"
                    : "text-slate-500 hover:text-slate-900",
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