"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { useStore } from "@/lib/store";
import {
  getTodayQueue,
  getUpcomingQueue,
  getTimeline,
  isFollowupDoneEntry,
  buildRhythm,
  getTodayProgress,
} from "@/lib/domain";
import { QueueGroup, type QueueGroup as GroupKey } from "../QueueGroup";
import { PulseCard } from "../PulseCard";
import { EmptyState } from "../Common";
import { Plus, ArrowRight } from "lucide-react";
import { exportCalendar, exportCSV, exportVCards } from "@/lib/export";

type FilterKey = "all" | "today" | "overdue";

export function TodayTab() {
  const state = useStore();
  const updateUI = useStore((s) => s.updateUI);

  const [filter, setFilter] = useState<FilterKey>("all");

  // 三組 queue:逾期 / 今天 / 接下來
  const overdueQueue = useMemo(
    () =>
      getTodayQueue(state.followups, state.contacts, new Date()).filter(
        (f) => f.status === "pending" && new Date(f.dueDate) < new Date(),
      ),
    [state.followups, state.contacts],
  );
  const todayQueue = useMemo(
    () =>
      getTodayQueue(state.followups, state.contacts, new Date()).filter(
        (f) =>
          f.status === "pending" &&
          new Date(f.dueDate) >= new Date(new Date().setHours(0, 0, 0, 0)) &&
          new Date(f.dueDate) < new Date(new Date().setHours(24, 0, 0, 0)),
      ),
    [state.followups, state.contacts],
  );
  const upcomingQueue = useMemo(
    () => getUpcomingQueue(state.followups, state.contacts, new Date(), 7),
    [state.followups, state.contacts],
  );

  const groups: Array<{ key: GroupKey; items: typeof overdueQueue }> = [
    { key: "overdue", items: overdueQueue },
    { key: "today", items: todayQueue },
    { key: "upcoming", items: upcomingQueue },
  ];

  const allCount = overdueQueue.length + todayQueue.length + upcomingQueue.length;
  const pendingCount = overdueQueue.length + todayQueue.length;

  const openDetail = (id: string) => updateUI({ selectedContactId: id });

  // Activity feed (最近互動) — 對齊 prototype 的 activity-card
  const activityEntries = useMemo(() => {
    const all: Array<{
      id: string;
      contactId: string;
      contactName: string;
      title: string;
      copy: string;
      ts: number;
    }> = [];
    for (const c of state.contacts) {
      if (c.status !== "active") continue;
      const tl = getTimeline(c.id, state);
      const display = c.payload.name ?? c.payload.company ?? "(無姓名)";
      for (const e of tl) {
        if (isFollowupDoneEntry(e)) {
          all.push({
            id: e.id,
            contactId: c.id,
            contactName: display,
            title: `已完成回訪 · ${display}`,
            copy: e.nextStep,
            ts: new Date(e.completedAt ?? e.updatedAt).getTime(),
          });
        } else {
          all.push({
            id: e.id,
            contactId: c.id,
            contactName: display,
            title: `新增聯絡人 · ${display}`,
            copy: "已建立下一步",
            ts: new Date(e.occurredAt).getTime(),
          });
        }
      }
    }
    return all.sort((a, b) => b.ts - a.ts).slice(0, 6);
  }, [state]);

  // Portable export handlers
  const handleExportVCards = () => {
    const vcf = exportVCards(state.contacts, state);
    triggerDownload(vcf, "business-card-pro.vcf", "text/vcard");
  };
  const handleExportCSV = () => {
    const csv = exportCSV(state.contacts, state);
    triggerDownload(csv, "business-card-pro.csv", "text/csv;charset=utf-8");
  };
  const handleExportICS = () => {
    const ics = exportCalendar(state.followups, state.contacts);
    triggerDownload(ics, "business-card-pro.ics", "text/calendar;charset=utf-8");
  };

  return (
    <div className="space-y-8">
      {/* Hero intro — 對齊 prototype 的 .intro + .eyebrow + .primary-button */}
      <section
        aria-labelledby="pageTitle"
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-6"
      >
        <div>
          <span className="ws-eyebrow">今天,先完成最重要的下一步</span>
          <h1 id="pageTitle" className="ws-hero-title">
            讓交換過的名片,真的走到下一次對話。
          </h1>
          <p className="ws-hero-copy">
            你不需要記住所有人,只要把今天該做的 {pendingCount}{" "}
            件事完成。
          </p>
        </div>
        <button
          type="button"
          className="btn-primary w-full md:w-auto"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("bcp:open-create"));
            }
          }}
          data-testid="today-add-contact"
        >
          <Plus className="w-4 h-4" /> 新增聯絡人
        </button>
      </section>

      {/* Section grid: progress + queue  |  pulse sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.65fr)_minmax(290px,0.85fr)] gap-4">
        <div className="space-y-4">
          <PulseCard />

          {/* Queue card */}
          <section
            aria-labelledby="queueTitle"
            className="ws-surface p-6"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 id="queueTitle" className="ws-section-title">
                  回訪 queue
                </h2>
                <p className="ws-section-subtitle">
                  依照緊急程度,從逾期到即將到期排列
                </p>
              </div>
              <div
                className="ws-filter-row"
                role="group"
                aria-label="回訪篩選"
              >
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  aria-pressed={filter === "all"}
                  className={clsx("ws-filter-pill", filter === "all" && "active")}
                  data-filter="all"
                >
                  全部 <span id="allCount">{allCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("today")}
                  aria-pressed={filter === "today"}
                  className={clsx("ws-filter-pill", filter === "today" && "active")}
                  data-filter="today"
                >
                  今天 <span id="todayCount">{todayQueue.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("overdue")}
                  aria-pressed={filter === "overdue"}
                  className={clsx("ws-filter-pill", filter === "overdue" && "active")}
                  data-filter="overdue"
                >
                  逾期 <span id="overdueCount">{overdueQueue.length}</span>
                </button>
              </div>
            </div>

            <div className="mt-4">
              {allCount === 0 ? (
                <div className="py-7 text-center text-[color:var(--muted-app)]">
                  <EmptyState
                    title="目前沒有待回訪"
                    hint="在『聯絡人』分頁新增並建立下一步即可加入 queue。"
                  />
                </div>
              ) : (
                <>
                  {groups.map((g) => {
                    // 篩選邏輯
                    if (filter === "today" && g.key !== "today") return null;
                    if (filter === "overdue" && g.key !== "overdue") return null;
                    return (
                      <QueueGroup
                        key={g.key}
                        group={g.key}
                        items={g.items}
                        onOpenDetail={openDetail}
                      />
                    );
                  })}
                  {filter === "today" && todayQueue.length === 0 && (
                    <div className="py-7 text-center text-[color:var(--muted-app)]">
                      今天沒有待回訪
                    </div>
                  )}
                  {filter === "overdue" && overdueQueue.length === 0 && (
                    <div className="py-7 text-center text-[color:var(--muted-app)]">
                      目前沒有逾期項目
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>

        {/* Pulse sidebar — 14 天回訪節奏 */}
        <aside className="ws-surface p-6 space-y-5" aria-label="本週回訪脈搏">
          <PulseSidebarCard />
        </aside>
      </div>

      {/* Lower grid: activity + portable export */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.9fr)] gap-4">
        <section
          aria-labelledby="activityTitle"
          className="ws-surface p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="activityTitle" className="ws-section-title">
                最近互動
              </h2>
              <p className="ws-section-subtitle">
                每一次完成,都留下下一次對話的線索
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary !py-1.5 !text-xs"
              onClick={() => updateUI({ activeTab: "timeline" })}
            >
              查看完整時間線 <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-3">
            {activityEntries.length === 0 ? (
              <div className="py-7 text-center text-[color:var(--muted-app)]">
                完成回訪後,這裡會自動累積每一次互動
              </div>
            ) : (
              <div>
                {activityEntries.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => updateUI({ selectedContactId: e.contactId })}
                    className="ws-activity-item w-full text-left bg-transparent border-0 p-0 cursor-pointer"
                  >
                    <span className="ws-activity-marker" aria-hidden="true" />
                    <span>
                      <span className="block text-xs font-bold text-[color:var(--ink-app)]">
                        {e.title}
                      </span>
                      <span className="block mt-0.5 text-[11px] text-[color:var(--muted-app)] truncate">
                        {e.copy}
                      </span>
                    </span>
                    <time className="text-[11px] text-[color:var(--faint-app)] whitespace-nowrap">
                      {formatRelative(e.ts)}
                    </time>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section
          aria-labelledby="portableTitle"
          className="ws-surface ws-portable-card p-6"
        >
          <div className="ws-portable-kicker text-[12px] font-bold">
            你的資料,你做主
          </div>
          <h2 id="portableTitle" className="ws-portable-title ws-section-title" style={{ color: "#fff" }}>
            隨時帶走,不被鎖住
          </h2>
          <p className="ws-portable-copy mt-2 text-xs leading-[1.6]">
            名片王只存在你的瀏覽器。需要整理、備份或換工具時,可以匯出成通用格式。
          </p>
          <div className="ws-portable-actions mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={handleExportVCards} data-export="vcard">
              匯出 vCard
            </button>
            <button type="button" onClick={handleExportCSV} data-export="csv">
              匯出 CSV
            </button>
            <button type="button" onClick={handleExportICS} data-export="ics">
              回訪 .ics
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

/** 14 天回訪節奏側欄卡片(對齊 prototype 的 .pulse-card) */
function PulseSidebarCard() {
  const state = useStore();
  // 這裡直接讀取 store,使用既有 buildRhythm / getTodayProgress
  const points = useMemo(
    () => buildRhythm(state.followups, state.interactions, new Date(), 14),
    [state.followups, state.interactions],
  );

  const progress = useMemo(
    () => getTodayProgress(state.followups, new Date()),
    [state.followups],
  );

  const max = Math.max(1, ...points.map((p) => p.count));
  // 7 天前 vs 7 天後(本週脈搏) — 用本週平均完成度估算「比上週 +N%」
  const recent7 = points.slice(-7);
  const last7Done = recent7.reduce((acc, p) => acc + p.count, 0);
  const prev7Done = points.slice(-14, -7).reduce((acc, p) => acc + p.count, 0);
  const delta =
    prev7Done === 0
      ? last7Done > 0
        ? 100
        : 0
      : Math.round(((last7Done - prev7Done) / prev7Done) * 100);

  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  // 顯示最近 7 天 (從右到左)
  const displayDays = recent7;

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-bold text-[color:var(--muted-app)]">
            14 天回訪節奏
          </div>
          <h3 className="ws-section-title mt-1">本週脈搏</h3>
        </div>
        <div className="text-xs font-extrabold text-[color:var(--success-app)]">
          {delta >= 0 ? "比上週 +" : "比上週 "}
          {delta}%
        </div>
      </div>
      <div
        className="mt-6 grid grid-cols-7 items-end gap-2 h-32 px-1 border-b border-[color:var(--line-app)]"
        role="img"
        aria-label="週一至週日回訪完成節奏"
      >
        {displayDays.map((p, i) => {
          const heightPct = Math.round((p.count / max) * 100);
          return (
            <div
              key={p.date}
              className="flex flex-col h-full items-center justify-end gap-2"
              title={`${p.date}: ${p.count} 次互動`}
            >
              <div className="ws-bar-track">
                <div
                  className={clsx(
                    "ws-bar",
                    p.isToday && "active",
                    !p.isToday && p.count > 0 && "done",
                  )}
                  style={{ height: `${Math.max(7, heightPct)}%` }}
                />
              </div>
              <div
                className={clsx(
                  "relative top-6 text-[10px] text-[color:var(--faint-app)]",
                  p.isToday && "active text-[color:var(--ink-app)] font-extrabold",
                )}
              >
                {weekdays[(new Date(p.date).getDay() + 6) % 7] ?? ""}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-7 text-xs text-[color:var(--muted-app)]">
        最近 7 天完成 <strong className="text-[color:var(--ink-app)]">{last7Done}</strong> 個下一步,
        維持這個節奏就很好。
      </p>

      {/* Mini task suggestions */}
      <ul className="mt-5 grid gap-1" aria-label="本週建議">
        {overdueSuggestion(state.followups)}
        <li className="flex items-center gap-2.5 py-2 border-t border-[color:var(--line-app)]">
          <span
            className="w-1.5 h-1.5 rounded-full bg-[color:var(--primary-app)] shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[color:var(--ink-app)] truncate">
              今天完成 {state.followups.filter((f) => f.status === "pending").length} 個承諾
            </div>
            <div className="text-[11px] text-[color:var(--muted-app)]">
              下午再回來看一次就好
            </div>
          </div>
        </li>
      </ul>
    </div>
  );
}

function overdueSuggestion(
  followups: Array<{ status: string; dueDate: string }>,
) {
  const overdue = followups.filter(
    (f) => f.status === "pending" && new Date(f.dueDate) < new Date(),
  ).length;
  if (overdue === 0) {
    return (
      <li className="flex items-center gap-2.5 py-2 border-t border-[color:var(--line-app)]">
        <span
          className="w-1.5 h-1.5 rounded-full bg-[color:var(--success-app)] shrink-0"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-[color:var(--ink-app)] truncate">
            目前沒有逾期,保持節奏
          </div>
          <div className="text-[11px] text-[color:var(--muted-app)]">讓 queue 持續可呼吸</div>
        </div>
      </li>
    );
  }
  return (
    <li className="flex items-center gap-2.5 py-2 border-t border-[color:var(--line-app)]">
      <span
        className="w-1.5 h-1.5 rounded-full bg-[color:var(--warning-app)] shrink-0"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold text-[color:var(--ink-app)] truncate">
          先處理 {overdue} 個逾期回訪
        </div>
        <div className="text-[11px] text-[color:var(--muted-app)]">
          讓 queue 回到可呼吸的狀態
        </div>
      </div>
    </li>
  );
}

function formatRelative(ts: number): string {
  const now = Date.now();
  const diffMs = now - ts;
  if (diffMs < 60_000) return "剛剛";
  if (diffMs < 3600_000) return `${Math.floor(diffMs / 60_000)} 分鐘前`;
  if (diffMs < 24 * 3600_000) return `${Math.floor(diffMs / 3600_000)} 小時前`;
  const d = new Date(ts);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

function triggerDownload(content: string, filename: string, mime: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
