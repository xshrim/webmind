import {
  FileText,
  History,
  MessageSquareText,
  Sparkles,
  Wand2,
  icons,
  type LucideIcon
} from "lucide-react";
import type { UiTextKey } from "../shared/i18n";

const TOOL_ICONS = icons as Record<string, LucideIcon>;

function ProductLogoIcon() {
  return <img className="webmind-logo-icon" src="/icons/icon-32.png" alt="" />;
}

export const NAV_ITEMS = [
  { id: "chat" as const, labelKey: "navChat" as UiTextKey, icon: MessageSquareText },
  { id: "tools" as const, labelKey: "navTools" as UiTextKey, icon: Wand2 },
  { id: "history" as const, labelKey: "navHistory" as UiTextKey, icon: History },
  { id: "logs" as const, labelKey: "navLogs" as UiTextKey, icon: FileText }
];

export const TOOL_ICON_CHOICES = Object.keys(TOOL_ICONS).sort((left, right) =>
  left.localeCompare(right)
);

export const TOOL_TAB_PRIORITY = [
  "analyze-image",
  "translate-text",
  "translate-document"
];

export function ToolIcon({ name }: { name: string }) {
  if (!name) return null;
  if (name === "WebMind") return <ProductLogoIcon />;
  const Icon = TOOL_ICONS[name] ?? Sparkles;
  return <Icon />;
}
