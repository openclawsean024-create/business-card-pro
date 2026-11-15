"use client";

import { useStore } from "@/lib/store";
import { exportCalendar, exportCSV, exportVCards } from "@/lib/export";
import { exportGoogleCSV, parseContactsFile } from "@/lib/google-contacts";
import { describeImport } from "@/lib/contact-import";
import { downloadText } from "../Common";
import { CalendarPlus, Download, Upload, Trash2, Settings as SettingsIcon } from "lucide-react";

export function SettingsTab() {
  const state = useStore();
  const reset = useStore((s) => s.reset);
  const importContacts = useStore((s) => s.importContacts);

  const active = state.contacts.filter((c) => c.status === "active");
  const pendingFollowups = state.followups.filter((followup) => followup.status === "pending");

  return (
    <section aria-labelledby="settings-h" className="space-y-4">
      <h2 id="settings-h" className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
        <SettingsIcon className="w-5 h-5 text-brand-600" /> 設定
      </h2>
      <div className="card p-5 space-y-4">
        <div>
          <div className="text-sm font-medium text-slate-900">方案</div>
          <p className="text-xs text-slate-500 mt-1">
            {state.plan.tier === "free"
              ? `免費 pilot · 上限 ${state.plan.maxContacts} 張 · ${state.plan.cloudSync ? "已啟用雲端同步" : "僅本地"}`
              : state.plan.tier}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              downloadText(exportVCards(active, state), "contacts.vcf", "text/vcard")
            }
            className="btn-primary"
          >
            <Download className="w-4 h-4" /> vCard 匯出
          </button>
          <button
            onClick={() =>
              downloadText(exportCSV(active, state), "contacts.csv", "text/csv")
            }
            className="btn-secondary"
          >
            <Download className="w-4 h-4" /> CSV 匯出
          </button>
          <button
            onClick={() =>
              downloadText(
                exportCalendar(state.followups, state.contacts),
                "followup-reminders.ics",
                "text/calendar",
              )
            }
            disabled={pendingFollowups.length === 0}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            title="匯入 Google Calendar；只會匯出尚未完成的回訪"
          >
            <CalendarPlus className="w-4 h-4" /> Google Calendar ({pendingFollowups.length})
          </button>
          <button
            onClick={() =>
              downloadText(exportGoogleCSV(active), "google-contacts.csv", "text/csv")
            }
            className="btn-secondary"
            title="產生可在 Google 聯絡人「匯入」的 CSV 檔；不會連線 Google"
          >
            <Download className="w-4 h-4" /> Google 聯絡人 CSV 匯出
          </button>
          <label className="btn-secondary cursor-pointer">
            <Upload className="w-4 h-4" /> 匯入 CSV／vCard
            <input
              type="file"
              accept=".csv,.vcf,text/csv,text/vcard"
              aria-label="匯入 CSV 或 vCard 檔"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                // 支援本 app 的 CSV、Google 聯絡人匯出的 Google CSV 與 vCard 3.0
                const parsed = parseContactsFile(text);
                const result = importContacts(parsed.contacts);
                const skipped = parsed.skipped > 0 ? `；${parsed.skipped} 筆沒有姓名與公司已略過` : "";
                alert(`${describeImport(result)}${skipped}`);
                e.target.value = "";
              }}
            />
          </label>
          <button
            onClick={() => {
              if (confirm("重置會清空所有資料,確定?")) reset();
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-white border border-danger-300 text-danger-600 font-medium text-sm hover:bg-danger-50 hover:border-danger-400 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" /> 重置全部
          </button>
        </div>
      </div>
      <div className="card p-4 text-xs text-slate-500 space-y-1">
        <div>Google Calendar 匯出會產生 .ics 檔案，請在 Google Calendar 選擇「匯入」加入。</div>
        <div>這是單向匯出，不會連線 Google，也不會將 localStorage 資料上傳。</div>
      </div>
      <div className="card p-4 text-xs text-slate-500 space-y-1">
        <div>Google 聯絡人以檔案互通：匯出 CSV 後到 Google 聯絡人選「匯入」；也可匯入 Google 聯絡人匯出的 Google CSV 或 vCard。</div>
        <div>不會連線 Google、不需要登入；匯入時 Email 或電話相同的聯絡人不會重複新增，且不會超過方案張數上限。</div>
      </div>
      <div className="card p-4 text-xs text-slate-500 space-y-1">
        <div>資料儲存在你的瀏覽器 (localStorage),不會自動上傳。</div>
        <div>SPEC §3.1 FR-009 · 個資最小化: 刪除聯絡人會一併清除照片、互動、回訪、同意紀錄。</div>
      </div>
    </section>
  );
}
