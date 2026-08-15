"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { getTodayQueue, isFollowupOverdue } from "@/lib/domain";
import { FollowupCard } from "../FollowupCard";
import { EmptyState } from "../Common";
import { CalendarClock } from "lucide-react";

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
        <h2 id="today-h" className="font-heading text-3xl font-bold flex items-center gap-2 text-white">
          <CalendarClock className="w-6 h-6 text-accent-500" /> 今日回訪
        </h2>
        <p className="text-sm text-slate-400 font-body mt-1">
          到期 <span className="text-accent-500 font-semibold">{dueTodayCount}</span> · 逾期{" "}
          <span className={overdueCount > 0 ? "text-amber-400 font-semibold" : "font-semibold"}>
            {overdueCount}
          </span>
        </p>
      </div>
      {queue.length === 0 ? (
        <EmptyState
          title="今日沒有待回訪"
          hint="新增聯絡人時一併建立『下一步』與日期,就會出現在這裡。"
        />
      ) : (
        <ul className="space-y-3" data-testid="today-queue">
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