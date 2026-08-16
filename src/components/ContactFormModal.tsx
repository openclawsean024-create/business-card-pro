"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Field } from "./Common";
import { X } from "lucide-react";
import type { Contact, Source, Context } from "@/lib/types";

interface ContactFormModalProps {
  contact: Contact | null;
  onClose: () => void;
}

/**
 * 新增 / 編輯聯絡人 modal。Minimalism 風格:
 * 白背景 + subtle border + subtle shadow,跟 Attio / Notion 一致。
 */
export function ContactFormModal({ contact, onClose }: ContactFormModalProps) {
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
              const payload = {
                name: name.trim() || null,
                company: company.trim() || null,
                title: title.trim() || null,
                phone: phone.trim() || null,
                email: email.trim() || null,
                address: null,
                website: null,
                notes: notes.trim() || null,
                tags: tagsText
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                ocrConfidence: null,
                ocrLowConfidenceFields: [],
              };
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
          <Field label="姓名 或 公司 (至少一項)" required>
            <div className="grid grid-cols-2 gap-2">
              <input
                aria-label="姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="王小明"
                className="input"
              />
              <input
                aria-label="公司"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="國泰人壽"
                className="input"
              />
            </div>
          </Field>
          <Field label="職稱 / 電話 / Email">
            <div className="grid grid-cols-3 gap-2">
              <input
                aria-label="職稱"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="業務副理"
                className="input"
              />
              <input
                aria-label="電話"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912-345-678"
                className="input"
              />
              <input
                aria-label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ming@example.com"
                className="input"
              />
            </div>
          </Field>
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
              儲存
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