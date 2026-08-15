"use client";

import { useStore } from "@/lib/store";
import { Trash2, Tag as TagIcon } from "lucide-react";
import type { Contact } from "@/lib/types";

export function ContactRow({ contact }: { contact: Contact }) {
  const deleteContact = useStore((s) => s.deleteContact);
  const p = contact.payload;
  return (
    <li className="glass-card p-4 flex items-start justify-between gap-3 animate-fade-in">
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-white">{p.name ?? p.company ?? "(無姓名)"}</div>
        <div className="text-xs text-slate-400 font-body">
          {p.title && `${p.title} · `}
          {p.company}
        </div>
        {p.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {p.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent-600/20 text-accent-500 border border-accent-600/30"
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
        className="p-2 rounded-md text-slate-400 hover:text-danger-500 hover:bg-danger-500/10 transition-colors cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      {p.notes && (
        <p className="mt-2 text-sm text-slate-300 col-span-full">{p.notes}</p>
      )}
    </li>
  );
}