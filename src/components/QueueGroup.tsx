"use client";

import { useState } from "react";
import clsx from "clsx";
import { useStore } from "@/lib/store";
import { isFollowupDueToday, isFollowupOverdue } from "@/lib/domain";
import { AlertTriangle, CheckCircle2, Clock, MoreHorizontal, ChevronRight } from "lucide-react";
import type { Contact, Followup } from "@/lib/types";

export type QueueGroup = "overdue" | "today" | "upcoming";

interface QueueItemProps {
  followup: Followup;
  contact: Contact | null;
  group: QueueGroup;
  onOpenDetail: (id: string) => void;
}

/** 將「完成回訪」表單內嵌在 queue item 內,送出後自動關閉並更新 store。 */
export function QueueItem({ followup, contact, group, onOpenDetail }: QueueItemProps) {
  const completeFollowup = useStore((s) => s.completeFollowup);
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [next, setNext] = useState("");

  if (!contact) return null;

  const p = contact.payload;
  const displayName = p.name ?? p.company ?? "(無姓名)";
  const overdue = group === "overdue" || isFollowupOverdue(followup);
  const today = group === "today" || isFollowupDueToday(followup);

  const due = new Date(followup.dueDate);
  const now = new Date();
  const daysDiff = Math.floor(
    (due.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      (24 * 3600 * 1000),
  );
  const dueLabel = overdue
    ? daysDiff === -1
      ? "逾期 1 天"
      : `逾期 ${Math.abs(daysDiff)} 天`
    : today
      ? "今天"
      : daysDiff === 0
        ? "今天"
        : `還有 ${daysDiff} 天`;

  return (
    <li
      className={clsx(
        "group/item relative border-t border-slate-100 first:border-t-0 transition-colors",
        overdue && "bg-amber-50/40",
      )}
      data-testid={`queue-item-${group}`}
    >
      <div
        className="grid items-center gap-3 px-3 py-3 sm:py-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] cursor-pointer hover:bg-slate-50 focus-within:bg-slate-50"
        role="group"
        tabIndex={0}
        onClick={(e) => {
          // 避免被內部 button 點擊觸發
          const target = e.target as HTMLElement;
          if (target.closest("button")) return;
          onOpenDetail(contact.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenDetail(contact.id);
          }
        }}
        aria-label={`回訪 ${displayName}`}
      >
        <div
          aria-hidden="true"
          className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm shrink-0"
        >
          {(displayName.trim().charAt(0) || "·").toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-slate-900 truncate">{displayName}</div>
          <div className="text-xs text-slate-500 truncate">
            {p.company ? `${p.company}` : ""}
            {p.title ? ` · ${p.title}` : ""}
          </div>
          <div className="mt-0.5 text-xs text-slate-700 truncate">
            <span className="text-brand-600" aria-hidden="true">↳</span>{" "}
            {followup.nextStep}
          </div>
        </div>
        <div
          className={clsx(
            "text-right shrink-0",
            overdue ? "text-amber-700" : today ? "text-brand-700" : "text-slate-600",
          )}
        >
          <div className="text-xs font-semibold">{dueLabel}</div>
          <div className="text-[11px] text-slate-500 font-mono">
            {due.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            className="btn-primary !py-1.5 !text-xs"
            aria-label={`完成 ${displayName} 的回訪`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> 完成
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(contact.id);
            }}
            aria-label={`查看 ${displayName} 的詳細資料`}
            className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {open && (
        <form
          className="px-3 pb-3 pt-2 space-y-2 border-t border-slate-100 bg-slate-50/50"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!summary.trim()) return;
            completeFollowup(followup.id, summary.trim(), next.trim() || null);
            setOpen(false);
            setSummary("");
            setNext("");
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <label className="block text-xs">
            <span className="font-medium text-slate-700">這次做了什麼?</span>
            <textarea
              required
              autoFocus
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className="input mt-1"
              aria-label="互動摘要"
            />
          </label>
          <label className="block text-xs">
            <span className="font-medium text-slate-700">下次承諾 (選填)</span>
            <input
              type="text"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="input mt-1"
              aria-label="下次承諾"
              placeholder="例如:下週三拜訪"
            />
          </label>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn-primary !py-1.5 !text-xs">
              送出
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-secondary !py-1.5 !text-xs"
            >
              取消
            </button>
            <span className="ml-auto text-[11px] text-slate-500 inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> {new Date(followup.createdAt).toLocaleDateString("zh-TW")}
            </span>
          </div>
        </form>
      )}
    </li>
  );
}

interface QueueGroupProps {
  group: QueueGroup;
  items: Array<Followup & { contact: Contact | null }>;
  onOpenDetail: (id: string) => void;
}

export function QueueGroup({ group, items, onOpenDetail }: QueueGroupProps) {
  const icon = group === "overdue" ? AlertTriangle : group === "today" ? CheckCircle2 : ChevronRight;
  const Icon = icon;
  const label =
    group === "overdue"
      ? "逾期 · 需要先處理"
      : group === "today"
        ? "今天 · 先把承諾交出去"
        : "接下來 · 先排好就不會忘";
  if (items.length === 0) return null;
  return (
    <section
      aria-labelledby={`queue-group-${group}`}
      className="mb-3"
    >
      <div
        id={`queue-group-${group}`}
        className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5"
      >
        <Icon
          className={clsx(
            "w-3.5 h-3.5",
            group === "overdue" && "text-amber-600",
            group === "today" && "text-brand-600",
            group === "upcoming" && "text-slate-400",
          )}
          aria-hidden="true"
        />
        <span>{label}</span>
        <span
          aria-hidden="true"
          className="flex-1 h-px bg-slate-200"
        />
        <span className="font-mono text-slate-400">{items.length}</span>
      </div>
      <ul
        className="card !p-0 divide-y divide-slate-100"
        data-testid={`queue-list-${group}`}
      >
        {items.map((it) => (
          <QueueItem
            key={it.id}
            followup={it}
            contact={it.contact}
            group={group}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </ul>
    </section>
  );
}
