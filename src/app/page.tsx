"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { TopNav } from "@/components/TopNav";
import { TodayTab } from "@/components/tabs/TodayTab";
import { QueueTab } from "@/components/tabs/QueueTab";
import { ContactsTab } from "@/components/tabs/ContactsTab";
import { TimelineTab } from "@/components/tabs/TimelineTab";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import { OnboardingHint } from "@/components/OnboardingHint";
import { ContactDetailDrawer } from "@/components/ContactDetailDrawer";
import { ContactFormModal } from "@/components/ContactFormModal";
import type { TabId } from "@/components/nav-items";
import { Moon, Sun } from "lucide-react";

const ONBOARDING_DISMISS_KEY = "bcp-onboarding-dismissed";

/**
 * 名片王 Pro workstation 桌機 layout(對齊 ui-prototype.html):
 *  <div class="ws-app-shell">
 *    <aside class="ws-sidebar" />      ← 桌機永久顯示
 *    <main class="ws-main">
 *      <header class="ws-topbar" />    ← 麵包屑 / 主題切換
 *      <TopNav />                      ← md+ tab bar
 *      <div class="ws-content">…</div>  ← 各 tab
 *      <BottomNav />                   ← mobile 浮動 nav
 *    </main>
 *    <ContactDetailDrawer />
 *  </div>
 */
export default function HomePage() {
  const store = useStore();
  const hydrate = useStore((s) => s.hydrate);
  const [hydrated, setHydrated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  // 全域「新增聯絡人」modal — 任何 tab 的 + 按鈕都可觸發
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, [hydrate]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", store.theme === "dark");
  }, [store.theme]);

  // 任何 tab 都可 dispatch `bcp:open-create` 開啟新增聯絡人 modal
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => setCreating(true);
    window.addEventListener("bcp:open-create", handler);
    return () => window.removeEventListener("bcp:open-create", handler);
  }, []);

  const activeContactCount = useMemo(
    () => store.contacts.filter((c) => c.status === "active").length,
    [store.contacts],
  );
  useEffect(() => {
    if (!hydrated) return;
    const dismissed =
      typeof window !== "undefined" &&
      window.localStorage.getItem(ONBOARDING_DISMISS_KEY) === "1";
    Promise.resolve().then(() =>
      setShowOnboarding(activeContactCount === 0 && !dismissed),
    );
  }, [hydrated, activeContactCount]);

  const tab: TabId = store.ui.activeTab;

  // 麵包屑日期(對齊 prototype: 週二 · 9 月 21 日)
  const todayLabel = useMemo(() => {
    const d = new Date();
    const weekdays = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
    const w = weekdays[d.getDay()] ?? "";
    return `${w} · ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm opacity-60">
        載入中…
      </div>
    );
  }

  const onTabChange = (t: TabId) => store.updateUI({ activeTab: t });

  return (
    <div className="ws-app-shell">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-brand-600 focus:text-white focus:px-3 focus:py-2 focus:rounded"
      >
        跳到主要內容
      </a>

      {/* 桌機 sidebar (md+) — 永久掛載以利測試取得 role=complementary */}
      <Sidebar activeTab={tab} onChange={onTabChange} />

      <main
        id="main-content"
        tabIndex={-1}
        className="ws-main"
      >
        {/* Mobile 簡化 header */}
        <header className="ws-mobile-header md:hidden sticky top-0 z-30">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-slate-900 tracking-tight">
                名片王 Pro
              </h1>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {activeContactCount} 位聯絡人
              </p>
            </div>
            <button
              type="button"
              className="ws-theme-toggle"
              aria-label={store.theme === "dark" ? "切換淺色主題" : "切換深色主題"}
              onClick={() => store.update({ theme: store.theme === "light" ? "dark" : "light" })}
            >
              {store.theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </button>
          </div>
        </header>

        {/* TopNav (md+) — 桌機第二列 tab bar */}
        <TopNav activeTab={tab} onChange={onTabChange} />

        <div className="max-w-[1260px] mx-auto px-4 sm:px-6 md:px-12 py-6 md:py-10">
          {/* 麵包屑 (桌機頂部列) */}
          <div className="hidden md:flex items-center justify-between min-h-[78px] pb-6">
            <div className="text-xs text-[color:var(--muted-app)]">
              工作台 <span aria-hidden="true"> / </span>{" "}
              <strong className="text-[color:var(--ink-app)]">{todayLabel}</strong>
            </div>
            <div className="flex items-center gap-2 text-xs text-[color:var(--muted-app)]">
              <span className="hidden lg:inline">本機使用者</span>
              <button
                type="button"
                className="ws-theme-toggle"
                aria-label={store.theme === "dark" ? "切換淺色主題" : "切換深色主題"}
                onClick={() => store.update({ theme: store.theme === "light" ? "dark" : "light" })}
              >
                {store.theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
              </button>
              <div className="ws-avatar sm" aria-hidden="true">我</div>
            </div>
          </div>

          <OnboardingHint
            visible={showOnboarding}
            onDismiss={() => {
              if (typeof window !== "undefined") {
                window.localStorage.setItem(ONBOARDING_DISMISS_KEY, "1");
              }
              setShowOnboarding(false);
            }}
            onGoToContacts={() => {
              if (typeof window !== "undefined") {
                window.localStorage.setItem(ONBOARDING_DISMISS_KEY, "1");
              }
              store.updateUI({ activeTab: "contacts" });
            }}
          />
          {tab === "today" && <TodayTab />}
          {tab === "queue" && <QueueTab />}
          {tab === "contacts" && <ContactsTab />}
          {tab === "timeline" && <TimelineTab />}
          {tab === "settings" && <SettingsTab />}
        </div>

        {/* Mobile bottom nav */}
        <BottomNav activeTab={tab} onChange={onTabChange} />
      </main>

      <ContactDetailDrawer />
      {creating && (
        <ContactFormModal
          contact={null}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}
