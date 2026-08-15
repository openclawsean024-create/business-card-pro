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
        "glass-card p-4 space-y-3 animate-fade-in",
        overdue && "border-amber-500/50 bg-amber-500/10",
      )}
      data-testid="followup-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-white text-base">
            {contact.payload.name ?? contact.payload.company ?? "(無姓名)"}
            {contact.payload.company && (
              <span className="text-slate-400 font-normal text-sm ml-1">
                · {contact.payload.company}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2 mt-1 font-body">
            <Clock className="w-3 h-3" /> {new Date(followup.dueDate).toLocaleDateString()}
            {overdue && (
              <span className="inline-flex items-center gap-1 text-amber-400">
                <AlertTriangle className="w-3 h-3" /> 逾期
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-200">{followup.nextStep}</p>
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
          className="space-y-2 pt-2 border-t border-white/10"
          onSubmit={(e) => {
            e.preventDefault();
            if (!summary.trim()) return;
            onComplete(followup.id, summary.trim(), next.trim() || null);
            setOpen(false);
            setSummary("");
            setNext("");
          }}
        >
          <label className="block text-xs text-slate-300">
            這次做了什麼?
            <textarea
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="input mt-1"
              rows={2}
            />
          </label>
          <label className="block text-xs text-slate-300">
            下次承諾(選填)
            <input
              type="text"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="input mt-1"
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