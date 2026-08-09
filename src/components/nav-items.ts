// SPEC §4.3 對齊: 5 個 tab 共用同一份 metadata,TopNav + BottomNav 渲染時用同一個 source of truth
// 加新 tab = 在這裡加一行,不會忘記另一處

import {
  CalendarClock,
  Users,
  Plus,
  MessageSquare,
  Settings as SettingsIcon,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export type TabId = "today" | "queue" | "contacts" | "timeline" | "settings";

export interface NavItem {
  id: TabId;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { id: "today", label: "今日", icon: CalendarClock },
  { id: "queue", label: "全部", icon: Users },
  { id: "contacts", label: "聯絡人", icon: Plus },
  { id: "timeline", label: "時間線", icon: MessageSquare },
  { id: "settings", label: "設定", icon: SettingsIcon },
] as const;