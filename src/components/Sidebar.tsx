"use client";

import clsx from "clsx";
import { useStore } from "@/lib/store";
import { isLocalOnly } from "@/lib/domain";
import { NAV_ITEMS, type TabId } from "./nav-items";
import {
  CalendarClock,
  Users,
  Plus,
  MessageSquare,
  Settings as SettingsIcon,
} from "lucide-react";

/**
 * 桌機側欄 (md+ 顯示)。
 * - 品牌區 / 主要導航 (與 BottomNav 共用 NAV_ITEMS source-of-truth)
 * - 本機模式 + 名片庫容量提示
 * - 主動聯絡人數
 *
 * 手機不渲染(< md 由 BottomNav 取代)。
 */
export function Sidebar() {
  const activeTab = useStore((s) => s.ui.activeTab);
  const updateUI = useStore((s) => s.updateUI);
  const theme = useStore((s) => s.theme);
  const update = useStore((s) => s.update);
  const activeCount = useStore(
    (s) => s.contacts.filter((c) => c.status === "active").length,
  );
  const maxContacts = useStore((s) => s.plan.maxContacts);
  const cloudSync = useStore((s) => s.plan.cloudSync);
  const todayCount = useStore((s) => {
    // 用 today queue 的 size(只看 pending + 到期日 <= 今天)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return s.followups.filter((f) => {
      if (f.status !== "pending") return false;
      return new Date(f.dueDate) < new Date(todayStart.getTime() + 24 * 3600 * 1000);
    }).length;
  });
  const localOnly = useStore(isLocalOnly);

  const ratio = maxContacts === 0 ? 0 : activeCount / maxContacts;
  const fillPct = `${Math.min(100, Math.round(ratio * 100))}%`;
  const warn = ratio >= 0.85;

  return (
    <aside
      aria-label="側邊導覽"
      className="hidden md:flex md:flex-col md:w-[240px] md:shrink-0 md:sticky md:top-0 md:h-screen md:border-r md:border-slate-200 md:bg-white md:py-5"
    >
      <div className="px-5">
        <div className="flex items-center gap-2.5">
          <div
            aria-hidden="true"
            className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center font-semibold"
          >
            王
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 tracking-tight">
              名片王 Pro
            </div>
            <div className="text-[11px] text-slate-500 leading-tight">
              把下一步做完,關係不掉線
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        工作台
      </div>
      <nav aria-label="主要導覽" className="mt-2 px-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map((it) => {
            const Icon = it.icon;
            const active = activeTab === it.id;
            const showCount = it.id === "today" && todayCount > 0;
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => updateUI({ activeTab: it.id as TabId })}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1 text-left">{it.label}</span>
                  {showCount && (
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-brand-100 text-brand-700">
                      {todayCount}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto px-3 pt-6">
        <div
          className={clsx(
            "rounded-lg border p-4",
            localOnly
              ? "border-emerald-200 bg-emerald-50/60"
              : "border-slate-200 bg-slate-50",
          )}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
            <span
              aria-hidden="true"
              className={clsx(
                "inline-block w-1.5 h-1.5 rounded-full",
                localOnly ? "bg-emerald-500" : "bg-slate-400",
              )}
            />
            本機模式已啟用
          </div>
          <p className="mt-1.5 text-[11px] text-slate-600 leading-snug">
            資料只存在這台瀏覽器,不上傳任何伺服器。你可以隨時匯出帶走。
          </p>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono">
              <span>名片庫容量</span>
              <strong className={warn ? "text-amber-700" : "text-slate-900"}>
                {activeCount} / {maxContacts}
              </strong>
            </div>
            <div
              role="progressbar"
              aria-label="名片庫容量"
              aria-valuenow={activeCount}
              aria-valuemin={0}
              aria-valuemax={maxContacts}
              className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white border border-slate-200"
            >
              <div
                className={clsx(
                  "h-full transition-all duration-300",
                  warn ? "bg-amber-500" : "bg-brand-600",
                )}
                style={{ width: fillPct }}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              {cloudSync ? "雲端同步" : "免費 pilot"}
            </span>
            <button
              type="button"
              onClick={() => update({ theme: theme === "light" ? "dark" : "light" })}
              aria-label={theme === "dark" ? "切換淺色主題" : "切換深色主題"}
              className="px-2 py-0.5 rounded border border-slate-200 text-slate-600 hover:bg-white cursor-pointer"
            >
              {theme === "dark" ? "淺色" : "深色"}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* re-export the NAV_ITEMS icon types so tsconfig doesn't complain about unused imports */
export type { TabId };
// Reference the lucide icons so the import isn't flagged as unused if tree-shaken.
export const SIDEBAR_ICON_REFS = [CalendarClock, Users, Plus, MessageSquare, SettingsIcon];