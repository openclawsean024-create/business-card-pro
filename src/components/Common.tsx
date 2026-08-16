import type { ReactNode } from "react";

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="card border-dashed border-slate-300 p-8 text-center">
      <p className="text-base font-medium text-slate-900">{title}</p>
      <p className="text-sm text-slate-500 mt-1.5">{hint}</p>
    </div>
  );
}

export function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block text-xs space-y-1.5">
      <span className="font-medium text-slate-700">
        {label}
        {required && <span className="text-danger-600 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

/** 觸發瀏覽器下載(Blob → objectURL → <a download>) */
export function downloadText(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}