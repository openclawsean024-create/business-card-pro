"use client";

import { NAV_ITEMS, type TabId } from "./nav-items";
import clsx from "clsx";

interface BottomNavProps {
  activeTab: TabId;
  onChange: (t: TabId) => void;
}

/**
 * 手機主導覽(< md 顯示)。
 * 對齊 ui-prototype.html 5 列 mobile-nav(prototype 把「新增」包進時間線/聯絡人頁內的 + 按鈕,
 * 不佔 mobile-nav slot — 因此這裡保持 5 個 tab button: 今日 / 全部 / 聯絡人 / 時間線 / 設定)。
 *
 * NAV_ITEMS 是 single source of truth — 加 tab 只改 nav-items.ts。
 */
export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <nav
      aria-label="行動版導覽"
      className="ws-mobile-nav md:hidden"
    >
      {NAV_ITEMS.map((it) => {
        const Icon = it.icon;
        const active = activeTab === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            aria-current={active ? "page" : undefined}
            data-tab={it.id}
            className={clsx(active && "active")}
          >
            <Icon aria-hidden="true" />
            <span>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
