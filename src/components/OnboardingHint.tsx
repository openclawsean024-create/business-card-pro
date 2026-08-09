"use client";

import Link from "next/link";

interface OnboardingHintProps {
  /** 是否顯示:第一次訪問 + localStorage 是空的 + 沒有聯絡人 */
  visible: boolean;
  onDismiss: () => void;
  onGoToContacts: () => void;
}

/**
 * 首次訪問且沒有資料時,顯示 onboarding hint。
 * SPEC §1.3 + §6.1: 「首次接觸 → 看到清楚的 CTA, 不只是空狀態」。
 * 設計選擇: 不用「demo data」按鈕(SPEC §1.5 Non-Goals 排除 onboarding 流程),
 * 改成引導使用者到「聯絡人」tab 自己建第一張。
 */
export function OnboardingHint({
  visible,
  onDismiss,
  onGoToContacts,
}: OnboardingHintProps) {
  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="新使用者指引"
      className="rounded-lg border border-brand-200 dark:border-brand-900 bg-brand-50 dark:bg-brand-950/30 p-5 mb-4"
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="shrink-0 w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-semibold"
        >
          1
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base">3 步開始使用名片王 Pro</h3>
          <ol className="mt-2 text-sm space-y-2 list-none">
            <li className="flex gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center">
                1
              </span>
              <span>
                <strong>新增聯絡人</strong> —
                姓名 + 公司任填一項,然後填「下一步」跟日期。
              </span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center">
                2
              </span>
              <span>
                <strong>回今日 tab</strong> 看 queue,點「完成」記錄這次見面/通話。
              </span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center">
                3
              </span>
              <span>
                <strong>時間線</strong> 自動累積所有互動,匯出 vCard/CSV 帶著走。
              </span>
            </li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={onGoToContacts}
              className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded bg-brand-600 text-white hover:bg-brand-700"
            >
              開始新增第一位聯絡人
            </button>
            <button
              onClick={onDismiss}
              className="text-sm px-3 py-1.5 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              我先看看
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            所有資料存在你的瀏覽器(SPEC §3.1 FR-008),不上傳任何伺服器。
            <Link
              href="https://github.com/openclawsean024-create/business-card-pro/blob/main/PRD/SPEC.md"
              className="underline ml-1"
              target="_blank"
              rel="noopener"
            >
              SPEC
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}