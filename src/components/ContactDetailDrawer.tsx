"use client";

import { useEffect, useMemo, useRef } from "react";
import { useStore } from "@/lib/store";
import { getTimeline, isFollowupDoneEntry, lastInteractionDate } from "@/lib/domain";
import { LogInteractionForm, kindLabel } from "./LogInteractionForm";
import { X, Phone, Mail, MapPin, Globe, Tag as TagIcon, Clock } from "lucide-react";

/**
 * 詳細 drawer。
 * - 由 store.ui.selectedContactId 控制 open/close
 * - ESC 關閉、點 scrim 關閉、focus trap
 * - 顯示:聯絡人基本資料 / 下一步 / 聯絡資訊 / 互動時間線 / 快速記錄
 *
 * 對齊 SPEC §3.1 FR-007 互動時間線 + UI-SPEC §3.3 detail drawer。
 */
export function ContactDetailDrawer() {
  const contactId = useStore((s) => s.ui.selectedContactId);
  const updateUI = useStore((s) => s.updateUI);
  const state = useStore();

  const contact = useMemo(
    () => (contactId ? state.contacts.find((c) => c.id === contactId && c.status === "active") ?? null : null),
    [state.contacts, contactId],
  );

  const pendingFollowup = useMemo(
    () =>
      contactId
        ? state.followups
            .filter((f) => f.contactId === contactId && f.status === "pending")
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]
        : null,
    [state.followups, contactId],
  );

  const timeline = useMemo(
    () => (contactId ? getTimeline(contactId, state) : []),
    [contactId, state],
  );
  const lastTouch = useMemo(
    () => (contactId ? lastInteractionDate(contactId, state) : null),
    [contactId, state],
  );

  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // ESC 關閉 + focus 移轉
  useEffect(() => {
    if (!contact) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        updateUI({ selectedContactId: null });
      }
    }
    document.addEventListener("keydown", onKey);
    // 開啟時把焦點帶到關閉按鈕,符合 a11y 習慣
    const t = setTimeout(() => closeBtnRef.current?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [contact, updateUI]);

  if (!contact) return null;
  const p = contact.payload;
  const displayName = p.name ?? p.company ?? "(無姓名)";

  return (
    <div
      className="fixed inset-0 z-40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-title"
    >
      {/* scrim */}
      <button
        type="button"
        aria-label="關閉詳細面板"
        onClick={() => updateUI({ selectedContactId: null })}
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm cursor-default"
      />
      {/* panel */}
      <div
        ref={panelRef}
        className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white border-l border-slate-200 shadow-xl overflow-y-auto"
      >
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between gap-3">
          <h2 id="detail-title" className="text-base font-semibold text-slate-900 truncate">
            {displayName}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={() => updateUI({ selectedContactId: null })}
            aria-label="關閉詳細面板"
            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-6">
          <div>
            <div className="flex items-center gap-3">
              <div
                aria-hidden="true"
                className="w-12 h-12 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-lg"
              >
                {(displayName.trim().charAt(0) || "·").toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-lg font-semibold text-slate-900 truncate">{displayName}</div>
                {p.title && p.company ? (
                  <div className="text-xs text-slate-500 truncate">
                    {p.title} · {p.company}
                  </div>
                ) : p.company ? (
                  <div className="text-xs text-slate-500 truncate">{p.company}</div>
                ) : null}
              </div>
            </div>

            {p.tags.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {p.tags.map((t) => (
                  <li
                    key={t}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    <TagIcon className="w-3 h-3" /> {t}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 下一步 / 回訪 */}
          <section aria-labelledby="detail-next-h">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
              下一步
            </div>
            <h3 id="detail-next-h" className="sr-only">
              下一步
            </h3>
            {pendingFollowup ? (
              <div className="mt-2 p-3 border border-brand-200 bg-brand-50 rounded-md text-sm text-slate-900">
                <div className="font-medium">{pendingFollowup.nextStep}</div>
                <div className="text-xs text-slate-500 mt-1 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  到期 {new Date(pendingFollowup.dueDate).toLocaleDateString("zh-TW")}
                </div>
              </div>
            ) : (
              <div className="mt-2 p-3 border border-dashed border-slate-300 rounded-md text-xs text-slate-500">
                沒有待回訪。在「聯絡人」分頁可以新增。
              </div>
            )}
          </section>

          {/* 聯絡資訊 */}
          <section aria-labelledby="detail-info-h">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
              聯絡資訊
            </div>
            <h3 id="detail-info-h" className="sr-only">
              聯絡資訊
            </h3>
            <dl className="mt-2 text-sm divide-y divide-slate-100 border border-slate-200 rounded-md overflow-hidden">
              {p.phone && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-white">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                  <dt className="sr-only">電話</dt>
                  <dd className="text-slate-900">{p.phone}</dd>
                </div>
              )}
              {p.email && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-white">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                  <dt className="sr-only">Email</dt>
                  <dd className="text-slate-900 truncate">{p.email}</dd>
                </div>
              )}
              {p.address && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-white">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                  <dt className="sr-only">地址</dt>
                  <dd className="text-slate-900 truncate">{p.address}</dd>
                </div>
              )}
              {p.website && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-white">
                  <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                  <dt className="sr-only">網站</dt>
                  <dd className="text-slate-900 truncate">{p.website}</dd>
                </div>
              )}
              {lastTouch && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                  <dt className="text-slate-500">最近互動</dt>
                  <dd className="text-slate-900 ml-auto font-mono text-xs">
                    {new Date(lastTouch).toLocaleDateString("zh-TW")}
                  </dd>
                </div>
              )}
            </dl>
            {!p.phone && !p.email && !p.address && !p.website && !lastTouch && (
              <p className="mt-2 text-xs text-slate-500">尚未填寫聯絡資料。</p>
            )}
          </section>

          {/* 互動時間線 */}
          <section aria-labelledby="detail-tl-h">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
              互動時間線
            </div>
            <h3 id="detail-tl-h" className="sr-only">
              互動時間線
            </h3>
            {timeline.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">尚無互動紀錄。</p>
            ) : (
              <ol className="mt-2 space-y-2">
                {timeline.slice(0, 10).map((entry) => {
                  if (isFollowupDoneEntry(entry)) {
                    return (
                      <li
                        key={entry.id}
                        className="border-l-2 border-brand-500 pl-3 py-1 text-sm"
                      >
                        <div className="text-xs text-slate-500 font-mono">
                          {new Date(entry.completedAt ?? entry.updatedAt).toLocaleString("zh-TW")} · 完成回訪
                        </div>
                        <div className="text-slate-700">{entry.nextStep}</div>
                        {entry.nextCommitment && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            下次承諾: {entry.nextCommitment}
                          </div>
                        )}
                      </li>
                    );
                  }
                  return (
                    <li
                      key={entry.id}
                      className="border-l-2 border-brand-400 pl-3 py-1 text-sm"
                    >
                      <div className="text-xs text-slate-500 font-mono">
                        {new Date(entry.occurredAt).toLocaleString("zh-TW")} ·{" "}
                        {kindLabel(entry.kind)}
                      </div>
                      <div className="text-slate-700">{entry.summary}</div>
                      {entry.nextCommitment && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          下次承諾: {entry.nextCommitment}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {/* 快速記錄 */}
          <section aria-labelledby="detail-log-h">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
              快速記錄
            </div>
            <h3 id="detail-log-h" className="sr-only">
              快速記錄
            </h3>
            <div className="mt-2">
              <LogInteractionForm
                contactId={contact.id}
                onLogged={() => {
                  /* interaction 已寫進 store,drawer 內 timeline 會即時更新 */
                }}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}