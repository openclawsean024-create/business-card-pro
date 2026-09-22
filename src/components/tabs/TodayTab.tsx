"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import {
  getTodayQueue,
  getUpcomingQueue,
  isFollowupOverdue,
  isFollowupDueToday,
} from "@/lib/domain";
import { QueueGroup } from "../QueueGroup";
import { EmptyState } from "../Common";
import { PulseCard } from "../PulseCard";
import { CalendarClock, Plus } from "lucide-react";

/**
 * 今日回訪工作台(預設 tab)。
 * - 今日進度 + 14 天節奏卡(PulseCard)
 * - 三組 queue: 逾期 / 今天 / 接下來
 * - 若無資料,顯示空狀態 + 「新增聯絡人」CTA
 */
export function TodayTab() {
  const followups = useStore((s) => s.followups);
  const contacts = useStore((s) => s.contacts);
  const completeFollowup = useStore((s) => s.completeFollowup); // ensure store subscribed
  const updateUI = useStore((s) => s.updateUI);

  const todayQueue = useMemo(
    () => getTodayQueue(followups, contacts),
    [followups, contacts],
  );
  const upcomingQueue = useMemo(
    () => getUpcomingQueue(followups, contacts),
    [followups, contacts],
  );

  // 把 todayQueue 進一步拆成 overdue / today(已是排序過的)
  const overdueItems = todayQueue.filter((q) => isFollowupOverdue(q));
  const dueTodayItems = todayQueue.filter(
    (q) => !isFollowupOverdue(q) && isFollowupDueToday(q),
  );

  // 偵測是否有 pending 的回訪,若都沒有就隱藏 up-coming 區塊
  const hasAny = overdueItems.length + dueTodayItems.length + upcomingQueue.length > 0;

  function openDetail(contactId: string) {
    updateUI({ selectedContactId: contactId });
  }

  // 我們在渲染時引用一下 completeFollowup 以保持與既有測試對齊
  void completeFollowup;

  return (
    <section aria-labelledby="today-h" className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-brand-700 uppercase tracking-wider">
            <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
            今日回訪工作台
          </div>
          <h2 id="today-h" className="mt-1 text-2xl font-semibold text-slate-900 tracking-tight">
            把今天的三個承諾交出去
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            從最緊急的下手,然後依序完成剩下的。
          </p>
        </div>
      </header>

      <PulseCard />

      {!hasAny ? (
        <EmptyState
          title="今日沒有待回訪"
          hint="新增聯絡人時一併建立『下一步』與日期,就會出現在這裡。"
        />
      ) : (
        <div data-testid="today-queue">
          <QueueGroup group="overdue" items={overdueItems} onOpenDetail={openDetail} />
          <QueueGroup group="today" items={dueTodayItems} onOpenDetail={openDetail} />
          <QueueGroup group="upcoming" items={upcomingQueue} onOpenDetail={openDetail} />
        </div>
      )}

      {!hasAny && (
        <div className="flex">
          <button
            type="button"
            onClick={() => updateUI({ activeTab: "contacts" })}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" /> 新增第一位聯絡人
          </button>
        </div>
      )}
    </section>
  );
}