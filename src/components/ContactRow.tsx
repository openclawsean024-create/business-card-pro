"use client";

import { useStore } from "@/lib/store";
import { Trash2, Tag as TagIcon } from "lucide-react";
import type { Contact } from "@/lib/types";

export function ContactRow({ contact }: { contact: Contact }) {
  const deleteContact = useStore((s) => s.deleteContact);
  const p = contact.payload;
  return (
    <li className="card p-4 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="font-medium text-slate-900">
          {p.name ?? p.company ?? "(無姓名)"}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">
          {p.title && `${p.title} · `}
          {p.company}
        </div>
        {p.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {p.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
              >
                <TagIcon className="w-3 h-3" /> {t}
              </span>
            ))}
          </div>
        )}
        {p.notes && (
          <p className="mt-2 text-sm text-slate-600">{p.notes}</p>
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
        className="p-2 rounded-md text-slate-400 hover:text-danger-600 hover:bg-danger-50 transition-colors cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  );
}