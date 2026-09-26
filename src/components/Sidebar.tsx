"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { useStore } from "@/lib/store";
import { NAV_ITEMS, type TabId } from "./nav-items";
import { getTodayQueue } from "@/lib/domain";

interface SidebarProps {
  activeTab: TabId;
  onChange: (t: TabId) => void;
}

/**
 * 名片王 Pro workstation 左側 sidebar — 對齊 ui-prototype.html:
 * - brand mark + brand name + caption
 * - 工作台 nav buttons (用 NAV_ITEMS source-of-truth)
 * - 本機模式已啟用 + 名片庫容量條
 * - profile (mini avatar + more-button)
 *
 * 桌機 / tablet 顯示,手機 (< md) 由 ws-mobile-nav 取代。
 */
export function Sidebar({ activeTab, onChange }: SidebarProps) {
  const contacts = useStore((s) => s.contacts);
  const plan = useStore((s) => s.plan);
  const followups = useStore((s) => s.followups);

  const activeCount = useMemo(
    () => contacts.filter((c) => c.status === "active").length,
    [contacts],
  );

  // 「今日回訪」徽章數字 — 對齊 prototype 的 #navCount
  const todayPending = useMemo(
    () => getTodayQueue(followups, contacts, new Date()).length,
    [followups, contacts],
  );

  const capacityPct = Math.min(
    Math.round((activeCount / Math.max(plan.maxContacts, 1)) * 100),
    100,
  );

  return (
    <aside
      className="ws-sidebar"
      aria-label="側邊導覽"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 pb-7">
        <div className="ws-brand-mark" aria-hidden="true">
          王
        </div>
        <div className="min-w-0">
          <div className="text-base font-bold tracking-tight">名片王 Pro</div>
          <div className="text-[11px] text-[color:var(--muted-app)] mt-0.5">
            把下一步做完,關係不掉線
          </div>
        </div>
      </div>

      <div className="px-3 pb-2 text-[11px] font-bold tracking-[0.1em] text-[color:var(--faint-app)]">
        工作台
      </div>

      {/* Nav list */}
      <nav aria-label="主要導覽" className="grid gap-1">
        {NAV_ITEMS.map((it) => {
          const Icon = it.icon;
          const active = activeTab === it.id;
          const showBadge = it.id === "today" && todayPending > 0;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onChange(it.id)}
              aria-current={active ? "page" : undefined}
              className={clsx("ws-nav-button")}
              data-active={active || undefined}
              data-tab={it.id}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
              <span className="truncate">{it.label}</span>
              {showBadge && (
                <span
                  className="ws-nav-count"
                  id="navCount"
                  aria-label={`今日待回訪 ${todayPending} 個`}
                >
                  {todayPending}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" aria-hidden="true" />

      {/* 本機模式已啟用 + 名片庫容量 */}
      <div className="ws-local-card">
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="ws-status-dot" aria-hidden="true" />
          本機模式已啟用
        </div>
        <p className="mt-2 text-[11px] leading-[1.55] text-[color:var(--muted-app)]">
          資料只存在這台瀏覽器,不上傳任何伺服器。你可以隨時匯出帶走。
        </p>
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-[color:var(--muted-app)]">
            <span>名片庫容量</span>
            <strong className="text-[color:var(--ink-app)] font-bold">
              {activeCount} / {plan.maxContacts}
            </strong>
          </div>
          <div
            className="ws-progress-track capacity"
            role="progressbar"
            aria-label="名片庫容量"
            aria-valuenow={activeCount}
            aria-valuemin={0}
            aria-valuemax={plan.maxContacts}
          >
            <span
              className="ws-progress-fill success"
              style={{ width: `${capacityPct}%` }}
              id="capacityFill"
            />
          </div>
        </div>
      </div>

      {/* Profile row */}
      <div className="flex items-center gap-2.5 px-2 pt-0 border-t border-[color:var(--line-app)] mt-3 pt-2.5">
        <div className="ws-avatar sm" aria-hidden="true">
          我
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold">本機使用者</div>
          <div className="text-[11px] text-[color:var(--muted-app)]">免費 pilot</div>
        </div>
        <button
          type="button"
          aria-label="更多帳號選項"
          className="ml-auto w-[30px] h-[30px] grid place-items-center border-0 rounded-lg text-[color:var(--muted-app)] bg-transparent text-lg cursor-pointer"
        >
          ⋯
        </button>
      </div>
    </aside>
  );
}
