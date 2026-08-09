"use client";

import { useStore } from "@/lib/store";
import { Trash2, Tag as TagIcon } from "lucide-react";
import type { Contact } from "@/lib/types";

export function ContactRow({ contact }: { contact: Contact }) {
  const deleteContact = useStore((s) => s.deleteContact);
  const p = contact.payload;
  return (
    <li className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{p.name ?? p.company ?? "(無姓名)"}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {p.title && `${p.title} · `}
            {p.company}
          </div>
          {p.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {p.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800"
                >
                  <TagIcon className="w-3 h-3" /> {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          aria-label={`刪除 ${p.name ?? p.company ?? "聯絡人"}`}
          onClick={() => {
            if (
              confirm(
                `確定刪除「${p.name ?? p.company ?? "(無姓名)"}」?相關照片與互動紀錄會一併清除。`,
              )
            ) {
              deleteContact(contact.id);
            }
          }}
          className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {p.notes && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{p.notes}</p>
      )}
    </li>
  );
}