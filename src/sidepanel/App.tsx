import {
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  CirclePlus,
  Clock3,
  Copy,
  Eraser,
  FileText,
  ImagePlus,
  Link2,
  LoaderCircle,
  MessageCirclePlus,
  MessageSquareText,
  Paperclip,
  PanelTop,
  PenLine,
  Presentation,
  RefreshCcw,
  RedoDot,
  ScanText,
  Search,
  Send,
  Settings,
  Sparkles,
  Square,
  SquareMousePointer,
  StickyNote,
  TextSelect,
  Trash2,
  Undo2,
  UserRound,
  Wand,
  Wand2,
  WandSparkles,
  X
} from "lucide-react";
import {
  useCallback,
  useEffect,
  lazy,
  useMemo,
  useRef,
  Suspense,
  useState
} from "react";
import {
  getActivePageContext,
  getActiveTab,
  isExtensionRuntime,
  openOptions,
  requestOriginPermission,
  runtimeRequest,
  sendToTab
} from "../shared/browser";
import {
  uiText,
  type UiTextKey
} from "../shared/i18n";
import { TooltipLayer } from "./TooltipLayer";
import {
  clearConversations,
  consumePendingAction,
  deleteConversation,
  listConversations,
  loadCustomTools,
  loadSettings,
  saveConversation,
  saveCustomTools,
  saveSettings
} from "../shared/storage";
import {
  allTools,
  toolInstruction,
  toolPromptWithContext
} from "../shared/tools";
import { modelPurposeForToolId, profileForPurpose } from "../shared/models";
import {
  articlePruneInstruction,
  immersiveReadingInstruction
} from "../shared/prompts";
import {
  buildReadingFallbackPrompt,
  parseReadingFallbackTranslations,
  type ReadingFallbackTranslation,
  type ReadingLocalPlan
} from "../shared/immersiveReading";
import type {
  AppSettings,
  AppLogLevel,
  ArticleExtractionRule,
  ArticlePreviewBlock,
  ChatRunRequest,
  ChatMessage,
  Conversation,
  CustomTool,
  ImageAttachment,
  ModelPurpose,
  PageContext,
  PageTextBlock,
  PageTranslation,
  PageTranslationMode,
  PendingAction,
  ProviderProfile,
  ToolDefinition,
  ToolInvocationContext,
  ToolSurface,
  WebSearchResult,
  AppLanguage
} from "../shared/types";
import {
  alignPageTranslations,
  buildPageTranslationSystemPrompt,
  buildPageTranslationUserPrompt,
  buildProtectedTranslationInput,
  buildProtectedTranslationInstruction,
  createMessage,
  errorMessage,
  extractPageTranslationEntries,
  extractJsonArray,
  protectTranslationText,
  scopeProtectedTranslationText,
  restoreTranslationText,
  shortTitle,
  toModelMessage,
  truncateText,
  type ProtectedTranslationText
} from "../shared/utils";
import {
  classifyImmersiveWorkflowError,
  createImmersiveRunState,
  createImmersiveWorkflowSummary,
  formatImmersiveWorkflowLog,
  immersiveReadingModelBatchAppliedProgress,
  immersiveTranslationBatchAppliedProgress,
  immersiveTranslationBatchStartProgress,
  immersiveWorkflowCollectingProgress,
  immersiveWorkflowCompleteProgress,
  immersiveWorkflowErrorProgress,
  immersiveWorkflowReadyProgress,
  immersiveWorkflowRunningProgress,
  isImmersiveWorkflowCancelledError,
  type ImmersiveWorkflowProgressUpdate,
  runImmersiveReadingFinalApplyWorkflow,
  runImmersiveReadingLocalFirstWorkflow,
  runImmersiveReadingModelPageWorkflow,
  runImmersiveTranslationWorkflow
} from "../shared/immersiveWorkflow";
import { SyntaxHighlightedMarkdown } from "./SyntaxHighlightedMarkdown";
import { extractPdfContext } from "./pdf";
import { searchWeb } from "../shared/webSearch";
import {
  fileToAttachment,
  urlToAttachment,
  urlToTextAttachment
} from "./attachments";
import {
  buildSystemMessage,
  contextModeAfterTabSwitch,
  contextLabel,
  contextMatchesTab,
  contextSnapshotExcerpt,
  contextTranslationSourceText,
  defaultContextMode,
  normalizePageContext,
  sameTabIdentity,
  type ContextMode
} from "./context";
import { markdownPreviewSegments } from "./markdownPreview";
import {
  NAV_ITEMS,
  TOOL_TAB_PRIORITY,
  ToolIcon
} from "./toolIcons";
import {
  LOG_LEVEL_OPTIONS,
  ToolInvocationBubble,
  attachmentText,
  contextIcon,
  formatLogTime,
  formatTime,
  logLevelTextKey,
  logLevelWeight
} from "./display";
import {
  ImmersiveReadingIcon,
  ImmersiveTranslateIcon
} from "./customIcons";

type ViewId = "chat" | "tools" | "history" | "logs";

const LazyToolIconPicker = lazy(() =>
  import("./ToolIconPicker").then((module) => ({
    default: module.ToolIconPicker
  }))
);

interface OperationLogEntry {
  id: string;
  time: number;
  level: AppLogLevel;
  message: string;
}

interface StreamMessage {
  type: "chat.delta" | "chat.done" | "chat.error" | "chat.cancelled";
  requestId: string;
  delta?: string;
  error?: string;
}

interface OperationLogRuntimeMessage {
  type?: string;
  payload?: {
    time?: number;
    level?: AppLogLevel;
    message?: string;
  };
}

const IMMERSIVE_READING_BATCH_SIZE = 20;
const IMMERSIVE_TRANSLATION_BATCH_SIZE = 10;
const IMMERSIVE_TRANSLATION_CONCURRENCY = 3;
const PINNED_MESSAGE_TOOL_IDS = new Set([
  "translate-text",
  "summary",
  "explain-code"
]);

function isFocusOutside(
  container: HTMLElement,
  nextTarget: EventTarget | null
): boolean {
  return !(nextTarget instanceof Node) || !container.contains(nextTarget);
}

function articleBlockIdsToRemove(
  modelText: string,
  blocks: ArticlePreviewBlock[],
  language?: AppLanguage
): Set<string> {
  const validIds = new Set(blocks.map((block) => block.id));
  const decisions = extractJsonArray<{
    id?: unknown;
    action?: unknown;
    decision?: unknown;
  }>(modelText, language);
  const removed = new Set<string>();
  let recognized = 0;
  for (const decision of decisions) {
    if (!decision || typeof decision.id !== "string") continue;
    if (!validIds.has(decision.id)) continue;
    const action = String(decision.action ?? decision.decision ?? "")
      .trim()
      .toLowerCase();
    if (!action) continue;
    recognized += 1;
    if (
      action === "remove" ||
      action === "exclude" ||
      action === "discard" ||
      action === "drop" ||
      action.includes("剔除") ||
      action.includes("删除") ||
      action.includes("刪除")
    ) {
      removed.add(decision.id);
    }
  }
  if (!recognized) {
    throw new Error(uiText(language, "modelPruneInvalidResult"));
  }
  return removed;
}

