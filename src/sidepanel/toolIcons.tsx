import {
  BookOpen,
  Code2,
  FileText,
  Globe2,
  History,
  ImagePlus,
  Languages,
  Lightbulb,
  ListChecks,
  Maximize2,
  Minimize2,
  MessageSquareText,
  PanelRightOpen,
  PenLine,
  Presentation,
  Reply,
  RotateCcw,
  ScanText,
  Search,
  Sparkles,
  TextSelect,
  Wand2,
  WandSparkles
} from "lucide-react";
import type { UiTextKey } from "../shared/i18n";

const TOOL_ICONS = {
  FileText,
  Globe2,
  ImagePlus,
  Lightbulb,
  ListChecks,
  Maximize2,
  Minimize2,
  PanelRightOpen,
  PenLine,
  RotateCcw,
  Reply,
  ScanText,
  Languages,
  BookOpen,
  Code2,
  Presentation,
  Search,
  MessageSquareText,
  Sparkles,
  TextSelect,
  Wand2,
  WandSparkles
};

export const NAV_ITEMS = [
  { id: "chat" as const, labelKey: "navChat" as UiTextKey, icon: MessageSquareText },
  { id: "tools" as const, labelKey: "navTools" as UiTextKey, icon: Wand2 },
  { id: "history" as const, labelKey: "navHistory" as UiTextKey, icon: History },
  { id: "logs" as const, labelKey: "navLogs" as UiTextKey, icon: FileText }
];

export const TOOL_ICON_CHOICES = [
  "Sparkles",
  "BookOpen",
  "Code2",
  "FileText",
  "Globe2",
  "ImagePlus",
  "Lightbulb",
  "Languages",
  "ListChecks",
  "Maximize2",
  "Minimize2",
  "PanelRightOpen",
  "MessageSquareText",
  "PenLine",
  "Presentation",
  "Reply",
  "RotateCcw",
  "ScanText",
  "Search",
  "TextSelect",
  "Wand2",
  "WandSparkles"
];

export const TOOL_TAB_PRIORITY = [
  "analyze-image",
  "translate-text",
  "translate-document"
];

export function ToolIcon({ name }: { name: string }) {
  const Icon = TOOL_ICONS[name as keyof typeof TOOL_ICONS] ?? Sparkles;
  return <Icon />;
}
