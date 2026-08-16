"use client";

import { useStore } from "@/lib/store";
import { Trash2, Tag as TagIcon, ChevronDown } from "lucide-react";
import { LogInteractionForm, kindLabel } from "./LogInteractionForm";
import type { Contact, Interaction } from "@/lib/types";

export function ContactRow({ contact }: { contact: Contact }) {
  const deleteContact = useStore((s) => s.deleteContact);
  const allInteractions = useStore((s) => s.interactions);
  const p = contact.payload;

  // 顯示最近 3 筆互動
  const recentInteractions: Interaction[] = allInteractions
    .filter((it) => it.contactId === contact.id)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 3);

  return (
    <li className="card overflow-hidden">
      <details className="group">
        {/* summary 點擊展開/收合,跟 TimelineTab 一致的 interaction */}
        <summary className="cursor-pointer p-4 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors">
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
            {p.notes && <p className="mt-2 text-sm text-slate-600">{p.notes}</p>}
            {/* summary 內顯示最近一筆互動 (用來提示使用者點開) */}
            {recentInteractions[0] && (
              <div className="mt-2 text-xs text-slate-500 font-mono">
                最近互動: {new Date(recentInteractions[0].occurredAt).toLocaleDateString("zh-TW")}{" "}
                · {kindLabel(recentInteractions[0].kind)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              aria-label={`刪除 ${p.name ?? p.company ?? "聯絡人"}`}
              onClick={(e) => {
                e.preventDefault(); // 避免觸發 summary toggle
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
            <ChevronDown
              className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </div>
        </summary>

        {/* 展開區:見面/通話/筆記記錄表單 + 該 contact 時間線 (最近 3 筆) */}
        <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-3">
          <LogInteractionForm contactId={contact.id} />
          {recentInteractions.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <div className="text-xs font-medium text-slate-700 mb-2">
                最近互動 ({recentInteractions.length} 筆)
              </div>
              <ul className="space-y-1.5 text-sm">
                {recentInteractions.map((it) => (
                  <li
                    key={it.id}
                    className="border-l-2 border-brand-400 pl-3 py-0.5"
                  >
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
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </li>
  );
}