import {
  BookOpen,
  Code2,
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

const TOOL_ICONS = {
  BookOpen,
  Code2,
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
  const Icon = TOOL_ICONS[name as keyof typeof TOOL_ICONS] ?? Sparkles;
  return <Icon />;
}
