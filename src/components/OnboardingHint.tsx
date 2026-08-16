"use client";

import Link from "next/link";
import { HelpCircle } from "lucide-react";

interface OnboardingHintProps {
  visible: boolean;
  onDismiss: () => void;
  onGoToContacts: () => void;
}

/**
 * Onboarding 提示卡。
 * v2: 從 glassmorphism 換成 Minimalism — 白卡 + subtle border + accent
 * brand-50 背景做強調。
 */
export function OnboardingHint({ visible, onDismiss, onGoToContacts }: OnboardingHintProps) {
  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="新使用者指引"
      className="card border-brand-200 bg-brand-50/50 p-6 mb-6"
    >
      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className="shrink-0 w-10 h-10 rounded-md bg-brand-600 text-white flex items-center justify-center"
        >
          <HelpCircle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-900">3 步開始使用名片王 Pro</h3>
          <ol className="mt-3 text-sm space-y-2 list-none text-slate-700">
            <li className="flex gap-3 items-start">
              <span className="shrink-0 w-6 h-6 rounded-full bg-white border border-slate-200 text-brand-600 text-xs flex items-center justify-center font-semibold font-mono">
                1
              </span>
              <span>
                <strong className="text-slate-900">新增聯絡人</strong> — 姓名 + 公司任填一項,然後填「下一步」跟日期。
              </span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="shrink-0 w-6 h-6 rounded-full bg-white border border-slate-200 text-brand-600 text-xs flex items-center justify-center font-semibold font-mono">
                2
              </span>
              <span>
                <strong className="text-slate-900">回「今日」tab</strong> 看 queue,點「完成」記錄這次見面/通話。
              </span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="shrink-0 w-6 h-6 rounded-full bg-white border border-slate-200 text-brand-600 text-xs flex items-center justify-center font-semibold font-mono">
                3
              </span>
              <span>
                <strong className="text-slate-900">時間線</strong> 自動累積所有互動,匯出 vCard/CSV 帶著走。
              </span>
            </li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={onGoToContacts} className="btn-primary">
              開始新增第一位聯絡人
            </button>
            <button onClick={onDismiss} className="btn-secondary">
              我先看看
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            所有資料存在你的瀏覽器(SPEC §3.1 FR-008),不上傳任何伺服器。
            <Link
              href="https://github.com/openclawsean024-create/business-card-pro/blob/main/PRD/SPEC.md"
              className="underline ml-1 text-brand-600 hover:text-brand-700"
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