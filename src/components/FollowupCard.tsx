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
        "card p-4 space-y-3",
        overdue && "border-amber-300 bg-amber-50",
      )}
      data-testid="followup-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-slate-900 text-base">
            {contact.payload.name ?? contact.payload.company ?? "(無姓名)"}
            {contact.payload.company && (
              <span className="text-slate-500 font-normal text-sm ml-1">
                · {contact.payload.company}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-2 mt-1 font-mono">
            <Clock className="w-3 h-3" /> {new Date(followup.dueDate).toLocaleDateString("zh-TW")}
            {overdue && (
              <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                <AlertTriangle className="w-3 h-3" /> 逾期
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-700">{followup.nextStep}</p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="btn-primary shrink-0"
          aria-label="完成回訪"
        >
          <CheckCircle2 className="w-4 h-4" /> 完成
        </button>
      </div>
      {open && (
        <form
          className="space-y-3 pt-3 border-t border-slate-100"
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
            <span className="font-medium text-slate-700">這次做了什麼?</span>
            <textarea
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="input mt-1.5"
              rows={2}
            />
          </label>
          <label className="block text-xs">
            <span className="font-medium text-slate-700">下次承諾(選填)</span>
            <input
              type="text"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="input mt-1.5"
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">
              送出
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
              取消
            </button>
          </div>
        </form>
      )}
    </li>
  );
}