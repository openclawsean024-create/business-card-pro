"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { getTimeline, isFollowupDoneEntry, listContacts, sortContacts } from "@/lib/domain";
import { EmptyState } from "../Common";
import { MessageSquare } from "lucide-react";

/** SPEC §3.1 FR-007: 互動時間線 + 下次承諾 */
export function TimelineTab() {
  const state = useStore();
  const sortedContacts = useMemo(
    () => sortContacts(listContacts(state), "createdAt"),
    [state],
  );

  return (
    <section aria-labelledby="timeline-h" className="space-y-4">
      <h2 id="timeline-h" className="text-xl font-semibold flex items-center gap-2">
        <MessageSquare className="w-5 h-5" /> 互動時間線
      </h2>
      {sortedContacts.length === 0 ? (
        <EmptyState
          title="沒有互動紀錄"
          hint="在聯絡人新增時建立交換事件,或完成回訪後會自動記錄。"
        />
      ) : (
        <div className="space-y-3">
          {sortedContacts.map((c) => {
            const tl = getTimeline(c.id, state).slice(0, 3);
            return (
              <details
                key={c.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
              >
                <summary className="cursor-pointer font-medium">
                  {c.payload.name ?? c.payload.company ?? "(無姓名)"}
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                    {tl.length} 筆互動
                  </span>
                </summary>
                <ul className="mt-3 space-y-2 text-sm">
                  {tl.map((it) => {
                    if (isFollowupDoneEntry(it)) {
                      return (
                        <li key={it.id} className="border-l-2 border-brand-500 pl-3">
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(it.completedAt ?? it.updatedAt).toLocaleString()} ·
                            followup-done
                          </div>
                          <div>完成: {it.nextStep}</div>
                          {it.nextCommitment && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              下次承諾: {it.nextCommitment}
                            </div>
                          )}
                        </li>
                      );
                    }
                    return (
                      <li key={it.id} className="border-l-2 border-brand-500 pl-3">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(it.occurredAt).toLocaleString()} · {it.kind}
                        </div>
                        <div>{it.summary}</div>
                        {it.nextCommitment && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            下次承諾: {it.nextCommitment}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}