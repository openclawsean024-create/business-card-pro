"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { getTimeline, isFollowupDoneEntry, listContacts, sortContacts } from "@/lib/domain";
import { EmptyState } from "../Common";
import { LogInteractionForm, kindLabel } from "../LogInteractionForm";
import { MessageSquare, Plus, X } from "lucide-react";

export function TimelineTab() {
  const state = useStore();
  const sortedContacts = useMemo(
    () => sortContacts(listContacts(state), "createdAt"),
    [state],
  );

  // 快速記錄:選 contact → 顯示 LogInteractionForm
  const [quickLogContactId, setQuickLogContactId] = useState<string | null>(null);
  const quickLogContact = state.contacts.find((c) => c.id === quickLogContactId) ?? null;

  return (
    <section aria-labelledby="timeline-h" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="timeline-h" className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand-600" /> 互動時間線
        </h2>
        {sortedContacts.length > 0 && quickLogContactId === null && (
          <button
            onClick={() => setQuickLogContactId("__pick__")}
            className="btn-primary"
            aria-label="快速記錄新互動"
          >
            <Plus className="w-4 h-4" /> 快速記錄
          </button>
        )}
      </div>

      {/* 快速記錄區:點按鈕後展開 contact picker + form */}
      {quickLogContactId === "__pick__" && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <label htmlFor="quick-log-contact" className="text-sm font-medium text-slate-700">
              選聯絡人:
            </label>
            <select
              id="quick-log-contact"
              autoFocus
              value=""
              onChange={(e) => {
                if (e.target.value) setQuickLogContactId(e.target.value);
              }}
              className="input flex-1"
            >
              <option value="">請選擇...</option>
              {sortedContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.payload.name ?? c.payload.company ?? "(無姓名)"}
                  {c.payload.company && c.payload.name ? ` · ${c.payload.company}` : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setQuickLogContactId(null)}
              className="btn-ghost"
              aria-label="取消快速記錄"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {quickLogContact && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-slate-500">快速記錄給</span>{" "}
              <span className="font-medium text-slate-900">
                {quickLogContact.payload.name ?? quickLogContact.payload.company}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setQuickLogContactId(null)}
              className="btn-ghost !text-xs"
              aria-label="關閉快速記錄"
            >
              <X className="w-3.5 h-3.5" /> 關閉
            </button>
          </div>
          <LogInteractionForm
            contactId={quickLogContact.id}
            onLogged={() => {
              // 記錄成功後關閉 picker
              setQuickLogContactId(null);
            }}
          />
        </div>
      )}

      {sortedContacts.length === 0 ? (
        <EmptyState
          title="沒有互動紀錄"
          hint="在聯絡人新增時建立交換事件,或完成回訪後會自動記錄。也可以從右上方「快速記錄」新增。"
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
                          {new Date(it.occurredAt).toLocaleString("zh-TW")} ·{" "}
                          {kindLabel(it.kind)}
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