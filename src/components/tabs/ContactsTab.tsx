"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { listContacts, sortContacts, lastInteractionDate } from "@/lib/domain";
import { ContactFormModal } from "../ContactFormModal";
import { SearchBar, type SortMode } from "../SearchBar";
import { EmptyState } from "../Common";
import { Plus, ChevronRight, Trash2 } from "lucide-react";

/**
 * 聯絡人總覽(全清單)
 * - 搜尋 / 標籤篩選 / 排序
 * - 點 row → 開 ContactDetailDrawer(右上 slide-in)
 * - 右上「新增」開 ContactFormModal(可直接建立 followup 並進入 queue)
 */
export function ContactsTab() {
  const state = useStore();
  const updateUI = useStore((s) => s.updateUI);
  const deleteContact = useStore((s) => s.deleteContact);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(
    () => sortContacts(listContacts(state), state.ui.sortMode, state.followups),
    [state],
  );

  const allTags = useMemo(
    () => Array.from(new Set(state.contacts.flatMap((c) => c.payload.tags))).sort(),
    [state.contacts],
  );

  return (
    <section aria-labelledby="contacts-h" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="contacts-h" className="text-2xl font-semibold text-slate-900">
          聯絡人{" "}
          <span className="font-mono text-base font-normal text-slate-500">
            ({filtered.length}/{state.plan.maxContacts})
          </span>
        </h2>
        <button onClick={() => setCreating(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> 新增
        </button>
      </div>
      <SearchBar
        value={state.ui.searchQuery}
        onChange={(v) => state.updateUI({ searchQuery: v })}
        tag={state.ui.activeTag}
        onTag={(t) => state.updateUI({ activeTag: t })}
        tags={allTags}
        sortMode={state.ui.sortMode as SortMode}
        onSort={(m) => state.updateUI({ sortMode: m })}
      />
      {filtered.length === 0 ? (
        <EmptyState title="沒有聯絡人" hint="點『新增』建立第一位,或匯入 CSV。" />
      ) : (
        <ul className="space-y-2" data-testid="contact-list">
          {filtered.map((c) => {
            const p = c.payload;
            const display = p.name ?? p.company ?? "(無姓名)";
            const last = lastInteractionDate(c.id, state);
            return (
              <li key={c.id} className="card">
                <div className="flex items-center gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => updateUI({ selectedContactId: c.id })}
                    className="flex-1 min-w-0 flex items-center gap-3 text-left hover:bg-slate-50 rounded-md -mx-2 px-2 py-1 transition-colors cursor-pointer"
                  >
                    <div
                      aria-hidden="true"
                      className="w-9 h-9 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm shrink-0"
                    >
                      {(display.trim().charAt(0) || "·").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-900 truncate">{display}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {[p.title, p.company].filter(Boolean).join(" · ")}
                      </div>
                      {p.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {p.tags.slice(0, 4).map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200"
                            >
                              {t}
                            </span>
                          ))}
                          {p.tags.length > 4 && (
                            <span className="text-[10px] text-slate-400">+{p.tags.length - 4}</span>
                          )}
                        </div>
                      )}
                      {last && (
                        <div className="mt-1 text-[11px] text-slate-500 font-mono">
                          最近互動 {new Date(last).toLocaleDateString("zh-TW")}
                        </div>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateUI({ selectedContactId: c.id })}
                      aria-label={`查看 ${display} 詳細資料`}
                      className="p-2 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`刪除 ${display}`}
                      onClick={() => {
                        if (
                          confirm(
                            `確定刪除「${display}」?相關照片與互動紀錄會一併清除。`,
                          )
                        ) {
                          deleteContact(c.id);
                        }
                      }}
                      className="p-2 rounded-md text-slate-400 hover:text-danger-600 hover:bg-danger-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {creating && <ContactFormModal contact={null} onClose={() => setCreating(false)} />}
    </section>
  );
}