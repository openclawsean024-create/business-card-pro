"use client";

import { create } from "zustand";
import {
  emptyAppState,
  STORAGE_KEY,
  type AppState,
  type Contact,
  type ContactPayload,
  type ExchangeEvent,
  type Followup,
  type ID,
  type Interaction,
  type Source,
  type Context,
  type Consent,
  type CardImage,
} from "./types";
import {
  cascadeDeleteContact,
  followupFromExchange,
  newId,
  validateContactPayload,
} from "./domain";

interface Actions {
  hydrate: () => void;
  update: (partial: Partial<AppState>) => void;
  updateUI: (partial: Partial<AppState["ui"]>) => void;
  addContact: (payload: ContactPayload, opts?: { source?: Source; context?: Context; nextStep?: string; dueDate?: string }) => { contact: Contact; followup: Followup | null; warnings: string[] };
  updateContact: (id: ID, payload: ContactPayload) => { ok: boolean; error?: string };
  deleteContact: (id: ID) => void;
  attachCardImage: (contactId: ID, dataUrl: string) => CardImage | null;
  addExchangeEvent: (contactId: ID, source: Source, context: Context, notes: string | null, occurredAt: string) => ExchangeEvent;
  scheduleFollowup: (contactId: ID, nextStep: string, dueDate: string) => Followup;
  completeFollowup: (id: ID, summary: string, nextCommitment: string | null) => void;
  addInteraction: (contactId: ID, kind: Exclude<Interaction["kind"], "followup-done">, summary: string, nextCommitment: string | null) => Interaction;
  grantConsent: (contactId: ID, scope: Consent["scope"]) => Consent;
  importContacts: (contacts: Contact[]) => void;
  reset: () => void;
}

type Store = AppState & Actions;

const initialState: AppState = emptyAppState();

