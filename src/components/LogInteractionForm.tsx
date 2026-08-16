"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Plus, MessageSquare, Phone, Mail, StickyNote, Send, MapPin, Smartphone } from "lucide-react";
import type { Interaction } from "@/lib/types";

/** 8 種 kind 的 label + icon,給 UI 用 */
const KIND_META: Record<
  Interaction["kind"],
  { label: string; icon: React.ComponentType<{ className?: string }>; hint: string }
> = {
  meeting: { label: "見面", icon: MapPin, hint: "實體見面討論" },
  visit: { label: "拜訪", icon: MapPin, hint: "登門拜訪客戶" },
  call: { label: "通話", icon: Phone, hint: "電話或視訊" },
  email: { label: "Email", icon: Mail, hint: "寄信往來" },
  line: { label: "LINE", icon: MessageSquare, hint: "LINE 對話重點" },
  wechat: { label: "WeChat", icon: MessageSquare, hint: "微信對話重點" },
  dm: { label: "私訊 DM", icon: Smartphone, hint: "其他平台私訊" },
  note: { label: "備註", icon: StickyNote, hint: "自由記事" },
};

/** 3 個 primary kind (UI 主按鈕) */
const PRIMARY_KINDS: Array<Interaction["kind"]> = ["meeting", "call", "line"];

export interface LogInteractionFormProps {
  contactId: string;
  /** 提交成功時的回呼(用於清表單) */
  onLogged?: (it: Interaction) => void;
  /** 額外的 className(讓 ContactRow 跟 TimelineTab 樣式略不同) */
  className?: string;
}

/**
 * 「記錄見面/交談/筆記」表單。
 * 共用在 ContactRow (inline expand) + TimelineTab (quick log)。
 * 對齊 session 決策 #2 (極簡,只 summary + kind) + 決策 #4 (純文字 textarea,lowest friction)。
 * occurredAt 永遠是 now (符合 store API 設計);若日後要 backfill 再擴 signature。
 */
export function LogInteractionForm({
  contactId,
  onLogged,
  className,
}: LogInteractionFormProps) {
  const addInteraction = useStore((s) => s.addInteraction);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Interaction["kind"]>("meeting");
  const [summary, setSummary] = useState("");
  const [next, setNext] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) return;
    const it = addInteraction(
      contactId,
      kind,
      summary.trim(),
      next.trim() || null,
    );
    setOpen(false);
    setSummary("");
    setNext("");
    onLogged?.(it);
  }

  // Primary 三鍵 UI: 未開表單時只顯示這三個
  if (!open) {
    return (
      <div className={className ?? "flex flex-wrap gap-2 pt-2 border-t border-slate-100"}>
        <button
          type="button"
          onClick={() => {
            setKind("meeting");
            setOpen(true);
          }}
          className="btn-secondary !py-1.5 !text-xs"
        >
          <MapPin className="w-3.5 h-3.5" /> 見面
        </button>
        <button
          type="button"
          onClick={() => {
            setKind("call");
            setOpen(true);
          }}
          className="btn-secondary !py-1.5 !text-xs"
        >
          <Phone className="w-3.5 h-3.5" /> 通話
        </button>
        <button
          type="button"
          onClick={() => {
            setKind("line");
            setOpen(true);
          }}
          className="btn-secondary !py-1.5 !text-xs"
        >
          <MessageSquare className="w-3.5 h-3.5" /> LINE
        </button>
        <button
          type="button"
          onClick={() => {
            setKind("note");
            setOpen(true);
          }}
          className="btn-ghost !py-1.5 !text-xs"
          aria-label="其他類型記錄"
          title="其他類型 (拜訪 / WeChat / 私訊 / Email / 備註)"
        >
          <Plus className="w-3.5 h-3.5" /> 其他
        </button>
      </div>
    );
  }

  const meta = KIND_META[kind];
  const Icon = meta.icon;

  return (
    <form
      onSubmit={handleSubmit}
      className={className ?? "space-y-3 pt-2 border-t border-slate-100"}
      data-testid="log-interaction-form"
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-brand-600" />
        <select
          aria-label="互動類型"
          value={kind}
          onChange={(e) => setKind(e.target.value as Interaction["kind"])}
          className="input !py-1.5 !text-xs flex-1"
        >
          {PRIMARY_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_META[k].label}
            </option>
          ))}
          <optgroup label="其他類型">
            <option value="visit">{KIND_META.visit.label}</option>
            <option value="email">{KIND_META.email.label}</option>
            <option value="wechat">{KIND_META.wechat.label}</option>
            <option value="dm">{KIND_META.dm.label}</option>
            <option value="note">{KIND_META.note.label}</option>
          </optgroup>
        </select>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-ghost !py-1.5 !text-xs"
        >
          取消
        </button>
      </div>
      <p className="text-xs text-slate-500 -mt-1">{meta.hint}</p>
      <textarea
        required
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder={
          kind === "meeting"
            ? "討論主題:保險需求, 預計下週寄 DM"
            : kind === "call"
              ? "通話結果:確認見面時間"
              : kind === "line"
                ? "LINE 對話重點:..."
                : "記錄..."
        }
        rows={3}
        className="input text-sm"
        aria-label="互動內容"
      />
      <input
        type="text"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        placeholder="下次承諾 (選填)"
        className="input text-sm"
        aria-label="下次承諾"
      />
      <button type="submit" className="btn-primary !py-1.5">
        <Send className="w-3.5 h-3.5" /> 記錄
      </button>
    </form>
  );
}

/** 給列表 / time line 顯示 kind 中文 label */
export function kindLabel(kind: Interaction["kind"]): string {
  return KIND_META[kind].label;
}