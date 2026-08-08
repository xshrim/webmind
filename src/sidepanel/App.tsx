import {
  ArrowUp,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  CirclePlus,
  Clock3,
  Copy,
  FileText,
  Globe2,
  ImagePlus,
  Link2,
  LoaderCircle,
  MessageCirclePlus,
  MessageSquareText,
  Paperclip,
  PenLine,
  Presentation,
  RefreshCcw,
  ScanText,
  Search,
  Send,
  Settings,
  Sparkles,
  Square,
  TextSelect,
  Trash2,
  UserRound,
  Wand2,
  WandSparkles,
  X
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  getActivePageContext,
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
import {
  consumePendingAction,
  deleteConversation,
  listConversations,
  loadCustomTools,
  loadSettings,
  saveConversation,
  saveCustomTools,
  saveSettings
} from "../shared/storage";
import { allTools, toolInstruction } from "../shared/tools";
import { modelPurposeForToolId, profileForPurpose } from "../shared/models";
import {
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
  buildProtectedTranslationPrompt,
  createMessage,
  errorMessage,
  extractPageTranslationEntries,
  protectTranslationText,
  restoreTranslationText,
  shortTitle,
  toModelMessage,
  truncateText,
  type ProtectedTranslationText
} from "../shared/utils";
import {
  orderTranslationsByBlocks,
  runImmersiveReadingModelPageWorkflow,
  runImmersiveTranslationWorkflow
} from "../shared/immersiveWorkflow";
import { Markdown } from "../ui/Markdown";
import { extractPdfContext } from "./pdf";
import { searchWeb } from "../shared/webSearch";
import {
  fileToAttachment,
  urlToAttachment,
  urlToTextAttachment
} from "./attachments";
import {
  buildSystemMessage,
  contextLabel,
  contextSnapshotExcerpt,
  defaultContextMode,
  normalizePageContext,
  type ContextMode
} from "./context";
import {
  NAV_ITEMS,
  TOOL_ICON_CHOICES,
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

type ViewId = "chat" | "tools" | "history" | "logs";

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

function isFocusOutside(
  container: HTMLElement,
  nextTarget: EventTarget | null
): boolean {
  return !(nextTarget instanceof Node) || !container.contains(nextTarget);
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
  const [bodyPreviewExpanded, setBodyPreviewExpanded] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [toolStatus, setToolStatus] = useState("");
  const [operationLogs, setOperationLogs] = useState<OperationLogEntry[]>([]);
  const [history, setHistory] = useState<Conversation[]>([]);
  const [customTools, setCustomTools] = useState<CustomTool[]>([]);
  const [toolEditorOpen, setToolEditorOpen] = useState(false);
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [toolDraft, setToolDraft] = useState({
    title: "",
    description: "",
    template: "",
    icon: "Sparkles"
  });
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

  const messagesRef = useRef(messages);
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
  const activeTabContextVersionRef = useRef(0);
  const contextModeRef = useRef<ContextMode>("page");
  const demoTimerRef = useRef<number | null>(null);

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
    async (reason: string, showLoading = true) => {
      const version = ++activeTabContextVersionRef.current;
      selectionContextVersionRef.current += 1;
      if (showLoading) setContextLoading(true);
      try {
        const scope = defaultContextMode(settingsRef.current);
        const page = await getActivePageContext(
          settingsRef.current?.interfaceLanguage,
          { ignoreSelection: true, scope }
        );
        if (activeTabContextVersionRef.current !== version) return;
        const preservedSelection = pendingSelectionContextRef.current;
        const keepPreservedSelection = Boolean(
          preservedSelection &&
            (!page.tab?.url || page.tab.url === preservedSelection.url)
        );
        if (preservedSelection && !keepPreservedSelection) {
          pendingSelectionContextRef.current = null;
        }
        const context = keepPreservedSelection
          ? preservedSelection
          : normalizePageContext(page.context);
        setActiveTab(page.tab);
        setPageContext(context);
        let nextContextMode: ContextMode = "page";
        if (context?.kind === "selection") {
          nextContextMode = "selection";
          contextModeRef.current = nextContextMode;
          setSelectionContext(context);
          setCurrentPageContext(null);
          setCurrentArticleContext(null);
        } else if (context?.kind === "article") {
          nextContextMode = "article";
          contextModeRef.current = nextContextMode;
          setSelectionContext(null);
          setCurrentPageContext(null);
          setCurrentArticleContext(context);
        } else {
          nextContextMode = "page";
          contextModeRef.current = nextContextMode;
          setSelectionContext(null);
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
          }`,
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
      await refreshActivePageContext("sidepanel-init", true);
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
            void refreshActivePageContext("default-context-updated", true);
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
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void refreshActivePageContext(reason, true);
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
  }, [refreshActivePageContext]);

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
                    ? restoreTranslationText(rawText, protection)
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

  const resolveRichContext = async (
    profile: ProviderProfile,
    forceIncludePage = false
  ): Promise<PageContext | null> => {
    if ((!includePage && !forceIncludePage) || !pageContext) return null;
    if (pageContext.kind === "youtube" && !pageContext.text) {
      setContextLoading(true);
      try {
        await requestOriginPermission(pageContext.url);
        const transcript = await runtimeRequest<PageContext>("context.youtube", {
          pageUrl: pageContext.url,
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
      pageContext.kind === "pdf" &&
      (!pageContext.text || pageContext.text.length < 200)
    ) {
      setContextLoading(true);
      try {
        const granted = await requestOriginPermission(pageContext.url);
        if (!granted) throw new Error(t("needPdfPermission"));
        const pdf = await extractPdfContext(
          pageContext.url,
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
    return pageContext;
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
    if (!activeTab?.id) {
      setNotice(t("noReadableTab"));
      return;
    }
    setArticlePicking(true);
    setToolStatus(t("selectingBodyRange"));
    setNotice("");
    try {
      const next = await sendToTab<PageContext | null>(activeTab.id, {
        type: "page.article.pick"
      });
      if (!next || next.kind !== "article" || !next.text.trim()) {
        setNotice(t("manualBodySelectionCancelled"));
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
      setNotice(errorMessage(error));
      appendOperationLog(errorMessage(error), "error");
    } finally {
      setArticlePicking(false);
      setToolStatus("");
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
      setBodyPreviewExpanded(false);
      appendOperationLog(t("restoreCurrentBody"), "success");
    } catch (error) {
      setNotice(errorMessage(error));
      appendOperationLog(errorMessage(error), "error");
    } finally {
      setArticlePicking(false);
      setToolStatus("");
    }
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
      const url = String(payload.url ?? senderTab.url ?? activeTab.url ?? "");
      const title = String(
        payload.title ?? senderTab.title ?? activeTab.title ?? t("currentPage")
      );
      setIncludePage(true);
      setNotice("");
      if (Boolean(payload.hasSelection) && text) {
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
      if (
        currentArticleContext &&
        (!url || currentArticleContext.url === url)
      ) {
        void sendToTab(senderTab.id, {
          type: "immersive.contextScope.set",
          scope: "article"
        }).catch(() => undefined);
        setPageContext(currentArticleContext);
        return;
      }
      if (currentPageContext && (!url || currentPageContext.url === url)) {
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
  }, [activeTab?.id, activeTab?.title, activeTab?.url, currentArticleContext, currentPageContext, settings?.interfaceLanguage]);

  const sendMessage = useCallback(
    async (
      textOverride?: string,
      options: {
        forceIncludePage?: boolean;
        skipPageContext?: boolean;
        skipWebSearch?: boolean;
        contextAsInput?: boolean;
        dictionaryForShortInput?: boolean;
        toolInvocation?: ToolDefinition;
        toolInvocationContext?: ToolInvocationContext;
        attachmentsOverride?: ImageAttachment[];
        historyOverride?: ChatMessage[];
        modelHistoryOverride?: ChatMessage[];
        hideToolsUntilResponse?: boolean;
        translationProtection?: ProtectedTranslationText;
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
        context = options.skipPageContext
          ? null
          : await resolveRichContext(profile, options.forceIncludePage);
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
      const contextualTranslationProtection =
        options.contextAsInput && context?.text.trim()
          ? protectTranslationText(context.text)
          : null;
      const requestTranslationProtection =
        options.translationProtection ?? contextualTranslationProtection;
      const modelContent =
        options.contextAsInput && context?.text.trim()
          ? buildProtectedTranslationPrompt(
              settingsRef.current ?? undefined,
              context.text,
              truncateText(
                contextualTranslationProtection?.text ?? context.text,
                profile.maxContextChars,
                settingsRef.current?.interfaceLanguage
              ),
              { dictionaryForShortInput: options.dictionaryForShortInput }
            )
          : undefined;
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
                text: contextSnapshotExcerpt(context.text),
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
      const modelMessages = [
        buildSystemMessage(
          options.contextAsInput ? null : context,
          results,
          profile,
          settingsRef.current?.interfaceLanguage
        ),
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
      activeTab?.title,
      activeTab?.url,
      appendOperationLog,
      pageContext,
      postStreamMessage,
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
        buildProtectedTranslationPrompt(
          settingsRef.current ?? undefined,
          content,
          protection.text,
          { dictionaryForShortInput: tool.id === "translate-text" }
        ),
        {
          skipPageContext: true,
          skipWebSearch: true,
          toolInvocation: tool,
          toolInvocationContext: { kind: "answer", text: content },
          translationProtection: protection,
          purpose: "translation"
        }
      );
      return;
    }
    await sendMessage(
        [
          toolInstruction(tool, settings ?? undefined, content),
          "",
          `${t("currentAnswer")}：`,
          content
        ].join("\n"),
      {
        skipPageContext: true,
        skipWebSearch: true,
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

  const translatePage = async (
    mode: PageTranslationMode = "bilingual",
    scope: "page" | "article" | "selection" = "page"
  ) => {
    const profile = requireProfile("translation");
    if (!profile || !activeTab?.id) return;
    appendOperationLog(
      `${t("immersiveTranslation")}: ${
        scope === "selection"
          ? t("currentSelection")
          : scope === "article"
            ? t("currentBody")
            : t("currentPage")
      }`,
      "info"
    );
    const tabId = activeTab.id;
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
    try {
      await sendProgress(
        3,
        scope === "selection"
          ? t("readingSelection")
          : scope === "article"
            ? t("collectingCurrentBody")
            : t("collectingPageBody")
      );
      const blocks = await sendToTab<PageTextBlock[]>(tabId, {
        type: "page.translation.prepare",
        purpose: "translation",
        scope,
        text: scope === "selection" ? pageContext?.text ?? "" : ""
      });
      if (!blocks.length) throw new Error(t("noTranslatableBlocks"));
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
      const { completed } = await runImmersiveTranslationWorkflow({
        blocks,
        batchSize: IMMERSIVE_TRANSLATION_BATCH_SIZE,
        concurrency:
          scope === "selection" ? 1 : IMMERSIVE_TRANSLATION_CONCURRENCY,
        requestTranslations,
        applyTranslations: async (translations) => {
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
        onBatchStart: async ({ batch, processedBefore }) => {
          setToolStatus(
            `${t("translatingPageProgress")}：${Math.min(processedBefore + batch.length, blocks.length)}/${blocks.length}`
          );
          await sendProgress(
            (processedBefore / blocks.length) * 92 + 5,
            `${t("translatingPageProgress")} ${Math.min(processedBefore + batch.length, blocks.length)}/${blocks.length}`
          );
        },
        onBatchApplied: async ({ completed }) => {
          await sendProgress(
            (Math.min(completed, blocks.length) / blocks.length) * 92 + 5,
            `${t("translationApplied")} ${completed}`
          );
        }
      });
      setToolStatus(`${t("translationApplied")} ${completed}`);
      appendOperationLog(`${t("translationComplete")}: ${completed}`, "success");
      await sendProgress(
        100,
        `${t("translationComplete")}, ${t("translationApplied")} ${completed}`,
        false
      );
    } catch (error) {
      setToolStatus("");
      setNotice(errorMessage(error));
      appendOperationLog(errorMessage(error), "error");
      try {
        await sendProgress(100, errorMessage(error), false, true);
      } catch {
        // Ignore progress rendering failures after the main operation already failed.
      }
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
    appendOperationLog(
      `${t("immersiveReading")}: ${
        scope === "selection"
          ? t("currentSelection")
          : scope === "article"
            ? t("currentBody")
            : t("currentPage")
      }`,
      "info"
    );
    appendOperationLog(
      `[workflow] ${t("immersiveReading")} start scope=${scope}`,
      "debug"
    );
    setToolStatus(t("immersiveReading"));
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
    try {
      appendOperationLog(
        `[workflow] ${t("immersiveReading")} collect text blocks`,
        "debug"
      );
      await sendProgress(
        3,
        scope === "selection"
          ? t("readingSelection")
          : scope === "article"
            ? t("collectingCurrentBody")
            : t("collectingPageBody")
      );
      const blocks = await sendToTab<PageTextBlock[]>(activeTab.id, {
        type: "page.translation.prepare",
        purpose: "reading",
        scope,
        text: scope === "selection" ? pageContext?.text ?? "" : ""
      });
      if (!blocks.length) throw new Error(t("noTranslatableBlocks"));
      appendOperationLog(
        `[workflow] ${t("immersiveReading")} collected blocks=${blocks.length}`,
        "debug"
      );
      const pageLanguageSample = blocks
        .map((block) => block.text)
        .join("\n")
        .slice(0, 8000);
      const useModelPage =
        currentSettings.immersiveReadingStrategy === "model-page";
      appendOperationLog(
        `[workflow] ${t("immersiveReading")} strategy=${
          useModelPage ? "model-page" : "local-first"
        } difficulty=${currentSettings.immersiveReadingDifficulty}`,
        "debug"
      );
      await sendProgress(
        8,
        `${t("immersiveReading")} ${blocks.length}/${blocks.length}`
      );
      const requestModelReading = async (requestBlocks: PageTextBlock[]) => {
        if (!profile) {
          throw new Error(t("modelEngineRequired"));
        }
        appendOperationLog(
          `[workflow] ${t("immersiveReading")} model-page request blocks=${requestBlocks.length} model=${profile.name}/${profile.model}`,
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
      if (useModelPage) {
        const result = await runImmersiveReadingModelPageWorkflow({
          blocks,
          batchSize: IMMERSIVE_TRANSLATION_BATCH_SIZE,
          concurrency: IMMERSIVE_TRANSLATION_CONCURRENCY,
          requestTranslations: requestModelReading,
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
          },
          onBatchApplied: async ({ batch, processedBefore, appliedCount }) => {
            await sendProgress(
              (Math.min(processedBefore + batch.length, blocks.length) /
                blocks.length) *
                92 +
                5,
              `${t("immersiveReadingApplied")} ${appliedCount}`
            );
          }
        });
        translations = result.translations;
        appliedDuringProcessing = result.appliedCount;
        appendOperationLog(
          `[workflow] ${t("immersiveReading")} model-page aligned translations=${translations.length}`,
          "debug"
        );
      } else {
        appendOperationLog(
          `[workflow] ${t("immersiveReading")} local-first build local plan`,
          "debug"
        );
        const plan = await sendToTab<ReadingLocalPlan>(activeTab.id!, {
          type: "page.reading.plan",
          blocks
        });
        appendOperationLog(
          `[workflow] ${t("immersiveReading")} local-first plan blocks=${plan.blocks.length} fallbackTerms=${plan.fallbackTerms.length}`,
          "debug"
        );
        let fallbackTranslations: ReadingFallbackTranslation[] = [];
        if (plan.fallbackTerms.length && profile) {
          try {
            appendOperationLog(
              `[workflow] ${t("immersiveReading")} local-first fallback request terms=${plan.fallbackTerms.length} model=${profile.name}/${profile.model}`,
              "debug"
            );
            await sendProgress(
              18,
              `${t("immersiveReading")} ${plan.fallbackTerms.length}`
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
                    "You are WebMind's local-first immersive-reading term translator. Translate only the supplied terms."
                  ),
                  createMessage(
                    "user",
                    buildReadingFallbackPrompt(plan.fallbackTerms)
                  )
                ]
              }
            );
            fallbackTranslations = parseReadingFallbackTranslations(
              response.text
            );
            appendOperationLog(
              `[workflow] ${t("immersiveReading")} local-first fallback parsed translations=${fallbackTranslations.length}`,
              "debug"
            );
          } catch {
            appendOperationLog(
              `[workflow] ${t("immersiveReading")} local-first fallback failed, continue with local dictionary results`,
              "debug"
            );
            fallbackTranslations = [];
          }
        } else {
          appendOperationLog(
            `[workflow] ${t("immersiveReading")} local-first fallback skipped terms=${plan.fallbackTerms.length}`,
            "debug"
          );
        }
        appendOperationLog(
          `[workflow] ${t("immersiveReading")} local-first finalize replacements`,
          "debug"
        );
        translations = await sendToTab<PageTranslation[]>(activeTab.id!, {
          type: "page.reading.finalize",
          blocks: plan.blocks,
          fallbackTranslations
        });
        appendOperationLog(
          `[workflow] ${t("immersiveReading")} local-first finalized translations=${translations.length}`,
          "debug"
        );
      }
      let completed = appliedDuringProcessing ?? 0;
      if (appliedDuringProcessing === null) {
        translations = orderTranslationsByBlocks(translations, blocks);
        const applied = await sendToTab<{ count: number }>(activeTab.id, {
          type: "page.reading.apply",
          translations,
          mode: currentSettings.immersiveReadingMode,
          backgroundStyle: currentSettings.immersiveReadingBackgroundStyle,
          outerEffects: currentSettings.immersiveReadingOuterTextEffects,
          innerEffects: currentSettings.immersiveReadingInnerTextEffects
        });
        completed = applied.count;
      }
      appendOperationLog(
        `[workflow] ${t("immersiveReading")} applied blocks=${completed}/${translations.length}`,
        "debug"
      );
      setToolStatus(`${t("immersiveReadingApplied")} ${completed}`);
      appendOperationLog(`${t("immersiveReadingApplied")} ${completed}`, "success");
      await sendProgress(
        100,
        `${t("immersiveReadingApplied")} ${completed}`,
        false
      );
    } catch (error) {
      setToolStatus("");
      setNotice(errorMessage(error));
      appendOperationLog(errorMessage(error), "error");
      try {
        await sendProgress(100, errorMessage(error), false, true);
      } catch {
        // Ignore progress rendering failures after the main operation failed.
      }
    }
  };

  const restorePage = async () => {
    if (!activeTab?.id) return;
    try {
      await sendToTab(activeTab.id, { type: "page.translation.restore" });
      setToolStatus(t("translationRemoved"));
      setNotice(t("pageRestored"));
      appendOperationLog(t("pageRestored"), "success");
    } catch (error) {
      setNotice(errorMessage(error));
      appendOperationLog(errorMessage(error), "error");
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
        toolInvocation: tool,
        purpose: "vision"
      });
      if (hideToolsUntilResponse && !started) {
        setChatToolsHiddenDuringRequest(false);
      }
      return;
    }
    if (!options.respectCurrentContext && pageContext) setIncludePage(true);
    setView("chat");
      const started = await sendMessage(toolInstruction(tool, settings ?? undefined), {
        forceIncludePage: !options.respectCurrentContext,
        contextAsInput:
          tool.id === "translate-text" || tool.id === "translate-document",
        dictionaryForShortInput: tool.id === "translate-text",
        modelHistoryOverride,
        toolInvocation: tool,
        purpose: modelPurposeForToolId(tool.id)
    });
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
    setToolDraft({ title: "", description: "", template: "", icon: "Sparkles" });
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

  const ContextIcon = contextIcon(pageContext);
  const contextScope = includePage
    ? contextLabel(pageContext, settings?.interfaceLanguage)
    : uiText(settings?.interfaceLanguage, "noneContext");
  const contextMode = !includePage
    ? "none"
    : pageContext?.kind === "selection"
      ? "selection"
      : pageContext?.kind === "article"
        ? "article"
      : "page";
  const contextOptions = [
    {
      id: "none" as const,
      title: uiText(settings?.interfaceLanguage, "noneContext"),
      icon: Square
    },
    {
      id: "page" as const,
      title: uiText(settings?.interfaceLanguage, "currentPage"),
      icon: Globe2
    },
    {
      id: "article" as const,
      title: uiText(settings?.interfaceLanguage, "currentBody"),
      icon: BookOpen
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
  const messageTools = allTools(customTools, settings ?? undefined).filter(
    (tool) =>
      !["ask-selection", "analyze-image"].includes(
        tool.id
      )
  );
  const translateMessageTool =
    messageTools.find((tool) => tool.id === "translate-text") ?? null;
  const moreMessageTools = messageTools.filter(
    (tool) => tool.id !== "translate-text"
  );
  const streamingMessageId = streamingId
    ? requestMapRef.current.get(streamingId) ?? null
    : null;
  const visibleOperationLogs = operationLogs.filter(
    (entry) =>
      logLevelWeight(entry.level) >=
      logLevelWeight(settings?.logLevel ?? "info")
  );
  const articleQuality =
    pageContext?.kind === "article" ? pageContext.articleQuality : undefined;
  const articlePreview =
    pageContext?.kind === "article" ? pageContext.articlePreview ?? [] : [];
  const articleQualityMetrics = articleQuality
    ? [
        ["textDensity", articleQuality.textDensity],
        ["linkRatio", articleQuality.linkRatio],
        ["visibleArea", articleQuality.visibleArea],
        ["continuity", articleQuality.continuity],
        ["languageConsistency", articleQuality.languageConsistency],
        ["clutterPenalty", articleQuality.clutterPenalty]
      ] as Array<[UiTextKey, number]>
    : [];
  const bodySourceLabel =
    articleQuality?.source === "manual"
      ? t("currentBodySourceManual")
      : articleQuality?.source === "readability"
      ? t("currentBodySourceReadability")
      : articleQuality
        ? t("currentBodySourceDom")
        : "";
  const bodyBlockCount =
    articleQuality?.blockCount ?? articlePreview.length;
  const bodyCharCount =
    articleQuality?.wordCount ?? pageContext?.text?.length ?? 0;

  if (!settings) {
    return <div className="panel-loading">{t("loading")} WebMind…</div>;
  }

  return (
    <div className="panel-shell">
      <header className="panel-header">
        <div className="brand-compact">
          <button
            className="brand-tool-button"
            type="button"
            title={`${t("immersiveTranslation")}: ${selectedContextOption.title}`}
            onClick={() => void runHeaderImmersiveTranslate()}
          >
            <ScanText />
          </button>
          <button
            className="brand-tool-button"
            type="button"
            title={`${t("immersiveReading")}: ${selectedContextOption.title}`}
            onClick={() => void runHeaderImmersiveReading()}
          >
            <BookOpen />
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
                          <Markdown content={message.content} />
                          {streamingMessageId !== message.id && (
                            <div className="message-actions assistant-actions">
                              <button
                                className="message-action-button"
                                type="button"
                                title={t("copyContent")}
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
                                <span>
                                  {copiedMessageId === message.id
                                    ? t("copied")
                                    : t("copyContent")}
                                </span>
                              </button>
                              <button
                                className="message-action-button"
                                type="button"
                                title={t("regenerate")}
                                disabled={Boolean(streamingId)}
                                onClick={() => void rerunAssistant(message.id)}
                              >
                                <RefreshCcw />
                                <span>{t("regenerate")}</span>
                              </button>
                              {translateMessageTool && (
                                <button
                                  className="message-action-button"
                                  type="button"
                                  title={translateMessageTool.description}
                                  disabled={Boolean(streamingId)}
                                  onClick={() =>
                                    void runMessageTool(
                                      translateMessageTool,
                                      message.content
                                    )
                                  }
                                >
                                  <ToolIcon name={translateMessageTool.icon} />
                                  <span>{translateMessageTool.title}</span>
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
                            <p className="user-copy">{message.content}</p>
                          )}
                          <div className="message-actions">
                            <button
                              className="message-action-button"
                              type="button"
                              title={t("copyContent")}
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
                              {copiedMessageId === message.id
                                ? t("copied")
                                : t("copyContent")}
                            </button>
                            <button
                              className="message-action-button"
                              type="button"
                              title={t("edit")}
                              disabled={
                                Boolean(streamingId) || editingMessageSubmitting
                              }
                              onClick={() => editUserMessage(message.id)}
                            >
                              <PenLine />
                              {t("edit")}
                            </button>
                          </div>
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
              <button
                className="icon-button"
                type="button"
                title={t("newChat")}
                onClick={newChat}
              >
                <CirclePlus />
              </button>
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
          {pageContext?.kind === "article" && (
            <details
              className="body-preview"
              open={bodyPreviewExpanded}
              onToggle={(event) =>
                setBodyPreviewExpanded(event.currentTarget.open)
              }
            >
              <summary>
                <BookOpen />
                <span>{t("currentBodyPreview")}</span>
                <span className="body-preview-summary-actions">
                  {articleQuality?.source === "manual" && (
                    <button
                      className="body-preview-action body-restore-button"
                      type="button"
                      disabled={articlePicking}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void restoreCurrentBody();
                      }}
                    >
                      <RefreshCcw />
                      {t("restoreCurrentBody")}
                    </button>
                  )}
                  <button
                    className="body-preview-action"
                    type="button"
                    disabled={articlePicking}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void pickCurrentBodyRange();
                    }}
                  >
                    <TextSelect />
                    {articlePicking
                      ? t("selectingBodyRange")
                      : t("selectCurrentBody")}
                  </button>
                  {articleQuality && (
                    <strong>
                      {t("currentBodyQuality")} {articleQuality.score}
                    </strong>
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
                {bodySourceLabel && <span>{bodySourceLabel}</span>}
                {articleQuality?.selector && (
                  <span title={articleQuality.selector}>
                    {articleQuality.selector}
                  </span>
                )}
              </div>
              {articleQualityMetrics.length > 0 && (
                <div className="body-quality-grid">
                  {articleQualityMetrics.map(([key, value]) => (
                    <span key={key}>
                      {t(key)} {Math.round(value * 100)}%
                    </span>
                  ))}
                </div>
              )}
              {articlePreview.length > 0 && (
                <div className="body-preview-blocks">
                  {articlePreview.map((block) => (
                    <p key={block.id}>{block.text}</p>
                  ))}
                </div>
              )}
            </details>
          )}
          <div className="composer">
            <textarea
              value={composer}
              rows={1}
              placeholder={
                activeProfile
                  ? includePage
                    ? `${contextScope}…`
                    : t("directQuestionPlaceholder")
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
              <label className="field">
                <span className="field-label">{t("icon")}</span>
                <select
                  value={toolDraft.icon}
                  onChange={(event) =>
                    setToolDraft((current) => ({
                      ...current,
                      icon: event.target.value
                    }))
                  }
                >
                  {TOOL_ICON_CHOICES.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">{t("title")}</span>
                <input
                  value={toolDraft.title}
                  onChange={(event) =>
                    setToolDraft((current) => ({
                      ...current,
                      title: event.target.value
                    }))
                  }
                />
              </label>
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