export const useStore = create<Store>((set, get) => ({
  ...initialState,
  hydrate: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppState>;
        set({ ...emptyAppState(), ...parsed, ui: { ...emptyAppState().ui, ...(parsed.ui ?? {}) } });
      }
    } catch (err) {
      console.warn(
        `[useStore#0000 @ ${new Date().toISOString()}] hydrate failed`,
        err,
      );
    }
  },
  update: (partial) => set((s) => ({ ...s, ...partial })),
  updateUI: (partial) => set((s) => ({ ...s, ui: { ...s.ui, ...partial } })),
  addContact: (payload, opts) => {
    const warnings: string[] = [];
    const err = validateContactPayload(payload);
    if (err) {
      warnings.push(err);
      throw new Error(err);
    }
    const state = get();
    const active = state.contacts.filter((c) => c.status === "active").length;
    if (active >= state.plan.maxContacts) {
      warnings.push(`已達免費層 ${state.plan.maxContacts} 張上限,可匯出後升級或刪除`);
      throw new Error(warnings[0]!);
    }
    const now = new Date().toISOString();
    const contact: Contact = {
      id: newId("ct"),
      ownerId: state.plan.cloudSync ? state.ownerId : null,
      status: "active",
      version: 1,
      createdAt: now,
      updatedAt: now,
      payload,
    };
    let followup: Followup | null = null;
    let exchange: ExchangeEvent | null = null;
    if (opts?.source || opts?.context) {
      exchange = {
        id: newId("ex"),
        contactId: contact.id,
        source: opts?.source ?? "名片",
        context: opts?.context ?? "其他",
        notes: null,
        occurredAt: now,
        createdAt: now,
      };
    }
    if (opts?.nextStep && opts?.dueDate) {
      followup = followupFromExchange(
        exchange ?? {
          id: "tmp",
          contactId: contact.id,
          source: opts?.source ?? "名片",
          context: opts?.context ?? "其他",
          notes: null,
          occurredAt: now,
          createdAt: now,
        },
        contact.id,
        opts.nextStep,
        opts.dueDate,
      );
    }
    set((s) => ({
      ...s,
      contacts: [contact, ...s.contacts],
      exchanges: exchange ? [exchange, ...s.exchanges] : s.exchanges,
      followups: followup ? [followup, ...s.followups] : s.followups,
    }));
    return { contact, followup, warnings };
  },
  updateContact: (id, payload) => {
    const err = validateContactPayload(payload);
    if (err) return { ok: false, error: err };
    set((s) => ({
      ...s,
      contacts: s.contacts.map((c) =>
        c.id === id
          ? { ...c, payload, version: c.version + 1, updatedAt: new Date().toISOString() }
          : c,
      ),
    }));
    return { ok: true };
  },
  deleteContact: (id) => {
    set((s) => cascadeDeleteContact(s, id));
  },
  attachCardImage: (contactId, dataUrl) => {
    const target = get().contacts.find((c) => c.id === contactId && c.status === "active");
    if (!target) return null;
    const img: CardImage = {
      id: newId("img"),
      contactId,
      dataUrl,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ ...s, cardImages: [img, ...s.cardImages] }));
    return img;
  },
  addExchangeEvent: (contactId, source, context, notes, occurredAt) => {
    const now = new Date().toISOString();
    const ev: ExchangeEvent = {
      id: newId("ex"),
      contactId,
      source,
      context,
      notes,
      occurredAt,
      createdAt: now,
    };
    set((s) => ({ ...s, exchanges: [ev, ...s.exchanges] }));
    return ev;
  },
  scheduleFollowup: (contactId, nextStep, dueDate) => {
    const fu: Followup = {
      id: newId("fu"),
      contactId,
      status: "pending",
      nextStep,
      dueDate,
      completedAt: null,
      nextCommitment: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => ({ ...s, followups: [fu, ...s.followups] }));
    return fu;
  },
  completeFollowup: (id, summary, nextCommitment) => {
    const state = get();
    const fu = state.followups.find((f) => f.id === id);
    if (!fu) return;
    const now = new Date().toISOString();
    set((s) => ({
      ...s,
      followups: s.followups.map((f) =>
        f.id === id
          ? {
              ...f,
              status: "done",
              completedAt: now,
              updatedAt: now,
              // 把 summary 寫回 nextStep 方便 FollowupEntry 顯示 "完成: ..."
              nextStep: summary,
              nextCommitment,
            }
          : f,
      ),
    }));
    // 同時寫入 interaction 作為另一個時間線節點
    const noteIt: Interaction = {
      id: newId("it"),
      contactId: fu.contactId,
      kind: "call",
      summary,
      nextCommitment,
      occurredAt: now,
      createdAt: now,
    };
    useStore.setState((s) => ({ ...s, interactions: [noteIt, ...s.interactions] }));
  },
  addInteraction: (contactId, kind, summary, nextCommitment) => {
    const now = new Date().toISOString();
    const it: Interaction = {
      id: newId("it"),
      contactId,
      kind,
      summary,
      nextCommitment,
      occurredAt: now,
      createdAt: now,
    };
    set((s) => ({ ...s, interactions: [it, ...s.interactions] }));
    return it;
  },
  grantConsent: (contactId, scope) => {
    const now = new Date().toISOString();
    const c: Consent = { id: newId("cs"), contactId, scope, grantedAt: now };
    set((s) => ({ ...s, consents: [c, ...s.consents] }));
    return c;
  },
  importContacts: (contacts) => {
    set((s) => {
      const existing = new Set(s.contacts.map((c) => c.id));
      const fresh = contacts.filter((c) => !existing.has(c.id));
      return { ...s, contacts: [...fresh, ...s.contacts] };
    });
  },
  reset: () => {
    set({ ...initialState });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  },
}));

// Persist subscription
if (typeof window !== "undefined") {
  // SPEC §6.1: 「錯誤可由 maintainer 追查」 — 每次 warn 帶一個 monotonic id
  // + timestamp,讓 maintainer 可以 grep 同一個 session 內所有錯誤。
  let warnCounter = 0;
  useStore.subscribe((state) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      warnCounter += 1;
      console.warn(
        `[useStore#${String(warnCounter).padStart(4, "0")} @ ${new Date().toISOString()}] persist failed`,
        err,
      );
    }
  });
}