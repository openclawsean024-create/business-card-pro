"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Contact, Followup, Interaction, Source, Context } from "@/lib/types";
import {
  CalendarClock,
  CheckCircle2,
  Plus,
  Search,
  Tag as TagIcon,
  Trash2,
  Users,
  Download,
  Upload,
  Settings as SettingsIcon,
  Sun,
  Moon,
  AlertTriangle,
  Clock,
  MessageSquare,
  X,
} from "lucide-react";
import clsx from "clsx";
import { exportVCards, exportCSV, parseCSV } from "@/lib/export";
import {
  getTodayQueue,
  listContacts,
  sortContacts,
  getTimeline,
  isFollowupOverdue,
  isFollowupDoneEntry,
} from "@/lib/domain";

type TabId = "today" | "queue" | "contacts" | "timeline" | "settings";

export default function HomePage() {
  const store = useStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    store.hydrate();
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", store.theme === "dark");
  }, [store.theme]);

  const tab: TabId = store.ui.activeTab;

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm opacity-60">
        載入中…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header theme={store.theme} onToggleTheme={() => store.update({ theme: store.theme === "light" ? "dark" : "light" })} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {tab === "today" && <TodayTab />}
        {tab === "queue" && <QueueTab />}
        {tab === "contacts" && <ContactsTab />}
        {tab === "timeline" && <TimelineTab />}
        {tab === "settings" && <SettingsTab />}
      </main>

      <BottomNav activeTab={tab} onChange={(t) => store.updateUI({ activeTab: t })} />
    </div>
  );
}

function Header({ theme, onToggleTheme }: { theme: "light" | "dark"; onToggleTheme: () => void }) {
  const activeCount = useStore((s) => s.contacts.filter((c) => c.status === "active").length);
  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">名片王 Pro</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            台灣業務的人脈回訪清單 · {activeCount} 位聯絡人
          </p>
        </div>
        <button
          aria-label={theme === "dark" ? "切換淺色主題" : "切換深色主題"}
          onClick={onToggleTheme}
          className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}

