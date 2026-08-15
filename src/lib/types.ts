// SPEC §4.3 對齊的 Domain Models
// 注意: payload 只存完成 job 必需欄位;敏感欄位以 Web Crypto 處理;刪除需有 tombstone

export type ID = string;
export type ISODate = string; // ISO-8601

/** 來源管道 */
export type Source = "名片" | "活動" | "介紹" | "cold-call" | "其他";

/** 交換情境(在哪裡認識) */
export type Context = "會議" | "展會" | "線上" | "朋友介紹" | "陌生拜訪" | "其他";

/** PlanQuota: 免費 pilot 20 張,個人 NT$149/月,業務 NT$399/月 */
export type PlanTier = "free" | "personal" | "business";

export interface PlanQuota {
  ownerId: ID;
  tier: PlanTier;
  // free tier: 20 張上限;personal: 200;business: 無限
  maxContacts: number;
  // 同步選項(免費層不啟用)
  cloudSync: boolean;
}

/** 聯絡人本體 */
export interface Contact {
  id: ID;
  ownerId: ID | null; // free 層不寫 owner
  status: "active" | "deleted";
  payload: ContactPayload;
  version: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface ContactPayload {
  /** AC-001: 姓名或公司必填一項 */
  name: string | null;
  company: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  tags: string[];
  /** AC-005: OCR 只作 preview, 所有欄位需確認 */
  ocrConfidence: number | null;
  ocrLowConfidenceFields: string[];
}

/** 名片照片附件(可選) */
export interface CardImage {
  id: ID;
  contactId: ID;
  dataUrl: string; // base64
  createdAt: ISODate;
}

/** 交換事件: 何時、在哪、怎麼交換 */
export interface ExchangeEvent {
  id: ID;
  contactId: ID;
  source: Source;
  context: Context;
  notes: string | null;
  occurredAt: ISODate;
  createdAt: ISODate;
}

/** 回訪事件: 下一步 + 預計日期 (FR-002 / FR-003) */
export interface Followup {
  id: ID;
  contactId: ID;
  status: "pending" | "done" | "skipped";
  nextStep: string;
  dueDate: ISODate; // FR-002: 預計日期
  completedAt: ISODate | null;
  /** 完成時填入的下次承諾 (來自 completeFollowup 的 nextCommitment) */
  nextCommitment: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** 互動紀錄時間線 (FR-007) */
export interface Interaction {
  id: ID;
  contactId: ID;
  kind: "note" | "call" | "email" | "meeting";
  summary: string;
  nextCommitment: string | null;
  occurredAt: ISODate;
  createdAt: ISODate;
}

/** followup 完成時產生的時間線 entry (與 Interaction 不同 schema) */
export type FollowupEntry = Followup & { kind: "followup-done" };

export type TimelineEntry = Interaction | FollowupEntry;

/** Consent: 個資同意書 (§5.2) */
export interface Consent {
  id: ID;
  contactId: ID;
  scope: "store" | "export" | "share";
  grantedAt: ISODate;
}

/** App 狀態(整體 localStorage payload) */
export interface AppState {
  ownerId: ID;
  plan: PlanQuota;
  contacts: Contact[];
  cardImages: CardImage[];
  exchanges: ExchangeEvent[];
  followups: Followup[];
  interactions: Interaction[];
  consents: Consent[];
  theme: "light" | "dark";
  /** UI 狀態 */
  ui: {
    searchQuery: string;
    activeTag: string | null;
    activeTab: TabId;
    sortMode: "name" | "company" | "dueDate" | "createdAt";
  };
}

export type TabId = "today" | "queue" | "contacts" | "timeline" | "settings";

export const DEFAULT_OWNER_ID = "local-owner";

export function defaultPlan(): PlanQuota {
  return {
    ownerId: DEFAULT_OWNER_ID,
    tier: "free",
    maxContacts: 20,
    cloudSync: false,
  };
}

export function emptyAppState(): AppState {
  return {
    ownerId: DEFAULT_OWNER_ID,
    plan: defaultPlan(),
    contacts: [],
    cardImages: [],
    exchanges: [],
    followups: [],
    interactions: [],
    consents: [],
    theme: "dark", // 配合 MASTER.md glassmorphism: dark 為 default
    ui: {
      searchQuery: "",
      activeTag: null,
      activeTab: "today",
      sortMode: "dueDate",
    },
  };
}

export const STORAGE_KEY = "business-card-pro-v3";