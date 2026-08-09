import {
  BookOpen,
  CodeXml,
  FileText,
  Globe2,
  ImagePlus,
  Languages,
  Lightbulb,
  ListChecks,
  Maximize2,
  MessageSquareReply,
  MessageSquareText,
  Minimize2,
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

function extensionAssetUrl(path: string): string {
  return typeof chrome !== "undefined" && chrome.runtime?.getURL
    ? chrome.runtime.getURL(path)
    : `/${path}`;
}

function ProductLogoIcon() {
  return (
    <img
      className="webmind-logo-icon"
      src={extensionAssetUrl("icons/icon-32.png")}
      alt=""
    />
  );
}

const TOOL_ICONS = {
  BookOpen,
  CodeXml,
  FileText,
  Globe2,
  ImagePlus,
  Languages,
  Lightbulb,
  ListChecks,
  Maximize2,
  MessageSquareText,
  Minimize2,
  MessageSquareReply,
  PanelRightOpen,
  PenLine,
  Presentation,
  Reply,
  RotateCcw,
  Search,
  ScanText,
  Sparkles,
  TextSelect,
  Wand2,
  WandSparkles
};

export function ToolIcon({ name }: { name: string }) {
  if (name === "WebMind") return <ProductLogoIcon />;
  const Icon = TOOL_ICONS[name as keyof typeof TOOL_ICONS] ?? Sparkles;
  return <Icon />;
}
