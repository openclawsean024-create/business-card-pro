"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { getTodayQueue, isFollowupOverdue } from "@/lib/domain";
import { FollowupCard } from "../FollowupCard";
import { EmptyState } from "../Common";
import { CalendarClock } from "lucide-react";

/** SPEC §3.1 FR-003 + AC-003: 今日 / 逾期 queue,一鍵完成 */
export function TodayTab() {
  const followups = useStore((s) => s.followups);
  const contacts = useStore((s) => s.contacts);
  const completeFollowup = useStore((s) => s.completeFollowup);

  const queue = useMemo(() => getTodayQueue(followups, contacts), [followups, contacts]);
  const overdueCount = queue.filter((q) => isFollowupOverdue(q)).length;
  const dueTodayCount = queue.length - overdueCount;

  return (
    <section aria-labelledby="today-h" className="space-y-4">
      <div>
        <h2 id="today-h" className="text-xl font-semibold flex items-center gap-2">
          <CalendarClock className="w-5 h-5" /> 今日回訪
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          到期 {dueTodayCount} · 逾期 {overdueCount}
        </p>
      </div>
      {queue.length === 0 ? (
        <EmptyState
          title="今日沒有待回訪"
          hint="新增聯絡人時一併建立『下一步』與日期,就會出現在這裡。"
        />
      ) : (
        <ul className="space-y-2" data-testid="today-queue">
          {queue.map((fu) => (
            <FollowupCard
              key={fu.id}
              followup={fu}
              contact={fu.contact}
              onComplete={completeFollowup}
            />
          ))}
        </ul>
      )}
    </section>
  );
}