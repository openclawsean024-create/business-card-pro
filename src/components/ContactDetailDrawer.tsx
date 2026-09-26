"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { getTimeline, isFollowupDoneEntry, lastInteractionDate } from "@/lib/domain";
import { LogInteractionForm, kindLabel } from "./LogInteractionForm";
import { X, Phone, Mail, MapPin, Globe, Tag as TagIcon, Clock, CheckCircle2 } from "lucide-react";

/**
 * 詳細 drawer(對齊 ui-prototype.html 的 #detailPanel):
 *  - 由 store.ui.selectedContactId 控制 open/close
 *  - ESC 關閉、點 scrim 關閉、focus trap
 *  - 顯示:聯絡人基本資料 / 下一步(完成這次回訪 CTA) / 聯絡資訊 / 互動時間線 / 快速記錄
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

  // 對齊 prototype 的 #detailComplete CTA:輸入 summary → 標 done
  const completeFollowup = useStore((s) => s.completeFollowup);
  const [completing, setCompleting] = useState(false);
  const [summary, setSummary] = useState("");
  const [next, setNext] = useState("");

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
      {/* panel — ws-detail-drawer 對齊 prototype (右側滑入 430px) */}
      <div
        ref={panelRef}
        className="ws-detail-drawer absolute right-0 top-0 sm:w-[430px]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="ws-avatar md shrink-0"
            >
              {(displayName.trim().charAt(0) || "·").toUpperCase()}
            </div>
            <div className="min-w-0">
              <div id="detail-title" className="text-xl font-extrabold tracking-tight">
                {displayName}
              </div>
              {(p.title || p.company) && (
                <div className="text-xs text-[color:var(--muted-app)] truncate">
                  {[p.title, p.company].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={() => updateUI({ selectedContactId: null })}
            aria-label="關閉聯絡人詳細資料"
            className="w-8 h-8 grid place-items-center border-0 rounded-lg text-[color:var(--muted-app)] bg-[color:var(--surface-soft)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {p.tags.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {p.tags.map((t) => (
              <li
                key={t}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[color:var(--surface-soft)] text-[color:var(--muted-app)] border border-[color:var(--line-app)]"
              >
                <TagIcon className="w-3 h-3" /> {t}
              </li>
            ))}
          </ul>
        )}

        {/* 下一步 + 完成這次回訪 CTA(prototype #detailNext + #detailComplete) */}
        <section aria-labelledby="detail-next-h" className="mt-8">
          <div className="text-[11px] font-extrabold tracking-[0.08em] text-[color:var(--faint-app)]">
            下一步
          </div>
          <h3 id="detail-next-h" className="sr-only">
            下一步
          </h3>
          {pendingFollowup ? (
            <>
              <div id="detailNext" className="ws-detail-next">
                {pendingFollowup.nextStep}
              </div>
              {!completing ? (
                <button
                  id="detailComplete"
                  type="button"
                  className="btn-primary mt-4 w-full"
                  onClick={() => setCompleting(true)}
                >
                  <CheckCircle2 className="w-4 h-4" /> 完成這次回訪
                </button>
              ) : (
                <form
                  className="mt-4 space-y-3 p-3 border border-[color:var(--line-app)] rounded-lg bg-[color:var(--surface-soft)]"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!summary.trim()) return;
                    completeFollowup(
                      pendingFollowup.id,
                      summary.trim(),
                      next.trim() || null,
                    );
                    setCompleting(false);
                    setSummary("");
                    setNext("");
                    updateUI({ selectedContactId: null });
                  }}
                >
                  <label className="block text-xs">
                    <span className="font-medium">這次做了什麼?</span>
                    <textarea
                      required
                      autoFocus
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      rows={2}
                      className="input mt-1.5"
                      aria-label="互動摘要"
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="font-medium">下次承諾 (選填)</span>
                    <input
                      type="text"
                      value={next}
                      onChange={(e) => setNext(e.target.value)}
                      className="input mt-1.5"
                      aria-label="下次承諾"
                      placeholder="例如:下週三拜訪"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary !py-1.5">
                      送出
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompleting(false)}
                      className="btn-secondary !py-1.5"
                    >
                      取消
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="mt-2 p-3 border border-dashed border-[color:var(--line-app)] rounded-md text-xs text-[color:var(--muted-app)]">
              沒有待回訪。在「聯絡人」分頁可以新增。
            </div>
          )}
        </section>

        {/* 聯絡資訊 */}
        <section aria-labelledby="detail-info-h" className="mt-8">
          <div className="text-[11px] font-extrabold tracking-[0.08em] text-[color:var(--faint-app)]">
            聯絡資訊
          </div>
          <h3 id="detail-info-h" className="sr-only">
            聯絡資訊
          </h3>
          <dl className="mt-2 text-sm">
            {p.phone && (
              <div className="flex justify-between gap-3 py-3 border-b border-[color:var(--line-app)]">
                <span className="text-[color:var(--muted-app)] flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" aria-hidden="true" /> 電話
                </span>
                <dd className="text-[color:var(--ink-app)] font-bold text-right">{p.phone}</dd>
              </div>
            )}
            {p.email && (
              <div className="flex justify-between gap-3 py-3 border-b border-[color:var(--line-app)]">
                <span className="text-[color:var(--muted-app)] flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" aria-hidden="true" /> Email
                </span>
                <dd className="text-[color:var(--ink-app)] font-bold text-right truncate">
                  {p.email}
                </dd>
              </div>
            )}
            {p.address && (
              <div className="flex justify-between gap-3 py-3 border-b border-[color:var(--line-app)]">
                <span className="text-[color:var(--muted-app)] flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> 地址
                </span>
                <dd className="text-[color:var(--ink-app)] font-bold text-right truncate">
                  {p.address}
                </dd>
              </div>
            )}
            {p.website && (
              <div className="flex justify-between gap-3 py-3 border-b border-[color:var(--line-app)]">
                <span className="text-[color:var(--muted-app)] flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5" aria-hidden="true" /> 網站
                </span>
                <dd className="text-[color:var(--ink-app)] font-bold text-right truncate">
                  {p.website}
                </dd>
              </div>
            )}
            {lastTouch && (
              <div className="flex justify-between gap-3 py-3 border-b border-[color:var(--line-app)]">
                <span className="text-[color:var(--muted-app)] flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" /> 最近互動
                </span>
                <dd className="text-[color:var(--ink-app)] font-bold text-right font-mono text-xs">
                  {new Date(lastTouch).toLocaleDateString("zh-TW")}
                </dd>
              </div>
            )}
          </dl>
          {!p.phone && !p.email && !p.address && !p.website && !lastTouch && (
            <p className="mt-2 text-xs text-[color:var(--muted-app)]">尚未填寫聯絡資料。</p>
          )}
        </section>

        {/* 互動時間線 */}
        <section aria-labelledby="detail-tl-h" className="mt-8">
          <div className="text-[11px] font-extrabold tracking-[0.08em] text-[color:var(--faint-app)]">
            互動時間線
          </div>
          <h3 id="detail-tl-h" className="sr-only">
            互動時間線
          </h3>
          {timeline.length === 0 ? (
            <p className="mt-2 text-xs text-[color:var(--muted-app)]">尚無互動紀錄。</p>
          ) : (
            <ol className="mt-2 space-y-2">
              {timeline.slice(0, 10).map((entry) => {
                if (isFollowupDoneEntry(entry)) {
                  return (
                    <li
                      key={entry.id}
                      className="border-l-2 border-brand-500 pl-3 py-1 text-sm"
                    >
                      <div className="text-xs text-[color:var(--muted-app)] font-mono">
                        {new Date(entry.completedAt ?? entry.updatedAt).toLocaleString("zh-TW")} · 完成回訪
                      </div>
                      <div className="text-slate-700">{entry.nextStep}</div>
                      {entry.nextCommitment && (
                        <div className="text-xs text-[color:var(--muted-app)] mt-0.5">
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
                    <div className="text-xs text-[color:var(--muted-app)] font-mono">
                      {new Date(entry.occurredAt).toLocaleString("zh-TW")} ·{" "}
                      {kindLabel(entry.kind)}
                    </div>
                    <div className="text-slate-700">{entry.summary}</div>
                    {entry.nextCommitment && (
                      <div className="text-xs text-[color:var(--muted-app)] mt-0.5">
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
        <section aria-labelledby="detail-log-h" className="mt-8 mb-6">
          <div className="text-[11px] font-extrabold tracking-[0.08em] text-[color:var(--faint-app)]">
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
  );
}
