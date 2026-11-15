"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Field } from "./Common";
import { X } from "lucide-react";
import type { Contact, ContactPayload, Source, Context } from "@/lib/types";
import { OCR_FIELDS, type OcrEngine, type OcrFieldKey, type ParsedCard } from "@/lib/ocr/types";
import { OcrCapture } from "./OcrCapture";

interface ContactFormModalProps {
  contact: Contact | null;
  onClose: () => void;
  /** 測試注入 mock OCR engine；未指定時使用預設的 Tesseract engine */
  ocrEngine?: OcrEngine;
}

const OCR_FIELD_LABELS: Record<OcrFieldKey, string> = {
  name: "姓名",
  company: "公司",
  title: "職稱",
  phone: "電話",
  email: "Email",
};

/** OCR 預覽狀態：只存在表單的記憶體裡，按下確認才隨聯絡人寫入 store */
interface OcrPreview {
  /** 已預填欄位的平均信心 0–1 */
  confidence: number;
  /** 信心偏低、使用者尚未改動的欄位 */
  low: OcrFieldKey[];
  /** 由 OCR 預填、使用者尚未改動的欄位 */
  filled: OcrFieldKey[];
}

const LOW_CLASS = " border-amber-500 bg-amber-50";

/**
 * 新增 / 編輯聯絡人 modal。Minimalism 風格:
 * 白背景 + subtle border + subtle shadow,跟 Attio / Notion 一致。
 */
