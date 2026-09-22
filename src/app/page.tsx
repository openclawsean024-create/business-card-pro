"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { BottomNav } from "@/components/BottomNav";
import { TodayTab } from "@/components/tabs/TodayTab";
import { QueueTab } from "@/components/tabs/QueueTab";
import { ContactsTab } from "@/components/tabs/ContactsTab";
import { TimelineTab } from "@/components/tabs/TimelineTab";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import { OnboardingHint } from "@/components/OnboardingHint";
import { ContactDetailDrawer } from "@/components/ContactDetailDrawer";
import type { TabId } from "@/components/nav-items";

const ONBOARDING_DISMISS_KEY = "bcp-onboarding-dismissed";

export default function HomePage() {
  const store = useStore();
  const hydrate = useStore((s) => s.hydrate);
  const [hydrated, setHydrated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, [hydrate]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", store.theme === "dark");
  }, [store.theme]);

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

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm opacity-60">
        載入中…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-brand-600 focus:text-white focus:px-3 focus:py-2 focus:rounded"
      >
        跳到主要內容
      </a>

      {/* 桌機側欄 */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* 手機 header + top nav 保留,桌機由 sidebar 提供導覽 */}
        <header className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-slate-900 tracking-tight">
                名片王 Pro
              </h1>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {activeContactCount} 位聯絡人
              </p>
            </div>
          </div>
        </header>
        <TopNav activeTab={tab} onChange={(t) => store.updateUI({ activeTab: t })} />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-8"
        >
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
        </main>

        <BottomNav activeTab={tab} onChange={(t) => store.updateUI({ activeTab: t })} />
      </div>

      <ContactDetailDrawer />
    </div>
  );
}
