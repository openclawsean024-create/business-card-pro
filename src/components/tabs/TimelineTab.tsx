"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { getTimeline, isFollowupDoneEntry } from "@/lib/domain";
import { EmptyState } from "../Common";
import { LogInteractionForm, kindLabel } from "../LogInteractionForm";
import { MessageSquare, Plus, X } from "lucide-react";

/**
 * 互動時間線(全站彙總 + 快速記錄)。
 * - 由新到舊列出所有 followup-done + interaction
 * - 每筆 → 開 ContactDetailDrawer
 * - 右上「快速記錄」picker(沿用 v3 UX)
 */
export function TimelineTab() {
  const state = useStore();
  const updateUI = useStore((s) => s.updateUI);

  const entries = useMemo(() => {
    const all: Array<{
      id: string;
      contactId: string;
      contactName: string;
      kind: string;
      summary: string;
      ts: number;
      nextCommitment?: string | null;
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
            kind: "完成回訪",
            summary: e.nextStep,
            ts: new Date(e.completedAt ?? e.updatedAt).getTime(),
            nextCommitment: e.nextCommitment,
          });
        } else {
          all.push({
            id: e.id,
            contactId: c.id,
            contactName: display,
            kind: kindLabel(e.kind),
            summary: e.summary,
            ts: new Date(e.occurredAt).getTime(),
            nextCommitment: e.nextCommitment,
          });
        }
      }
    }
    return all.sort((a, b) => b.ts - a.ts);
  }, [state]);

  const sortedContacts = useMemo(
    () =>
      state.contacts
        .filter((c) => c.status === "active")
        .sort((a, b) => a.payload.name?.localeCompare(b.payload.name ?? "") ?? 0),
    [state.contacts],
  );

  return (
    <section aria-labelledby="timeline-h" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="timeline-h" className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand-600" /> 互動時間線
        </h2>
        {sortedContacts.length > 0 && <QuickLogPicker contacts={sortedContacts} />}
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="沒有互動紀錄"
          hint="完成回訪後會自動寫入時間線,或從右上方『快速記錄』手動新增。"
        />
      ) : (
        <ol
          className="card !p-0 divide-y divide-slate-100"
          data-testid="global-timeline"
        >
          {entries.map((e) => (
            <li key={`${e.contactId}-${e.id}`}>
              <button
                type="button"
                onClick={() => updateUI({ selectedContactId: e.contactId })}
                className="w-full text-left flex items-start gap-3 p-4 hover:bg-slate-50 cursor-pointer"
                aria-label={`查看 ${e.contactName} 的詳細資料`}
              >
                <div
                  aria-hidden="true"
                  className="mt-1 w-2 h-2 rounded-full bg-brand-600 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-slate-900 truncate">
                      {e.contactName}
                    </div>
                    <time
                      className="text-xs text-slate-500 font-mono shrink-0"
                      dateTime={new Date(e.ts).toISOString()}
                    >
                      {new Date(e.ts).toLocaleString("zh-TW", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{e.kind}</div>
                  <div className="text-sm text-slate-700 mt-0.5 line-clamp-2">
                    {e.summary}
                  </div>
                  {e.nextCommitment && (
                    <div className="text-xs text-slate-500 mt-1">
                      下次承諾: {e.nextCommitment}
                    </div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

interface QuickLogPickerProps {
  contacts: Array<{ id: string; payload: { name: string | null; company: string | null } }>;
}

function QuickLogPicker({ contacts }: QuickLogPickerProps) {
  const [picker, setPicker] = useState<string | null>(null);
  const active = contacts.find((c) => c.id === picker);

  if (active) {
    return (
      <div className="card p-4 space-y-3 w-full">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="text-slate-500">快速記錄給</span>{" "}
            <span className="font-medium text-slate-900">
              {active.payload.name ?? active.payload.company}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPicker(null)}
            className="btn-ghost !text-xs"
            aria-label="關閉快速記錄"
          >
            <X className="w-3.5 h-3.5" /> 關閉
          </button>
        </div>
        <LogInteractionForm
          contactId={active.id}
          onLogged={() => setPicker(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex">
      <button
        type="button"
        onClick={() => setPicker("__pick__")}
        className="btn-primary"
      >
        <Plus className="w-4 h-4" /> 快速記錄
      </button>
      <select
        aria-label="快速記錄 — 選擇聯絡人"
        className="sr-only"
        tabIndex={-1}
        value=""
        onChange={(e) => {
          if (e.target.value) setPicker(e.target.value);
        }}
      >
        <option value="">請選擇</option>
        {contacts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.payload.name ?? c.payload.company ?? "(無姓名)"}
          </option>
        ))}
      </select>
    </div>
  );
}