function BottomNav({ activeTab, onChange }: { activeTab: TabId; onChange: (t: TabId) => void }) {
  const items: Array<{ id: TabId; label: string; icon: React.ReactNode }> = useMemo(
    () => [
      { id: "today", label: "今日", icon: <CalendarClock className="w-4 h-4" /> },
      { id: "queue", label: "全部", icon: <Users className="w-4 h-4" /> },
      { id: "contacts", label: "聯絡人", icon: <Plus className="w-4 h-4" /> },
      { id: "timeline", label: "時間線", icon: <MessageSquare className="w-4 h-4" /> },
      { id: "settings", label: "設定", icon: <SettingsIcon className="w-4 h-4" /> },
    ],
    [],
  );
  return (
    <nav className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky bottom-0 z-30 md:hidden">
      <ul className="grid grid-cols-5">
        {items.map((it) => (
          <li key={it.id}>
            <button
              onClick={() => onChange(it.id)}
              aria-current={activeTab === it.id ? "page" : undefined}
              className={clsx(
                "w-full flex flex-col items-center gap-1 py-2 text-[10px]",
                activeTab === it.id
                  ? "text-brand-600 dark:text-brand-500"
                  : "text-slate-500 dark:text-slate-400",
              )}
            >
              {it.icon}
              <span>{it.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* --- 今日 queue (AC-003 + FR-003) --- */
function TodayTab() {
  const followups = useStore((s) => s.followups);
  const contacts = useStore((s) => s.contacts);
  const completeFollowup = useStore((s) => s.completeFollowup);

  const queue = useMemo(() => getTodayQueue(followups, contacts), [followups, contacts]);
  const overdueCount = queue.filter((q) => isFollowupOverdue(q)).length;
  const dueTodayCount = queue.length - overdueCount;

  return (
    <section aria-labelledby="today-h" className="space-y-4">
      <div>
        <h2 id="today-h" className="text-xl font-semibold flex items-center gap-2">
          <CalendarClock className="w-5 h-5" /> 今日回訪
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          到期 {dueTodayCount} · 逾期 {overdueCount}
        </p>
      </div>
      {queue.length === 0 ? (
        <EmptyState
          title="今日沒有待回訪"
          hint="新增聯絡人時一併建立『下一步』與日期,就會出現在這裡。"
        />
      ) : (
        <ul className="space-y-2" data-testid="today-queue">
          {queue.map((fu) => (
            <FollowupCard key={fu.id} followup={fu} contact={fu.contact} onComplete={completeFollowup} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FollowupCard({
  followup,
  contact,
  onComplete,
}: {
  followup: Followup;
  contact: Contact | null;
  onComplete: (id: string, summary: string, nextCommitment: string | null) => void;
}) {
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

/* --- 全部 queue(全部 pending)--- */
function QueueTab() {
  const all = useStore((s) => s.followups);
  const contacts = useStore((s) => s.contacts);
  const pending = all
    .filter((f) => f.status === "pending")
    .map((f) => ({ ...f, contact: contacts.find((c) => c.id === f.contactId) ?? null }))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <section aria-labelledby="queue-h" className="space-y-4">
      <h2 id="queue-h" className="text-xl font-semibold flex items-center gap-2">
        <Users className="w-5 h-5" /> 全部待回訪 ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <EmptyState title="沒有待回訪" hint="在『聯絡人』分頁新增即可加入 queue。" />
      ) : (
        <ul className="space-y-2" data-testid="all-queue">
          {pending.map((fu) => (
            <FollowupCard
              key={fu.id}
              followup={fu}
              contact={fu.contact}
              onComplete={useStore.getState().completeFollowup}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/* --- 聯絡人(全部 + 新增)--- */
function ContactsTab() {
  const state = useStore();
  const [creating, setCreating] = useState(false);
  const filtered = useMemo(() => sortContacts(listContacts(state), state.ui.sortMode, state.followups), [state]);

  return (
    <section aria-labelledby="contacts-h" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="contacts-h" className="text-xl font-semibold">
          聯絡人 ({filtered.length}/{state.plan.maxContacts})
        </h2>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded bg-brand-600 text-white hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" /> 新增
        </button>
      </div>
      <SearchBar
        value={state.ui.searchQuery}
        onChange={(v) => state.updateUI({ searchQuery: v })}
        tag={state.ui.activeTag}
        onTag={(t) => state.updateUI({ activeTag: t })}
        tags={Array.from(new Set(state.contacts.flatMap((c) => c.payload.tags))).sort()}
        sortMode={state.ui.sortMode}
        onSort={(m) => state.updateUI({ sortMode: m })}
      />
      {filtered.length === 0 ? (
        <EmptyState title="沒有聯絡人" hint="點『新增』建立第一位,或匯入 CSV。" />
      ) : (
        <ul className="space-y-2" data-testid="contact-list">
          {filtered.map((c) => (
            <ContactRow key={c.id} contact={c} />
          ))}
        </ul>
      )}
      {creating && <ContactFormModal contact={null} onClose={() => setCreating(false)} />}
    </section>
  );
}

function ContactRow({ contact }: { contact: Contact }) {
  const deleteContact = useStore((s) => s.deleteContact);
  const p = contact.payload;
  return (
    <li className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{p.name ?? p.company ?? "(無姓名)"}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {p.title && `${p.title} · `}
            {p.company}
          </div>
          {p.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {p.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800"
                >
                  <TagIcon className="w-3 h-3" /> {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          aria-label={`刪除 ${p.name ?? p.company ?? "聯絡人"}`}
          onClick={() => {
            if (confirm(`確定刪除「${p.name ?? p.company ?? "(無姓名)"}」?相關照片與互動紀錄會一併清除。`)) {
              deleteContact(contact.id);
            }
          }}
          className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {p.notes && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{p.notes}</p>}
    </li>
  );
}

function SearchBar({
  value,
  onChange,
  tag,
  onTag,
  tags,
  sortMode,
  onSort,
}: {
  value: string;
  onChange: (v: string) => void;
  tag: string | null;
  onTag: (t: string | null) => void;
  tags: string[];
  sortMode: AppSort;
  onSort: (m: AppSort) => void;
}) {
  return (
    <div className="flex flex-col md:flex-row gap-2">
      <label className="flex-1 flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-900">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          aria-label="搜尋聯絡人"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="搜尋姓名、公司、標籤、備註"
          className="flex-1 bg-transparent outline-none text-sm"
        />
        {value && (
          <button onClick={() => onChange("")} aria-label="清除搜尋">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </label>
      <select
        value={sortMode}
        onChange={(e) => onSort(e.target.value as AppSort)}
        aria-label="排序方式"
        className="text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-2 bg-white dark:bg-slate-900"
      >
        <option value="dueDate">依下次回訪</option>
        <option value="name">依姓名</option>
        <option value="company">依公司</option>
        <option value="createdAt">依新增時間</option>
      </select>
      {tags.length > 0 && (
        <select
          value={tag ?? ""}
          onChange={(e) => onTag(e.target.value || null)}
          aria-label="篩選標籤"
          className="text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-2 bg-white dark:bg-slate-900"
        >
          <option value="">全部標籤</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

type AppSort = "name" | "company" | "dueDate" | "createdAt";

/* --- 新增 / 編輯聯絡人 modal --- */
function ContactFormModal({
  contact,
  onClose,
}: {
  contact: Contact | null;
  onClose: () => void;
}) {
  const addContact = useStore((s) => s.addContact);
  const updateContact = useStore((s) => s.updateContact);

  const [name, setName] = useState(contact?.payload.name ?? "");
  const [company, setCompany] = useState(contact?.payload.company ?? "");
  const [title, setTitle] = useState(contact?.payload.title ?? "");
  const [phone, setPhone] = useState(contact?.payload.phone ?? "");
  const [email, setEmail] = useState(contact?.payload.email ?? "");
  const [notes, setNotes] = useState(contact?.payload.notes ?? "");
  const [tagsText, setTagsText] = useState(contact?.payload.tags.join(", ") ?? "");

  // AC-002: exchange + follow-up 同時可建
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 id="contact-form-title" className="font-semibold">
            {contact ? "編輯聯絡人" : "新增聯絡人"}
          </h3>
          <button onClick={onClose} aria-label="關閉">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form
          className="space-y-3"
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
              <input aria-label="職稱" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="業務副理" className="input" />
              <input aria-label="電話" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0912-345-678" className="input" />
              <input aria-label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ming@example.com" className="input" />
            </div>
          </Field>
          <Field label="標籤 (逗號分隔)">
            <input aria-label="標籤" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="保險, VIP" className="input" />
          </Field>
          <Field label="備註">
            <textarea aria-label="備註" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input" />
          </Field>
          {!contact && (
            <>
              <fieldset className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
                <legend className="text-xs font-medium">交換情境 (選填,會記錄到時間線)</legend>
                <div className="grid grid-cols-2 gap-2">
                  <select aria-label="來源" value={source} onChange={(e) => setSource(e.target.value as Source)} className="input">
                    <option value="名片">名片</option>
                    <option value="活動">活動</option>
                    <option value="介紹">介紹</option>
                    <option value="cold-call">cold-call</option>
                    <option value="其他">其他</option>
                  </select>
                  <select aria-label="情境" value={context} onChange={(e) => setContext(e.target.value as Context)} className="input">
                    <option value="會議">會議</option>
                    <option value="展會">展會</option>
                    <option value="線上">線上</option>
                    <option value="朋友介紹">朋友介紹</option>
                    <option value="陌生拜訪">陌生拜訪</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
              </fieldset>
              <fieldset className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
                <legend className="text-xs font-medium flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={createFollowup}
                    onChange={(e) => setCreateFollowup(e.target.checked)}
                  />
                  同時建立「下一步」與預計日期 (建議)
                </legend>
                {createFollowup && (
                  <div className="grid grid-cols-3 gap-2">
                    <input aria-label="下一步" value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="寄商品 DM" className="input col-span-2" />
                    <input aria-label="預計日期" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" />
                  </div>
                )}
              </fieldset>
            </>
          )}
          {error && (
            <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 px-3 py-2 rounded bg-brand-600 text-white hover:bg-brand-700">
              儲存
            </button>
            <button type="button" onClick={onClose} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700">
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-xs space-y-1">
      <span>
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

/* --- 互動時間線(全部聯絡人合併檢視)--- */
function TimelineTab() {
  const state = useStore();
  const sortedContacts = useMemo(() => sortContacts(listContacts(state), "createdAt"), [state]);

  return (
    <section aria-labelledby="timeline-h" className="space-y-4">
      <h2 id="timeline-h" className="text-xl font-semibold flex items-center gap-2">
        <MessageSquare className="w-5 h-5" /> 互動時間線
      </h2>
      {sortedContacts.length === 0 ? (
        <EmptyState title="沒有互動紀錄" hint="在聯絡人新增時建立交換事件,或完成回訪後會自動記錄。" />
      ) : (
        <div className="space-y-3">
          {sortedContacts.map((c) => {
            const tl = getTimeline(c.id, state).slice(0, 3);
            return (
              <details key={c.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <summary className="cursor-pointer font-medium">
                  {c.payload.name ?? c.payload.company ?? "(無姓名)"}
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                    {tl.length} 筆互動
                  </span>
                </summary>
                <ul className="mt-3 space-y-2 text-sm">
                  {tl.map((it) => {
                    if (isFollowupDoneEntry(it)) {
                      return (
                        <li key={it.id} className="border-l-2 border-brand-500 pl-3">
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(it.completedAt ?? it.updatedAt).toLocaleString()} · followup-done
                          </div>
                          <div>完成: {it.nextStep}</div>
                          {it.nextCommitment && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              下次承諾: {it.nextCommitment}
                            </div>
                          )}
                        </li>
                      );
                    }
                    return (
                      <li key={it.id} className="border-l-2 border-brand-500 pl-3">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(it.occurredAt).toLocaleString()} · {it.kind}
                        </div>
                        <div>{it.summary}</div>
                        {it.nextCommitment && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            下次承諾: {it.nextCommitment}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* --- 設定: 匯出 / 匯入 / 重置 --- */
function SettingsTab() {
  const state = useStore();
  const reset = useStore((s) => s.reset);
  const importContacts = useStore((s) => s.importContacts);

  return (
    <section aria-labelledby="settings-h" className="space-y-4">
      <h2 id="settings-h" className="text-xl font-semibold flex items-center gap-2">
        <SettingsIcon className="w-5 h-5" /> 設定
      </h2>
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
        <div>
          <div className="text-sm font-medium">方案</div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {state.plan.tier === "free"
              ? `免費 pilot · 上限 ${state.plan.maxContacts} 張 · ${state.plan.cloudSync ? "已啟用雲端同步" : "僅本地"}`
              : state.plan.tier}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => downloadText(exportVCards(state.contacts.filter((c) => c.status === "active"), state), "contacts.vcf", "text/vcard")}
            className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded bg-brand-600 text-white hover:bg-brand-700"
          >
            <Download className="w-4 h-4" /> vCard 匯出
          </button>
          <button
            onClick={() => downloadText(exportCSV(state.contacts.filter((c) => c.status === "active"), state), "contacts.csv", "text/csv")}
            className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700"
          >
            <Download className="w-4 h-4" /> CSV 匯出
          </button>
          <label className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 cursor-pointer">
            <Upload className="w-4 h-4" /> CSV 匯入
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const parsed = parseCSV(text);
                importContacts(parsed);
                alert(`匯入 ${parsed.length} 筆`);
                e.target.value = "";
              }}
            />
          </label>
          <button
            onClick={() => {
              if (confirm("重置會清空所有資料,確定?")) reset();
            }}
            className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded text-rose-600 border border-rose-200 dark:border-rose-900"
          >
            <Trash2 className="w-4 h-4" /> 重置全部
          </button>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs text-slate-500 dark:text-slate-400 space-y-2">
        <div>資料儲存在你的瀏覽器 (localStorage),不會自動上傳。</div>
        <div>SPEC §3.1 FR-009 · 個資最小化: 刪除聯絡人會一併清除照片、互動、回訪、同意紀錄。</div>
      </div>
    </section>
  );
}

function downloadText(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>
    </div>
  );
}