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
      <h2 id="timeline-h" className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-brand-600" /> 互動時間線
      </h2>
      {sortedContacts.length === 0 ? (
        <EmptyState
          title="沒有互動紀錄"
          hint="在聯絡人新增時建立交換事件,或完成回訪後會自動記錄。"
        />
      ) : (
        <div className="space-y-2">
          {sortedContacts.map((c) => {
            const tl = getTimeline(c.id, state).slice(0, 3);
            return (
              <details key={c.id} className="card group">
                <summary className="cursor-pointer p-4 font-medium text-slate-900 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <span>{c.payload.name ?? c.payload.company ?? "(無姓名)"}</span>
                  <span className="font-mono text-xs text-slate-500 font-normal">
                    {tl.length} 筆互動
                  </span>
                </summary>
                <ul className="px-4 pb-4 space-y-2 text-sm border-t border-slate-100 pt-3">
                  {tl.map((it) => {
                    if (isFollowupDoneEntry(it)) {
                      return (
                        <li
                          key={it.id}
                          className="border-l-2 border-brand-500 pl-3 py-1"
                        >
                          <div className="text-xs text-slate-500 font-mono">
                            {new Date(it.completedAt ?? it.updatedAt).toLocaleString("zh-TW")} ·{" "}
                            followup-done
                          </div>
                          <div className="text-slate-700">完成: {it.nextStep}</div>
                          {it.nextCommitment && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              下次承諾: {it.nextCommitment}
                            </div>
                          )}
                        </li>
                      );
                    }
                    return (
                      <li key={it.id} className="border-l-2 border-brand-500 pl-3 py-1">
                        <div className="text-xs text-slate-500 font-mono">
                          {new Date(it.occurredAt).toLocaleString("zh-TW")} · {it.kind}
                        </div>
                        <div className="text-slate-700">{it.summary}</div>
                        {it.nextCommitment && (
                          <div className="text-xs text-slate-500 mt-0.5">
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