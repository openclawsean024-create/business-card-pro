"use client";

import { useStore } from "@/lib/store";
import { exportCSV, exportVCards, parseCSV } from "@/lib/export";
import { downloadText } from "../Common";
import { Download, Upload, Trash2, Settings as SettingsIcon } from "lucide-react";

export function SettingsTab() {
  const state = useStore();
  const reset = useStore((s) => s.reset);
  const importContacts = useStore((s) => s.importContacts);

  const active = state.contacts.filter((c) => c.status === "active");

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
          <label className="btn-secondary cursor-pointer">
            <Upload className="w-4 h-4" /> CSV 匯入
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const { contacts: parsed } = parseCSV(text);
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
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-white border border-danger-300 text-danger-600 font-medium text-sm hover:bg-danger-50 hover:border-danger-400 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" /> 重置全部
          </button>
        </div>
      </div>
      <div className="card p-4 text-xs text-slate-500 space-y-1">
        <div>資料儲存在你的瀏覽器 (localStorage),不會自動上傳。</div>
        <div>SPEC §3.1 FR-009 · 個資最小化: 刪除聯絡人會一併清除照片、互動、回訪、同意紀錄。</div>
      </div>
    </section>
  );
}