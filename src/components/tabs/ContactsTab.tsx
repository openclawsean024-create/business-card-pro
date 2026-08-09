"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { listContacts, sortContacts } from "@/lib/domain";
import { ContactRow } from "../ContactRow";
import { ContactFormModal } from "../ContactFormModal";
import { SearchBar, type SortMode } from "../SearchBar";
import { EmptyState } from "../Common";
import { Plus } from "lucide-react";

/** SPEC §3.1 FR-001/006/009 + AC-001/008/009 */
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
      <div className="flex items-center justify-between gap-2">
        <h2 id="contacts-h" className="text-xl font-semibold">
          聯絡人 ({filtered.length}/{state.plan.maxContacts})
        </h2>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded bg-brand-600 text-white hover:bg-brand-700"
        >
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