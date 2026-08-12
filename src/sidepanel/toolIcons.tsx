import {
  BookOpen,
  BookText,
  CodeXml,
  FileText,
  History,
  ImagePlus,
  Languages,
  Lightbulb,
  ListChecks,
  Maximize2,
  MessageSquareText,
  Network,
  Minimize2,
  NotepadText,
  PanelRightOpen,
  PenLine,
  Presentation,
  Reply,
  Sparkles,
  Wand2,
  type LucideIcon
} from "lucide-react";
import { lazy, Suspense } from "react";
import type { UiTextKey } from "../shared/i18n";
import type { IconName } from "lucide-react/dynamic";

const DynamicLucideIcon = lazy(() =>
  import("lucide-react/dynamic").then((module) => ({
    default: module.DynamicIcon
  }))
);

const TOOL_ICONS: Record<string, LucideIcon> = {
  BookOpen,
  BookText,
  CodeXml,
  FileText,
  History,
  ImagePlus,
  Languages,
  Lightbulb,
  ListChecks,
  Maximize2,
  MessageSquareText,
  Minimize2,
  NotepadText,
  PanelRightOpen,
  PenLine,
  Presentation,
  Reply,
  Sparkles,
  Wand2
};

function DynamicIconFallback() {
  return <Sparkles />;
}

export function lucideIconNameFromKebab(name: string): string {
  return name
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function lucideIconNameToKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

function ProductLogoIcon() {
  return <img className="webmind-logo-icon" src="/icons/icon-32.png" alt="" />;
}

export const NAV_ITEMS = [
  { id: "chat" as const, labelKey: "navChat" as UiTextKey, icon: MessageSquareText },
  { id: "tools" as const, labelKey: "navTools" as UiTextKey, icon: Wand2 },
  { id: "mcp" as const, labelKey: "navMcp" as UiTextKey, icon: Network },
  { id: "history" as const, labelKey: "navHistory" as UiTextKey, icon: History },
  { id: "logs" as const, labelKey: "navLogs" as UiTextKey, icon: NotepadText }
];

export const TOOL_TAB_PRIORITY = [
  "analyze-image",
  "translate-text",
  "translate-document"
];

export function ToolIcon({ name }: { name: string }) {
  if (!name) return null;
  if (name === "WebMind") return <ProductLogoIcon />;
  const Icon = TOOL_ICONS[name];
  if (!Icon) {
    return (
      <Suspense fallback={<Sparkles />}>
        <DynamicLucideIcon
          name={lucideIconNameToKebab(name) as IconName}
          fallback={DynamicIconFallback}
        />
      </Suspense>
    );
  }
  return <Icon />;
}
