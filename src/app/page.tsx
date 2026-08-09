"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Header } from "@/components/Header";
import { TopNav } from "@/components/TopNav";
import { BottomNav } from "@/components/BottomNav";
import { TodayTab } from "@/components/tabs/TodayTab";
import { QueueTab } from "@/components/tabs/QueueTab";
import { ContactsTab } from "@/components/tabs/ContactsTab";
import { TimelineTab } from "@/components/tabs/TimelineTab";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import type { TabId } from "@/components/nav-items";

export default function HomePage() {
  const store = useStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    store.hydrate();
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", store.theme === "dark");
  }, [store.theme]);

  const tab: TabId = store.ui.activeTab;

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm opacity-60">
        載入中…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <TopNav activeTab={tab} onChange={(t) => store.updateUI({ activeTab: t })} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {tab === "today" && <TodayTab />}
        {tab === "queue" && <QueueTab />}
        {tab === "contacts" && <ContactsTab />}
        {tab === "timeline" && <TimelineTab />}
        {tab === "settings" && <SettingsTab />}
      </main>

      <BottomNav activeTab={tab} onChange={(t) => store.updateUI({ activeTab: t })} />
    </div>
  );
}