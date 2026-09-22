"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { getTodayProgress, buildRhythm } from "@/lib/domain";

/**
 * 今日回訪節奏:
 *  - 「你已經在往前走了」+ done/total 進度條
 *  - 最近 14 天每日 followup-done + interaction 計數的迷你條形圖
 *
 * 對應 SPEC §3.1 FR-003(完成回訪產生互動)與 PRD UI-SPEC §3.3「14 天回訪節奏」。
 */
export function PulseCard() {
  const followups = useStore((s) => s.followups);
  const interactions = useStore((s) => s.interactions);

  const progress = useMemo(
    () => getTodayProgress(followups),
    [followups],
  );
  const rhythm = useMemo(
    () => buildRhythm(followups, interactions, new Date(), 14),
    [followups, interactions],
  );

  const max = Math.max(1, ...rhythm.map((p) => p.count));
  const pending = Math.max(0, progress.total - progress.done);
  const ratio = progress.total === 0 ? 0 : progress.done / progress.total;
  const widthPct = `${Math.round(ratio * 100)}%`;

  return (
    <section
      aria-labelledby="pulse-h"
      className="card p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
            今日回訪節奏
          </div>
          <h3 id="pulse-h" className="text-lg font-semibold text-slate-900 mt-1">
            <span className="sr-only">今日回訪節奏：</span>
            {progress.total === 0
              ? "今天沒有待辦,享受一個輕鬆的一天"
              : progress.done >= progress.total
                ? "今天的下一步都做完了"
                : "你已經在往前走了"}
          </h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-brand-600 font-mono">
            {progress.done}
            <span className="text-sm text-slate-500 font-normal"> / {progress.total}</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">今日完成</div>
        </div>
      </div>

      <div className="mt-4">
        <div
          role="progressbar"
          aria-label="今日回訪完成度"
          aria-valuenow={progress.done}
          aria-valuemin={0}
          aria-valuemax={progress.total}
          className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
        >
          <div
            className="h-full bg-brand-600 transition-all duration-300"
            style={{ width: widthPct }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {progress.total === 0
            ? "新增聯絡人並建立「下一步」就會自動出現在這裡。"
            : pending === 0
              ? `已完成全部 ${progress.total} 個下一步。`
              : `還有 ${pending} 個下一步待處理。`}
        </p>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-slate-700">最近 14 天回訪節奏</div>
          <div className="text-xs text-slate-500 font-mono">
            最高 {max} / 天
          </div>
        </div>
        <div
          className="mt-3 grid gap-1.5 items-end h-24"
          style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}
          role="img"
          aria-label="最近 14 天回訪節奏條形圖"
        >
          {rhythm.map((p) => {
            const h = Math.max(4, Math.round((p.count / max) * 92));
            const aria = `${p.date}: ${p.count} 次互動`;
            return (
              <div
                key={p.date}
                className="flex flex-col items-center gap-1"
                title={aria}
              >
                <div className="w-full h-full flex items-end">
                  <div
                    className={
                      p.count === 0
                        ? "w-full h-1 rounded-full bg-slate-200"
                        : p.isToday
                          ? "w-full rounded-full bg-brand-600 transition-all"
                          : "w-full rounded-full bg-brand-200 transition-all"
                    }
                    style={{ height: `${h}px` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div
          className="mt-1 grid text-[10px] text-slate-400 font-mono"
          style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}
        >
          {rhythm.map((p) => (
            <div
              key={p.date}
              className={
                "text-center truncate " + (p.isToday ? "text-slate-900 font-semibold" : "")
              }
            >
              {Number.parseInt(p.date.slice(8, 10), 10)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
