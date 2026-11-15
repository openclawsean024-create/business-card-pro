// GOAL.md M1 AC-005：聯絡人同步 provider 介面
// M1 只有 mock 實作（MockGoogleContactsProvider，記憶體資料、零網路）。
// 真實的 Google OAuth／People API 屬於 M3，需先有資料流說明、權限範圍與人審。
import type { Contact, ContactPayload, ID, ISODate } from "../types";

/** 參與同步的欄位。標籤（Google 的群組）與 OCR 中繼資料不同步。 */
export const SYNC_FIELDS = ["name", "company", "title", "phone", "email", "address", "website", "notes"] as const;
export type SyncFieldKey = (typeof SYNC_FIELDS)[number];
export type SyncFields = Pick<ContactPayload, SyncFieldKey>;

/** provider 端的一筆聯絡人（已轉成本 app 的欄位） */
export interface RemoteContact {
  remoteId: string;
  fields: SyncFields;
  updatedAt: ISODate;
}

/**
 * 同一聯絡人兩邊都修改過且內容不同。
 * 規則：以 updatedAt 較新者為準（winner）；另一個版本放在 discarded，留給使用者確認。
 */
export interface SyncConflict {
  localId: ID;
  remoteId: string;
  /** 用來認定是同一人的鍵：`email:<小寫>` 或 `tel:<數字>` */
  matchedBy: string;
  winner: "local" | "remote";
  localUpdatedAt: ISODate;
  remoteUpdatedAt: ISODate;
  differingFields: SyncFieldKey[];
  local: SyncFields;
  remote: SyncFields;
  discarded: SyncFields;
}

export interface PushResult {
  created: number;
  updated: number;
  /** 內容相同或遠端較新而未寫入的筆數 */
  unchanged: number;
}

export interface ContactSyncProvider {
  readonly id: string;
  /** 顯示給使用者的名稱；mock 必須明確標示測試模式 */
  readonly label: string;
  /** true＝測試模式，沒有連線任何外部服務 */
  readonly isMock: boolean;
  /** 上次同步完成的時間；null＝尚未同步過。用來判斷某一邊是否「改過」 */
  readonly lastSyncedAt: ISODate | null;
  /** 取得 provider 端的全部聯絡人 */
  pull(): Promise<RemoteContact[]>;
  /** 把本機聯絡人寫到 provider：沒有對應者新增，本機較新者更新 */
  push(contacts: Contact[]): Promise<PushResult>;
  /** 列出與本機聯絡人的衝突（兩邊都改過且內容不同） */
  listConflicts(local: Contact[]): Promise<SyncConflict[]>;
  /** 記錄一次同步完成的時間，作為下次判斷「是否改過」的基準 */
  markSynced(at: ISODate): void;
}
