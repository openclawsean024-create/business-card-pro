"use client";

import { useStore } from "@/lib/store";
import { exportCSV, exportVCards, parseCSV } from "@/lib/export";
import { downloadText } from "../Common";
import { Download, Upload, Trash2, Settings as SettingsIcon } from "lucide-react";

/** SPEC §3.1 FR-004 + AC-006/007/010: 永遠可匯出,不擋資料 */
export function SettingsTab() {
  const state = useStore();
  const reset = useStore((s) => s.reset);
  const importContacts = useStore((s) => s.importContacts);

  const active = state.contacts.filter((c) => c.status === "active");

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
            onClick={() =>
              downloadText(exportVCards(active, state), "contacts.vcf", "text/vcard")
            }
            className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded bg-brand-600 text-white hover:bg-brand-700"
          >
            <Download className="w-4 h-4" /> vCard 匯出
          </button>
          <button
            onClick={() =>
              downloadText(exportCSV(active, state), "contacts.csv", "text/csv")
            }
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