export function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [view, setView] = useState<ViewId>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composer, setComposer] = useState("");
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [includePage, setIncludePage] = useState(true);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [currentPageContext, setCurrentPageContext] =
    useState<PageContext | null>(null);
  const [currentArticleContext, setCurrentArticleContext] =
    useState<PageContext | null>(null);
  const [selectionContext, setSelectionContext] =
    useState<PageContext | null>(null);
  const [activeTab, setActiveTab] = useState<chrome.tabs.Tab | null>(null);
  const [contextError, setContextError] = useState("");
  const [contextLoading, setContextLoading] = useState(true);
  const [articlePicking, setArticlePicking] = useState(false);
  const [articlePruning, setArticlePruning] = useState(false);
  const [bodyPreviewExpanded, setBodyPreviewExpanded] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [toolStatus, setToolStatus] = useState("");
  const [operationLogs, setOperationLogs] = useState<OperationLogEntry[]>([]);
  const [history, setHistory] = useState<Conversation[]>([]);
  const [customTools, setCustomTools] = useState<CustomTool[]>([]);
  const [toolEditorOpen, setToolEditorOpen] = useState(false);
  const [toolIconPickerOpen, setToolIconPickerOpen] = useState(false);
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [toolDraft, setToolDraft] = useState({
    title: "",
    description: "",
    template: "",
    icon: ""
  });
  const [bodyCopied, setBodyCopied] = useState(false);
  const [articleScoreTrend, setArticleScoreTrend] = useState<
    "up" | "down" | "same"
  >("same");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [editingMessageSubmitting, setEditingMessageSubmitting] =
    useState(false);
  const [messageToolMenuId, setMessageToolMenuId] = useState<string | null>(
    null
  );
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [chatToolsExpanded, setChatToolsExpanded] = useState(false);
  const [chatToolsHiddenDuringRequest, setChatToolsHiddenDuringRequest] =
    useState(false);
  const [articleRuleEditorOpen, setArticleRuleEditorOpen] = useState(false);
  const [articleRuleDraft, setArticleRuleDraft] = useState({
    urlPattern: "",
    selector: ""
  });

  const messagesRef = useRef(messages);
  const previousArticleScoreRef = useRef<{
    pageUrl: string;
    score: number;
  } | null>(null);
  const settingsRef = useRef(settings);
  const conversationIdRef = useRef<string>(crypto.randomUUID());
  const conversationCreatedAtRef = useRef<number>(Date.now());
  const requestMapRef = useRef(new Map<string, string>());
  const requestTranslationProtectionRef = useRef(
    new Map<string, ProtectedTranslationText>()
  );
  const requestTranslationRawTextRef = useRef(new Map<string, string>());
  const lastPendingIdRef = useRef<string | null>(null);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const connectStreamPortRef = useRef<(() => chrome.runtime.Port | null) | null>(
    null
  );
  const persistConversationRef = useRef<(() => Promise<void>) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyzeImageInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatToolsTrayRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const previousStreamingIdRef = useRef<string | null>(null);
  const chatToolsStreamStartedRef = useRef(false);
  const selectionContextVersionRef = useRef(0);
  const pendingSelectionContextRef = useRef<PageContext | null>(null);
  const selectionContextRef = useRef<PageContext | null>(null);
  const selectionOverrideRef = useRef<{
    previousMode: ContextMode;
    previousIncludePage: boolean;
    previousContext: PageContext | null;
    url: string;
  } | null>(null);
  const activeTabContextVersionRef = useRef(0);
  const activeTabIdRef = useRef<number | null>(null);
  const articlePickingRef = useRef(false);
  const articlePickRunRef = useRef<{
    id: string;
    tabId: number;
  } | null>(null);
  const contextModeRef = useRef<ContextMode>("page");
  const demoTimerRef = useRef<number | null>(null);
  const immersiveRunRef = useRef<{
    id: string;
    controller: AbortController;
  } | null>(null);

  const beginImmersiveRun = () => {
    immersiveRunRef.current?.controller.abort();
    const run = {
      id: crypto.randomUUID(),
      controller: new AbortController()
    };
    immersiveRunRef.current = run;
    return run;
  };

  const isCurrentImmersiveRun = (run: { id: string }): boolean =>
    immersiveRunRef.current?.id === run.id;

  const finishImmersiveRun = (run: { id: string }) => {
    if (isCurrentImmersiveRun(run)) {
      immersiveRunRef.current = null;
    }
  };

  const cancelArticlePicking = useCallback((tabId?: number) => {
    if (!articlePickingRef.current && !articlePickRunRef.current) return;
    const targetTabId = tabId ?? articlePickRunRef.current?.tabId;
    articlePickRunRef.current = null;
    articlePickingRef.current = false;
    setArticlePicking(false);
    setToolStatus("");
    if (targetTabId) {
      void sendToTab(targetTabId, { type: "page.article.pick.cancel" }).catch(
        () => undefined
      );
    }
  }, []);

  const updateMessages = useCallback(
    (
      updater: ChatMessage[] | ((current: ChatMessage[]) => ChatMessage[])
    ) => {
      setMessages((current) => {
        const next =
          typeof updater === "function" ? updater(current) : updater;
        messagesRef.current = next;
        return next;
      });
    },
    []
  );

  const activeProfile = useMemo(
    () =>
      settings?.profiles.find(
        (profile) => profile.id === settings.activeProfileId
      ) ?? null,
    [settings]
  );

  const availableTools = useMemo(
    () => allTools(customTools, settings ?? undefined),
    [customTools, settings]
  );
  const t = (key: UiTextKey) => uiText(settings?.interfaceLanguage, key);

  const appendOperationLog = useCallback(
    (message: string, level: AppLogLevel = "info") => {
      const trimmed = message.trim();
      if (!trimmed) return;
      setOperationLogs((current) =>
        [
          ...current,
          {
            id: crypto.randomUUID(),
            time: Date.now(),
            level,
            message: trimmed
          }
        ].slice(-300)
      );
    },
    []
  );

  useEffect(() => {
    if (!notice) return;
    appendOperationLog(notice, notice.includes("Error") ? "error" : "warning");
  }, [appendOperationLog, notice]);

  useEffect(() => {
    if (!toolStatus) return;
    appendOperationLog(toolStatus, "info");
  }, [appendOperationLog, toolStatus]);

  useEffect(() => {
    if (!contextError) return;
    appendOperationLog(contextError, "error");
  }, [appendOperationLog, contextError]);

  useEffect(() => {
    if (view !== "logs") return;
    logsEndRef.current?.scrollIntoView({ block: "end" });
  }, [operationLogs, view]);

  useEffect(() => {
    if (!isExtensionRuntime()) return;
    const listener = (message: OperationLogRuntimeMessage) => {
      if (message.type !== "webmind.operationLog") return;
      const logMessage = String(message.payload?.message ?? "").trim();
      if (!logMessage) return;
      setOperationLogs((current) =>
        [
          ...current,
          {
            id: crypto.randomUUID(),
            time:
              typeof message.payload?.time === "number"
                ? message.payload.time
                : Date.now(),
            level: message.payload?.level ?? "info",
            message: logMessage
          }
        ].slice(-300)
      );
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!contextError) return;
    const timer = window.setTimeout(() => setContextError(""), 5000);
    return () => window.clearTimeout(timer);
  }, [contextError]);

  useEffect(() => {
    if (!toolStatus) return;
    const restored = uiText(settings?.interfaceLanguage, "translationRemoved");
    const appliedPrefix = `${uiText(
      settings?.interfaceLanguage,
      "translationApplied"
    )} `;
    if (toolStatus !== restored && !toolStatus.startsWith(appliedPrefix)) {
      return;
    }
    const timer = window.setTimeout(() => setToolStatus(""), 5000);
    return () => window.clearTimeout(timer);
  }, [settings?.interfaceLanguage, toolStatus]);

  useEffect(() => {
    articlePickingRef.current = articlePicking;
  }, [articlePicking]);

  useEffect(() => {
    selectionContextRef.current = selectionContext;
  }, [selectionContext]);

  useEffect(() => {
    const previousTabId = activeTabIdRef.current;
    const nextTabId = activeTab?.id ?? null;
    if (
      articlePickingRef.current &&
      previousTabId !== null &&
      previousTabId !== nextTabId
    ) {
      cancelArticlePicking(previousTabId);
    }
    if (previousTabId !== null && previousTabId !== nextTabId) {
      selectionOverrideRef.current = null;
    }
    activeTabIdRef.current = nextTabId;
  }, [activeTab?.id, cancelArticlePicking]);

  useEffect(() => {
    if (!articlePicking || !activeTab?.id) return;
    const tabId = activeTab.id;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      cancelArticlePicking(tabId);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [activeTab?.id, articlePicking, cancelArticlePicking]);

  const toolsFor = useCallback(
    (surface: ToolSurface): ToolDefinition[] => {
      const enabledIds = settings?.enabledToolIds?.[surface] ?? [];
      return enabledIds
        .map((id) => availableTools.find((tool) => tool.id === id))
        .filter((tool): tool is ToolDefinition => Boolean(tool));
    },
    [availableTools, settings]
  );

  const refreshHistory = useCallback(async () => {
    setHistory(await listConversations());
  }, []);

  const persistCurrentConversation = useCallback(async () => {
    const currentSettings = settingsRef.current;
    if (!currentSettings?.activeProfileId) return;
    const currentMessages = messagesRef.current.filter(
      (message) => message.role !== "system"
    );
    const firstUser = currentMessages.find((message) => message.role === "user");
    if (!firstUser || currentMessages.length < 2) return;
    const conversation: Conversation = {
      id: conversationIdRef.current,
      title: shortTitle(
        firstUser.content ||
          uiText(currentSettings.interfaceLanguage, "imageChat")
      ),
      messages: currentMessages,
      providerId: currentSettings.activeProfileId,
      pageTitle: pageContext?.title,
      pageUrl: pageContext?.url,
      createdAt: conversationCreatedAtRef.current,
      updatedAt: Date.now()
    };
    await saveConversation(conversation, currentSettings.historyLimit);
    await refreshHistory();
  }, [pageContext, refreshHistory]);

  useEffect(() => {
    persistConversationRef.current = persistCurrentConversation;
  }, [persistCurrentConversation]);

  const applyPendingAction = useCallback(async (pending: PendingAction) => {
    if (lastPendingIdRef.current === pending.id) return;
    lastPendingIdRef.current = pending.id;
    appendOperationLog(
      `${uiText(settingsRef.current?.interfaceLanguage, "logPendingAction")}: ${pending.action}`,
      "info"
    );
    const pendingContextScope =
      pending.contextScope === "page" ||
      pending.contextScope === "article" ||
      pending.contextScope === "selection"
        ? pending.contextScope
        : null;
    if (pending.pageUrl && pending.pageTitle) {
      const next: PageContext = {
        kind: pending.imageUrl ? "image" : "selection",
        title:
          pending.pageTitle ??
          uiText(settingsRef.current?.interfaceLanguage, "currentPage"),
        url: pending.pageUrl,
        text: pending.text ?? "",
        markdown: pending.markdown ?? pending.text ?? "",
        selection: pending.text
      };
      if (next.kind === "selection" && pending.text?.trim()) {
        pendingSelectionContextRef.current = next;
        setSelectionContext(next);
        setPageContext(next);
      } else {
        setPageContext(next);
      }
      if (pendingContextScope === "selection") {
        contextModeRef.current = "selection";
        const tabId = activeTab?.id;
        if (tabId) {
          void sendToTab(tabId, {
            type: "immersive.contextScope.set",
            scope: "selection"
          }).catch(() => undefined);
        }
      }
      if (pending.text) setIncludePage(true);
    }
    if (pending.imageUrl) {
      setComposer(
        uiText(settingsRef.current?.interfaceLanguage, "promptImageAnalysis")
      );
      try {
        setAttachments([
          await urlToAttachment(
            pending.imageUrl,
            settingsRef.current?.interfaceLanguage
          )
        ]);
      } catch (error) {
        setNotice(errorMessage(error));
      }
    } else if (pending.action === "ask") {
      setComposer("");
    } else if (pending.text) {
      const actionQuestions: Record<Exclude<PendingAction["action"], "ask">, string> = {
        summarize: uiText(
          settingsRef.current?.interfaceLanguage,
          "promptSummarizeSelection"
        ),
        explain: uiText(
          settingsRef.current?.interfaceLanguage,
          "promptExplainSelection"
        ),
        translate: uiText(
          settingsRef.current?.interfaceLanguage,
          "promptAutoTranslateSelection"
        ),
        rewrite: uiText(
          settingsRef.current?.interfaceLanguage,
          "promptRewriteSelection"
        ),
        reply: uiText(
          settingsRef.current?.interfaceLanguage,
          "promptReplySelection"
        )
      };
      setComposer(actionQuestions[pending.action]);
    }
    setView("chat");
  }, [activeTab?.id, appendOperationLog]);

  const refreshActivePageContext = useCallback(
    async (
      reason: string,
      showLoading = true,
      policy: "default" | "preserve" = "default",
      replaceableArticleExtraction = false
    ) => {
      const version = ++activeTabContextVersionRef.current;
      selectionContextVersionRef.current += 1;
      if (showLoading) setContextLoading(true);
      try {
        const currentMode = contextModeRef.current;
        const defaultMode = defaultContextMode(settingsRef.current);
        const activeTabBeforeRefresh = activeTabIdRef.current;
        const getPage = (
          scope: "page" | "article",
          ignoreSelection = true
        ) =>
          getActivePageContext(settingsRef.current?.interfaceLanguage, {
            ignoreSelection,
            scope,
            replaceableArticleExtraction:
              scope === "article" && replaceableArticleExtraction
          });
        const requestedMode: ContextMode =
          policy === "preserve" ? currentMode : defaultMode;
        let page =
          requestedMode === "none"
            ? { tab: await getActiveTab(), context: null }
            : await getPage(
                requestedMode === "article" ? "article" : "page",
                requestedMode !== "selection"
              );
        if (activeTabContextVersionRef.current !== version) return;
        const tabChanged = Boolean(
          policy === "preserve" &&
            page.tab?.id &&
            activeTabBeforeRefresh !== null &&
            page.tab.id !== activeTabBeforeRefresh
        );
        let nextContextMode = requestedMode;
        let normalizedContext = normalizePageContext(page.context);
        if (tabChanged) {
          nextContextMode = contextModeAfterTabSwitch(
            requestedMode,
            defaultMode,
            normalizedContext
          );
        }
        if (
          tabChanged &&
          requestedMode === "selection" &&
          nextContextMode === "article"
        ) {
          if (defaultMode === "article") {
            page = await getPage("article", true);
            if (activeTabContextVersionRef.current !== version) return;
            normalizedContext = normalizePageContext(page.context);
          }
        }
        const preservedSelection = selectionContextRef.current;
        const keepSelection = Boolean(
          nextContextMode === "selection" &&
            !tabChanged &&
            preservedSelection &&
            (!page.tab?.url || page.tab.url === preservedSelection.url)
        );
        const context = keepSelection
          ? preservedSelection
          : nextContextMode === "selection" &&
              normalizedContext?.kind !== "selection"
            ? null
            : normalizedContext;

        if (tabChanged) {
          selectionOverrideRef.current = null;
          pendingSelectionContextRef.current = null;
          selectionContextRef.current = null;
          setSelectionContext(null);
        }
        contextModeRef.current = nextContextMode;
        setActiveTab(page.tab);
        activeTabIdRef.current = page.tab?.id ?? null;
        setIncludePage(nextContextMode !== "none");

        if (nextContextMode === "none") {
          setPageContext(null);
          setCurrentPageContext(null);
          setCurrentArticleContext(null);
          setSelectionContext(null);
          setContextError("");
          if (page.tab?.id) {
            void sendToTab(page.tab.id, {
              type: "immersive.contextScope.set",
              scope: "none"
            }).catch(() => undefined);
          }
          appendOperationLog(
            `[workflow] active tab context refreshed reason=${reason} title=${
              page.tab?.title ?? "-"
            } mode=none`,
            "debug"
          );
          return;
        }

        setPageContext(context);
        if (nextContextMode === "selection" && context?.kind === "selection") {
          selectionContextRef.current = context;
          setSelectionContext(context);
          setCurrentPageContext(null);
          setCurrentArticleContext(null);
        } else if (nextContextMode === "selection") {
          selectionContextRef.current = null;
          setSelectionContext(null);
          setCurrentPageContext(
            normalizedContext && normalizedContext.kind !== "article"
              ? normalizedContext
              : null
          );
          setCurrentArticleContext(null);
        } else if (nextContextMode === "article") {
          setSelectionContext(null);
          selectionContextRef.current = null;
          setCurrentPageContext(null);
          setCurrentArticleContext(
            context?.kind === "article" ? context : null
          );
        } else {
          setSelectionContext(null);
          selectionContextRef.current = null;
          setCurrentPageContext(context);
          setCurrentArticleContext(null);
        }
        if (page.tab?.id) {
          void sendToTab(page.tab.id, {
            type: "immersive.contextScope.set",
            scope: nextContextMode
          }).catch(() => undefined);
        }
        setContextError(page.error ?? "");
        appendOperationLog(
          `[workflow] active tab context refreshed reason=${reason} title=${
            page.tab?.title ?? context?.title ?? "-"
          } mode=${nextContextMode}`,
          "debug"
        );
      } catch (error) {
        if (activeTabContextVersionRef.current !== version) return;
        setContextError(errorMessage(error));
        appendOperationLog(
          `[workflow] active tab context refresh failed reason=${reason} error=${errorMessage(error)}`,
          "debug"
        );
      } finally {
        if (activeTabContextVersionRef.current === version) {
          setContextLoading(false);
        }
      }
    },
    [appendOperationLog]
  );

  useEffect(() => {
    void Promise.all([
      loadSettings(),
      listConversations(),
      loadCustomTools()
    ]).then(async ([loadedSettings, loadedHistory, tools]) => {
      settingsRef.current = loadedSettings;
      setSettings(loadedSettings);
      setIncludePage(true);
      setWebSearchEnabled(loadedSettings.webSearchByDefault);
      document.documentElement.dataset.theme = loadedSettings.theme;
      setHistory(loadedHistory);
      setCustomTools(tools);
      await refreshActivePageContext("sidepanel-init", true, "default", true);
      appendOperationLog(
        uiText(loadedSettings.interfaceLanguage, "logSidepanelReady"),
        "success"
      );
    });
  }, [appendOperationLog, refreshActivePageContext]);

  useEffect(() => {
    if (!isExtensionRuntime()) return;
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName === "local" && changes["webmind.settings"]) {
        void loadSettings().then((next) => {
          const previousDefaultContextScope =
            settingsRef.current?.defaultContextScope;
          settingsRef.current = next;
          setSettings(next);
          document.documentElement.dataset.theme = next.theme;
          appendOperationLog(
            uiText(next.interfaceLanguage, "logSettingsUpdated"),
            "info"
          );
          if (
            previousDefaultContextScope !== next.defaultContextScope &&
            (contextModeRef.current === "page" ||
              contextModeRef.current === "article")
          ) {
            setIncludePage(true);
            void refreshActivePageContext(
              "default-context-updated",
              true,
              "default",
              true
            );
          }
        });
      }
      if (areaName === "local" && changes["webmind.customTools"]) {
        void loadCustomTools().then((tools) => {
          setCustomTools(tools);
          appendOperationLog(
            uiText(settingsRef.current?.interfaceLanguage, "logToolsUpdated"),
            "info"
          );
        });
      }
      if (
        areaName === "session" &&
        changes["webmind.pendingAction"]?.newValue
      ) {
        void runtimeRequest<PendingAction | null>("pending.consume")
          .then((pending) => {
            if (pending) return applyPendingAction(pending);
            return undefined;
          })
          .catch(() => undefined);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [appendOperationLog, applyPendingAction, refreshActivePageContext]);

  useEffect(() => {
    if (!isExtensionRuntime()) return;
    let refreshTimer: number | null = null;
    const scheduleRefresh = (reason: string) => {
      if (articlePickingRef.current) {
        cancelArticlePicking(activeTabIdRef.current ?? undefined);
      }
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void refreshActivePageContext(reason, true, "preserve", true);
      }, 120);
    };
    const handleActivated = () => scheduleRefresh("tab-activated");
    const handleUpdated = (
      _tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab
    ) => {
      if (!tab.active) return;
      if (
        changeInfo.status === "complete" ||
        Boolean(changeInfo.url) ||
        Boolean(changeInfo.title)
      ) {
        scheduleRefresh("tab-updated");
      }
    };
    const handleFocusChanged = (windowId: number) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) return;
      scheduleRefresh("window-focus-changed");
    };
    chrome.tabs.onActivated.addListener(handleActivated);
    chrome.tabs.onUpdated.addListener(handleUpdated);
    chrome.windows.onFocusChanged.addListener(handleFocusChanged);
    return () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      chrome.tabs.onActivated.removeListener(handleActivated);
      chrome.tabs.onUpdated.removeListener(handleUpdated);
      chrome.windows.onFocusChanged.removeListener(handleFocusChanged);
    };
  }, [cancelArticlePicking, refreshActivePageContext]);

  useEffect(() => {
    if (!isExtensionRuntime()) return;
    const onMessage = (message: StreamMessage) => {
      if (message.type === "chat.cancelled") {
        appendOperationLog(
          uiText(settingsRef.current?.interfaceLanguage, "logChatCancelled"),
          "warning"
        );
        const assistantId = requestMapRef.current.get(message.requestId);
        requestMapRef.current.delete(message.requestId);
        requestTranslationProtectionRef.current.delete(message.requestId);
        requestTranslationRawTextRef.current.delete(message.requestId);
        setStreamingId((current) =>
          current === message.requestId ? null : current
        );
        if (assistantId) {
          updateMessages((current) =>
            current.map((item) =>
              item.id === assistantId
                ? {
                    ...item,
                    interruptionNotice: uiText(
                      settingsRef.current?.interfaceLanguage,
                      "requestCancelled"
                    )
                  }
                : item
            )
          );
        }
        return;
      }
      const assistantId = requestMapRef.current.get(message.requestId);
      if (!assistantId) return;
      if (message.type === "chat.delta" && message.delta) {
        const protection = requestTranslationProtectionRef.current.get(
          message.requestId
        );
        const rawText = protection
          ? `${requestTranslationRawTextRef.current.get(message.requestId) ?? ""}${message.delta}`
          : "";
        if (protection) {
          requestTranslationRawTextRef.current.set(message.requestId, rawText);
        }
        updateMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? {
                  ...item,
                  content: protection
                    ? restoreTranslationText(rawText, protection, {
                        streaming: true
                      })
                    : item.content + message.delta
                }
              : item
          )
        );
      }
      if (message.type === "chat.error") {
        appendOperationLog(
          message.error ||
            uiText(
              settingsRef.current?.interfaceLanguage,
              "modelRequestFailed"
            ),
          "error"
        );
        updateMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? {
                  ...item,
                  content:
                    message.error ||
                    uiText(
                      settingsRef.current?.interfaceLanguage,
                      "modelRequestFailed"
                    ),
                  error: true
                }
              : item
          )
        );
        setStreamingId(null);
        requestMapRef.current.delete(message.requestId);
        requestTranslationProtectionRef.current.delete(message.requestId);
        requestTranslationRawTextRef.current.delete(message.requestId);
      }
      if (message.type === "chat.done") {
        appendOperationLog(
          uiText(settingsRef.current?.interfaceLanguage, "logChatDone"),
          "success"
        );
        const protection = requestTranslationProtectionRef.current.get(
          message.requestId
        );
        if (protection) {
          const rawText = requestTranslationRawTextRef.current.get(
            message.requestId
          );
          updateMessages((current) =>
            current.map((item) =>
              item.id === assistantId
                ? {
                    ...item,
                    content: restoreTranslationText(
                      rawText ?? item.content,
                      protection
                    )
                  }
                : item
            )
          );
        }
        setStreamingId(null);
        requestMapRef.current.delete(message.requestId);
        requestTranslationProtectionRef.current.delete(message.requestId);
        requestTranslationRawTextRef.current.delete(message.requestId);
        void persistConversationRef.current?.();
      }
    };

    let disposed = false;
    const connectedPorts = new Set<chrome.runtime.Port>();
    const connect = (): chrome.runtime.Port | null => {
      if (disposed) return null;
      try {
        const port = chrome.runtime.connect({ name: "webmind-stream" });
        connectedPorts.add(port);
        portRef.current = port;
        port.onMessage.addListener(onMessage);
        port.onDisconnect.addListener(() => {
          void chrome.runtime.lastError;
          connectedPorts.delete(port);
          if (portRef.current === port) portRef.current = null;
          if (disposed || requestMapRef.current.size === 0) return;
          const interruptedAssistantIds = new Set(
            requestMapRef.current.values()
          );
          const interruptionNotice = uiText(
            settingsRef.current?.interfaceLanguage,
            "backgroundNoResponse"
          );
          requestMapRef.current.clear();
          requestTranslationProtectionRef.current.clear();
          requestTranslationRawTextRef.current.clear();
          setStreamingId(null);
          setNotice(
            interruptionNotice
          );
          appendOperationLog(interruptionNotice, "error");
          updateMessages((current) =>
            current.map((item) =>
              interruptedAssistantIds.has(item.id)
                ? { ...item, interruptionNotice }
                : item
            )
          );
        });
        return port;
      } catch {
        return null;
      }
    };
    connectStreamPortRef.current = connect;
    connect();
    return () => {
      disposed = true;
      connectStreamPortRef.current = null;
      portRef.current = null;
      for (const port of connectedPorts) {
        port.onMessage.removeListener(onMessage);
        try {
          port.disconnect();
        } catch {
          // The port may already be disconnected during extension reload.
        }
      }
      connectedPorts.clear();
    };
  }, [appendOperationLog, updateMessages]);

  useEffect(() => {
    const wasStreaming = previousStreamingIdRef.current !== null;
    previousStreamingIdRef.current = streamingId;
    if (
      settings?.autoScrollDuringStreaming === false &&
      (Boolean(streamingId) || wasStreaming)
    ) {
      return;
    }
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, settings?.autoScrollDuringStreaming, streamingId]);

  useEffect(() => {
    if (!chatToolsExpanded) return;
    const frame = window.requestAnimationFrame(() => {
      const tray = chatToolsTrayRef.current;
      const list = tray?.parentElement;
      if (!tray || !list) return;
      const trayRect = tray.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();
      const targetTop = list.scrollTop + trayRect.top - listRect.top;
      list.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chatToolsExpanded]);

  useEffect(() => {
    if (!chatToolsHiddenDuringRequest) return;
    if (streamingId) {
      chatToolsStreamStartedRef.current = true;
      return;
    }
    if (!chatToolsStreamStartedRef.current) return;
    chatToolsStreamStartedRef.current = false;
    setChatToolsHiddenDuringRequest(false);
    setChatToolsExpanded(false);
    if (settings?.autoScrollDuringStreaming !== false) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          chatEndRef.current?.scrollIntoView({ block: "end" });
        });
      });
    }
  }, [chatToolsHiddenDuringRequest, streamingId]);

  useEffect(() => {
    const consume = async () => {
      let pending: PendingAction | null = null;
      try {
        pending = isExtensionRuntime()
          ? await runtimeRequest<PendingAction | null>("pending.consume")
          : await consumePendingAction();
      } catch {
        pending = null;
      }
      if (pending) await applyPendingAction(pending);
    };
    void consume();
  }, [applyPendingAction]);

  const requireProfile = (
    purpose: ModelPurpose = "default"
  ): ProviderProfile | null => {
    const currentSettings = settingsRef.current ?? settings;
    const profile = currentSettings
      ? profileForPurpose(currentSettings, purpose)
      : null;
    if (profile) return profile;
    setNotice(t("modelEngineRequired"));
    return null;
  };

  const postStreamMessage = useCallback(
    (message: {
      type: "chat.start" | "chat.cancel";
      payload?: ChatRunRequest;
      requestId?: string;
    }): boolean => {
      let port = portRef.current;
      if (!port) port = connectStreamPortRef.current?.() ?? null;
      if (!port) {
        setNotice(
          uiText(settingsRef.current?.interfaceLanguage, "backgroundNoResponse")
        );
        return false;
      }
      try {
        port.postMessage(message);
        return true;
      } catch {
        if (portRef.current === port) portRef.current = null;
        const reconnected = connectStreamPortRef.current?.() ?? null;
        if (reconnected) {
          try {
            reconnected.postMessage(message);
            return true;
          } catch {
            if (portRef.current === reconnected) portRef.current = null;
          }
        }
        setNotice(
          uiText(settingsRef.current?.interfaceLanguage, "backgroundNoResponse")
        );
        return false;
      }
    },
    []
  );

  const contextMatchesActivePage = (
    context: PageContext | null | undefined
  ): context is PageContext => {
    return contextMatchesTab(context, activeTab);
  };

  const articleContextForActivePage = (): PageContext | null => {
    if (
      pageContext?.kind === "article" &&
      contextMatchesActivePage(pageContext)
    ) {
      return pageContext;
    }
    if (
      currentArticleContext?.kind === "article" &&
      contextMatchesActivePage(currentArticleContext)
    ) {
      return currentArticleContext;
    }
    return null;
  };

  const selectionContextForActivePage = (): PageContext | null => {
    if (
      pageContext?.kind === "selection" &&
      contextMatchesActivePage(pageContext)
    ) {
      return pageContext;
    }
    if (
      selectionContext?.kind === "selection" &&
      contextMatchesActivePage(selectionContext)
    ) {
      return selectionContext;
    }
    return null;
  };

  const pageContextForActivePage = (): PageContext | null => {
    if (
      pageContext &&
      pageContext.kind !== "selection" &&
      pageContext.kind !== "article" &&
      contextMatchesActivePage(pageContext)
    ) {
      return pageContext;
    }
    if (
      currentPageContext &&
      currentPageContext.kind !== "selection" &&
      currentPageContext.kind !== "article" &&
      contextMatchesActivePage(currentPageContext)
    ) {
      return currentPageContext;
    }
    return null;
  };

  const effectiveContextMode = (): ContextMode => {
    if (!includePage) return "none";
    return contextModeRef.current;
  };

  const contextForCurrentMode = (): PageContext | null => {
    const mode = effectiveContextMode();
    if (mode === "none") return null;
    if (mode === "selection") return selectionContextForActivePage();
    if (mode === "article") return articleContextForActivePage();
    return pageContextForActivePage();
  };

  const contextMatchesMode = (
    context: PageContext | null,
    mode: Exclude<ContextMode, "none">
  ): context is PageContext =>
    Boolean(
      context &&
        (mode === "selection"
          ? context.kind === "selection"
          : mode === "article"
            ? context.kind === "article"
            : context.kind !== "selection" && context.kind !== "article")
    );

  const resolveRichContext = async (
    profile: ProviderProfile,
    forceIncludePage = false,
    contextOverride?: PageContext | null
  ): Promise<PageContext | null> => {
    if (!includePage && !forceIncludePage) return null;
    const requestedMode =
      forceIncludePage && contextModeRef.current === "none"
        ? defaultContextMode(settingsRef.current)
        : effectiveContextMode();
    if (requestedMode === "none") return null;
    const liveTab = await getActiveTab();
    const cachedTabIsCurrent = sameTabIdentity(liveTab, activeTab);
    if (
      contextOverride !== undefined &&
      contextOverride !== null &&
      cachedTabIsCurrent &&
      contextMatchesTab(contextOverride, liveTab) &&
      contextMatchesMode(contextOverride, requestedMode)
    ) {
      return contextOverride;
    }

    let resolvedMode: Exclude<ContextMode, "none"> = requestedMode;
    let context = cachedTabIsCurrent ? contextForCurrentMode() : null;
    const readActiveContext = async (mode: Exclude<ContextMode, "none">) => {
      const page = await getActivePageContext(
        settingsRef.current?.interfaceLanguage,
        {
          ignoreSelection: mode !== "selection",
          scope: mode === "article" ? "article" : "page"
        }
      );
      return {
        ...page,
        context: normalizePageContext(page.context)
      };
    };

    if (!cachedTabIsCurrent || !contextMatchesMode(context, requestedMode)) {
      let page = await readActiveContext(requestedMode);
      let refreshed = page.context;
      if (!sameTabIdentity(page.tab, activeTab)) {
        selectionOverrideRef.current = null;
        pendingSelectionContextRef.current = null;
        selectionContextRef.current = null;
        setSelectionContext(null);
        const nextMode = contextModeAfterTabSwitch(
          requestedMode,
          defaultContextMode(settingsRef.current),
          refreshed
        );
        resolvedMode =
          nextMode === "none" ? defaultContextMode(settingsRef.current) : nextMode;
        if (
          requestedMode === "selection" &&
          resolvedMode === "article" &&
          refreshed?.kind !== "article"
        ) {
          page = await readActiveContext("article");
          refreshed = page.context;
        }
      }
      context =
        resolvedMode === "selection" && refreshed?.kind !== "selection"
          ? null
          : refreshed;
      contextModeRef.current = resolvedMode;
      setActiveTab(page.tab);
      activeTabIdRef.current = page.tab?.id ?? null;
      setIncludePage(true);
      setPageContext(context);
      if (resolvedMode === "selection" && context?.kind === "selection") {
        selectionContextRef.current = context;
        setSelectionContext(context);
        setCurrentPageContext(null);
        setCurrentArticleContext(null);
      } else if (resolvedMode === "selection") {
        selectionContextRef.current = null;
        setSelectionContext(null);
        setCurrentPageContext(
          refreshed && refreshed.kind !== "article" ? refreshed : null
        );
        setCurrentArticleContext(null);
      } else if (resolvedMode === "article") {
        setSelectionContext(null);
        selectionContextRef.current = null;
        setCurrentPageContext(null);
        setCurrentArticleContext(
          context?.kind === "article" ? context : null
        );
      } else {
        setSelectionContext(null);
        selectionContextRef.current = null;
        setCurrentPageContext(context);
        setCurrentArticleContext(null);
      }
      if (page.tab?.id) {
        void sendToTab(page.tab.id, {
          type: "immersive.contextScope.set",
          scope: resolvedMode
        }).catch(() => undefined);
      }
      setContextError(page.error ?? "");
    }
    if (!contextMatchesMode(context, resolvedMode)) return null;
    if (context.kind === "youtube" && !context.text) {
      setContextLoading(true);
      try {
        await requestOriginPermission(context.url);
        const transcript = await runtimeRequest<PageContext>("context.youtube", {
          pageUrl: context.url,
          language: navigator.language
        });
        setPageContext(transcript);
        setCurrentPageContext(transcript);
        return transcript;
      } finally {
        setContextLoading(false);
      }
    }
    if (
      context.kind === "pdf" &&
      (!context.text || context.text.length < 200)
    ) {
      setContextLoading(true);
      try {
        const granted = await requestOriginPermission(context.url);
        if (!granted) throw new Error(t("needPdfPermission"));
        const pdf = await extractPdfContext(
          context.url,
          profile.maxContextChars,
          (page, total) =>
            setToolStatus(`${t("readingPdf")}：${page}/${total}`),
          settingsRef.current?.interfaceLanguage
        );
        setPageContext(pdf);
        setCurrentPageContext(pdf);
        setToolStatus("");
        return pdf;
      } finally {
        setContextLoading(false);
      }
    }
    return context;
  };

  const readTabContext = async (
    ignoreSelection: boolean,
    scope: "page" | "article" = "page"
  ) => {
    if (!activeTab?.id) throw new Error(t("noReadableTab"));
    const context = await sendToTab<PageContext>(activeTab.id, {
      type: "page.context",
      ignoreSelection,
      scope
    });
    return normalizePageContext(context);
  };

  const syncImmersiveContextScope = (mode: ContextMode) => {
    if (!activeTab?.id) return;
    void sendToTab(activeTab.id, {
      type: "immersive.contextScope.set",
      scope: mode
    }).catch(() => undefined);
  };

  const changeContextMode = async (mode: ContextMode) => {
    selectionOverrideRef.current = null;
    contextModeRef.current = mode;
    syncImmersiveContextScope(mode);
    appendOperationLog(
      `${t("currentContext")}: ${
        mode === "none"
          ? t("noneContext")
          : mode === "selection"
            ? t("currentSelection")
            : mode === "article"
              ? t("currentBody")
            : t("currentPage")
      }`,
      "info"
    );
    if (mode === "none") {
      setIncludePage(false);
      return;
    }
    if (!pageContext && !activeTab?.id) return;
    setIncludePage(true);
    setNotice("");
    if (mode === "page") {
      if (
        pageContext &&
        pageContext.kind !== "selection" &&
        pageContext.kind !== "article" &&
        pageContext.kind !== "image"
      ) {
        return;
      }
      if (
        currentPageContext &&
        (!pageContext || currentPageContext.url === pageContext.url)
      ) {
        setPageContext(currentPageContext);
        return;
      }
      setContextLoading(true);
      setToolStatus(t("switchingToCurrentPage"));
      try {
        const next = await readTabContext(true, "page");
        setCurrentPageContext(next);
        setPageContext(next);
        setContextError("");
      } catch (error) {
        setNotice(errorMessage(error));
      } finally {
        setContextLoading(false);
        setToolStatus("");
      }
      return;
    }

    if (mode === "article") {
      if (currentArticleContext && (!pageContext || currentArticleContext.url === pageContext.url)) {
        setPageContext(currentArticleContext);
        return;
      }
      setContextLoading(true);
      setToolStatus(t("readingCurrentBody"));
      try {
        const next = await readTabContext(true, "article");
        if (!next || next.kind !== "article" || !next.text.trim()) {
          setNotice(t("noProcessablePageBody"));
          return;
        }
        setCurrentArticleContext(next);
        setPageContext(next);
        setContextError("");
      } catch (error) {
        setNotice(errorMessage(error));
      } finally {
        setContextLoading(false);
        setToolStatus("");
      }
      return;
    }

    if (selectionContext && (!pageContext || selectionContext.url === pageContext.url)) {
      setPageContext(selectionContext);
      return;
    }
    setContextLoading(true);
    setToolStatus(t("readingSelection"));
    try {
      const next = await readTabContext(false, "page");
      if (!next || next.kind !== "selection" || !next.text.trim()) {
        setNotice(t("noSelectionOnPage"));
        return;
      }
      setSelectionContext(next);
      setPageContext(next);
      setContextError("");
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setContextLoading(false);
      setToolStatus("");
    }
  };

  const pickCurrentBodyRange = async () => {
    const tabId = activeTab?.id;
    if (!tabId) {
      setNotice(t("noReadableTab"));
      return;
    }
    cancelArticlePicking(tabId);
    const run = {
      id: crypto.randomUUID(),
      tabId
    };
    articlePickRunRef.current = run;
    articlePickingRef.current = true;
    setArticlePicking(true);
    setToolStatus(t("selectingBodyRange"));
    setNotice("");
    try {
      const next = await sendToTab<PageContext | null>(tabId, {
        type: "page.article.pick"
      });
      if (articlePickRunRef.current?.id !== run.id) return;
      if (!next || next.kind !== "article" || !next.text.trim()) {
        return;
      }
      const normalized = normalizePageContext(next);
      setIncludePage(true);
      contextModeRef.current = "article";
      syncImmersiveContextScope("article");
      setCurrentArticleContext(normalized);
      setPageContext(normalized);
      setContextError("");
      setBodyPreviewExpanded(true);
      appendOperationLog(t("selectCurrentBody"), "success");
    } catch (error) {
      if (articlePickRunRef.current?.id !== run.id) return;
      setNotice(errorMessage(error));
      appendOperationLog(errorMessage(error), "error");
    } finally {
      if (articlePickRunRef.current?.id === run.id) {
        articlePickRunRef.current = null;
        articlePickingRef.current = false;
        setArticlePicking(false);
        setToolStatus("");
      }
    }
  };

  const restoreCurrentBody = async () => {
    if (!activeTab?.id) return;
    setArticlePicking(true);
    setToolStatus(t("restoreCurrentBody"));
    setNotice("");
    try {
      const next = await sendToTab<PageContext>(activeTab.id, {
        type: "page.article.restore"
      });
      const normalized = normalizePageContext(next);
      setCurrentArticleContext(normalized);
      setPageContext(normalized);
      setIncludePage(true);
      contextModeRef.current = "article";
      syncImmersiveContextScope("article");
      setContextError("");
      appendOperationLog(t("restoreCurrentBody"), "success");
    } catch (error) {
      setNotice(errorMessage(error));
      appendOperationLog(errorMessage(error), "error");
    } finally {
      setArticlePicking(false);
      setToolStatus("");
    }
  };

  const highlightCurrentBodyPreviewBlock = async (
    block: ArticlePreviewBlock
  ) => {
    const text = block.sourceText ?? block.text;
    if (!activeTab?.id || (!text.trim() && !block.targetId)) return;
    await sendToTab(activeTab.id, {
      type: "page.article.preview.highlight",
      text,
      targetId: block.targetId
    }).catch(() => undefined);
  };

  const removeCurrentBodyPreviewBlock = async (
    block: ArticlePreviewBlock
  ) => {
    if (!activeTab?.id) return;
    const text = block.sourceText ?? block.text;
    try {
      const next = await sendToTab<PageContext>(activeTab.id, {
        type: "page.article.preview.remove",
        text,
        targetId: block.targetId
      });
      const normalized = normalizePageContext(next);
      setCurrentArticleContext(normalized);
      setPageContext(normalized);
      setIncludePage(true);
      contextModeRef.current = "article";
      syncImmersiveContextScope("article");
      setContextError("");
      setBodyPreviewExpanded(true);
    } catch (error) {
      setNotice(errorMessage(error));
      appendOperationLog(errorMessage(error), "error");
    }
  };

  const pruneCurrentBodyPreviewBlocks = async () => {
    if (!activeTab?.id) return;
    setArticlePicking(true);
    setToolStatus(t("smartPruneCurrentBody"));
    setNotice("");
    try {
      const next = await sendToTab<PageContext>(activeTab.id, {
        type: "page.article.preview.prune"
      });
      const normalized = normalizePageContext(next);
      setCurrentArticleContext(normalized);
      setPageContext(normalized);
      setIncludePage(true);
      contextModeRef.current = "article";
      syncImmersiveContextScope("article");
      setContextError("");
      setBodyPreviewExpanded(true);
      appendOperationLog(t("smartPruneCurrentBody"), "success");
    } catch (error) {
      setNotice(errorMessage(error));
      appendOperationLog(errorMessage(error), "error");
    } finally {
      setArticlePicking(false);
      setToolStatus("");
    }
  };

  const pruneCurrentBodyWithModel = async () => {
    if (!activeTab?.id || articlePicking || articlePruning) return;
    const tabId = activeTab.id;
    const contextVersion = activeTabContextVersionRef.current;
    const profile = requireProfile("default");
    if (!profile) return;
    const currentArticle = articleContextForActivePage();
    const blocks = currentArticle?.articlePreview ?? [];
    if (!blocks.length) {
      setNotice(t("noProcessablePageBody"));
      return;
    }
    setArticlePruning(true);
    setToolStatus(t("modelPruneCurrentBodyRunning"));
    setNotice("");
    try {
      const modelBlocks = blocks.map((block) => ({
        id: block.id,
        text: block.text,
        markdown: block.markdown ?? block.text
      }));
      const response = await runtimeRequest<{ text: string }>("model.complete", {
        profileId: profile.id,
        purpose: "default",
        temperature: 0,
        messages: [
          createMessage(
            "system",
            articlePruneInstruction(settingsRef.current ?? undefined)
          ),
          createMessage(
            "user",
            [
              "<page-metadata>",
              JSON.stringify({
                title: currentArticle?.title ?? "",
                url: currentArticle?.url ?? "",
                siteName: currentArticle?.siteName ?? ""
              }),
              "</page-metadata>",
              "<article-blocks>",
              JSON.stringify(modelBlocks),
              "</article-blocks>"
            ].join("\n")
          )
        ]
      });
      const removeIds = articleBlockIdsToRemove(
        response.text,
        blocks,
        settingsRef.current?.interfaceLanguage
      );
      if (
        activeTabIdRef.current !== tabId ||
        activeTabContextVersionRef.current !== contextVersion
      ) {
        return;
      }
      if (!removeIds.size) {
        setNotice(t("modelPruneNoChanges"));
        appendOperationLog(t("modelPruneNoChanges"), "info");
        return;
      }
      if (removeIds.size >= blocks.length) {
        throw new Error(t("modelPruneAllRejected"));
      }
      const next = await sendToTab<PageContext>(tabId, {
        type: "page.article.preview.remove-many",
        blocks: blocks
          .filter((block) => removeIds.has(block.id))
          .map((block) => ({
            text: block.text,
            sourceText: block.sourceText,
            targetId: block.targetId
          }))
      });
      const normalized = normalizePageContext(next);
      setCurrentArticleContext(normalized);
      setPageContext(normalized);
      setIncludePage(true);
      contextModeRef.current = "article";
      syncImmersiveContextScope("article");
      setContextError("");
      setBodyPreviewExpanded(true);
      appendOperationLog(
        `${t("modelPruneCurrentBody")}: ${removeIds.size}`,
        "success"
      );
    } catch (error) {
      setNotice(errorMessage(error));
      appendOperationLog(errorMessage(error), "error");
    } finally {
      setArticlePruning(false);
      setToolStatus("");
    }
  };

  const copyContextPreviewText = async (value?: string) => {
    const text = value?.trim() ?? "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setBodyCopied(true);
      window.setTimeout(() => setBodyCopied(false), 1400);
    } catch (error) {
      setNotice(errorMessage(error));
      appendOperationLog(errorMessage(error), "error");
    }
  };

  const openArticleRuleEditor = () => {
    const url = pageContext?.url || activeTab?.url || "";
    setArticleRuleDraft({
      urlPattern: url,
      selector: articleSummary?.selector ?? ""
    });
    setArticleRuleEditorOpen(true);
  };

  const saveArticleExtractionRule = async () => {
    const currentSettings = settingsRef.current;
    const urlPattern = articleRuleDraft.urlPattern.trim();
    const selector = articleRuleDraft.selector.trim();
    if (!currentSettings || !urlPattern || !selector) {
      setNotice(t("articleExtractionRuleInvalid"));
      return;
    }
    const nextRule: ArticleExtractionRule = {
      id: crypto.randomUUID(),
      urlPattern,
      selector
    };
    const nextSettings: AppSettings = {
      ...currentSettings,
      articleExtractionRules: [
        nextRule,
        ...(currentSettings.articleExtractionRules ?? []).filter(
          (rule) =>
            rule.urlPattern !== nextRule.urlPattern ||
            rule.selector !== nextRule.selector
        )
      ]
    };
    settingsRef.current = nextSettings;
    setSettings(nextSettings);
    await saveSettings(nextSettings);
    setArticleRuleEditorOpen(false);
    setNotice(t("articleExtractionRuleSaved"));
    appendOperationLog(t("articleExtractionRuleSaved"), "success");
    await refreshActivePageContext(
      "article-extraction-rule-saved",
      true,
      "preserve"
    );
    setBodyPreviewExpanded(true);
  };

  useEffect(() => {
    const activeTabId = activeTab?.id;
    if (!isExtensionRuntime() || !activeTabId) return;
    const listener = (
      message: { type?: string; payload?: Record<string, unknown> },
      sender: chrome.runtime.MessageSender
    ) => {
      const senderTab = sender.tab;
      if (
        message.type !== "page.selection.changed" ||
        !senderTab ||
        senderTab.id !== activeTabId
      ) {
        return;
      }
      const version = ++selectionContextVersionRef.current;
      const payload = message.payload ?? {};
      const text = String(payload.text ?? "").trim();
      const markdown = String(payload.markdown ?? text).trim();
      const url = String(payload.url ?? senderTab.url ?? activeTab.url ?? "");
      const title = String(
        payload.title ?? senderTab.title ?? activeTab.title ?? t("currentPage")
      );
      setIncludePage(true);
      setNotice("");
      if (Boolean(payload.hasSelection) && text) {
        if (
          !selectionOverrideRef.current &&
          (contextModeRef.current !== "selection" || !includePage)
        ) {
          selectionOverrideRef.current = {
            previousMode: includePage ? effectiveContextMode() : "none",
            previousIncludePage: includePage,
            previousContext: includePage ? contextForCurrentMode() : null,
            url
          };
        }
        contextModeRef.current = "selection";
        void sendToTab(senderTab.id, {
          type: "immersive.contextScope.set",
          scope: "selection"
        }).catch(() => undefined);
        const next: PageContext = {
          kind: "selection",
          title,
          url,
          text,
          markdown,
          selection: text,
          description: t("selectionDescription").replace(
            "{count}",
            String(text.length)
          )
        };
        setSelectionContext(next);
        setPageContext(next);
        setContextError("");
        return;
      }

      pendingSelectionContextRef.current = null;
      setSelectionContext(null);
      const selectionOverride = selectionOverrideRef.current;
      selectionOverrideRef.current = null;
      if (selectionOverride) {
        const previousMode = selectionOverride.previousMode;
        const previousContext = selectionOverride.previousContext;
        const previousContextMatches =
          previousContext && (!url || !previousContext.url || previousContext.url === url);
        contextModeRef.current = previousMode;
        setIncludePage(selectionOverride.previousIncludePage);
        void sendToTab(senderTab.id, {
          type: "immersive.contextScope.set",
          scope: previousMode
        }).catch(() => undefined);
        if (!selectionOverride.previousIncludePage || previousMode === "none") {
          return;
        }
        if (previousContextMatches) {
          if (previousContext.kind === "article") {
            setCurrentArticleContext(previousContext);
          } else if (previousContext.kind !== "selection") {
            setCurrentPageContext(previousContext);
          }
          setPageContext(previousContext);
          return;
        }
        if (
          previousMode === "article" &&
          currentArticleContext &&
          (!url || currentArticleContext.url === url)
        ) {
          setPageContext(currentArticleContext);
          return;
        }
        if (
          previousMode === "page" &&
          currentPageContext &&
          (!url || currentPageContext.url === url)
        ) {
          setPageContext(currentPageContext);
          return;
        }
        const restoreScope = previousMode === "article" ? "article" : "page";
        void sendToTab<PageContext>(senderTab.id, {
          type: "page.context",
          ignoreSelection: true,
          scope: restoreScope
        })
          .then((context) => {
            if (selectionContextVersionRef.current !== version) return;
            const next = normalizePageContext(context);
            if (previousMode === "article" && next?.kind === "article") {
              setCurrentArticleContext(next);
              setPageContext(next);
            } else {
              setCurrentPageContext(next);
              setPageContext(next);
            }
            setContextError("");
          })
          .catch((error) => {
            if (selectionContextVersionRef.current === version) {
              setContextError(errorMessage(error));
            }
          });
        return;
      }
      if (contextModeRef.current !== "selection") {
        return;
      }
      if (
        currentArticleContext &&
        (!url || currentArticleContext.url === url)
      ) {
        contextModeRef.current = "article";
        void sendToTab(senderTab.id, {
          type: "immersive.contextScope.set",
          scope: "article"
        }).catch(() => undefined);
        setPageContext(currentArticleContext);
        return;
      }
      if (currentPageContext && (!url || currentPageContext.url === url)) {
        contextModeRef.current = "page";
        void sendToTab(senderTab.id, {
          type: "immersive.contextScope.set",
          scope: "page"
        }).catch(() => undefined);
        setPageContext(currentPageContext);
        return;
      }
      if (!senderTab.id) return;
      const fallbackScope = "article" as const;
      void sendToTab<PageContext>(senderTab.id, {
        type: "page.context",
        ignoreSelection: true,
        scope: fallbackScope
      })
        .then((context) => {
          if (selectionContextVersionRef.current !== version) return;
          const next = normalizePageContext(context);
          const nextScope = next?.kind === "article" ? "article" : "page";
          if (nextScope === "article") {
            setCurrentArticleContext(next);
          } else {
            setCurrentPageContext(next);
          }
          contextModeRef.current = nextScope;
          void sendToTab(senderTab.id!, {
            type: "immersive.contextScope.set",
            scope: nextScope
          }).catch(() => undefined);
          setPageContext(next);
          setContextError("");
        })
        .catch((error) => {
          if (selectionContextVersionRef.current === version) {
            setContextError(errorMessage(error));
          }
        });
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [
    activeTab?.id,
    activeTab?.title,
    activeTab?.url,
    currentArticleContext,
    currentPageContext,
    includePage,
    pageContext,
    selectionContext,
    settings?.interfaceLanguage
  ]);

  const sendMessage = useCallback(
    async (
      textOverride?: string,
      options: {
        forceIncludePage?: boolean;
        skipPageContext?: boolean;
        skipWebSearch?: boolean;
        contextAsInput?: boolean;
        contextOverride?: PageContext | null;
        dictionaryForShortInput?: boolean;
        toolInvocation?: ToolDefinition;
        toolInvocationContext?: ToolInvocationContext;
        attachmentsOverride?: ImageAttachment[];
        historyOverride?: ChatMessage[];
        modelHistoryOverride?: ChatMessage[];
        hideToolsUntilResponse?: boolean;
        translationProtection?: ProtectedTranslationText;
        requestModelContent?: string;
        requestSystemInstruction?: string;
        toolContextInput?: boolean;
        purpose?: ModelPurpose;
      } = {}
    ): Promise<boolean> => {
      const text = (textOverride ?? composer).trim();
      const requestAttachments = options.attachmentsOverride ?? attachments;
      const imageAttachments = requestAttachments.filter(
        (attachment) => (attachment.kind ?? "image") === "image"
      );
      const purpose =
        options.purpose ?? (imageAttachments.length ? "vision" : "default");
      const profile = requireProfile(purpose);
      if (!profile || streamingId) return false;
      if (!text && !requestAttachments.length) return false;
      appendOperationLog(
        options.toolInvocation
          ? `${t("logToolRun")}: ${options.toolInvocation.title}`
          : t("logChatStart"),
        "info"
      );
      if (imageAttachments.length && !profile.supportsVision) {
        setNotice(
          uiText(
            settingsRef.current?.interfaceLanguage,
            "profileVisionDisabled"
          ).replace("{name}", profile.name)
        );
        return false;
      }
      setNotice("");
      let context: PageContext | null = null;
      let results: WebSearchResult[] = [];
      try {
        context =
          options.skipPageContext
            ? null
            : await resolveRichContext(
                profile,
                options.forceIncludePage,
                options.contextOverride
              );
        if (!options.skipWebSearch && webSearchEnabled && text) {
          const allowed = await requestOriginPermission(
            "https://html.duckduckgo.com/"
          );
          if (!allowed) throw new Error(t("needSearchDomainPermission"));
          setToolStatus(t("searchingWeb"));
          results = await searchWeb(
            text,
            6,
            settingsRef.current?.interfaceLanguage
          );
          setToolStatus("");
        }
      } catch (error) {
        setToolStatus("");
        setNotice(errorMessage(error));
        return false;
      }

      const supplementalText = attachmentText(
        requestAttachments,
        settingsRef.current?.interfaceLanguage
      );
      const userContent = [
        text ||
          (imageAttachments.length
            ? uiText(settingsRef.current?.interfaceLanguage, "noContextImage")
            : uiText(
                settingsRef.current?.interfaceLanguage,
                "noContextAttachment"
              )),
        supplementalText
          ? `\n\n${uiText(
              settingsRef.current?.interfaceLanguage,
              "attachmentIntro"
            )}\n${supplementalText}`
        : ""
      ].join("");
      const contextSourceText = contextTranslationSourceText(context);
      const toolContextText =
        options.toolContextInput && contextSourceText
          ? truncateText(
              contextSourceText,
              profile.maxContextChars,
              settingsRef.current?.interfaceLanguage
            )
          : "";
      const toolMetadata = context
        ? [
            `${uiText(settingsRef.current?.interfaceLanguage, "title")}：${context.title}`,
            `${uiText(settingsRef.current?.interfaceLanguage, "url")}：${context.url}`,
            context.description
              ? `${uiText(settingsRef.current?.interfaceLanguage, "description")}：${context.description}`
              : ""
          ]
            .filter(Boolean)
            .join("\n")
        : "";
      const contextualToolModelContent =
        options.toolContextInput && options.toolInvocation
          ? toolPromptWithContext(
              options.toolInvocation,
              settingsRef.current ?? undefined,
              toolContextText,
              toolMetadata,
              undefined,
              context?.language
            )
          : undefined;
      const contextualTranslationProtection =
        options.contextAsInput && contextSourceText
          ? protectTranslationText(contextSourceText)
          : null;
      const protectedContextText =
        contextualTranslationProtection?.text ?? context?.text ?? "";
      const truncatedProtectedContextText =
        options.contextAsInput && contextSourceText
          ? truncateText(
              protectedContextText,
              profile.maxContextChars,
              settingsRef.current?.interfaceLanguage
            )
          : "";
      const requestTranslationProtection =
        options.translationProtection ??
        (contextualTranslationProtection
          ? scopeProtectedTranslationText(
              contextualTranslationProtection,
              truncatedProtectedContextText
            )
          : null);
      const contextualTranslationSystemInstruction =
        options.contextAsInput && contextSourceText
          ? buildProtectedTranslationInstruction(
              settingsRef.current ?? undefined,
              contextSourceText,
              { dictionaryForShortInput: options.dictionaryForShortInput }
            )
          : undefined;
      const modelContent =
        options.requestModelContent ??
        (options.contextAsInput && contextSourceText
          ? buildProtectedTranslationInput(truncatedProtectedContextText)
          : contextualToolModelContent);
      const requestSystemInstruction =
        options.requestSystemInstruction ?? contextualTranslationSystemInstruction;
      const invocationContext: ToolInvocationContext =
        options.toolInvocationContext ??
        (context?.kind === "selection"
          ? {
              kind: "selection",
              text: context.selection ?? context.text
            }
          : context?.kind === "article"
            ? {
                kind: "article",
                title: context.title || activeTab?.title,
                text: context.text,
                url: context.url || activeTab?.url,
                faviconUrl: activeTab?.favIconUrl
              }
          : context
            ? {
                kind: "page",
                title: context.title || activeTab?.title,
                text: contextSnapshotExcerpt(context.text),
                url: context.url || activeTab?.url,
                faviconUrl: activeTab?.favIconUrl
              }
            : { kind: "none" });
      const toolInvocation = options.toolInvocation
        ? {
            toolId: options.toolInvocation.id,
            title: options.toolInvocation.title,
            icon: options.toolInvocation.icon,
            context: invocationContext
          }
        : undefined;
      const userMessage = createMessage("user", userContent, {
        attachments: requestAttachments,
        inputText: text,
        modelContent,
        toolInvocation
      });
      const assistantMessage = createMessage("assistant", "");
      const nextVisible = [
        ...(options.historyOverride ?? messagesRef.current),
        userMessage,
        assistantMessage
      ];
      const modelHistory = options.modelHistoryOverride
        ? [...options.modelHistoryOverride, userMessage]
        : nextVisible;
      updateMessages(nextVisible);
      setComposer("");
      setAttachments([]);
      setEditingMessageId(null);
      setEditingMessageText("");
      setView("chat");
      const requestId = crypto.randomUUID();
      requestMapRef.current.set(requestId, assistantMessage.id);
      if (requestTranslationProtection) {
        requestTranslationProtectionRef.current.set(
          requestId,
          requestTranslationProtection
        );
        requestTranslationRawTextRef.current.set(requestId, "");
      }
      setStreamingId(requestId);
      const baseSystemMessage = buildSystemMessage(
        options.contextAsInput || options.toolContextInput ? null : context,
        results,
        profile,
        settingsRef.current?.interfaceLanguage
      );
      const modelMessages = [
        requestSystemInstruction
          ? {
              ...baseSystemMessage,
              content: [
                baseSystemMessage.content,
                requestSystemInstruction
              ].filter(Boolean).join("\n\n")
            }
          : baseSystemMessage,
        ...modelHistory
          .filter((message) => message.id !== assistantMessage.id)
          .slice(-18)
          .map(toModelMessage)
      ];

      if (!isExtensionRuntime()) {
        const demo =
          uiText(settingsRef.current?.interfaceLanguage, "previewDemoAnswer");
        let index = 0;
        demoTimerRef.current = window.setInterval(() => {
          index += 3;
          updateMessages((current) =>
            current.map((item) =>
              item.id === assistantMessage.id
                ? { ...item, content: demo.slice(0, index) }
                : item
            )
          );
          if (index >= demo.length) {
            if (demoTimerRef.current !== null) {
              window.clearInterval(demoTimerRef.current);
              demoTimerRef.current = null;
            }
            setStreamingId(null);
            requestTranslationProtectionRef.current.delete(requestId);
            requestTranslationRawTextRef.current.delete(requestId);
          }
        }, 18);
        return true;
      }

      const posted = postStreamMessage({
        type: "chat.start",
        payload: {
          requestId,
          profileId: profile.id,
          purpose,
          messages: modelMessages
        }
      });
      if (!posted) {
        appendOperationLog(t("backgroundNoResponse"), "error");
        requestMapRef.current.delete(requestId);
        requestTranslationProtectionRef.current.delete(requestId);
        requestTranslationRawTextRef.current.delete(requestId);
        setStreamingId(null);
        updateMessages((current) =>
          current.filter(
            (item) =>
              item.id !== assistantMessage.id || Boolean(item.content.trim())
          )
        );
      }
      return posted;
    },
    [
      activeProfile,
      attachments,
      composer,
      includePage,
      activeTab?.favIconUrl,
      activeTab?.id,
      activeTab?.title,
      activeTab?.url,
      appendOperationLog,
      currentArticleContext,
      currentPageContext,
      pageContext,
      postStreamMessage,
      selectionContext,
      streamingId,
      updateMessages,
      webSearchEnabled
    ]
  );

  const stopStreaming = (completionMessage?: string) => {
    const requestId = streamingId;
    if (!requestId) return;
    appendOperationLog(t("logChatStop"), "warning");
    const assistantId = requestMapRef.current.get(requestId);
    postStreamMessage({
      type: "chat.cancel",
      requestId
    });
    if (demoTimerRef.current !== null) {
      window.clearInterval(demoTimerRef.current);
      demoTimerRef.current = null;
    }
    requestMapRef.current.delete(requestId);
    requestTranslationProtectionRef.current.delete(requestId);
    requestTranslationRawTextRef.current.delete(requestId);
    setStreamingId(null);
    if (assistantId) {
      updateMessages((current) => {
        if (completionMessage) {
          return current.map((item) =>
            item.id === assistantId
              ? {
                  ...item,
                  interruptionNotice: completionMessage
                }
              : item
          );
        }
        return current.filter(
          (item) => item.id !== assistantId || Boolean(item.content.trim())
        );
      });
    }
  };

  useEffect(() => {
    if (!streamingId) return;
    const requestId = streamingId;
    let disposed = false;
    let timer: number | null = null;
    const armTimeout = async () => {
      const currentSettings = settingsRef.current;
      const inMemoryTimeoutSeconds = Math.max(
        0,
        Number(currentSettings?.modelThinkingTimeoutSeconds) || 0
      );
      if (inMemoryTimeoutSeconds <= 0) return;
      const storedSettings = await loadSettings();
      if (disposed || streamingId !== requestId) return;
      const storedTimeoutSeconds = Math.max(
        0,
        Number(storedSettings.modelThinkingTimeoutSeconds) || 0
      );
      if (storedTimeoutSeconds <= 0) return;
      const timeoutSeconds = Math.min(
        inMemoryTimeoutSeconds,
        storedTimeoutSeconds
      );
      timer = window.setTimeout(async () => {
        const latestSettings = await loadSettings();
        const latestInMemoryTimeoutSeconds = Math.max(
          0,
          Number(settingsRef.current?.modelThinkingTimeoutSeconds) || 0
        );
        const currentTimeoutSeconds = Math.max(
          0,
          Number(latestSettings.modelThinkingTimeoutSeconds) || 0
        );
        if (
          disposed ||
          streamingId !== requestId ||
          currentTimeoutSeconds !== timeoutSeconds ||
          latestInMemoryTimeoutSeconds !== timeoutSeconds ||
          currentTimeoutSeconds <= 0
        ) {
          return;
        }
        stopStreaming(
          uiText(
            latestSettings.interfaceLanguage,
            "modelThinkingTimeoutMessage"
          )
        );
      }, timeoutSeconds * 1000);
    };
    void armTimeout();
    return () => {
      disposed = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [settings?.modelThinkingTimeoutSeconds, streamingId]);

  const editUserMessage = (messageId: string) => {
    if (streamingId || editingMessageSubmitting) return;
    const current = messagesRef.current;
    const messageIndex = current.findIndex((message) => message.id === messageId);
    if (messageIndex < 0) return;
    const message = current[messageIndex];
    if (message.role !== "user") return;
    setEditingMessageId(message.id);
    setEditingMessageText(message.inputText ?? message.content);
    setNotice("");
  };

  const cancelUserMessageEdit = () => {
    if (editingMessageSubmitting) return;
    setEditingMessageId(null);
    setEditingMessageText("");
  };

  const resendEditedUserMessage = async (messageId: string) => {
    if (streamingId || editingMessageSubmitting) return;
    const current = messagesRef.current;
    const messageIndex = current.findIndex((message) => message.id === messageId);
    if (messageIndex < 0) return;
    const message = current[messageIndex];
    if (message.role !== "user") return;
    const editedText = editingMessageText.trim();
    const editedAttachments = message.attachments ?? [];
    if (!editedText && !editedAttachments.length) return;

    setEditingMessageSubmitting(true);
    try {
      await sendMessage(editedText, {
        attachmentsOverride: editedAttachments,
        historyOverride: current.slice(0, messageIndex),
        purpose:
          editedAttachments.some(
            (attachment) => (attachment.kind ?? "image") === "image"
          )
            ? "vision"
            : modelPurposeForToolId(message.toolInvocation?.toolId)
      });
    } finally {
      setEditingMessageSubmitting(false);
    }
  };

  const rerunAssistant = async (assistantMessageId: string) => {
    if (streamingId) return;
    const current = messagesRef.current;
    const assistantIndex = current.findIndex(
      (message) => message.id === assistantMessageId
    );
    if (assistantIndex < 1) return;
    const userMessage = current
      .slice(0, assistantIndex)
      .reverse()
      .find((message) => message.role === "user");
    if (!userMessage) return;
    const purpose = userMessage.attachments?.some(
      (attachment) => (attachment.kind ?? "image") === "image"
    )
      ? "vision"
      : modelPurposeForToolId(userMessage.toolInvocation?.toolId);
    const profile = requireProfile(purpose);
    if (!profile) return;
    appendOperationLog(t("logChatRegenerate"), "info");
    setNotice("");
    let context: PageContext | null = null;
    let results: WebSearchResult[] = [];
    try {
      context = await resolveRichContext(profile);
      if (webSearchEnabled && userMessage.content) {
        const allowed = await requestOriginPermission(
          "https://html.duckduckgo.com/"
        );
        if (!allowed) throw new Error(t("needSearchDomainPermission"));
        setToolStatus(t("searchingWeb"));
        results = await searchWeb(
          userMessage.content,
          6,
          settingsRef.current?.interfaceLanguage
        );
        setToolStatus("");
      }
    } catch (error) {
      setToolStatus("");
      setNotice(errorMessage(error));
      return;
    }

    const assistantMessage = createMessage("assistant", "");
    const nextVisible = [
      ...current.slice(0, assistantIndex),
      assistantMessage
    ];
    updateMessages(nextVisible);
    setView("chat");
    const requestId = crypto.randomUUID();
    requestMapRef.current.set(requestId, assistantMessage.id);
    setStreamingId(requestId);
    const modelMessages = [
      buildSystemMessage(
        context,
        results,
        profile,
        settingsRef.current?.interfaceLanguage
      ),
      ...nextVisible
        .filter((message) => message.id !== assistantMessage.id)
        .slice(-18)
        .map(toModelMessage)
    ];
    const posted = postStreamMessage({
      type: "chat.start",
      payload: {
        requestId,
        profileId: profile.id,
        purpose,
        messages: modelMessages
      }
    });
    if (!posted) {
      appendOperationLog(t("backgroundNoResponse"), "error");
      requestMapRef.current.delete(requestId);
      setStreamingId(null);
      updateMessages((visible) =>
        visible.filter(
          (item) =>
            item.id !== assistantMessage.id || Boolean(item.content.trim())
        )
      );
    }
  };

  const runMessageTool = async (tool: ToolDefinition, content: string) => {
    if (!content.trim()) return;
    appendOperationLog(`${t("logToolRun")}: ${tool.title}`, "info");
    if (tool.id === "translate-text" || tool.id === "translate-document") {
      const protection = protectTranslationText(content);
      await sendMessage(
        toolInstruction(tool, settings ?? undefined),
        {
          skipPageContext: true,
          skipWebSearch: true,
          modelHistoryOverride: [],
          requestModelContent: buildProtectedTranslationInput(protection.text),
          requestSystemInstruction: buildProtectedTranslationInstruction(
            settingsRef.current ?? undefined,
            content,
            { dictionaryForShortInput: tool.id === "translate-text" }
          ),
          toolInvocation: tool,
          toolInvocationContext: { kind: "answer", text: content },
          translationProtection: protection,
          purpose: "translation"
        }
      );
      return;
    }
    const toolRequestText =
      toolInstruction(tool, settings ?? undefined) || tool.title;
    await sendMessage(
      toolRequestText,
      {
        skipPageContext: true,
        skipWebSearch: true,
        requestModelContent: toolPromptWithContext(
          tool,
          settings ?? undefined,
          content,
          "",
          t("currentAnswer")
        ),
        toolInvocation: tool,
        toolInvocationContext: { kind: "answer", text: content },
        purpose: modelPurposeForToolId(tool.id)
      }
    );
  };

  const newChat = () => {
    appendOperationLog(t("logNewChat"), "info");
    if (streamingId) stopStreaming();
    updateMessages([]);
    setChatToolsExpanded(false);
    setChatToolsHiddenDuringRequest(false);
    chatToolsStreamStartedRef.current = false;
    conversationIdRef.current = crypto.randomUUID();
    conversationCreatedAtRef.current = Date.now();
    setComposer("");
    setAttachments([]);
    setEditingMessageId(null);
    setEditingMessageText("");
    setNotice("");
    setView("chat");
  };

  const clearConversationHistory = async () => {
    if (streamingId) stopStreaming();
    await clearConversations();
    setHistory([]);
    updateMessages([]);
    conversationIdRef.current = crypto.randomUUID();
    conversationCreatedAtRef.current = Date.now();
    setComposer("");
    setAttachments([]);
    setEditingMessageId(null);
    setEditingMessageText("");
    setChatToolsExpanded(false);
    setChatToolsHiddenDuringRequest(false);
    chatToolsStreamStartedRef.current = false;
    setNotice(t("localHistoryCleared"));
    appendOperationLog(t("localHistoryCleared"), "warning");
  };

  const translatePage = async (
    mode: PageTranslationMode = "bilingual",
    scope: "page" | "article" | "selection" = "page"
  ) => {
    const profile = requireProfile("translation");
    if (!profile || !activeTab?.id) return;
    const workflowLabel = t("immersiveTranslation");
    let runState = createImmersiveRunState("translation", scope, "collecting");
    appendOperationLog(
      `${workflowLabel}: ${
        scope === "selection"
          ? t("currentSelection")
          : scope === "article"
            ? t("currentBody")
            : t("currentPage")
      }`,
      "info"
    );
    appendOperationLog(
      formatImmersiveWorkflowLog(workflowLabel, "start", { scope }),
      "debug"
    );
    const tabId = activeTab.id;
    const run = beginImmersiveRun();
    setToolStatus(
      scope === "selection"
        ? t("collectingSelection")
        : scope === "article"
          ? t("collectingCurrentBody")
          : t("collectingTranslatableText")
    );
    setNotice("");
    const sendProgress = async (
      percent: number,
      label: string,
      active = true,
      error = false
    ) => {
      await sendToTab(tabId, {
        type: "page.translation.progress",
        title: t("immersiveTranslation"),
        percent,
        label,
        active,
        error
      });
    };
    const sendProgressUpdate = async (
      update: ImmersiveWorkflowProgressUpdate
    ) => {
      await sendProgress(
        update.percent,
        update.label,
        update.active,
        update.error
      );
    };
    try {
      await sendProgressUpdate(
        immersiveWorkflowCollectingProgress(
          scope === "selection"
            ? t("readingSelection")
            : scope === "article"
              ? t("collectingCurrentBody")
              : t("collectingPageBody")
        )
      );
      const blocks = await sendToTab<PageTextBlock[]>(tabId, {
        type: "page.translation.prepare",
        purpose: "translation",
        scope,
        articlePreview:
          scope === "article"
            ? articleContextForActivePage()?.articlePreview ?? []
            : [],
        text:
          scope === "selection"
            ? selectionContextForActivePage()?.text ?? ""
            : scope === "article"
              ? articleContextForActivePage()?.text ?? ""
              : ""
      });
      if (!blocks.length) throw new Error(t("noTranslatableBlocks"));
      runState = createImmersiveRunState("translation", scope, "requesting", {
        totalBlocks: blocks.length
      });
      appendOperationLog(
        formatImmersiveWorkflowLog(workflowLabel, "blocks_collected", {
          scope,
          blocks: blocks.length
        }),
        "debug"
      );
      const requestTranslations = async (requestBlocks: PageTextBlock[]) => {
        const sourceText = requestBlocks.map((block) => block.text).join("\n");
        const response = await runtimeRequest<{ text: string }>(
          "model.complete",
          {
            profileId: profile.id,
            purpose: "translation",
            temperature: 0,
            messages: [
              createMessage(
                "system",
                buildPageTranslationSystemPrompt(
                  settingsRef.current ?? undefined,
                  sourceText
                )
              ),
              createMessage(
                "user",
                buildPageTranslationUserPrompt(requestBlocks)
              )
            ]
          }
        );
        return alignPageTranslations(
          requestBlocks,
          extractPageTranslationEntries(
            response.text,
            requestBlocks.length,
            settingsRef.current?.interfaceLanguage
          )
        );
      };
      const { completed, summary } = await runImmersiveTranslationWorkflow({
        blocks,
        batchSize: IMMERSIVE_TRANSLATION_BATCH_SIZE,
        concurrency:
          scope === "selection" ? 1 : IMMERSIVE_TRANSLATION_CONCURRENCY,
        signal: run.controller.signal,
        requestTranslations,
        applyTranslations: async (translations) => {
          runState = createImmersiveRunState("translation", scope, "applying", {
            totalBlocks: blocks.length
          });
          const applied = await sendToTab<{ count: number }>(tabId, {
            type: "page.translation.apply",
            translations,
            mode,
            displayStyle:
              settings?.immersiveTranslationDisplayStyle ?? "default",
            effects: settings?.immersiveTranslationTextEffects ?? []
          });
          return applied.count;
        },
        invalidTranslationsError: () => new Error(t("jsonArrayInvalid")),
        applyCountMismatchError: () => new Error(t("translationWriteFailed")),
        onBatchStart: async (progress) => {
          const current = Math.min(
            progress.processedBefore + progress.batch.length,
            blocks.length
          );
          setToolStatus(
            `${t("translatingPageProgress")}：${current}/${blocks.length}`
          );
          await sendProgressUpdate(
            immersiveTranslationBatchStartProgress(
              progress,
              blocks.length,
              t("translatingPageProgress")
            )
          );
        },
        onBatchApplied: async ({ completed }) => {
          await sendProgressUpdate(
            immersiveTranslationBatchAppliedProgress(
              completed,
              blocks.length,
              t("translationApplied")
            )
          );
        }
      });
      runState = createImmersiveRunState("translation", scope, "completed", {
        totalBlocks: summary.totalBlocks,
        appliedBlocks: summary.appliedBlocks
      });
      if (!isCurrentImmersiveRun(run)) return;
      setToolStatus(`${t("translationApplied")} ${completed}`);
      appendOperationLog(`${t("translationComplete")}: ${completed}`, "success");
      appendOperationLog(
        formatImmersiveWorkflowLog(workflowLabel, "complete", {
          scope: runState.scope,
          applied: summary.appliedBlocks,
          total: summary.totalBlocks
        }),
        "debug"
      );
      await sendProgressUpdate(
        immersiveWorkflowCompleteProgress(
          `${t("translationComplete")}, ${t("translationApplied")} ${completed}`
        )
      );
    } catch (error) {
      if (isImmersiveWorkflowCancelledError(error)) {
        appendOperationLog(
          formatImmersiveWorkflowLog(workflowLabel, "cancelled", { scope }),
          "debug"
        );
        return;
      }
      if (!isCurrentImmersiveRun(run)) return;
      const message = errorMessage(error);
      const errorInfo = classifyImmersiveWorkflowError(message, {
        missingProfile: t("modelEngineRequired"),
        emptyContext: t("noTranslatableBlocks"),
        modelResponseInvalid: t("jsonArrayInvalid"),
        applyFailed: t("translationWriteFailed")
      });
      runState = createImmersiveRunState("translation", scope, "failed", {
        error: message
      });
      setToolStatus("");
      setNotice(message);
      appendOperationLog(message, "error");
      appendOperationLog(
        formatImmersiveWorkflowLog(workflowLabel, "error", {
          scope: runState.scope,
          code: errorInfo.code,
          error: runState.error
        }),
        "debug"
      );
      try {
        await sendProgressUpdate(immersiveWorkflowErrorProgress(message));
      } catch {
        // Ignore progress rendering failures after the main operation already failed.
      }
    } finally {
      finishImmersiveRun(run);
    }
  };

  const runImmersiveReading = async (
    scope: "page" | "article" | "selection" = "page"
  ) => {
    const currentSettings = settingsRef.current;
    const profile = currentSettings
      ? profileForPurpose(currentSettings, "translation")
      : null;
    if (!currentSettings || !activeTab?.id) return;
    const workflowLabel = t("immersiveReading");
    const run = beginImmersiveRun();
    let runState = createImmersiveRunState("reading", scope, "collecting");
    appendOperationLog(
      `${workflowLabel}: ${
        scope === "selection"
          ? t("currentSelection")
          : scope === "article"
            ? t("currentBody")
            : t("currentPage")
      }`,
      "info"
    );
    appendOperationLog(
      formatImmersiveWorkflowLog(workflowLabel, "start", { scope }),
      "debug"
    );
    setToolStatus(workflowLabel);
    setNotice("");
    const sendProgress = async (
      percent: number,
      label: string,
      active = true,
      error = false
    ) => {
      await sendToTab(activeTab.id!, {
        type: "page.translation.progress",
        title: t("immersiveReading"),
        percent,
        label,
        active,
        error
      });
    };
    const sendProgressUpdate = async (
      update: ImmersiveWorkflowProgressUpdate
    ) => {
      await sendProgress(
        update.percent,
        update.label,
        update.active,
        update.error
      );
    };
    try {
      appendOperationLog(
        formatImmersiveWorkflowLog(workflowLabel, "collect_blocks", { scope }),
        "debug"
      );
      await sendProgressUpdate(
        immersiveWorkflowCollectingProgress(
          scope === "selection"
            ? t("readingSelection")
            : scope === "article"
              ? t("collectingCurrentBody")
              : t("collectingPageBody")
        )
      );
      const blocks = await sendToTab<PageTextBlock[]>(activeTab.id, {
        type: "page.translation.prepare",
        purpose: "reading",
        scope,
        articlePreview:
          scope === "article"
            ? articleContextForActivePage()?.articlePreview ?? []
            : [],
        text:
          scope === "selection"
            ? selectionContextForActivePage()?.text ?? ""
            : scope === "article"
              ? articleContextForActivePage()?.text ?? ""
              : ""
      });
      if (!blocks.length) throw new Error(t("noTranslatableBlocks"));
      runState = createImmersiveRunState("reading", scope, "requesting", {
        totalBlocks: blocks.length
      });
      appendOperationLog(
        formatImmersiveWorkflowLog(workflowLabel, "blocks_collected", {
          scope,
          blocks: blocks.length
        }),
        "debug"
      );
      const pageLanguageSample = blocks
        .map((block) => block.text)
        .join("\n")
        .slice(0, 8000);
      const useModelPage =
        currentSettings.immersiveReadingStrategy === "model-page";
      appendOperationLog(
        formatImmersiveWorkflowLog(workflowLabel, "strategy_selected", {
          scope,
          strategy: useModelPage ? "model-page" : "local-first",
          difficulty: currentSettings.immersiveReadingDifficulty
        }),
        "debug"
      );
      await sendProgressUpdate(
        immersiveWorkflowReadyProgress(blocks.length, t("immersiveReading"))
      );
      const requestModelReading = async (requestBlocks: PageTextBlock[]) => {
        if (!profile) {
          throw new Error(t("modelEngineRequired"));
        }
        appendOperationLog(
          formatImmersiveWorkflowLog(workflowLabel, "model_page_request", {
            scope,
            blocks: requestBlocks.length,
            model: `${profile.name}/${profile.model}`
          }),
          "debug"
        );
        const response = await runtimeRequest<{ text: string }>(
          "model.complete",
          {
            profileId: profile.id,
            purpose: "translation",
            temperature: 0,
            messages: [
              createMessage(
                "system",
                immersiveReadingInstruction(currentSettings)
              ),
              createMessage(
                "user",
                [
                  "<page-language-sample>",
                  pageLanguageSample,
                  "</page-language-sample>",
                  "<reading-input>",
                  JSON.stringify(requestBlocks),
                  "</reading-input>"
                ].join("\n")
              )
            ]
          }
        );
        return alignPageTranslations(
          requestBlocks,
          extractPageTranslationEntries(
            response.text,
            requestBlocks.length,
            currentSettings.interfaceLanguage
          )
        );
      };
      let translations: PageTranslation[] = [];
      let appliedDuringProcessing: number | null = null;
      let workflowSummary = createImmersiveWorkflowSummary({
        totalBlocks: blocks.length,
        requestedBlocks: 0,
        translatedBlocks: 0,
        appliedBlocks: 0
      });
      if (useModelPage) {
        const result = await runImmersiveReadingModelPageWorkflow({
          blocks,
          batchSize: IMMERSIVE_TRANSLATION_BATCH_SIZE,
          concurrency: IMMERSIVE_TRANSLATION_CONCURRENCY,
          signal: run.controller.signal,
          requestTranslations: requestModelReading,
          applyTranslations: async (orderedTranslations) => {
            runState = createImmersiveRunState("reading", scope, "applying", {
              totalBlocks: blocks.length
            });
            const applied = await sendToTab<{ count: number }>(activeTab.id!, {
              type: "page.reading.apply",
              translations: orderedTranslations,
              mode: currentSettings.immersiveReadingMode,
              backgroundStyle: currentSettings.immersiveReadingBackgroundStyle,
              outerEffects: currentSettings.immersiveReadingOuterTextEffects,
              innerEffects: currentSettings.immersiveReadingInnerTextEffects
            });
            return applied.count;
          },
          onBatchApplied: async (progress) => {
            await sendProgressUpdate(
              immersiveReadingModelBatchAppliedProgress(
                progress,
                blocks.length,
                t("immersiveReadingApplied")
              )
            );
          }
        });
        translations = result.translations;
        appliedDuringProcessing = result.appliedCount;
        workflowSummary = result.summary;
        appendOperationLog(
          formatImmersiveWorkflowLog(workflowLabel, "model_page_aligned", {
            scope,
            translations: workflowSummary.translatedBlocks
          }),
          "debug"
        );
      } else {
        const result = await runImmersiveReadingLocalFirstWorkflow({
          blocks,
          signal: run.controller.signal,
          buildPlan: async (requestBlocks) =>
            sendToTab<ReadingLocalPlan>(activeTab.id!, {
              type: "page.reading.plan",
              blocks: requestBlocks
            }),
          requestFallbackTranslations: profile
            ? async (terms) => {
                const response = await runtimeRequest<{ text: string }>(
                  "model.complete",
                  {
                    profileId: profile.id,
                    purpose: "translation",
                    temperature: 0,
                    messages: [
                      createMessage(
                        "system",
                        "You are WebMind's local-first immersive-reading term translator. Translate only the supplied terms."
                      ),
                      createMessage("user", buildReadingFallbackPrompt(terms))
                    ]
                  }
                );
                return parseReadingFallbackTranslations(response.text);
              }
            : undefined,
          finalizePlan: async (planBlocks, fallbackTranslations) =>
            sendToTab<PageTranslation[]>(activeTab.id!, {
              type: "page.reading.finalize",
              blocks: planBlocks,
              fallbackTranslations
            }),
          onPlanStart: () => {
            appendOperationLog(
              formatImmersiveWorkflowLog(workflowLabel, "local_first_plan_start", {
                scope
              }),
              "debug"
            );
          },
          onPlanReady: (plan) => {
            appendOperationLog(
              formatImmersiveWorkflowLog(workflowLabel, "local_first_plan_ready", {
                scope,
                blocks: plan.blocks.length,
                fallbackTerms: plan.fallbackTerms.length
              }),
              "debug"
            );
          },
          onFallbackRequest: async (terms) => {
            appendOperationLog(
              formatImmersiveWorkflowLog(
                workflowLabel,
                "local_first_fallback_request",
                {
                  scope,
                  fallbackTerms: terms.length,
                  model: profile ? `${profile.name}/${profile.model}` : undefined
                }
              ),
              "debug"
            );
            await sendProgressUpdate(
              immersiveWorkflowRunningProgress(
                18,
                `${t("immersiveReading")} ${terms.length}`
              )
            );
          },
          onFallbackComplete: (fallbackTranslations) => {
            appendOperationLog(
              formatImmersiveWorkflowLog(
                workflowLabel,
                "local_first_fallback_complete",
                {
                  scope,
                  translations: fallbackTranslations.length
                }
              ),
              "debug"
            );
          },
          onFallbackFailed: () => {
            appendOperationLog(
              formatImmersiveWorkflowLog(
                workflowLabel,
                "local_first_fallback_failed",
                { scope }
              ),
              "debug"
            );
          },
          onFallbackSkipped: (terms) => {
            appendOperationLog(
              formatImmersiveWorkflowLog(
                workflowLabel,
                "local_first_fallback_skipped",
                {
                  scope,
                  fallbackTerms: terms.length
                }
              ),
              "debug"
            );
          },
          onFinalize: () => {
            appendOperationLog(
              formatImmersiveWorkflowLog(workflowLabel, "local_first_finalize", {
                scope,
              }),
              "debug"
            );
          },
          onFinalized: (finalTranslations) => {
            appendOperationLog(
              formatImmersiveWorkflowLog(workflowLabel, "local_first_finalized", {
                scope,
                translations: finalTranslations.length
              }),
              "debug"
            );
          }
        });
        translations = result.translations;
        workflowSummary = result.summary;
      }
      let completed = appliedDuringProcessing ?? 0;
      if (appliedDuringProcessing === null) {
        const applyResult = await runImmersiveReadingFinalApplyWorkflow({
          blocks,
          translations,
          summary: workflowSummary,
          signal: run.controller.signal,
          onApplyStart: () => {
            runState = createImmersiveRunState("reading", scope, "applying", {
              totalBlocks: blocks.length
            });
          },
          applyTranslations: async (orderedTranslations) => {
            const applied = await sendToTab<{ count: number }>(activeTab.id!, {
              type: "page.reading.apply",
              translations: orderedTranslations,
              mode: currentSettings.immersiveReadingMode,
              backgroundStyle: currentSettings.immersiveReadingBackgroundStyle,
              outerEffects: currentSettings.immersiveReadingOuterTextEffects,
              innerEffects: currentSettings.immersiveReadingInnerTextEffects
            });
            return applied.count;
          }
        });
        translations = applyResult.translations;
        completed = applyResult.appliedCount;
        workflowSummary = applyResult.summary;
      }
      runState = createImmersiveRunState("reading", scope, "completed", {
        totalBlocks: workflowSummary.totalBlocks,
        appliedBlocks: workflowSummary.appliedBlocks
      });
      if (!isCurrentImmersiveRun(run)) return;
      appendOperationLog(
        formatImmersiveWorkflowLog(workflowLabel, "applied", {
          scope: runState.scope,
          applied: workflowSummary.appliedBlocks,
          total: workflowSummary.translatedBlocks
        }),
        "debug"
      );
      setToolStatus(`${t("immersiveReadingApplied")} ${completed}`);
      appendOperationLog(`${t("immersiveReadingApplied")} ${completed}`, "success");
      await sendProgressUpdate(
        immersiveWorkflowCompleteProgress(
          `${t("immersiveReadingApplied")} ${completed}`
        )
      );
    } catch (error) {
      if (isImmersiveWorkflowCancelledError(error)) {
        appendOperationLog(
          formatImmersiveWorkflowLog(workflowLabel, "cancelled", { scope }),
          "debug"
        );
        return;
      }
      if (!isCurrentImmersiveRun(run)) return;
      const message = errorMessage(error);
      const errorInfo = classifyImmersiveWorkflowError(message, {
        missingProfile: t("modelEngineRequired"),
        emptyContext: t("noTranslatableBlocks"),
        modelResponseInvalid: t("jsonArrayInvalid")
      });
      runState = createImmersiveRunState("reading", scope, "failed", {
        error: message
      });
      setToolStatus("");
      setNotice(message);
      appendOperationLog(message, "error");
      appendOperationLog(
        formatImmersiveWorkflowLog(workflowLabel, "error", {
          scope: runState.scope,
          code: errorInfo.code,
          error: runState.error
        }),
        "debug"
      );
      try {
        await sendProgressUpdate(immersiveWorkflowErrorProgress(message));
      } catch {
        // Ignore progress rendering failures after the main operation failed.
      }
    } finally {
      finishImmersiveRun(run);
    }
  };

  const restorePage = async () => {
    if (!activeTab?.id) return;
    immersiveRunRef.current?.controller.abort();
    immersiveRunRef.current = null;
    const workflowLabel = t("restorePage");
    const runState = createImmersiveRunState("translation", "page", "restoring");
    appendOperationLog(
      formatImmersiveWorkflowLog(workflowLabel, "restore", {
        scope: runState.scope
      }),
      "debug"
    );
    try {
      await sendToTab(activeTab.id, { type: "page.translation.restore" });
      setToolStatus(t("translationRemoved"));
      setNotice(t("pageRestored"));
      appendOperationLog(t("pageRestored"), "success");
      appendOperationLog(
        formatImmersiveWorkflowLog(workflowLabel, "restored", {
          scope: runState.scope
        }),
        "debug"
      );
    } catch (error) {
      setNotice(errorMessage(error));
      appendOperationLog(errorMessage(error), "error");
      appendOperationLog(
        formatImmersiveWorkflowLog(workflowLabel, "restore_error", {
          scope: runState.scope,
          error: errorMessage(error)
        }),
        "debug"
      );
    }
  };

  const executeTool = async (
    tool: ToolDefinition,
    options: {
      isolatedConversation?: boolean;
      respectCurrentContext?: boolean;
      hideToolsUntilResponse?: boolean;
    } = {}
  ) => {
    setNotice("");
    appendOperationLog(`${t("logToolSelected")}: ${tool.title}`, "info");
    const hideToolsUntilResponse = options.hideToolsUntilResponse ?? false;
    if (hideToolsUntilResponse) {
      chatToolsStreamStartedRef.current = false;
      setChatToolsHiddenDuringRequest(true);
      setChatToolsExpanded(false);
    }
    const modelHistoryOverride = options.isolatedConversation ? [] : undefined;
    if (tool.id === "ask-selection") {
      setComposer("");
      setView("chat");
      appendOperationLog(t("logAskSelectionReady"), "success");
      window.setTimeout(() => {
        document.querySelector<HTMLTextAreaElement>(".composer textarea")?.focus();
      }, 0);
      return;
    }
    if (tool.id === "analyze-image") {
      setView("chat");
      const profile = requireProfile("vision");
      if (!profile) {
        if (hideToolsUntilResponse) setChatToolsHiddenDuringRequest(false);
        return;
      }
      if (!profile.supportsVision) {
        if (hideToolsUntilResponse) setChatToolsHiddenDuringRequest(false);
        setNotice(
          t("profileVisionDisabled").replace("{name}", profile.name)
        );
        return;
      }
      const hasImage = attachments.some(
        (attachment) => (attachment.kind ?? "image") === "image"
      );
      if (!hasImage) {
        if (hideToolsUntilResponse) setChatToolsHiddenDuringRequest(false);
        setNotice(t("addImageBeforeAnalyze"));
        appendOperationLog(t("addImageBeforeAnalyze"), "warning");
        analyzeImageInputRef.current?.click();
        return;
      }
      const started = await sendMessage(toolInstruction(tool, settings ?? undefined), {
        skipPageContext: true,
        skipWebSearch: true,
        modelHistoryOverride,
        requestModelContent: toolPromptWithContext(
          tool,
          settings ?? undefined,
          ""
        ),
        toolInvocation: tool,
        purpose: "vision"
      });
      if (hideToolsUntilResponse && !started) {
        setChatToolsHiddenDuringRequest(false);
      }
      return;
    }
    const isTranslationTool =
      tool.id === "translate-text" || tool.id === "translate-document";
    const toolRequestText =
      toolInstruction(tool, settings ?? undefined) || tool.title;
    const respectCurrentContext = options.respectCurrentContext ?? true;
    const currentContextForTool = respectCurrentContext
      ? contextForCurrentMode()
      : undefined;
    if (!respectCurrentContext && pageContext) setIncludePage(true);
    setView("chat");
    const started = await sendMessage(
      toolRequestText,
      {
        forceIncludePage: !respectCurrentContext,
        skipWebSearch: isTranslationTool,
        contextAsInput: isTranslationTool,
        toolContextInput: !isTranslationTool,
        contextOverride: currentContextForTool ?? undefined,
        dictionaryForShortInput: tool.id === "translate-text",
        modelHistoryOverride: isTranslationTool ? [] : modelHistoryOverride,
        toolInvocation: tool,
        purpose: modelPurposeForToolId(tool.id)
      }
    );
    if (hideToolsUntilResponse && !started) {
      setChatToolsHiddenDuringRequest(false);
    }
  };

  const analyzeSelectedImages = async (files: File[]) => {
    if (!files.length) return;
    const tool = availableTools.find((item) => item.id === "analyze-image");
    if (!tool) return;
    try {
      const images = (
        await Promise.all(
          files.slice(0, 6).map((file) =>
            fileToAttachment(file, settings?.interfaceLanguage)
          )
        )
      ).filter(
        (attachment) => (attachment.kind ?? "image") === "image"
      );
      if (!images.length) {
        setNotice(t("addImageBeforeAnalyze"));
        appendOperationLog(t("addImageBeforeAnalyze"), "warning");
        return;
      }
      const nextAttachments = [...images, ...attachments].slice(0, 6);
      setAttachments(nextAttachments);
      setView("chat");
      appendOperationLog(
        `${t("logAttachmentAdded")}: ${images.length}`,
        "success"
      );
      await sendMessage(toolInstruction(tool, settings ?? undefined), {
        skipPageContext: true,
        skipWebSearch: true,
        attachmentsOverride: nextAttachments,
        requestModelContent: toolPromptWithContext(
          tool,
          settings ?? undefined,
          ""
        ),
        toolInvocation: tool,
        purpose: "vision"
      });
    } catch (error) {
      setNotice(errorMessage(error));
      appendOperationLog(errorMessage(error), "error");
    }
  };

  const loadConversation = (conversation: Conversation) => {
    appendOperationLog(`${t("logConversationLoaded")}: ${conversation.title}`, "info");
    conversationIdRef.current = conversation.id;
    conversationCreatedAtRef.current = conversation.createdAt;
    updateMessages(conversation.messages);
    setChatToolsExpanded(false);
    setChatToolsHiddenDuringRequest(false);
    chatToolsStreamStartedRef.current = false;
    setEditingMessageId(null);
    setEditingMessageText("");
    if (
      settings &&
      settings.profiles.some((profile) => profile.id === conversation.providerId)
    ) {
      const next = {
        ...settings,
        activeProfileId: conversation.providerId,
        defaultProfileId: conversation.providerId
      };
      settingsRef.current = next;
      setSettings(next);
    }
    setView("chat");
  };

  const resetToolDraft = () => {
    setEditingToolId(null);
    setToolDraft({ title: "", description: "", template: "", icon: "" });
    setToolIconPickerOpen(false);
  };

  const openNewToolEditor = () => {
    resetToolDraft();
    setToolEditorOpen(true);
  };

  const openEditToolEditor = (tool: ToolDefinition) => {
    setEditingToolId(tool.id);
    setToolDraft({
      title: tool.title,
      description: tool.description,
      template: tool.template,
      icon: tool.icon || "Sparkles"
    });
    setToolEditorOpen(true);
  };

  const closeToolEditor = () => {
    setToolEditorOpen(false);
    setToolIconPickerOpen(false);
    resetToolDraft();
  };

  const saveTool = async () => {
    if (!toolDraft.title.trim() || !toolDraft.template.trim()) {
      setNotice(t("toolNeedsPrompt"));
      return;
    }
    const nextTool: CustomTool = {
      id: editingToolId ?? crypto.randomUUID(),
      title: toolDraft.title.trim(),
      description: toolDraft.description.trim(),
      template: toolDraft.template.trim(),
      icon: toolDraft.icon,
      createdAt: Date.now()
    };
    const existingOverride = customTools.find((tool) => tool.id === editingToolId);
    const next = editingToolId
      ? existingOverride
        ? customTools.map((tool) =>
            tool.id === editingToolId
              ? { ...nextTool, createdAt: tool.createdAt }
              : tool
          )
        : [...customTools, nextTool]
      : [...customTools, nextTool];
    setCustomTools(next);
    const currentSettings = settingsRef.current;
    if (currentSettings && !editingToolId) {
      const nextSettings: AppSettings = {
        ...currentSettings,
        enabledToolIds: {
          ...currentSettings.enabledToolIds,
          selection: [...currentSettings.enabledToolIds.selection, nextTool.id],
          home: [...currentSettings.enabledToolIds.home, nextTool.id],
          tools: [...currentSettings.enabledToolIds.tools, nextTool.id],
          edge: currentSettings.enabledToolIds.edge ?? []
        }
      };
      settingsRef.current = nextSettings;
      setSettings(nextSettings);
      await saveSettings(nextSettings);
    }
    await saveCustomTools(next);
    closeToolEditor();
  };

  const deleteTool = async (toolId: string) => {
    const nextTools = customTools.filter((tool) => tool.id !== toolId);
    setCustomTools(nextTools);
    await saveCustomTools(nextTools);
    const currentSettings = settingsRef.current;
    if (!currentSettings) return;
    const nextSettings: AppSettings = {
      ...currentSettings,
      enabledToolIds: {
        ...currentSettings.enabledToolIds,
        selection: currentSettings.enabledToolIds.selection.filter(
          (id) => id !== toolId
        ),
        home: currentSettings.enabledToolIds.home.filter((id) => id !== toolId),
        tools: currentSettings.enabledToolIds.tools.filter((id) => id !== toolId),
        edge: currentSettings.enabledToolIds.edge.filter((id) => id !== toolId)
      }
    };
    settingsRef.current = nextSettings;
    setSettings(nextSettings);
    await saveSettings(nextSettings);
  };

  const addUrlAttachment = async () => {
    const rawUrl = window.prompt(t("enterAttachmentUrl"));
    if (!rawUrl?.trim()) return;
    try {
      const attachment = await urlToTextAttachment(
        rawUrl.trim(),
        settingsRef.current?.interfaceLanguage
      );
      setAttachments((current) => [...current, attachment].slice(0, 6));
      appendOperationLog(`${t("logAttachmentAdded")}: URL`, "success");
      setView("chat");
    } catch (error) {
      setNotice(errorMessage(error));
      appendOperationLog(errorMessage(error), "error");
    }
  };

  const contextMode = effectiveContextMode();
  const previewContext = includePage ? contextForCurrentMode() : null;
  const ContextIcon = contextIcon(previewContext);
  const contextScope = includePage
    ? contextLabel(previewContext, settings?.interfaceLanguage)
    : uiText(settings?.interfaceLanguage, "noneContext");
  const contextOptions = [
    {
      id: "none" as const,
      title: uiText(settings?.interfaceLanguage, "noneContext"),
      icon: Square
    },
    {
      id: "page" as const,
      title: uiText(settings?.interfaceLanguage, "currentPage"),
      icon: PanelTop
    },
    {
      id: "article" as const,
      title: uiText(settings?.interfaceLanguage, "currentBody"),
      icon: StickyNote
    },
    {
      id: "selection" as const,
      title: uiText(settings?.interfaceLanguage, "currentSelection"),
      icon: TextSelect
    }
  ];
  const selectedContextOption =
    contextOptions.find((option) => option.id === contextMode) ??
    contextOptions[0];
  const SelectedContextIcon = selectedContextOption.icon;
  const contextPreviewTitle =
    contextMode === "none"
      ? t("nonePreview")
      : contextMode === "page"
        ? t("pagePreview")
        : contextMode === "article"
          ? t("bodyPreview")
          : t("selectionPreview");
  const runHeaderImmersiveTranslate = async () => {
    if (contextMode === "none") {
      setNotice(t("chooseContextFirst"));
      return;
    }
    await translatePage(
      settings?.immersiveTranslationStyle ?? "bilingual",
      contextMode
    );
  };
  const runHeaderImmersiveReading = async () => {
    if (contextMode === "none") {
      setNotice(t("chooseContextFirst"));
      return;
    }
    await runImmersiveReading(contextMode);
  };
  const hasFileAttachments = attachments.some(
    (attachment) => (attachment.kind ?? "image") !== "url"
  );
  const hasUrlAttachments = attachments.some(
    (attachment) => attachment.kind === "url"
  );
  const homeTools = toolsFor("home").filter(
    (tool) => tool.id !== "ask-selection"
  );
  const panelTools = availableTools.filter(
    (tool) => tool.id !== "ask-selection"
  ).sort(
    (left, right) =>
      (TOOL_TAB_PRIORITY.includes(left.id)
        ? TOOL_TAB_PRIORITY.indexOf(left.id)
        : 100) -
      (TOOL_TAB_PRIORITY.includes(right.id)
        ? TOOL_TAB_PRIORITY.indexOf(right.id)
        : 100)
  );
  const messageTools = allTools(customTools, settings ?? undefined);
  const translateMessageTool =
    messageTools.find((tool) => tool.id === "translate-text") ?? null;
  const summaryMessageTool =
    messageTools.find((tool) => tool.id === "summary") ?? null;
  const explainCodeMessageTool =
    messageTools.find((tool) => tool.id === "explain-code") ?? null;
  const moreMessageTools = messageTools.filter(
    (tool) => !PINNED_MESSAGE_TOOL_IDS.has(tool.id)
  );
  const streamingMessageId = streamingId
    ? requestMapRef.current.get(streamingId) ?? null
    : null;
  const visibleOperationLogs = operationLogs.filter(
    (entry) =>
      logLevelWeight(entry.level) >=
      logLevelWeight(settings?.logLevel ?? "info")
  );
  const isArticlePreview = previewContext?.kind === "article";
  const previewContextText = previewContext?.text?.trim() ?? "";
  const previewContextMarkdown =
    previewContext?.markdown?.trim() || previewContextText;
  const articleSummary =
    isArticlePreview ? previewContext.articleSummary : undefined;
  const articlePreview =
    isArticlePreview ? previewContext.articlePreview ?? [] : [];
  const contextPreviewBlocks: ArticlePreviewBlock[] = isArticlePreview
    ? articlePreview
    : previewContextMarkdown
      ? markdownPreviewSegments(previewContextMarkdown)
          .map((markdown, index) => ({
            id: `context-preview-${index}`,
            text: markdown.trim(),
            markdown: markdown.trim()
          }))
          .filter((block) => block.text)
      : [];
  const bodySourceLabel =
    articleSummary?.source === "edited"
        ? t("currentBodySourceEdited")
      : articleSummary?.source === "manual"
      ? t("currentBodySourceManual")
      : articleSummary?.source === "rule"
      ? t("currentBodySourceRule")
      : articleSummary
        ? t("currentBodySourceDom")
        : "";
  const bodyBlockCount =
    articleSummary?.blockCount ?? contextPreviewBlocks.length;
  const bodyCharCount =
    articleSummary?.charCount ?? previewContextText.length;
  const articleScore = articleSummary?.score;
  const articleScoreMetrics = articleSummary?.scoreMetrics;

  useEffect(() => {
    if (!isArticlePreview || typeof articleScore !== "number") {
      previousArticleScoreRef.current = null;
      setArticleScoreTrend("same");
      return;
    }

    const pageUrl = previewContext.url ?? "";
    const previous = previousArticleScoreRef.current;
    if (!previous || previous.pageUrl !== pageUrl) {
      setArticleScoreTrend("same");
    } else if (articleScore > previous.score) {
      setArticleScoreTrend("up");
    } else if (articleScore < previous.score) {
      setArticleScoreTrend("down");
    } else {
      setArticleScoreTrend("same");
    }
    previousArticleScoreRef.current = { pageUrl, score: articleScore };
  }, [
    articleScore,
    articleSummary?.blockCount,
    articleSummary?.charCount,
    articleSummary?.selector,
    articleSummary?.source,
    isArticlePreview,
    previewContext?.text,
    previewContext?.url
  ]);

  const articleScoreMetricRows: Array<[UiTextKey, number]> = [
    ["articleMetricLength", articleScoreMetrics?.length ?? 0],
    ["articleMetricStructure", articleScoreMetrics?.structure ?? 0],
    ["articleMetricHeading", articleScoreMetrics?.heading ?? 0],
    ["articleMetricSemantics", articleScoreMetrics?.semantics ?? 0],
    ["articleMetricDensity", articleScoreMetrics?.density ?? 0],
    ["articleMetricLinkPurity", articleScoreMetrics?.linkPurity ?? 0],
    ["articleMetricFocus", articleScoreMetrics?.focus ?? 0],
    ["articleMetricCleanliness", articleScoreMetrics?.cleanliness ?? 0]
  ];

  if (!settings) {
    return <div className="panel-loading">{t("loading")} WebMind…</div>;
  }

  return (
    <div className="panel-shell">
      <TooltipLayer />
      <header className="panel-header">
        <div className="brand-compact">
          <button
            className="brand-tool-button"
            type="button"
            title={`${t("immersiveTranslation")}: ${selectedContextOption.title}`}
            onClick={() => void runHeaderImmersiveTranslate()}
          >
            <ImmersiveTranslateIcon />
          </button>
          <button
            className="brand-tool-button"
            type="button"
            title={`${t("immersiveReading")}: ${selectedContextOption.title}`}
            onClick={() => void runHeaderImmersiveReading()}
          >
            <ImmersiveReadingIcon />
          </button>
          <strong>WebMind</strong>
        </div>
        <div className="header-actions">
          <button
            className="icon-button"
            type="button"
            title={t("restorePage")}
            onClick={() => void restorePage()}
          >
            <RefreshCcw />
          </button>
          <select
            className="provider-select"
            value={settings.activeProfileId ?? ""}
            title={
              activeProfile
                ? `${activeProfile.name} · ${activeProfile.model}`
                : t("chooseModel")
            }
            onChange={(event) => {
              const next = {
                ...settings,
                activeProfileId: event.target.value || null,
                defaultProfileId: event.target.value || null
              };
              settingsRef.current = next;
              setSettings(next);
              appendOperationLog(
                `${t("currentModelEngine")}: ${
                  event.target.selectedOptions[0]?.textContent ?? t("chooseModel")
                }`,
                "info"
              );
              void import("../shared/storage").then(({ saveSettings }) =>
                saveSettings(next)
              );
            }}
          >
            <option value="">{t("chooseModel")}</option>
            {settings.profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name} · {profile.model}
              </option>
            ))}
          </select>
          <button
            className="icon-button"
            type="button"
            title={t("newChat")}
            onClick={newChat}
          >
            <MessageCirclePlus />
          </button>
          <button
            className="icon-button"
            type="button"
            title={t("settings")}
            onClick={() => void openOptions()}
          >
            <Settings />
          </button>
        </div>
      </header>

      <main className="panel-main">
        {view === "chat" && (
          <section className="chat-view">
            {!settings.profiles.length && (
              <div className="setup-banner">
                <Bot />
                <div>
                  <strong>{t("modelEngines")}</strong>
                  <span>{t("noModelEnginesHelp")}</span>
                </div>
                <button
                  className="primary-button compact"
                  type="button"
                  onClick={() => void openOptions()}
                >
                  <CirclePlus />
                  {t("add")}
                </button>
              </div>
            )}

            {!messages.length ? (
              <div className="chat-empty">
                <div className="empty-mark">
                  <Sparkles />
                </div>
                <p>
                  {pageContext
                    ? `${t("currentPage")}: ${pageContext.title}`
                    : t("openAnyPage")}
                </p>
                <div className="starter-grid">
                  {homeTools.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      title={tool.description}
    onClick={() =>
      void executeTool(tool, { hideToolsUntilResponse: true })
    }
                    >
                      <span className="starter-tool-icon">
                        <ToolIcon name={tool.icon} />
                      </span>
                      <span>{tool.title}</span>
                    </button>
                  ))}
                  {!homeTools.length && (
                    <button type="button" onClick={() => setView("tools")}>
                      <Wand2 />
                      {t("openTools")}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="message-list" aria-live="polite">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`message ${message.role} ${
                      message.error ? "error" : ""
                    }`}
                  >
                    <div className="message-meta">
                      <span className="message-identity">
                        <span
                          className={`message-avatar ${message.role}`}
                          aria-hidden="true"
                        >
                          {message.role === "user" ? <UserRound /> : <Sparkles />}
                        </span>
                        {message.role === "user"
                          ? t("you")
                          : activeProfile?.name ?? "WebMind"}
                      </span>
                      {message.role === "user" &&
                        editingMessageId !== message.id && (
                          <span className="message-meta-actions">
                            <button
                              className="message-meta-action"
                              type="button"
                              title={t("edit")}
                              aria-label={t("edit")}
                              disabled={
                                Boolean(streamingId) || editingMessageSubmitting
                              }
                              onClick={() => editUserMessage(message.id)}
                            >
                              <PenLine />
                            </button>
                            <button
                              className="message-meta-action"
                              type="button"
                              title={
                                copiedMessageId === message.id
                                  ? t("copied")
                                  : t("copyContent")
                              }
                              aria-label={t("copyContent")}
                              onClick={async () => {
                                await navigator.clipboard.writeText(
                                  message.content
                                );
                                setCopiedMessageId(message.id);
                                window.setTimeout(
                                  () => setCopiedMessageId(null),
                                  1400
                                );
                              }}
                            >
                              {copiedMessageId === message.id ? (
                                <Check />
                              ) : (
                                <Copy />
                              )}
                            </button>
                          </span>
                        )}
                    </div>
                    {message.attachments?.length ? (
                      <div className="message-images">
                        {message.attachments.map((attachment) => (
                          (attachment.kind ?? "image") === "image" &&
                          attachment.dataUrl ? (
                            <img
                              key={attachment.id}
                              src={attachment.dataUrl}
                              alt={attachment.name}
                            />
                          ) : (
                            <div className="message-file" key={attachment.id}>
                              {attachment.kind === "url" ? <Link2 /> : <FileText />}
                              <span>{attachment.name}</span>
                            </div>
                          )
                        ))}
                      </div>
                    ) : null}
                    {message.content ? (
                      message.role === "assistant" ? (
                        <>
                          <SyntaxHighlightedMarkdown content={message.content} />
                          {streamingMessageId !== message.id && (
                            <div className="message-actions assistant-actions">
                              <button
                                className="message-action-button icon-only"
                                type="button"
                                title={
                                  copiedMessageId === message.id
                                    ? t("copied")
                                    : t("copyContent")
                                }
                                aria-label={t("copyContent")}
                                onClick={async () => {
                                  await navigator.clipboard.writeText(
                                    message.content
                                  );
                                  setCopiedMessageId(message.id);
                                  window.setTimeout(
                                    () => setCopiedMessageId(null),
                                    1400
                                  );
                                }}
                              >
                                {copiedMessageId === message.id ? (
                                  <Check />
                                ) : (
                                  <Copy />
                                )}
                              </button>
                              <button
                                className="message-action-button icon-only"
                                type="button"
                                title={t("regenerate")}
                                aria-label={t("regenerate")}
                                disabled={Boolean(streamingId)}
                                onClick={() => void rerunAssistant(message.id)}
                              >
                                <RedoDot />
                              </button>
                              {translateMessageTool && (
                                <button
                                  className="message-action-button icon-only"
                                  type="button"
                                  title={translateMessageTool.title}
                                  aria-label={translateMessageTool.title}
                                  disabled={Boolean(streamingId)}
                                  onClick={() =>
                                    void runMessageTool(
                                      translateMessageTool,
                                      message.content
                                    )
                                  }
                                >
                                  <ToolIcon name={translateMessageTool.icon} />
                                </button>
                              )}
                              {summaryMessageTool && (
                                <button
                                  className="message-action-button icon-only"
                                  type="button"
                                  title={summaryMessageTool.title}
                                  aria-label={summaryMessageTool.title}
                                  disabled={Boolean(streamingId)}
                                  onClick={() =>
                                    void runMessageTool(
                                      summaryMessageTool,
                                      message.content
                                    )
                                  }
                                >
                                  <ToolIcon name={summaryMessageTool.icon} />
                                </button>
                              )}
                              {explainCodeMessageTool && (
                                <button
                                  className="message-action-button icon-only"
                                  type="button"
                                  title={explainCodeMessageTool.title}
                                  aria-label={explainCodeMessageTool.title}
                                  disabled={Boolean(streamingId)}
                                  onClick={() =>
                                    void runMessageTool(
                                      explainCodeMessageTool,
                                      message.content
                                    )
                                  }
                                >
                                  <ToolIcon name={explainCodeMessageTool.icon} />
                                </button>
                              )}
                              {moreMessageTools.length > 0 && (
                                <div
                                  className="icon-menu-shell message-tool-menu"
                                  onBlur={(event) => {
                                    if (
                                      isFocusOutside(
                                        event.currentTarget,
                                        event.relatedTarget
                                      )
                                    ) {
                                      setMessageToolMenuId(null);
                                    }
                                  }}
                                >
                                  <button
                                    className="message-tool-select"
                                    type="button"
                                    title={t("selectMoreTools")}
                                    disabled={Boolean(streamingId)}
                                    onClick={() =>
                                      setMessageToolMenuId((current) =>
                                        current === message.id
                                          ? null
                                          : message.id
                                      )
                                    }
                                  >
                                    <Wand2 />
                                    <span>{t("moreTools")}</span>
                                    <ChevronDown className="menu-chevron" />
                                  </button>
                                  {messageToolMenuId === message.id && (
                                    <div
                                      className="icon-menu-popover message-tool-popover"
                                      role="menu"
                                    >
                                      {moreMessageTools.map((tool) => (
                                        <button
                                          key={tool.id}
                                          type="button"
                                          role="menuitem"
                                          onClick={() => {
                                            setMessageToolMenuId(null);
                                            void runMessageTool(
                                              tool,
                                              message.content
                                            );
                                          }}
                                        >
                                          <ToolIcon name={tool.icon} />
                                          <span>{tool.title}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : editingMessageId === message.id ? (
                        <>
                          <textarea
                            className="user-message-editor"
                            value={editingMessageText}
                            rows={3}
                            autoFocus
                            disabled={editingMessageSubmitting}
                            onChange={(event) =>
                              setEditingMessageText(event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                event.preventDefault();
                                cancelUserMessageEdit();
                                return;
                              }
                              if (
                                event.key === "Enter" &&
                                !event.shiftKey &&
                                !event.nativeEvent.isComposing
                              ) {
                                event.preventDefault();
                                void resendEditedUserMessage(message.id);
                              }
                            }}
                          />
                          <div className="message-actions user-edit-actions">
                            <button
                              className="message-action-button"
                              type="button"
                              title={t("cancel")}
                              disabled={editingMessageSubmitting}
                              onClick={cancelUserMessageEdit}
                            >
                              <X />
                              {t("cancel")}
                            </button>
                            <button
                              className="message-action-button primary"
                              type="button"
                              title={t("send")}
                              disabled={
                                editingMessageSubmitting ||
                                (!editingMessageText.trim() &&
                                  !message.attachments?.length)
                              }
                              onClick={() =>
                                void resendEditedUserMessage(message.id)
                              }
                            >
                              {editingMessageSubmitting ? (
                                <LoaderCircle className="spin" />
                              ) : (
                                <Send />
                              )}
                              {t("send")}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          {message.toolInvocation ? (
                            <ToolInvocationBubble
                              invocation={message.toolInvocation}
                              language={settings?.interfaceLanguage}
                            />
                          ) : (
                            <SyntaxHighlightedMarkdown content={message.content} />
                          )}
                        </>
                      )
                    ) : message.role === "assistant" &&
                      streamingMessageId === message.id ? (
                      <div className="typing-indicator">
                        <span />
                        <span />
                        <span />
                      </div>
                    ) : null}
                    {message.interruptionNotice && (
                      <div className="message-interruption" role="status">
                        {message.interruptionNotice}
                      </div>
                    )}
                  </article>
                ))}
                {homeTools.length > 0 && !chatToolsHiddenDuringRequest && (
                  <div className="chat-tools-tray" ref={chatToolsTrayRef}>
                    <button
                      className="chat-tools-toggle"
                      type="button"
                      aria-expanded={chatToolsExpanded}
                      onClick={() => setChatToolsExpanded((expanded) => !expanded)}
                    >
                      <span className="chat-tools-toggle-main">
                        <WandSparkles />
                        <span>{t("showTools")}</span>
                      </span>
                      <ChevronDown className="chat-tools-toggle-chevron" />
                    </button>
                    {chatToolsExpanded && (
                      <div className="starter-grid chat-tools-grid">
                        {homeTools.map((tool) => (
                          <button
                            key={tool.id}
                            type="button"
                            title={tool.description}
                            disabled={Boolean(streamingId)}
                            onClick={() =>
                              void executeTool(tool, {
                                isolatedConversation: true,
                                respectCurrentContext: true,
                                hideToolsUntilResponse: true
                              })
                            }
                          >
                            <span className="starter-tool-icon">
                              <ToolIcon name={tool.icon} />
                            </span>
                            <span>{tool.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </section>
        )}

        {view === "tools" && (
          <section className="workspace-view">
            <div className="view-heading">
              <div>
                <p className="eyebrow">{t("navTools")}</p>
                <h1>{t("processCurrentContent")}</h1>
              </div>
              <div className="view-heading-actions">
                <ContextIcon />
                <button
                  className="icon-button"
                  type="button"
                  title={t("addTool")}
                  onClick={openNewToolEditor}
                >
                  <CirclePlus />
                </button>
              </div>
            </div>

            {panelTools.length ? (
              <div className="tool-list">
                {panelTools.map((tool) => (
                  <div className="tool-row custom" key={tool.id}>
                    <button
                      className="tool-main"
                      type="button"
                      onClick={() =>
                        void executeTool(tool, {
                          hideToolsUntilResponse: true
                        })
                      }
                    >
                      <span className="tool-icon custom">
                        <ToolIcon name={tool.icon} />
                      </span>
                      <span>
                        <strong>{tool.title}</strong>
                        <small>
                          {tool.description ||
                            (tool.builtin ? t("builtinTool") : t("customTool"))}
                        </small>
                      </span>
                    </button>
                    <button
                      className="icon-button mini"
                      type="button"
                      title={t("edit")}
                      onClick={() => openEditToolEditor(tool)}
                    >
                      <PenLine />
                    </button>
                    {!tool.builtin && (
                      <button
                        className="icon-button mini danger"
                        type="button"
                        title={t("delete")}
                        onClick={() => void deleteTool(tool.id)}
                      >
                        <Trash2 />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="simple-empty">
                <Wand2 />
                <strong>{t("noEnabledTools")}</strong>
                <span>{t("toolsPageShowsAll")}</span>
              </div>
            )}

            {(toolStatus || contextError) && (
              <div className="tool-status">
                {contextLoading ? <LoaderCircle className="spin" /> : <Check />}
                <span>{toolStatus || contextError}</span>
              </div>
            )}
          </section>
        )}

        {view === "history" && (
          <section className="workspace-view">
            <div className="view-heading">
              <div>
                <p className="eyebrow">{t("localRecords")}</p>
                <h1>{t("savedConversations")}</h1>
              </div>
              <div className="view-heading-actions">
                <button
                  className="icon-button danger"
                  type="button"
                  title={t("clearConversationHistory")}
                  disabled={!history.length}
                  onClick={() => void clearConversationHistory()}
                >
                  <Trash2 />
                </button>
                <button
                  className="icon-button"
                  type="button"
                  title={t("newChat")}
                  onClick={newChat}
                >
                  <CirclePlus />
                </button>
              </div>
            </div>

            {!history.length ? (
              <div className="simple-empty">
                <Clock3 />
                <strong>{t("noSavedConversations")}</strong>
                <span>{t("conversationsAutoSave")}</span>
              </div>
            ) : (
              <div className="history-list">
                {history.map((conversation) => (
                  <article className="history-row" key={conversation.id}>
                    <button
                      className="history-main"
                      type="button"
                      onClick={() => loadConversation(conversation)}
                    >
                      <strong>{conversation.title}</strong>
                      <span>
                        {conversation.pageTitle || t("ordinaryConversation")} ·{" "}
                        {formatTime(
                          conversation.updatedAt,
                          settings.interfaceLanguage
                        )}
                      </span>
                    </button>
                    <button
                      className="icon-button mini danger"
                      type="button"
                      title={t("delete")}
                      onClick={async () => {
                        await deleteConversation(conversation.id);
                        appendOperationLog(
                          `${t("delete")}: ${conversation.title}`,
                          "warning"
                        );
                        await refreshHistory();
                      }}
                    >
                      <Trash2 />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {view === "logs" && (
          <section className="workspace-view">
            <div className="view-heading">
              <div>
                <p className="eyebrow">{t("operationLogs")}</p>
                <h1>{t("navLogs")}</h1>
              </div>
              <button
                className="icon-button"
                type="button"
                title={t("clearLogs")}
                disabled={!operationLogs.length}
                onClick={() => setOperationLogs([])}
              >
                <Trash2 />
              </button>
            </div>

            <div className="operation-log-filter">
              <span>{t("displayLogLevel")}</span>
              <div className="log-level-segmented">
                {LOG_LEVEL_OPTIONS.map((level) => (
                  <button
                    key={level}
                    className={settings.logLevel === level ? "active" : ""}
                    type="button"
                    title={t("displayLogLevelHelp")}
                    onClick={() => {
                      const next = { ...settings, logLevel: level };
                      settingsRef.current = next;
                      setSettings(next);
                      void saveSettings(next);
                    }}
                  >
                    {t(logLevelTextKey(level))}
                  </button>
                ))}
              </div>
            </div>

            {!visibleOperationLogs.length ? (
              <div className="simple-empty">
                <FileText />
                <strong>{t("noOperationLogs")}</strong>
                <span>{t("operationLogsHelp")}</span>
              </div>
            ) : (
              <div className="operation-log-list" aria-live="polite">
                {visibleOperationLogs.map((entry) => (
                  <article
                    className={`operation-log-row ${entry.level}`}
                    key={entry.id}
                  >
                    <time>{formatLogTime(entry.time, settings.interfaceLanguage)}</time>
                    <span className="operation-log-level">
                      {t(logLevelTextKey(entry.level))}
                    </span>
                    <p>{entry.message}</p>
                  </article>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </section>
        )}
      </main>

      {view === "chat" && (
        <footer className="composer-area">
          {notice && (
            <div className="composer-notice">
              <span>{notice}</span>
              <button
                className="icon-button mini"
                type="button"
                title={t("closeNotice")}
                onClick={() => setNotice("")}
              >
                <X />
              </button>
            </div>
          )}
          {attachments.length > 0 && (
            <div className="attachment-strip">
              {attachments.map((attachment) => (
                <div className="attachment-thumb" key={attachment.id}>
                  {(attachment.kind ?? "image") === "image" &&
                  attachment.dataUrl ? (
                    <img src={attachment.dataUrl} alt={attachment.name} />
                  ) : (
                    <div className="attachment-file">
                      {attachment.kind === "url" ? <Link2 /> : <FileText />}
                      <span>{attachment.name}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    title={t("removeAttachment")}
                    onClick={() =>
                      setAttachments((current) =>
                        current.filter((item) => item.id !== attachment.id)
                      )
                    }
                  >
                    <X />
                  </button>
                </div>
              ))}
            </div>
          )}
          <details
            className="body-preview"
            open={bodyPreviewExpanded}
            onToggle={(event) =>
              setBodyPreviewExpanded(event.currentTarget.open)
            }
          >
              <summary>
                <SelectedContextIcon />
                <span>{contextPreviewTitle}</span>
                <span className="body-preview-summary-actions">
                  {(articleSummary?.source === "manual" ||
                    articleSummary?.source === "edited") && (
                    <button
                      className="body-preview-action icon-only body-restore-button"
                      type="button"
                      title={t("restoreCurrentBody")}
                      aria-label={t("restoreCurrentBody")}
                      disabled={articlePicking || articlePruning}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void restoreCurrentBody();
                      }}
                    >
                      <Undo2 />
                    </button>
                  )}
                  {isArticlePreview && (
                    <button
                      className="body-preview-action icon-only"
                      type="button"
                      title={
                        articlePicking
                          ? t("selectingBodyRange")
                          : t("selectCurrentBody")
                      }
                      aria-label={
                        articlePicking
                          ? t("selectingBodyRange")
                          : t("selectCurrentBody")
                      }
                      disabled={articlePicking || articlePruning}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void pickCurrentBodyRange();
                      }}
                    >
                      <SquareMousePointer />
                    </button>
                  )}
                  <button
                    className="body-preview-action icon-only"
                    type="button"
                    title={
                      isArticlePreview ? t("copyCurrentBody") : t("copyContent")
                    }
                    aria-label={
                      isArticlePreview ? t("copyCurrentBody") : t("copyContent")
                    }
                    disabled={!previewContextText}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void copyContextPreviewText(previewContextMarkdown);
                    }}
                  >
                    {bodyCopied ? <Check /> : <Copy />}
                  </button>
                  {typeof articleScore === "number" && (
                    <span
                      className={`body-preview-score ${articleScoreTrend}`}
                      tabIndex={0}
                      aria-label={t("currentBodyScore").replace(
                        "{score}",
                        String(articleScore)
                      )}
                      aria-describedby="current-body-score-tooltip"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                    >
                      {articleScore}
                      <span
                        id="current-body-score-tooltip"
                        className="body-preview-score-tooltip"
                        role="tooltip"
                      >
                        <span className="body-preview-score-tooltip-title">
                          {t("currentBodyScore").replace(
                            "{score}",
                            String(articleScore)
                          )}
                        </span>
                        <span className="body-preview-score-metrics">
                          {articleScoreMetricRows.map(([key, value]) => (
                            <span key={key}>
                              <span>{t(key)}</span>
                              <b>{value}</b>
                            </span>
                          ))}
                        </span>
                      </span>
                    </span>
                  )}
                  <span
                    className="body-preview-toggle-icon"
                    role="button"
                    tabIndex={0}
                    aria-label={bodyPreviewExpanded ? t("collapse") : t("expand")}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setBodyPreviewExpanded((expanded) => !expanded);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      event.stopPropagation();
                      setBodyPreviewExpanded((expanded) => !expanded);
                    }}
                  >
                    {bodyPreviewExpanded ? <ChevronUp /> : <ChevronDown />}
                  </span>
                </span>
              </summary>
              <div className="body-preview-meta">
                {isArticlePreview && (
                  <button
                    className="body-preview-meta-action icon-only"
                    type="button"
                    title={t("smartPruneCurrentBody")}
                    aria-label={t("smartPruneCurrentBody")}
                    disabled={articlePicking || articlePruning}
                    onClick={() => void pruneCurrentBodyPreviewBlocks()}
                  >
                    <Eraser />
                  </button>
                )}
                {isArticlePreview && (
                  <button
                    className="body-preview-meta-action icon-only"
                    type="button"
                    title={t("modelPruneCurrentBody")}
                    aria-label={t("modelPruneCurrentBody")}
                    disabled={articlePicking || articlePruning}
                    onClick={() => void pruneCurrentBodyWithModel()}
                  >
                    <Wand />
                  </button>
                )}
                {articleSummary?.selector && (
                  <button
                    className="body-preview-meta-action body-preview-selector"
                    type="button"
                    title={articleSummary.selector}
                    onClick={() => openArticleRuleEditor()}
                  >
                    {articleSummary.selector}
                  </button>
                )}
                {!isArticlePreview && <span>{selectedContextOption.title}</span>}
                {!isArticlePreview && previewContext?.title && (
                  <span title={previewContext.title}>{previewContext.title}</span>
                )}
                {isArticlePreview && bodySourceLabel && <span>{bodySourceLabel}</span>}
                <span>
                  {t("currentBodyBlocks").replace(
                    "{count}",
                    String(bodyBlockCount)
                  )}
                </span>
                <span>
                  {t("currentBodyChars").replace(
                    "{count}",
                    String(bodyCharCount)
                  )}
                </span>
              </div>
              {contextPreviewBlocks.length > 0 && (
                <div className="body-preview-blocks">
                  {contextPreviewBlocks.map((block) =>
                    isArticlePreview ? (
                      <div
                        key={block.id}
                        className="body-preview-block"
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          if ((event.target as Element).closest("a")) return;
                          void highlightCurrentBodyPreviewBlock(block);
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          void highlightCurrentBodyPreviewBlock(block);
                        }}
                      >
                        <div className="body-preview-block-content">
                          <SyntaxHighlightedMarkdown
                            content={block.markdown ?? block.sourceText ?? block.text}
                            eager={bodyPreviewExpanded}
                          />
                        </div>
                        <button
                          className="body-preview-block-remove"
                          type="button"
                          title={t("removeCurrentBodyBlock")}
                          aria-label={t("removeCurrentBodyBlock")}
                          disabled={articlePruning}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void removeCurrentBodyPreviewBlock(block);
                          }}
                        >
                          <X />
                        </button>
                      </div>
                    ) : (
                      <div
                        key={block.id}
                        className="body-preview-block passive"
                      >
                        <div className="body-preview-block-content">
                          <SyntaxHighlightedMarkdown
                            content={block.markdown ?? block.sourceText ?? block.text}
                            eager={bodyPreviewExpanded}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </details>
          <div className="composer">
            {composer.trim() && (
              <button
                className="composer-clear"
                type="button"
                title={t("clearComposer")}
                aria-label={t("clearComposer")}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setComposer("")}
              >
                <X />
              </button>
            )}
            <textarea
              value={composer}
              rows={1}
              placeholder={
                activeProfile
                  ? `${
                      includePage
                        ? `${contextScope}…`
                        : t("directQuestionPlaceholder")
                    } ${t("composerShortcutHint")}`
                  : t("addEngineFirst")
              }
              onChange={(event) => setComposer(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
            />
            <div className="composer-toolbar">
              <div className="composer-tools">
                <div
                  className="icon-menu-shell context-menu-shell"
                  onBlur={(event) => {
                    if (
                      isFocusOutside(event.currentTarget, event.relatedTarget)
                    ) {
                      setContextMenuOpen(false);
                    }
                  }}
                >
                  <button
                    className={`context-select ${includePage ? "active" : ""}`}
                    type="button"
                    title={t("currentContext")}
                    aria-haspopup="menu"
                    aria-expanded={contextMenuOpen}
                    disabled={contextLoading}
                    onClick={() => setContextMenuOpen((open) => !open)}
                  >
                    <SelectedContextIcon />
                    <span>{selectedContextOption.title}</span>
                    <ChevronDown className="menu-chevron" />
                  </button>
                  {contextMenuOpen && (
                    <div
                      className="icon-menu-popover context-popover"
                      role="menu"
                    >
                      {contextOptions.map((option) => {
                        const OptionIcon = option.icon;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            role="menuitem"
                            className={
                              option.id === contextMode ? "active" : ""
                            }
                            onClick={() => {
                              setContextMenuOpen(false);
                              void changeContextMode(option.id);
                            }}
                          >
                            <OptionIcon />
                            <span>{option.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  className={`icon-button mini ${
                    webSearchEnabled ? "active" : ""
                  }`}
                  type="button"
                  title={t("webSearch")}
                  onClick={() =>
                    setWebSearchEnabled((value) => {
                      appendOperationLog(
                        `${t("webSearch")}: ${
                          value ? t("logDisabled") : t("logEnabled")
                        }`,
                        "info"
                      );
                      return !value;
                    })
                  }
                >
                  <Search />
                </button>
                <button
                  className={`icon-button mini ${
                    hasFileAttachments ? "active" : ""
                  }`}
                  type="button"
                  title={t("addAttachment")}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip />
                </button>
                <button
                  className={`icon-button mini ${
                    hasUrlAttachments ? "active" : ""
                  }`}
                  type="button"
                  title={t("addUrl")}
                  onClick={() => void addUrlAttachment()}
                >
                  <Link2 />
                </button>
              </div>
              {streamingId ? (
                <button
                  className="send-button stop"
                  type="button"
                  title={t("stop")}
                  onClick={() => stopStreaming(t("requestCancelled"))}
                >
                  <Square />
                </button>
              ) : (
                <button
                  className="send-button"
                  type="button"
                  title={t("send")}
                  disabled={!activeProfile || (!composer.trim() && !attachments.length)}
                  onClick={() => void sendMessage()}
                >
                  <ArrowUp />
                </button>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            hidden
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/*,.csv,.css,.html,.js,.json,.jsx,.log,.md,.py,.ts,.tsx,.txt,.xml,.yaml,.yml"
            multiple
            onChange={async (event) => {
              const files = Array.from(event.target.files ?? []).slice(0, 6);
              try {
                const next = await Promise.all(
                  files.map((file) =>
                    fileToAttachment(file, settings.interfaceLanguage)
                  )
                );
                setAttachments((current) => [...current, ...next].slice(0, 6));
                appendOperationLog(
                  `${t("logAttachmentAdded")}: ${next.length}`,
                  "success"
                );
                setView("chat");
              } catch (error) {
                setNotice(errorMessage(error));
              }
              event.target.value = "";
            }}
          />
        </footer>
      )}

      <input
        ref={analyzeImageInputRef}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void analyzeSelectedImages(files);
        }}
      />

      <nav className="panel-nav" aria-label={t("mainNav")}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              type="button"
              onClick={() => setView(item.id)}
            >
              <Icon />
              <span>{uiText(settings?.interfaceLanguage, item.labelKey)}</span>
            </button>
          );
        })}
      </nav>

      {articleRuleEditorOpen && (
        <div className="modal-backdrop">
          <section
            className="modal article-rule-editor"
            role="dialog"
            aria-modal="true"
          >
            <header className="modal-header">
              <div>
                <p className="eyebrow">{t("currentBody")}</p>
                <h2>{t("articleExtractionRules")}</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                title={t("close")}
                onClick={() => setArticleRuleEditorOpen(false)}
              >
                <X />
              </button>
            </header>
            <div className="modal-body form-stack">
              <label className="field">
                <span className="field-label">
                  {t("articleExtractionUrlPattern")}
                </span>
                <input
                  value={articleRuleDraft.urlPattern}
                  onChange={(event) =>
                    setArticleRuleDraft((current) => ({
                      ...current,
                      urlPattern: event.target.value
                    }))
                  }
                  placeholder="example.com, *.example.com, https://example.com/*"
                  spellCheck={false}
                />
                <small>{t("articleExtractionRulesHelp")}</small>
              </label>
              <label className="field">
                <span className="field-label">
                  {t("articleExtractionSelector")}
                </span>
                <input
                  value={articleRuleDraft.selector}
                  onChange={(event) =>
                    setArticleRuleDraft((current) => ({
                      ...current,
                      selector: event.target.value
                    }))
                  }
                  placeholder="main article, article, #content, .post-body"
                  spellCheck={false}
                />
              </label>
            </div>
            <footer className="modal-footer">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setArticleRuleEditorOpen(false)}
              >
                {t("cancel")}
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => void saveArticleExtractionRule()}
              >
                <CirclePlus />
                {t("addArticleExtractionRule")}
              </button>
            </footer>
          </section>
        </div>
      )}

      {toolEditorOpen && (
        <div className="modal-backdrop">
          <section className="modal prompt-editor" role="dialog" aria-modal="true">
            <header className="modal-header">
              <div>
                <p className="eyebrow">{t("custom")}</p>
                <h2>
                  {editingToolId
                    ? `${t("edit")} ${t("addTool")}`
                    : t("addTool")}
                </h2>
              </div>
              <button
                className="icon-button"
                type="button"
                title={t("close")}
                onClick={closeToolEditor}
              >
                <X />
              </button>
            </header>
            <div className="modal-body form-stack">
              <div className="field">
                <span className="field-label">{t("title")}</span>
                <div className="tool-title-editor-row">
                  <button
                    className={`tool-icon-picker-trigger ${
                      toolDraft.icon ? "" : "empty"
                    }`}
                    type="button"
                    title={toolDraft.icon || t("noIcon")}
                    aria-label={t("chooseIcon")}
                    onClick={() => {
                      setToolIconPickerOpen((current) => !current);
                    }}
                  >
                    <ToolIcon name={toolDraft.icon} />
                  </button>
                  <input
                    value={toolDraft.title}
                    onChange={(event) =>
                      setToolDraft((current) => ({
                        ...current,
                        title: event.target.value
                      }))
                    }
                  />
                </div>
              </div>
              {toolIconPickerOpen && (
                <Suspense
                  fallback={
                    <div
                      className="tool-icon-picker"
                      role="dialog"
                      aria-label={t("chooseIcon")}
                    >
                      <div className="tool-icon-empty">{t("loading")}</div>
                    </div>
                  }
                >
                  <LazyToolIconPicker
                    currentIcon={toolDraft.icon}
                    language={settings?.interfaceLanguage}
                    onSelect={(icon) => {
                      setToolDraft((current) => ({ ...current, icon }));
                      setToolIconPickerOpen(false);
                    }}
                  />
                </Suspense>
              )}
              <label className="field">
                <span className="field-label">{t("description")}</span>
                <input
                  value={toolDraft.description}
                  onChange={(event) =>
                    setToolDraft((current) => ({
                      ...current,
                      description: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field">
                <span className="field-label">{t("toolPrompt")}</span>
                <textarea
                  rows={8}
                  value={toolDraft.template}
                  onChange={(event) =>
                    setToolDraft((current) => ({
                      ...current,
                      template: event.target.value
                    }))
                  }
                />
              </label>
            </div>
            <footer className="modal-footer">
              <button
                className="secondary-button"
                type="button"
                onClick={closeToolEditor}
              >
                {t("cancel")}
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => void saveTool()}
              >
                <Send />
                {editingToolId ? t("saveChanges") : t("saveTool")}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
