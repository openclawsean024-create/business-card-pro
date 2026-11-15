"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, ShieldCheck } from "lucide-react";
import { getOcrEngine, recognizeCard, type OcrEngine, type ParsedCard } from "@/lib/ocr";

interface OcrCaptureProps {
  /** 辨識完成：只把預覽結果交給表單，不建立聯絡人 */
  onResult: (parsed: ParsedCard) => void;
  /** 測試注入 mock engine；未指定時使用預設的 Tesseract engine */
  engine?: OcrEngine;
}

type Status =
  | { kind: "idle" }
  | { kind: "recognizing"; progress: number }
  | { kind: "done"; found: number }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

/**
 * 名片 OCR 入口（GOAL.md M1 AC-002、AC-007；來源：manager `card-list.tsx` 的拍照／上傳按鈕）。
 *
 * - 影像只交給 engine 在本機辨識：不轉成 data URL、不寫入 store 或 localStorage、不上傳。
 * - 辨識結果只透過 onResult 預填表單；是否存檔由使用者在表單按下確認決定。
 * - 失敗或取消時不動表單內容，使用者可以直接手動輸入。
 */
export function OcrCapture({ onResult, engine }: OcrCaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const busy = status.kind === "recognizing";

  // 表單關閉時中止進行中的辨識
  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.type && !file.type.startsWith("image/")) {
      setStatus({ kind: "error", message: "這不是圖片檔，請改選名片照片，或直接手動輸入。" });
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus({ kind: "recognizing", progress: 0 });
    try {
      const parsed = await recognizeCard(file, engine ?? getOcrEngine(), {
        signal: controller.signal,
        onProgress: (ratio) => {
          if (!controller.signal.aborted) setStatus({ kind: "recognizing", progress: ratio });
        },
      });
      if (controller.signal.aborted) return;
      const found = Object.values(parsed.fields).filter(Boolean).length;
      setStatus({ kind: "done", found });
      onResult(parsed);
    } catch (err) {
      if (controller.signal.aborted) return;
      console.warn("[OcrCapture] recognize failed", err);
      setStatus({
        kind: "error",
        message: "辨識失敗（可能是網路無法下載辨識模型，或圖片無法讀取）。已填的欄位都還在，請直接手動輸入。",
      });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus({ kind: "cancelled" });
  }

  return (
    <section
      aria-labelledby="ocr-capture-title"
      className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2"
      data-testid="ocr-capture"
    >
      <h4 id="ocr-capture-title" className="text-xs font-medium text-slate-700">
        掃描名片（選用）
      </h4>
      <p
        id="ocr-privacy-notice"
        data-testid="ocr-privacy-notice"
        className="flex gap-2 text-xs leading-relaxed text-slate-600"
      >
        <ShieldCheck className="w-4 h-4 shrink-0 text-brand-600 mt-0.5" aria-hidden="true" />
        <span>
          名片影像只在你的裝置上辨識，不會上傳到伺服器，辨識後預設不保存影像。首次使用會從 CDN
          下載辨識程式與語言模型（下載內容不含你的影像）。名片上是他人的個人資料，只會存在這台裝置的瀏覽器，請僅用於業務聯繫。辨識結果只是預覽，請逐欄確認後再儲存。
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          aria-describedby="ocr-privacy-notice"
          onClick={() => cameraRef.current?.click()}
        >
          <Camera className="w-4 h-4" aria-hidden="true" /> 拍照掃描
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          aria-describedby="ocr-privacy-notice"
          onClick={() => fileRef.current?.click()}
        >
          <ImageUp className="w-4 h-4" aria-hidden="true" /> 上傳圖片
        </button>
        {busy && (
          <button type="button" className="btn-secondary" onClick={cancel}>
            取消辨識
          </button>
        )}
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="拍照掃描名片"
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void handleFile(file);
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        aria-label="上傳名片圖片"
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void handleFile(file);
        }}
      />
      <p role="status" aria-live="polite" className="text-xs text-slate-600 min-h-[1rem]">
        {status.kind === "recognizing" && `辨識中… ${Math.round(status.progress * 100)}%`}
        {status.kind === "done" &&
          (status.found > 0
            ? `已預填 ${status.found} 個欄位，尚未儲存。請對照名片逐欄確認。`
            : "沒有辨識出可用的欄位，請手動輸入。")}
        {status.kind === "cancelled" && "已取消辨識，已填的欄位都還在，可以繼續手動輸入。"}
      </p>
      {status.kind === "error" && (
        <p role="alert" className="text-xs text-danger-600">
          {status.message}
        </p>
      )}
    </section>
  );
}
