"use client";

import { useState } from "react";
import clsx from "clsx";
import { useStore } from "@/lib/store";
import { isFollowupOverdue } from "@/lib/domain";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import type { Contact, Followup } from "@/lib/types";

interface FollowupCardProps {
  followup: Followup;
  contact: Contact | null;
  onComplete: (id: string, summary: string, nextCommitment: string | null) => void;
}

export function FollowupCard({ followup, contact, onComplete }: FollowupCardProps) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [next, setNext] = useState("");
  const overdue = isFollowupOverdue(followup);

  if (!contact) return null;

  return (
    <li
      className={clsx(
        "rounded-lg border p-3",
        overdue
          ? "border-amber-300 bg-amber-50 dark:bg-amber-950/30"
          : "border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800",
      )}
      data-testid="followup-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">
            {contact.payload.name ?? contact.payload.company ?? "(無姓名)"}
            {contact.payload.company && (
              <span className="text-slate-500 dark:text-slate-400 text-sm ml-1">
                · {contact.payload.company}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
            <Clock className="w-3 h-3" /> {new Date(followup.dueDate).toLocaleDateString()}
            {overdue && (
              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-3 h-3" /> 逾期
              </span>
            )}
          </div>
          <p className="mt-2 text-sm">{followup.nextStep}</p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 inline-flex items-center gap-1 text-sm px-2 py-1 rounded bg-brand-600 text-white hover:bg-brand-700"
          aria-label="完成回訪"
        >
          <CheckCircle2 className="w-4 h-4" /> 完成
        </button>
      </div>
      {open && (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!summary.trim()) return;
            onComplete(followup.id, summary.trim(), next.trim() || null);
            setOpen(false);
            setSummary("");
            setNext("");
          }}
        >
          <label className="block text-xs">
            這次做了什麼?
            <textarea
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
              rows={2}
            />
          </label>
          <label className="block text-xs">
            下次承諾(選填)
            <input
              type="text"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              className="text-sm px-3 py-1.5 rounded bg-brand-600 text-white hover:bg-brand-700"
            >
              送出
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700"
            >
              取消
            </button>
          </div>
        </form>
      )}
    </li>
  );
}