"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { getTimeline, isFollowupDoneEntry, listContacts, sortContacts } from "@/lib/domain";
import { EmptyState } from "../Common";
import { MessageSquare } from "lucide-react";

export function TimelineTab() {
  const state = useStore();
  const sortedContacts = useMemo(
    () => sortContacts(listContacts(state), "createdAt"),
    [state],
  );

  return (
    <section aria-labelledby="timeline-h" className="space-y-4">
      <h2 id="timeline-h" className="font-heading text-3xl font-bold flex items-center gap-2 text-white">
        <MessageSquare className="w-6 h-6 text-accent-500" /> 互動時間線
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
                className="glass-card p-4 group"
              >
                <summary className="cursor-pointer font-semibold text-white flex items-center justify-between">
                  <span>{c.payload.name ?? c.payload.company ?? "(無姓名)"}</span>
                  <span className="text-xs text-slate-400 font-normal">
                    {tl.length} 筆互動
                  </span>
                </summary>
                <ul className="mt-3 space-y-2 text-sm">
                  {tl.map((it) => {
                    if (isFollowupDoneEntry(it)) {
                      return (
                        <li
                          key={it.id}
                          className="border-l-2 border-accent-500 pl-3 py-1"
                        >
                          <div className="text-xs text-slate-400">
                            {new Date(it.completedAt ?? it.updatedAt).toLocaleString()} ·
                            followup-done
                          </div>
                          <div className="text-slate-200">完成: {it.nextStep}</div>
                          {it.nextCommitment && (
                            <div className="text-xs text-slate-400 mt-1">
                              下次承諾: {it.nextCommitment}
                            </div>
                          )}
                        </li>
                      );
                    }
                    return (
                      <li key={it.id} className="border-l-2 border-accent-500 pl-3 py-1">
                        <div className="text-xs text-slate-400">
                          {new Date(it.occurredAt).toLocaleString()} · {it.kind}
                        </div>
                        <div className="text-slate-200">{it.summary}</div>
                        {it.nextCommitment && (
                          <div className="text-xs text-slate-400 mt-1">
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