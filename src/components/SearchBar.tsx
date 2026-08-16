"use client";

import { Search, X } from "lucide-react";

export type SortMode = "name" | "company" | "dueDate" | "createdAt";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  tag: string | null;
  onTag: (t: string | null) => void;
  tags: string[];
  sortMode: SortMode;
  onSort: (m: SortMode) => void;
}

export function SearchBar({
  value,
  onChange,
  tag,
  onTag,
  tags,
  sortMode,
  onSort,
}: SearchBarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-2">
      <div className="flex-1 flex items-center gap-2 input !py-2">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          aria-label="搜尋聯絡人"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="搜尋姓名、公司、標籤、備註"
          className="flex-1 bg-transparent outline-none text-sm"
        />
        {value && (
          <button onClick={() => onChange("")} aria-label="清除搜尋" className="cursor-pointer">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>
      <select
        value={sortMode}
        onChange={(e) => onSort(e.target.value as SortMode)}
        aria-label="排序方式"
        className="input !py-2 cursor-pointer"
      >
        <option value="dueDate">依下次回訪</option>
        <option value="name">依姓名</option>
        <option value="company">依公司</option>
        <option value="createdAt">依新增時間</option>
      </select>
      {tags.length > 0 && (
        <select
          value={tag ?? ""}
          onChange={(e) => onTag(e.target.value || null)}
          aria-label="篩選標籤"
          className="input !py-2 cursor-pointer"
        >
          <option value="">全部標籤</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}