export function ContactFormModal({ contact, onClose, ocrEngine }: ContactFormModalProps) {
  const addContact = useStore((s) => s.addContact);
  const updateContact = useStore((s) => s.updateContact);

  const [name, setName] = useState(contact?.payload.name ?? "");
  const [company, setCompany] = useState(contact?.payload.company ?? "");
  const [title, setTitle] = useState(contact?.payload.title ?? "");
  const [phone, setPhone] = useState(contact?.payload.phone ?? "");
  const [email, setEmail] = useState(contact?.payload.email ?? "");
  const [notes, setNotes] = useState(contact?.payload.notes ?? "");
  const [tagsText, setTagsText] = useState(contact?.payload.tags.join(", ") ?? "");

  const [createFollowup, setCreateFollowup] = useState(!contact);
  const [source, setSource] = useState<Source>("名片");
  const [context, setContext] = useState<Context>("會議");
  const [nextStep, setNextStep] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });

  const [error, setError] = useState<string | null>(null);

  // GOAL.md M1 AC-002：OCR 只預填表單，使用者按下「確認並儲存」才會呼叫 addContact
  const [ocr, setOcr] = useState<OcrPreview | null>(null);
  const values: Record<OcrFieldKey, string> = { name, company, title, phone, email };
  const setters: Record<OcrFieldKey, (v: string) => void> = {
    name: setName,
    company: setCompany,
    title: setTitle,
    phone: setPhone,
    email: setEmail,
  };

  function applyOcr(parsed: ParsedCard) {
    const previous = ocr?.filled ?? [];
    const filled: OcrFieldKey[] = [];
    let sum = 0;
    for (const key of OCR_FIELDS) {
      // 使用者自己輸入或改過的欄位一律保留；只動空白欄位與上一次 OCR 預填後沒改過的欄位
      const untouched = values[key].trim() === "" || previous.includes(key);
      if (!untouched) continue;
      const value = parsed.fields[key];
      if (!value) {
        if (previous.includes(key)) setters[key]("");
        continue;
      }
      setters[key](value);
      filled.push(key);
      sum += parsed.confidence[key];
    }
    if (filled.length === 0) {
      setOcr(null);
      return;
    }
    setOcr({
      confidence: Math.round((sum / filled.length) * 100) / 100,
      low: parsed.lowConfidenceFields.filter((k) => filled.includes(k)),
      filled,
    });
  }

  /** 使用者改動欄位＝已確認該欄位，移除低信心標示 */
  function editField(key: OcrFieldKey, value: string) {
    setters[key](value);
    if (ocr && (ocr.low.includes(key) || ocr.filled.includes(key))) {
      setOcr({ ...ocr, low: ocr.low.filter((k) => k !== key), filled: ocr.filled.filter((k) => k !== key) });
    }
  }

  const isLow = (key: OcrFieldKey) => ocr?.low.includes(key) ?? false;
  const lowProps = (key: OcrFieldKey) =>
    isLow(key) ? { "data-ocr-low": "true", "aria-describedby": "ocr-low-hint" } : {};

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
    >
      <div className="w-full max-w-md card p-6 max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 id="contact-form-title" className="text-lg font-semibold text-slate-900">
            {contact ? "編輯聯絡人" : "新增聯絡人"}
          </h3>
          <button
            onClick={onClose}
            aria-label="關閉"
            className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            try {
              const payload: ContactPayload = {
                name: name.trim() || null,
                company: company.trim() || null,
                title: title.trim() || null,
                phone: phone.trim() || null,
                email: email.trim() || null,
                // 表單沒有地址／網站欄位：編輯時保留原值（例如匯入的 Google 聯絡人）
                address: contact?.payload.address ?? null,
                website: contact?.payload.website ?? null,
                notes: notes.trim() || null,
                tags: tagsText
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                ocrConfidence: ocr ? ocr.confidence : (contact?.payload.ocrConfidence ?? null),
                ocrLowConfidenceFields: ocr ? ocr.low : [],
              };
              if (contact) {
                // 編輯既有聯絡人：沒被改動的低信心欄位維持標示
                const before = contact.payload as unknown as Record<string, unknown>;
                const after = payload as unknown as Record<string, unknown>;
                payload.ocrLowConfidenceFields = contact.payload.ocrLowConfidenceFields.filter(
                  (f) => before[f] === after[f],
                );
              }
              if (contact) {
                const r = updateContact(contact.id, payload);
                if (!r.ok) {
                  setError(r.error ?? "更新失敗");
                  return;
                }
              } else {
                addContact(payload, {
                  source,
                  context,
                  nextStep: createFollowup ? nextStep.trim() : undefined,
                  dueDate: createFollowup ? new Date(dueDate).toISOString() : undefined,
                });
              }
              onClose();
            } catch (err) {
              setError(err instanceof Error ? err.message : "操作失敗");
            }
          }}
        >
          {!contact && <OcrCapture engine={ocrEngine} onResult={applyOcr} />}
          {ocr && (
            <p
              role="status"
              data-testid="ocr-preview-banner"
              className="text-xs text-slate-700 bg-brand-50 border border-brand-200 rounded-md px-3 py-2"
            >
              名片辨識預覽（信心 {Math.round(ocr.confidence * 100)}%）— 尚未儲存。請逐欄確認，按下「確認並儲存」才會建立聯絡人。
            </p>
          )}
          <Field label="姓名 或 公司 (至少一項)" required>
            <div className="grid grid-cols-2 gap-2">
              <input
                aria-label="姓名"
                value={name}
                onChange={(e) => editField("name", e.target.value)}
                {...lowProps("name")}
                placeholder="王小明"
                className={`input${isLow("name") ? LOW_CLASS : ""}`}
              />
              <input
                aria-label="公司"
                value={company}
                onChange={(e) => editField("company", e.target.value)}
                {...lowProps("company")}
                placeholder="國泰人壽"
                className={`input${isLow("company") ? LOW_CLASS : ""}`}
              />
            </div>
          </Field>
          <Field label="職稱 / 電話 / Email">
            <div className="grid grid-cols-3 gap-2">
              <input
                aria-label="職稱"
                value={title}
                onChange={(e) => editField("title", e.target.value)}
                {...lowProps("title")}
                placeholder="業務副理"
                className={`input${isLow("title") ? LOW_CLASS : ""}`}
              />
              <input
                aria-label="電話"
                value={phone}
                onChange={(e) => editField("phone", e.target.value)}
                {...lowProps("phone")}
                placeholder="0912-345-678"
                className={`input${isLow("phone") ? LOW_CLASS : ""}`}
              />
              <input
                aria-label="Email"
                type="email"
                value={email}
                onChange={(e) => editField("email", e.target.value)}
                {...lowProps("email")}
                placeholder="ming@example.com"
                className={`input${isLow("email") ? LOW_CLASS : ""}`}
              />
            </div>
          </Field>
          {ocr && ocr.low.length > 0 && (
            <p id="ocr-low-hint" data-testid="ocr-low-hint" className="text-xs text-amber-800">
              ⚠ 以下欄位辨識信心較低，請對照名片確認：{ocr.low.map((k) => OCR_FIELD_LABELS[k]).join("、")}
            </p>
          )}
          <Field label="標籤 (逗號分隔)">
            <input
              aria-label="標籤"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="保險, VIP"
              className="input"
            />
          </Field>
          <Field label="備註">
            <textarea
              aria-label="備註"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input"
            />
          </Field>
          {!contact && (
            <>
              <fieldset className="border-t border-slate-200 pt-4 space-y-2">
                <legend className="text-xs font-medium text-slate-700">交換情境 (選填,會記錄到時間線)</legend>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    aria-label="來源"
                    value={source}
                    onChange={(e) => setSource(e.target.value as Source)}
                    className="input cursor-pointer"
                  >
                    <option value="名片">名片</option>
                    <option value="活動">活動</option>
                    <option value="介紹">介紹</option>
                    <option value="cold-call">cold-call</option>
                    <option value="其他">其他</option>
                  </select>
                  <select
                    aria-label="情境"
                    value={context}
                    onChange={(e) => setContext(e.target.value as Context)}
                    className="input cursor-pointer"
                  >
                    <option value="會議">會議</option>
                    <option value="展會">展會</option>
                    <option value="線上">線上</option>
                    <option value="朋友介紹">朋友介紹</option>
                    <option value="陌生拜訪">陌生拜訪</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
              </fieldset>
              <fieldset className="border-t border-slate-200 pt-4 space-y-2">
                <legend className="text-xs font-medium text-slate-700 flex items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label="同時建立下一步與預計日期"
                    checked={createFollowup}
                    onChange={(e) => setCreateFollowup(e.target.checked)}
                    className="cursor-pointer accent-brand-600"
                  />
                  同時建立「下一步」與預計日期 (建議)
                </legend>
                {createFollowup && (
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      aria-label="下一步"
                      value={nextStep}
                      onChange={(e) => setNextStep(e.target.value)}
                      placeholder="寄商品 DM"
                      className="input col-span-2"
                    />
                    <input
                      aria-label="預計日期"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      onInput={(e) => setDueDate((e.target as HTMLInputElement).value)}
                      className="input cursor-pointer"
                    />
                  </div>
                )}
              </fieldset>
            </>
          )}
          {error && (
            <p
              role="alert"
              className="text-sm text-danger-700 bg-danger-50 border border-danger-200 rounded-md px-3 py-2"
            >
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {ocr ? "確認並儲存" : "儲存"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}