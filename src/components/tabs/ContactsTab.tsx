"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { listContacts, sortContacts } from "@/lib/domain";
import { ContactRow } from "../ContactRow";
import { ContactFormModal } from "../ContactFormModal";
import { SearchBar, type SortMode } from "../SearchBar";
import { EmptyState } from "../Common";
import { Plus } from "lucide-react";

export function ContactsTab() {
  const state = useStore();
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
      <div className="flex items-center justify-between">
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
          {filtered.map((c) => (
            <ContactRow key={c.id} contact={c} />
          ))}
        </ul>
      )}
      {creating && <ContactFormModal contact={null} onClose={() => setCreating(false)} />}
    </section>
  );
}