// src/shared/i18n.ts
var LANGUAGE_LABELS = {
  "zh-CN": "\u7B80\u4F53\u4E2D\u6587",
  "zh-TW": "\u7E41\u9AD4\u4E2D\u6587",
  en: "English",
  ja: "\u65E5\u672C\u8A9E",
  ko: "\uD55C\uAD6D\uC5B4"
};
function resolveLanguage(language, browserLanguage = typeof navigator !== "undefined" ? navigator.language : "zh-CN") {
  if (language && language !== "auto") return language;
  const normalized = browserLanguage.toLowerCase();
  if (normalized.startsWith("zh-tw") || normalized.startsWith("zh-hk")) {
    return "zh-TW";
  }
  if (normalized.startsWith("en")) return "en";
  if (normalized.startsWith("ja")) return "ja";
  if (normalized.startsWith("ko")) return "ko";
  return "zh-CN";
}
var UI_TEXT = {
  "zh-CN": {
    askSelectionTitle: "\u5728\u4FA7\u8FB9\u680F\u63D0\u95EE",
    askSelectionDescription: "\u628A\u5F53\u524D\u5185\u5BB9\u4EA4\u7ED9\u4FA7\u8FB9\u680F\u7EE7\u7EED\u63D0\u95EE",
    copy: "\u590D\u5236",
    more: "\u66F4\u591A",
    webmindAnswer: "WebMind \u56DE\u7B54",
    showTools: "\u663E\u793A WebMind \u5DE5\u5177",
    copySelection: "\u590D\u5236\u6240\u9009\u6587\u672C",
    openSidebar: "\u6253\u5F00\u4FA7\u8FB9\u680F",
    immersiveTranslateApplied: "\u5DF2\u5728\u9875\u9762\u4E2D\u5E94\u7528\u6C89\u6D78\u7FFB\u8BD1\u3002",
    searchAnswerSystem: "\u4F60\u662F WebMind \u641C\u7D22\u56DE\u7B54\u52A9\u624B\u3002\u7528\u6237\u6B63\u5728\u641C\u7D22\u5F15\u64CE\u7ED3\u679C\u9875\u3002\u8BF7\u57FA\u4E8E DuckDuckGo \u8FD4\u56DE\u7684\u7F51\u9875\u641C\u7D22\u7ED3\u679C\u56DE\u7B54\uFF0C\u4F18\u5148\u5F15\u7528\u7ED3\u679C\u4E2D\u7684\u4FE1\u606F\uFF1B\u4FE1\u606F\u4E0D\u8DB3\u65F6\u8BF4\u660E\u4E0D\u8DB3\uFF0C\u4E0D\u8981\u5047\u88C5\u8BBF\u95EE\u4E86\u672A\u63D0\u4F9B\u7684\u7F51\u9875\u3002\u56DE\u7B54\u8981\u7B80\u6D01\u3001\u7ED3\u6784\u6E05\u695A\u3002",
    searchQuery: "\u641C\u7D22\u8BCD",
    duckResults: "DuckDuckGo \u7F51\u9875\u641C\u7D22\u7ED3\u679C",
    duckNoResults: "DuckDuckGo \u7F51\u9875\u641C\u7D22\u7ED3\u679C\uFF1A\u6CA1\u6709\u8FD4\u56DE\u53EF\u7528\u7ED3\u679C\u3002",
    searchAnswerRequest: "\u8BF7\u76F4\u63A5\u56DE\u7B54\u8FD9\u4E2A\u641C\u7D22\u95EE\u9898\uFF0C\u5E76\u5728\u5FC5\u8981\u65F6\u5217\u51FA\u53EF\u7EE7\u7EED\u786E\u8BA4\u7684\u65B9\u5411\u3002",
    sourceCitationInstruction: "\u6BCF\u4E2A\u57FA\u4E8E\u641C\u7D22\u7ED3\u679C\u7684\u6BB5\u843D\u672B\u5C3E\u5FC5\u987B\u7528 [\u641C\u7D22 N] \u6807\u6CE8\u6765\u6E90\u7F16\u53F7\uFF0CN \u5BF9\u5E94\u4E0A\u65B9\u7ED3\u679C\u5E8F\u53F7\u3002\u4E0D\u8981\u5728\u672B\u5C3E\u5217\u6765\u6E90\u5217\u8868\uFF0C\u4E0D\u8981\u8F93\u51FA\u6765\u6E90 URL\u3002",
    browserAssistantSystem: "\u4F60\u662F\u6D4F\u89C8\u5668\u4E2D\u7684\u5199\u4F5C\u4E0E\u9605\u8BFB\u52A9\u624B\u3002\u5FE0\u5B9E\u5904\u7406\u7528\u6237\u63D0\u4F9B\u7684\u6587\u672C\uFF0C\u4E0D\u865A\u6784\u4E0A\u4E0B\u6587\u3002",
    modelToolSystem: "\u4F60\u662F WebMind \u5DE5\u5177\u6267\u884C\u5668\u3002\u76F4\u63A5\u5B8C\u6210\u5DE5\u5177\u6307\u4EE4\uFF0C\u53EA\u8FD4\u56DE\u7528\u6237\u9700\u8981\u7684\u7ED3\u679C\u3002",
    unsupportedQuickAction: "\u4E0D\u652F\u6301\u7684\u5FEB\u6377\u64CD\u4F5C",
    currentContext: "\u5F53\u524D\u4E0A\u4E0B\u6587",
    assistantSystem: "\u4F60\u662F WebMind\uFF0C\u4E00\u4E2A\u5728\u6D4F\u89C8\u5668\u4FA7\u8FB9\u680F\u4E2D\u5DE5\u4F5C\u7684\u7814\u7A76\u3001\u9605\u8BFB\u4E0E\u5199\u4F5C\u52A9\u624B\u3002\u9ED8\u8BA4\u4F7F\u7528\u4E0E\u7528\u6237\u76F8\u540C\u7684\u8BED\u8A00\u56DE\u7B54\u3002",
    assistantGuard: "\u4E25\u683C\u533A\u5206\u4E0A\u4E0B\u6587\u4E2D\u660E\u786E\u7ED9\u51FA\u7684\u4E8B\u5B9E\u548C\u4F60\u7684\u63A8\u65AD\u3002\u4E0A\u4E0B\u6587\u4E0D\u8DB3\u65F6\u76F4\u63A5\u8BF4\u660E\u3002\u4E0D\u8981\u58F0\u79F0\u6D4F\u89C8\u3001\u70B9\u51FB\u6216\u8BFB\u53D6\u4E86\u6CA1\u6709\u63D0\u4F9B\u7ED9\u4F60\u7684\u5185\u5BB9\u3002",
    selectionContextIntro: "\u4EE5\u4E0B\u662F\u7528\u6237\u4E3B\u52A8\u9009\u62E9\u7684\u6587\u672C\u3002\u672C\u8F6E\u64CD\u4F5C\u53EA\u9488\u5BF9\u8FD9\u6BB5\u9009\u4E2D\u5185\u5BB9\uFF0C\u4E0D\u8981\u6269\u5C55\u5230\u9875\u9762\u4E2D\u672A\u63D0\u4F9B\u7684\u90E8\u5206\uFF1A",
    pageContextIntro: "\u4EE5\u4E0B\u662F\u7528\u6237\u4E3B\u52A8\u9644\u5E26\u7684\u6574\u4E2A\u9875\u9762\u4E0A\u4E0B\u6587\uFF1A",
    translationInputIntro: "\u4EE5\u4E0B\u5185\u5BB9\u662F\u672C\u6B21\u5FC5\u987B\u7FFB\u8BD1\u7684\u8F93\u5165\u6B63\u6587\uFF1A",
    title: "\u6807\u9898",
    url: "\u5730\u5740",
    description: "\u8BF4\u660E",
    body: "\u6B63\u6587\uFF1A",
    selectionOnly: "\u56DE\u7B54\u65F6\u5E94\u628A\u201C\u6240\u9009\u6587\u672C\u201D\u4F5C\u4E3A\u552F\u4E00\u9875\u9762\u8D44\u6599\u3002",
    pdfCitation: "\u56DE\u7B54 PDF \u95EE\u9898\u65F6\u5C3D\u91CF\u5F15\u7528\u201C\u7B2C N \u9875\u201D\u3002",
    youtubeCitation: "\u56DE\u7B54\u89C6\u9891\u95EE\u9898\u65F6\u5C3D\u91CF\u5F15\u7528\u5B57\u5E55\u65F6\u95F4\u6233\u3002",
    pageCitation: "\u5F15\u7528\u5F53\u524D\u9875\u9762\u65F6\u53EF\u4F7F\u7528\u201C\u5F53\u524D\u9875\u9762\u201D\u5E76\u70B9\u660E\u76F8\u5173\u6BB5\u843D\u3002",
    searchSummaryIntro: "\u4EE5\u4E0B\u662F\u7F51\u9875\u641C\u7D22\u7ED3\u679C\u6458\u8981\u3002\u56DE\u7B54\u65F6\u7528 [\u641C\u7D22 1]\u3001[\u641C\u7D22 2] \u6807\u6CE8\u4F9D\u636E\uFF0C\u5E76\u5728\u672B\u5C3E\u5217\u51FA\u5B9E\u9645\u4F7F\u7528\u7684\u6765\u6E90\uFF1A",
    noContextImage: "\u8BF7\u5206\u6790\u8FD9\u5F20\u56FE\u7247\u3002",
    noContextAttachment: "\u8BF7\u6839\u636E\u9644\u4EF6\u5185\u5BB9\u56DE\u7B54\u3002",
    attachmentIntro: "\u4EE5\u4E0B\u662F\u7528\u6237\u6DFB\u52A0\u7684\u9644\u4EF6\u5185\u5BB9\uFF1A",
    languageSetting: "\u754C\u9762\u8BED\u8A00",
    languageSettingHelp: "\u5F71\u54CD\u754C\u9762\u6587\u5B57\u3001\u5185\u7F6E\u5DE5\u5177\u540D\u79F0\u548C\u9ED8\u8BA4\u63D0\u793A\u8BCD\u3002",
    translationLanguageSetting: "\u8BD1\u6587\u8BED\u8A00",
    translationLanguageSettingHelp: "\u81EA\u52A8\u65F6\u4F1A\u6839\u636E\u5185\u5BB9\u8BED\u8A00\u5728\u754C\u9762\u8BED\u8A00\u548C\u82F1\u6587\u4E4B\u95F4\u5207\u6362\uFF1B\u624B\u52A8\u9009\u62E9\u5219\u59CB\u7EC8\u7FFB\u8BD1\u4E3A\u6240\u9009\u8BED\u8A00\u3002",
    immersiveTranslationParagraphShortcut: "\u5F53\u524D\u6BB5\u843D\u6C89\u6D78\u7FFB\u8BD1\u5FEB\u6377\u952E",
    immersiveTranslationPageShortcut: "\u5F53\u524D\u9875\u9762\u6C89\u6D78\u7FFB\u8BD1\u5FEB\u6377\u952E",
    immersiveTranslationShortcutHelp: "\u5F53\u524D\u6BB5\u843D\u7528\u4E8E\u9009\u533A\u6216\u6BB5\u843D\u5185\u5BB9\uFF0C\u5F53\u524D\u9875\u9762\u7528\u4E8E\u6574\u9875\u7FFB\u8BD1\u3002",
    shortcutNone: "\u65E0",
    shortcutAlt: "Alt",
    shortcutCtrlAlt: "Ctrl+Alt",
    navChat: "\u5BF9\u8BDD",
    navTools: "\u5DE5\u5177",
    navHistory: "\u5386\u53F2",
    navLogs: "\u65E5\u5FD7",
    operationLogs: "\u64CD\u4F5C\u65E5\u5FD7",
    operationLogsHelp: "\u4EA7\u54C1\u6267\u884C\u7684\u5173\u952E\u64CD\u4F5C\u4F1A\u5B9E\u65F6\u663E\u793A\u5728\u8FD9\u91CC\u3002",
    clearLogs: "\u6E05\u7A7A\u65E5\u5FD7",
    noOperationLogs: "\u6682\u65E0\u65E5\u5FD7",
    logLevelDebug: "\u8C03\u8BD5",
    logLevelInfo: "\u4FE1\u606F",
    logLevelSuccess: "\u6210\u529F",
    logLevelWarning: "\u63D0\u9192",
    logLevelError: "\u9519\u8BEF",
    logSidepanelReady: "\u4FA7\u8FB9\u680F\u5DF2\u51C6\u5907\u5C31\u7EEA",
    logSettingsUpdated: "\u8BBE\u7F6E\u5DF2\u66F4\u65B0",
    logToolsUpdated: "\u5DE5\u5177\u914D\u7F6E\u5DF2\u66F4\u65B0",
    logPendingAction: "\u6536\u5230\u9875\u9762\u64CD\u4F5C",
    logChatStart: "\u5F00\u59CB\u5BF9\u8BDD",
    logChatDone: "\u56DE\u7B54\u5B8C\u6210",
    logChatCancelled: "\u56DE\u7B54\u5DF2\u53D6\u6D88",
    logChatStop: "\u7528\u6237\u505C\u6B62\u56DE\u7B54",
    logChatRegenerate: "\u91CD\u65B0\u56DE\u7B54",
    logToolRun: "\u6267\u884C\u5DE5\u5177",
    logToolSelected: "\u9009\u62E9\u5DE5\u5177",
    logAskSelectionReady: "\u5DF2\u5207\u6362\u5230\u4FA7\u8FB9\u680F\u63D0\u95EE",
    logNewChat: "\u65B0\u5EFA\u5BF9\u8BDD",
    logAttachmentAdded: "\u6DFB\u52A0\u9644\u4EF6",
    logConversationLoaded: "\u8F7D\u5165\u5386\u53F2\u5BF9\u8BDD",
    logEnabled: "\u5DF2\u542F\u7528",
    logDisabled: "\u5DF2\u5173\u95ED",
    logRuntimeRequest: "\u8FD0\u884C\u8BF7\u6C42",
    displayLogLevel: "\u663E\u793A\u65E5\u5FD7\u7EA7\u522B",
    displayLogLevelHelp: "\u65E5\u5FD7\u9762\u677F\u53EA\u663E\u793A\u6240\u9009\u7EA7\u522B\u53CA\u4EE5\u4E0A\u7684\u65E5\u5FD7\uFF1B\u8C03\u8BD5\u7EA7\u522B\u4F1A\u663E\u793A\u6BCF\u6B21\u5927\u6A21\u578B\u8BF7\u6C42\u7684\u8BE6\u7EC6\u8BB0\u5F55\u3002",
    cancel: "\u53D6\u6D88",
    close: "\u5173\u95ED",
    save: "\u4FDD\u5B58",
    saving: "\u4FDD\u5B58\u4E2D",
    add: "\u6DFB\u52A0",
    edit: "\u7F16\u8F91",
    delete: "\u5220\u9664",
    test: "\u6D4B\u8BD5",
    testing: "\u6D4B\u8BD5\u4E2D",
    current: "\u5F53\u524D",
    modelRoles: "\u89D2\u8272",
    defaultModelRole: "\u9ED8\u8BA4",
    translationModelRole: "\u7FFB\u8BD1",
    visionModelRole: "\u89C6\u89C9",
    setDefaultModelRole: "\u8BBE\u4E3A\u9ED8\u8BA4\u6A21\u578B",
    setTranslationModelRole: "\u8BBE\u4E3A\u7FFB\u8BD1\u6A21\u578B",
    clearTranslationModelRole: "\u53D6\u6D88\u7FFB\u8BD1\u6A21\u578B",
    setVisionModelRole: "\u8BBE\u4E3A\u89C6\u89C9\u6A21\u578B",
    clearVisionModelRole: "\u53D6\u6D88\u89C6\u89C9\u6A21\u578B",
    visionModelRoleUnavailable: "\u8BE5\u5F15\u64CE\u672A\u542F\u7528\u56FE\u7247\u8BC6\u522B\uFF0C\u4E0D\u80FD\u8BBE\u4E3A\u89C6\u89C9\u6A21\u578B",
    settings: "\u8BBE\u7F6E",
    loading: "\u52A0\u8F7D\u4E2D",
    newChat: "\u65B0\u5BF9\u8BDD",
    send: "\u53D1\u9001",
    stop: "\u505C\u6B62",
    restorePage: "\u8FD8\u539F\u9875\u9762",
    chooseModel: "\u9009\u62E9\u6A21\u578B",
    currentModelEngine: "\u5F53\u524D\u6A21\u578B\u5F15\u64CE",
    selectTool: "\u9009\u62E9\u5DE5\u5177",
    selectMoreTools: "\u9009\u62E9\u66F4\u591A\u5DE5\u5177",
    moreTools: "\u66F4\u591A\u5DE5\u5177",
    copyContent: "\u590D\u5236\u5185\u5BB9",
    copyUrl: "\u590D\u5236\u7F51\u9875 URL",
    copied: "\u5DF2\u590D\u5236",
    regenerate: "\u91CD\u65B0\u56DE\u7B54",
    continueExecution: "\u7EE7\u7EED\u6267\u884C",
    replace: "\u66FF\u6362",
    closeNotice: "\u5173\u95ED\u63D0\u793A",
    removeAttachment: "\u79FB\u9664\u9644\u4EF6",
    openTools: "\u6253\u5F00\u5DE5\u5177",
    currentPage: "\u5F53\u524D\u9875\u9762",
    selectedContent: "\u9009\u4E2D\u5185\u5BB9",
    noneContext: "\u65E0\u4E0A\u4E0B\u6587",
    webSearch: "\u7F51\u9875\u641C\u7D22",
    addAttachment: "\u6DFB\u52A0\u56FE\u7247\u6216\u6587\u6863",
    addUrl: "\u6DFB\u52A0 URL",
    you: "\u4F60",
    ordinaryConversation: "\u666E\u901A\u5BF9\u8BDD",
    usedTool: "\u4F7F\u7528\u5DE5\u5177",
    questionContext: "\u63D0\u95EE\u4E0A\u4E0B\u6587",
    imageChat: "\u56FE\u7247\u5BF9\u8BDD",
    openAnyPage: "\u6253\u5F00\u4EFB\u610F\u7F51\u9875\uFF0C\u7136\u540E\u4ECE\u8FD9\u91CC\u5F00\u59CB\u3002",
    noEnabledTools: "\u8FD9\u4E2A\u4F4D\u7F6E\u8FD8\u6CA1\u6709\u542F\u7528\u5DE5\u5177",
    toolsPageShowsAll: "\u5DE5\u5177\u9875\u4F1A\u663E\u793A\u5168\u90E8\u53EF\u7528\u5DE5\u5177\u3002",
    noSavedConversations: "\u8FD8\u6CA1\u6709\u4FDD\u5B58\u7684\u5BF9\u8BDD",
    conversationsAutoSave: "\u5B8C\u6210\u4E00\u6B21\u95EE\u7B54\u540E\u4F1A\u81EA\u52A8\u4FDD\u5B58\u5728\u672C\u5730\u3002",
    languageOptionAuto: "\u81EA\u52A8",
    languageOptionZhCN: "\u7B80\u4F53\u4E2D\u6587",
    languageOptionZhTW: "\u7E41\u9AD4\u4E2D\u6587",
    languageOptionEn: "\u82F1\u8BED",
    languageOptionJa: "\u65E5\u8BED",
    languageOptionKo: "\u97E9\u8BED",
    appSubtitle: "\u672C\u5730\u4F18\u5148\u7684\u6D4F\u89C8\u5668\u6A21\u578B\u5DE5\u4F5C\u53F0",
    modelEngines: "\u6A21\u578B\u5F15\u64CE",
    modelEnginesDescription: "\u4E0D\u9700\u8981\u8D26\u53F7\u6216\u8BA2\u9605\u3002\u9ED8\u8BA4\u3001\u7FFB\u8BD1\u548C\u89C6\u89C9\u6807\u8BB0\u5206\u522B\u53EA\u80FD\u7ED1\u5B9A\u4E00\u4E2A\u6A21\u578B\uFF0C\u540C\u4E00\u4E2A\u6A21\u578B\u53EF\u4EE5\u540C\u65F6\u62E5\u6709\u591A\u4E2A\u6807\u8BB0\u3002\u7FFB\u8BD1\u548C\u89C6\u89C9\u4EFB\u52A1\u672A\u6307\u5B9A\u4E13\u9879\u6A21\u578B\u65F6\u4F1A\u4F7F\u7528\u9ED8\u8BA4\u6A21\u578B\u3002\u5F15\u64CE\u914D\u7F6E\u4E0E\u5BC6\u94A5\u4FDD\u5B58\u5728\u6269\u5C55\u5B58\u50A8\u4E2D\u3002",
    addEngine: "\u6DFB\u52A0\u5F15\u64CE",
    noModelEngines: "\u8FD8\u6CA1\u6709\u6A21\u578B\u5F15\u64CE",
    noModelEnginesHelp: "\u6DFB\u52A0\u5E38\u89C1\u4E91\u7AEF\u6A21\u578B\u3001OpenAI \u517C\u5BB9\u63A5\u53E3\u6216\u672C\u5730 Ollama\u3002",
    pageFeatures: "\u9875\u9762\u529F\u80FD",
    pageFeaturesHelp: "\u6BCF\u4E2A\u6A21\u5757\u7684\u8BBE\u7F6E\u72EC\u7ACB\u6536\u7EB3\uFF0C\u4FBF\u4E8E\u786E\u8BA4\u5F71\u54CD\u8303\u56F4\u3002",
    selectionOverlay: "\u5212\u8BCD\u6D6E\u5C42",
    selectionOverlayHelp: "\u63A7\u5236\u9009\u62E9\u6587\u5B57\u540E\u7684\u60AC\u6D6E\u5DE5\u5177\u680F\u3002",
    selectionOverlayMode: "\u89E6\u53D1\u65B9\u5F0F",
    selectionOverlayMinChars: "\u6700\u5C11\u9009\u4E2D\u5B57\u7B26\u6570",
    selectionOverlayMinCharsHelp: "\u9009\u4E2D\u6587\u5B57\u8FBE\u5230\u8BE5\u5B57\u7B26\u6570\u65F6\u624D\u89E6\u53D1\u5212\u8BCD\u6D6E\u5C42\uFF0C\u6700\u4F4E\u4E3A 1\u3002",
    selectionOverlayOff: "\u5173\u95ED\u5212\u8BCD\u6D6E\u5C42",
    selectionOverlayOffHelp: "\u9009\u62E9\u6587\u5B57\u540E\u4E0D\u663E\u793A\u4EFB\u4F55\u5FEB\u6377\u5165\u53E3\u3002",
    selectionOverlayAlways: "\u76F4\u63A5\u663E\u793A\u5DE5\u5177\u680F",
    selectionOverlayAlwaysHelp: "\u9009\u62E9\u6587\u5B57\u540E\u7ACB\u5373\u663E\u793A\u53EF\u7528\u5DE5\u5177\u3002",
    selectionOverlayHover: "\u5148\u663E\u793A\u6D6E\u70B9",
    selectionOverlayHoverHelp: "\u9009\u62E9\u6587\u5B57\u540E\u663E\u793A\u5C0F\u5706\u70B9\uFF0C\u60AC\u505C\u540E\u5C55\u5F00\u5DE5\u5177\u680F\u3002",
    urlBlacklist: "\u7F51\u5740\u9ED1\u540D\u5355",
    selectionOverlayBlacklistHelp: "\u6BCF\u884C\u4E00\u6761\u89C4\u5219\uFF1B\u652F\u6301\u57DF\u540D\u3001\u901A\u914D\u7B26\u548C URL \u7247\u6BB5\u3002",
    edgeQuickTools: "\u5FEB\u6377\u5DE5\u5177",
    edgeQuickToolsHelp: "\u7EDF\u4E00\u63A7\u5236\u8D34\u8FB9\u83DC\u5355\u3001\u56FE\u6587\u63D0\u53D6\u548C\u81EA\u52A8\u56DE\u590D\u3002",
    edgeDockMenu: "\u8D34\u8FB9\u83DC\u5355",
    edgeQuickToolsEnable: "\u542F\u7528\u8D34\u8FB9\u83DC\u5355",
    edgeQuickToolsEnableHelp: "\u5173\u95ED\u540E\u7F51\u9875\u53F3\u4FA7\u4E0D\u4F1A\u663E\u793A\u8D34\u8FB9\u83DC\u5355\u3002",
    edgeQuickToolsBlacklistHelp: "\u547D\u4E2D\u540E\u9875\u9762\u53F3\u4FA7\u5FEB\u6377\u5DE5\u5177\u4E0D\u4F1A\u663E\u793A\u3002",
    quickToolsBlacklistHelp: "\u547D\u4E2D\u540E\u8D34\u8FB9\u83DC\u5355\u3001\u56FE\u6587\u63D0\u53D6\u548C\u81EA\u52A8\u56DE\u590D\u90FD\u4E0D\u4F1A\u5728\u9875\u9762\u4E2D\u751F\u6548\u3002",
    immersiveTranslation: "\u6C89\u6D78\u7FFB\u8BD1",
    immersiveTranslationHelp: "\u63A7\u5236\u8BD1\u6587\u5199\u56DE\u9875\u9762\u540E\u7684\u5448\u73B0\u65B9\u5F0F\u3002",
    immersiveTranslationAutoWhitelist: "\u81EA\u52A8\u6C89\u6D78\u7FFB\u8BD1\u767D\u540D\u5355",
    immersiveTranslationAutoWhitelistHelp: "\u6BCF\u884C\u4E00\u6761\u89C4\u5219\uFF1B\u652F\u6301\u57DF\u540D\u3001\u901A\u914D\u7B26\u548C URL \u7247\u6BB5\u3002\u9875\u9762\u6253\u5F00\u5E76\u547D\u4E2D\u540E\u4F1A\u81EA\u52A8\u8FDB\u884C\u6C89\u6D78\u7FFB\u8BD1\u3002",
    immersiveReading: "\u6C89\u6D78\u9605\u8BFB",
    immersiveReadingHelp: "\u628A\u9875\u9762\u4E2D\u7B26\u5408\u96BE\u5EA6\u7684\u8BCD\u8BED\u66FF\u6362\u4E3A\u5B66\u4E60\u8BED\u8A00\uFF0C\u5F62\u6210\u6BCD\u8BED\u4E0E\u975E\u6BCD\u8BED\u6DF7\u5408\u9605\u8BFB\u3002",
    immersiveReadingStrategy: "\u6267\u884C\u65B9\u6848",
    immersiveReadingStrategyLocalFirst: "\u672C\u5730\u4F18\u5148",
    immersiveReadingStrategyLocalFirstHelp: "\u4F18\u5148\u4F7F\u7528\u672C\u5730\u8BCD\u8868\u7B5B\u9009\u548C\u79BB\u7EBF\u8BCD\u5178\u7FFB\u8BD1\uFF0C\u901F\u5EA6\u66F4\u5FEB\u3001\u6D88\u8017\u66F4\u4F4E\uFF1B\u672C\u5730\u6CA1\u6709\u53EF\u7528\u91CA\u4E49\u65F6\u624D\u5C11\u91CF\u8C03\u7528\u5927\u6A21\u578B\u515C\u5E95\u3002",
    immersiveReadingStrategyModelPage: "\u6A21\u578B\u4F18\u5148",
    immersiveReadingStrategyModelPageHelp: "\u5C06\u9875\u9762\u5185\u5BB9\u4EA4\u7ED9\u5927\u6A21\u578B\u7ED3\u5408\u4E0A\u4E0B\u6587\u7B5B\u9009\u548C\u7FFB\u8BD1\uFF0C\u6548\u679C\u66F4\u7075\u6D3B\uFF0C\u4F46\u901F\u5EA6\u548C\u8D39\u7528\u53D6\u51B3\u4E8E\u6A21\u578B\u3002",
    immersiveReadingAutoWhitelist: "\u81EA\u52A8\u6C89\u6D78\u9605\u8BFB\u767D\u540D\u5355",
    immersiveReadingAutoWhitelistHelp: "\u6BCF\u884C\u4E00\u6761\u89C4\u5219\uFF1B\u652F\u6301\u57DF\u540D\u3001\u901A\u914D\u7B26\u548C URL \u7247\u6BB5\u3002\u9875\u9762\u6253\u5F00\u5E76\u547D\u4E2D\u540E\u4F1A\u81EA\u52A8\u8FDB\u884C\u6C89\u6D78\u9605\u8BFB\u3002",
    immersiveReadingDifficulty: "\u8BCD\u8BED\u96BE\u5EA6",
    immersiveReadingDifficultyHelp: "\u96BE\u5EA6\u8D8A\u9AD8\uFF0C\u6A21\u578B\u8D8A\u503E\u5411\u4E8E\u66FF\u6362\u66F4\u5C11\u3001\u66F4\u96BE\u7684\u8BCD\u8BED\u3002",
    immersiveReadingMode: "\u66FF\u6362\u6A21\u5F0F",
    immersiveReadingTranslation: "\u8BD1\u6587",
    immersiveReadingOriginalTranslation: "\u539F\u6587\uFF08\u8BD1\u6587\uFF09",
    immersiveReadingTranslationOriginal: "\u8BD1\u6587\uFF08\u539F\u6587\uFF09",
    immersiveReadingOuterEffects: "\u62EC\u53F7\u5916\u6587\u5B57\u6548\u679C",
    immersiveReadingInnerEffects: "\u62EC\u53F7\u53CA\u62EC\u53F7\u4E2D\u6587\u5B57\u6548\u679C",
    immersiveReadingApplied: "\u6C89\u6D78\u9605\u8BFB\u5DF2\u5E94\u7528",
    displayMode: "\u663E\u793A\u6A21\u5F0F",
    translationOnly: "\u4EC5\u663E\u793A\u8BD1\u6587",
    bilingual: "\u539F\u6587 + \u8BD1\u6587",
    translationStyle: "\u8BD1\u6587\u6837\u5F0F",
    translationStyleDefault: "\u9ED8\u8BA4",
    translationStyleHighlight: "\u9AD8\u4EAE",
    translationStyleDivider: "\u5206\u5272\u7EBF",
    translationStyleQuote: "\u5F15\u7528",
    translationStyleBlur: "\u6A21\u7CCA",
    translationStyleTransparent: "\u900F\u660E",
    textEffects: "\u6587\u5B57\u6548\u679C",
    underline: "\u4E0B\u5B9E\u7EBF",
    dashedUnderline: "\u4E0B\u865A\u7EBF",
    largeText: "\u5927\u5B57\u53F7",
    smallText: "\u5C0F\u5B57\u53F7",
    bold: "\u52A0\u7C97",
    italic: "\u659C\u4F53",
    light: "\u5F31\u5316",
    emphasis: "\u5F3A\u8C03",
    generalConfig: "\u901A\u7528\u914D\u7F6E",
    generalConfigHelp: "\u63A7\u5236\u641C\u7D22\u9875\u589E\u5F3A\u3001\u9ED8\u8BA4\u4E0A\u4E0B\u6587\u548C\u5916\u89C2\u3002",
    appearanceTheme: "\u5916\u89C2\u4E3B\u9898",
    themeSystem: "\u8DDF\u968F\u7CFB\u7EDF",
    themeLight: "\u6D45\u8272",
    themeDark: "\u6DF1\u8272",
    autoScrollDuringStreaming: "\u8F93\u51FA\u65F6\u81EA\u52A8\u6EDA\u52A8",
    autoScrollDuringStreamingHelp: "\u5927\u6A21\u578B\u8F93\u51FA\u8FC7\u7A0B\u4E2D\uFF0C\u4FA7\u8FB9\u680F\u81EA\u52A8\u8DDF\u968F\u6700\u65B0\u5185\u5BB9\u6EDA\u52A8\u3002",
    autoReply: "\u81EA\u52A8\u56DE\u590D",
    autoReplyOff: "\u4E0D\u542F\u7528",
    autoReplyMultiline: "\u4EC5\u591A\u884C\u6587\u672C\u6846\u542F\u7528",
    autoReplyAll: "\u6240\u6709\u6587\u672C\u6846\u542F\u7528",
    autoReplyHelp: "\u5728\u53EF\u7F16\u8F91\u6587\u672C\u6846\u53F3\u4E0A\u89D2\u663E\u793A\u5C0F\u56FE\u6807\uFF0C\u70B9\u51FB\u540E\u53C2\u8003\u5F53\u524D\u9875\u9762\u751F\u6210\u7B80\u77ED\u56DE\u590D\u3002",
    autoReplyBlacklistHelp: "\u547D\u4E2D\u540E\u7F51\u9875\u8F93\u5165\u6846\u4E0D\u4F1A\u663E\u793A\u81EA\u52A8\u56DE\u590D\u5165\u53E3\u3002",
    imageTextExtraction: "\u56FE\u6587\u63D0\u53D6",
    imageTextExtractionHelp: "\u9F20\u6807\u60AC\u505C\u56FE\u7247\u540E\u663E\u793A\u6587\u5B57\u63D0\u53D6\u5165\u53E3\u3002",
    imageTextExtractionOff: "\u4E0D\u542F\u7528",
    imageTextExtractionOn: "\u6309\u5C3A\u5BF8\u542F\u7528",
    imageTextExtractionMinSize: "\u6700\u5C0F\u56FE\u7247\u5C3A\u5BF8",
    imageTextExtractionMinSizeHelp: "\u4EC5\u5F53\u56FE\u7247\u663E\u793A\u5BBD\u5EA6\u548C\u9AD8\u5EA6\u90FD\u4E0D\u5C0F\u4E8E\u8BE5\u50CF\u7D20\u503C\u65F6\u663E\u793A\u5165\u53E3\u3002",
    imageTextExtractionBlacklistHelp: "\u547D\u4E2D\u540E\u7F51\u9875\u56FE\u7247\u4E0D\u4F1A\u663E\u793A\u56FE\u6587\u63D0\u53D6\u5165\u53E3\u3002",
    hoverDefinition: "\u60AC\u505C\u91CA\u4E49",
    hoverDefinitionHelp: "\u9F20\u6807\u505C\u7559\u5728\u4E2D\u6587\u8BCD\u8BED\u6216\u82F1\u6587\u5355\u8BCD\u4E0A\u65F6\uFF0C\u4F7F\u7528\u5185\u7F6E\u7684\u79BB\u7EBF\u8BCD\u5178\uFF0C\u4EE5\u5355\u884C\u63D0\u793A\u663E\u793A\u7B80\u660E\u91CA\u4E49\u3002",
    hoverDefinitionOff: "\u4E0D\u542F\u7528",
    hoverDefinitionChinese: "\u4EC5\u4E2D\u6587",
    hoverDefinitionEnglish: "\u4EC5\u82F1\u6587",
    hoverDefinitionBoth: "\u4E2D\u82F1\u6587",
    hoverDefinitionShortcut: "\u60AC\u505C\u53D6\u8BCD\u5FEB\u6377\u952E",
    hoverDefinitionShortcutHelp: "\u542F\u7528\u540E\uFF0C\u53EA\u6709\u6309\u4F4F Ctrl \u5E76\u60AC\u505C\u5728\u8BCD\u8BED\u4E0A\u65F6\u624D\u663E\u793A\u91CA\u4E49\uFF1B\u6309\u4F4F Alt \u6216 Shift \u65F6\u4E0D\u4F1A\u89E6\u53D1\uFF0C\u4EE5\u907F\u5F00\u6C89\u6D78\u7FFB\u8BD1\u3002",
    hoverDefinitionShortcutOff: "\u4E0D\u4F7F\u7528\u5FEB\u6377\u952E",
    hoverDefinitionShortcutCtrl: "\u6309\u4F4F Ctrl",
    hoverDefinitionBlacklistHelp: "\u547D\u4E2D\u540E\u9875\u9762\u4E2D\u4E0D\u4F1A\u663E\u793A\u60AC\u505C\u91CA\u4E49\u3002",
    searchAnswerSetting: "\u641C\u7D22\u9875\u663E\u793A\u6A21\u578B\u56DE\u7B54",
    searchAnswerSettingHelp: "\u5F00\u542F\u540E\u5728\u641C\u7D22\u7ED3\u679C\u9875\u53F3\u4FA7\u81EA\u52A8\u56DE\u7B54\uFF0C\u5E76\u4F7F\u7528 DuckDuckGo \u641C\u7D22\u7ED3\u679C\u4F5C\u4E3A\u53C2\u8003\u3002",
    includePageByDefault: "\u9ED8\u8BA4\u9644\u5E26\u5F53\u524D\u9875\u9762",
    includePageByDefaultHelp: "\u53D1\u9001\u524D\u4ECD\u53EF\u5728\u8F93\u5165\u533A\u5173\u95ED\u9875\u9762\u4E0A\u4E0B\u6587\u3002",
    webSearchByDefault: "\u5BF9\u8BDD\u9ED8\u8BA4\u542F\u7528\u7F51\u9875\u641C\u7D22",
    webSearchByDefaultHelp: "\u4FA7\u8FB9\u680F\u666E\u901A\u5BF9\u8BDD\u9ED8\u8BA4\u4F7F\u7528 DuckDuckGo \u7ED3\u679C\u8865\u5145\u95EE\u9898\u3002",
    historyLimit: "\u6700\u591A\u4FDD\u5B58\u5BF9\u8BDD",
    modelThinkingTimeout: "\u5927\u6A21\u578B\u601D\u8003\u8D85\u65F6\u65F6\u95F4\uFF08\u79D2\uFF09",
    modelThinkingTimeoutHelp: "0 \u8868\u793A\u4E0D\u8D85\u65F6\uFF1B\u8D85\u65F6\u540E\u4F1A\u4E2D\u65AD\u5F53\u524D\u56DE\u7B54\uFF0C\u5E76\u5728\u56DE\u7B54\u4E2D\u8BF4\u660E\u8D85\u65F6\u3002",
    toolEnable: "\u5DE5\u5177\u542F\u7528",
    toolEnableHelp: "\u6BCF\u4E2A\u5165\u53E3\u9009\u62E9\u54EA\u4E9B\u5DE5\u5177\uFF0C\u4EE5\u53CA\u8FD9\u4E9B\u5DE5\u5177\u7684\u663E\u793A\u987A\u5E8F\u3002",
    toolSurfaceSelection: "\u5212\u8BCD\u6D6E\u5C42",
    toolSurfaceSelectionHelp: "\u7F51\u9875\u4E0A\u9009\u62E9\u6587\u5B57\u540E\u51FA\u73B0\u7684\u5FEB\u6377\u5DE5\u5177\u3002",
    toolSurfaceHome: "\u4FA7\u8FB9\u680F\u4F4D",
    toolSurfaceHomeHelp: "\u4FA7\u8FB9\u680F\u7A7A\u5BF9\u8BDD\u9996\u9875\u7684\u5FEB\u6377\u5165\u53E3\u3002",
    toolSurfaceEdge: "\u5FEB\u6377\u5DE5\u5177",
    toolSurfaceEdgeHelp: "\u9875\u9762\u53F3\u4FA7\u8D34\u8FB9\u5C55\u5F00\u7684\u5FEB\u6377\u5165\u53E3\u3002",
    noToolsEnabled: "\u672A\u542F\u7528\u5DE5\u5177",
    chooseTools: "\u9009\u62E9\u5DE5\u5177",
    chooseToolsHelp: "\u52FE\u9009\u987A\u5E8F\u5C31\u662F\u663E\u793A\u987A\u5E8F\uFF0C\u53EF\u7528\u7BAD\u5934\u5FAE\u8C03\u3002",
    builtinTool: "\u5185\u7F6E\u5DE5\u5177",
    customTool: "\u81EA\u5B9A\u4E49\u5DE5\u5177",
    moveUp: "\u4E0A\u79FB",
    moveDown: "\u4E0B\u79FB",
    dataSync: "\u6570\u636E\u540C\u6B65",
    dataSyncHelp: "\u5BFC\u51FA\u6587\u4EF6\u548C Chrome \u8D26\u53F7\u540C\u6B65\u90FD\u4E0D\u4F1A\u5305\u542B API \u5BC6\u94A5\u3002",
    chromeAccountSync: "Chrome \u8D26\u53F7\u540C\u6B65",
    autoSyncNonSensitive: "\u81EA\u52A8\u540C\u6B65\u975E\u654F\u611F\u8BBE\u7F6E",
    autoSyncNonSensitiveHelp: "\u5F00\u542F\u540E\u4F1A\u628A\u8BBE\u7F6E\u3001\u6A21\u578B\u5F15\u64CE\u4FE1\u606F\u548C\u81EA\u5B9A\u4E49\u5DE5\u5177\u540C\u6B65\u5230 Chrome \u8D26\u53F7\uFF1BAPI \u5BC6\u94A5\u548C\u5BF9\u8BDD\u5386\u53F2\u4E0D\u4F1A\u540C\u6B65\u3002",
    syncToChrome: "\u540C\u6B65\u5230 Chrome \u8D26\u53F7",
    syncFromChrome: "\u4ECE Chrome \u8D26\u53F7\u540C\u6B65",
    syncing: "\u540C\u6B65\u4E2D",
    syncSecretNote: "\u5982\u679C\u540C\u6B65\u540E\u7684\u6A21\u578B\u5F15\u64CE\u7F3A\u5C11\u5BC6\u94A5\uFF0C\u8BF7\u5728\u672C\u673A\u91CD\u65B0\u586B\u5199\u3002",
    exportSettings: "\u5BFC\u51FA\u8BBE\u7F6E",
    importSettings: "\u5BFC\u5165\u8BBE\u7F6E",
    clearConversationHistory: "\u6E05\u7A7A\u5BF9\u8BDD\u5386\u53F2",
    providerEditorAria: "\u6A21\u578B\u5F15\u64CE\u8BBE\u7F6E",
    newEngine: "\u65B0\u5F15\u64CE",
    providerKind: "\u63A5\u53E3\u7C7B\u578B",
    providerKindOpenAICompatible: "OpenAI \u517C\u5BB9",
    providerKindAnthropic: "Anthropic",
    providerKindGemini: "Gemini",
    providerKindOllama: "Ollama",
    providerName: "\u663E\u793A\u540D\u79F0",
    providerNamePlaceholder: "\u4F8B\u5982\uFF1A\u516C\u53F8\u5185\u7F51\u6A21\u578B",
    providerBaseUrl: "\u63A5\u53E3\u5730\u5740",
    providerBaseUrlHelp: "\u4FDD\u5B58\u65F6\u4F1A\u6309\u8FD9\u4E2A\u57DF\u540D\u7533\u8BF7\u7F51\u7EDC\u8BBF\u95EE\u6743\u9650\u3002",
    providerModel: "\u6A21\u578B ID",
    providerModelPlaceholder: "\u7531\u4F60\u7684\u670D\u52A1\u5546\u63D0\u4F9B",
    providerModelHelp: "\u53EF\u624B\u52A8\u8F93\u5165\uFF0C\u4E5F\u53EF\u70B9\u51FB\u53F3\u4FA7\u6309\u94AE\u4ECE\u5F53\u524D\u63A5\u53E3\u83B7\u53D6\u3002",
    fetchModels: "\u83B7\u53D6\u6A21\u578B\u5217\u8868",
    providerApiKey: "API \u5BC6\u94A5",
    providerApiKeyPlaceholder: "\u4EC5\u4FDD\u5B58\u5728\u8FD9\u53F0\u8BBE\u5907\u7684\u6269\u5C55\u5B58\u50A8\u4E2D",
    providerSecretStorage: "\u5BC6\u94A5\u4FDD\u5B58\u65B9\u5F0F",
    providerSecretLocal: "\u6301\u4E45\u4FDD\u5B58",
    providerSecretSession: "\u4EC5\u672C\u6B21\u4F1A\u8BDD",
    providerTemperature: "\u6E29\u5EA6",
    providerMaxTokens: "\u6700\u5927\u8F93\u51FA Token",
    providerMaxContext: "\u6700\u5927\u4E0A\u4E0B\u6587\u5B57\u6570",
    providerSupportsVision: "\u652F\u6301\u56FE\u7247\u8F93\u5165",
    providerSupportsVisionHelp: "\u6A21\u578B\u4E0D\u652F\u6301\u89C6\u89C9\u65F6\u8BF7\u5173\u95ED",
    providerCustomHeaders: "\u81EA\u5B9A\u4E49\u8BF7\u6C42\u5934",
    providerCustomHeadersHelp: "\u53EF\u9009\uFF0C\u4F7F\u7528 JSON \u5BF9\u8C61\u683C\u5F0F\uFF1B\u540C\u540D\u5B57\u6BB5\u4F1A\u8986\u76D6\u9ED8\u8BA4\u8BF7\u6C42\u5934\u3002",
    saveEngine: "\u4FDD\u5B58\u5F15\u64CE",
    providerSaved: "\u6A21\u578B\u5F15\u64CE\u5DF2\u4FDD\u5B58",
    providerDeleted: "\u6A21\u578B\u5F15\u64CE\u5DF2\u5220\u9664",
    providerNameRequired: "\u8BF7\u586B\u5199\u5F15\u64CE\u540D\u79F0",
    providerBaseUrlRequired: "\u8BF7\u586B\u5199\u63A5\u53E3\u5730\u5740",
    providerModelRequired: "\u8BF7\u586B\u5199\u6A21\u578B ID",
    duckPermissionRequired: "\u9700\u8981\u5141\u8BB8 DuckDuckGo \u641C\u7D22\u57DF\u540D\u6743\u9650",
    settingsSyncedToChrome: "\u8BBE\u7F6E\u5DF2\u540C\u6B65\u5230 Chrome \u8D26\u53F7\uFF0C\u5BC6\u94A5\u672A\u540C\u6B65",
    settingsSyncedFromChrome: "\u5DF2\u4ECE Chrome \u8D26\u53F7\u540C\u6B65\u8BBE\u7F6E\uFF0C\u6A21\u578B\u5BC6\u94A5\u4ECD\u4EE5\u672C\u673A\u4FDD\u5B58\u4E3A\u51C6",
    chromeSyncEnabled: "\u5DF2\u542F\u7528 Chrome \u8D26\u53F7\u540C\u6B65\uFF0C\u5BC6\u94A5\u4E0D\u4F1A\u540C\u6B65",
    chromeSyncDisabled: "\u5DF2\u5173\u95ED Chrome \u8D26\u53F7\u540C\u6B65",
    settingsExported: "\u8BBE\u7F6E\u5DF2\u5BFC\u51FA\uFF0C\u5BC6\u94A5\u672A\u5305\u542B\u5728\u6587\u4EF6\u4E2D",
    invalidSettingsFile: "\u4E0D\u662F\u6709\u6548\u7684 WebMind \u8BBE\u7F6E\u6587\u4EF6",
    settingsImported: "\u8BBE\u7F6E\u5DF2\u5BFC\u5165\uFF0C\u8BF7\u91CD\u65B0\u586B\u5199\u5404\u5F15\u64CE\u5BC6\u94A5",
    localHistoryCleared: "\u672C\u5730\u5BF9\u8BDD\u5386\u53F2\u5DF2\u6E05\u7A7A",
    processCurrentContent: "\u5904\u7406\u5F53\u524D\u5185\u5BB9",
    localRecords: "\u672C\u5730\u8BB0\u5F55",
    addTool: "\u6DFB\u52A0\u5DE5\u5177",
    saveChanges: "\u4FDD\u5B58\u4FEE\u6539",
    saveTool: "\u4FDD\u5B58\u5DE5\u5177",
    custom: "\u81EA\u5B9A\u4E49",
    icon: "\u56FE\u6807",
    toolPrompt: "\u63D0\u793A\u8BCD",
    mainNav: "\u4E3B\u5BFC\u822A",
    connectEngineBannerTitle: "\u5148\u8FDE\u63A5\u4E00\u4E2A\u6A21\u578B\u5F15\u64CE",
    connectEngineBannerDescription: "\u652F\u6301\u5E38\u89C1\u4E91\u7AEF\u6A21\u578B\u3001OpenAI \u517C\u5BB9\u63A5\u53E3\u548C\u672C\u5730 Ollama\u3002",
    pageRecognized: "\u5DF2\u8BC6\u522B",
    enterAttachmentUrl: "\u8F93\u5165\u8981\u4F5C\u4E3A\u9644\u4EF6\u6DFB\u52A0\u7684 URL",
    modelEngineRequired: "\u8BF7\u5148\u6DFB\u52A0\u5E76\u9009\u62E9\u4E00\u4E2A\u6A21\u578B\u5F15\u64CE",
    needPdfPermission: "\u9700\u8981\u7F51\u9875\u6743\u9650\u624D\u80FD\u8BFB\u53D6\u8FD9\u4E2A PDF",
    noReadableTab: "\u6CA1\u6709\u53EF\u8BFB\u53D6\u7684\u5F53\u524D\u6807\u7B7E\u9875",
    switchingToCurrentPage: "\u6B63\u5728\u5207\u6362\u5230\u5F53\u524D\u9875\u9762\u2026",
    readingSelection: "\u6B63\u5728\u8BFB\u53D6\u9009\u4E2D\u5185\u5BB9\u2026",
    noSelectionOnPage: "\u5F53\u524D\u9875\u9762\u6CA1\u6709\u53EF\u5207\u6362\u7684\u9009\u4E2D\u5185\u5BB9",
    searchPermissionRequired: "\u9700\u8981\u641C\u7D22\u57DF\u540D\u6743\u9650\u624D\u80FD\u8865\u5145\u7F51\u9875\u7ED3\u679C",
    searchingWeb: "\u6B63\u5728\u641C\u7D22\u7F51\u9875\u2026",
    previewDemoAnswer: "\u8FD9\u662F\u9884\u89C8\u6A21\u5F0F\u4E0B\u7684\u793A\u4F8B\u56DE\u7B54\u3002\u52A0\u8F7D\u4E3A Chrome \u6269\u5C55\u5E76\u914D\u7F6E\u6A21\u578B\u5F15\u64CE\u540E\uFF0C\u8FD9\u91CC\u4F1A\u663E\u793A\u771F\u5B9E\u7684\u6D41\u5F0F\u8F93\u51FA\u3002\n\n- \u9875\u9762\u4E0A\u4E0B\u6587\u53EF\u968F\u65F6\u5F00\u5173\n- \u652F\u6301\u7528\u6237\u81EA\u5E26\u6A21\u578B\u548C\u5BC6\u94A5\n- \u5386\u53F2\u8BB0\u5F55\u53EA\u4FDD\u5B58\u5728\u672C\u5730",
    currentAnswer: "\u5F53\u524D\u56DE\u7B54",
    collectingSelection: "\u6B63\u5728\u6536\u96C6\u9009\u4E2D\u5185\u5BB9\u2026",
    collectingTranslatableText: "\u6B63\u5728\u6536\u96C6\u53EF\u7FFB\u8BD1\u6587\u672C\u2026",
    collectingPageBody: "\u6B63\u5728\u6536\u96C6\u6B63\u6587\u2026",
    noTranslatableBlocks: "\u5F53\u524D\u9875\u9762\u6CA1\u6709\u53EF\u7FFB\u8BD1\u7684\u6B63\u6587\u5757",
    translatingPageProgress: "\u6B63\u5728\u7FFB\u8BD1\u9875\u9762",
    translatingShort: "\u7FFB\u8BD1\u4E2D",
    translationWritten: "\u5DF2\u5199\u5165",
    translationComplete: "\u5B8C\u6210",
    translationApplied: "\u5DF2\u5728\u9875\u9762\u4E2D\u52A0\u5165",
    translationRemoved: "\u5DF2\u79FB\u9664\u9875\u9762\u8BD1\u6587",
    pageRestored: "\u5DF2\u8FD8\u539F\u9875\u9762",
    addImageBeforeAnalyze: "\u8BF7\u5148\u6DFB\u52A0\u4E00\u5F20\u56FE\u7247\uFF0C\u518D\u6267\u884C\u56FE\u7247\u5206\u6790\u5DE5\u5177",
    toolNeedsPrompt: "\u5DE5\u5177\u9700\u8981\u6807\u9898\u548C\u63D0\u793A\u8BCD",
    chooseContextFirst: "\u8BF7\u5148\u5728\u4E0A\u4E0B\u6587\u4E2D\u9009\u62E9\u5F53\u524D\u9875\u9762\u6216\u9009\u4E2D\u5185\u5BB9",
    directQuestionPlaceholder: "\u76F4\u63A5\u63D0\u95EE\u2026",
    askContextPlaceholder: "\u5411\u5F53\u524D\u9875\u9762\u63D0\u95EE\u2026",
    addEngineFirst: "\u5148\u5728\u8BBE\u7F6E\u4E2D\u6DFB\u52A0\u6A21\u578B\u5F15\u64CE",
    copyFailed: "\u590D\u5236\u5931\u8D25",
    readingPdf: "\u6B63\u5728\u8BFB\u53D6 PDF",
    needSearchDomainPermission: "\u9700\u8981\u641C\u7D22\u57DF\u540D\u6743\u9650\u624D\u80FD\u8865\u5145\u7F51\u9875\u7ED3\u679C",
    profileVisionDisabled: "\u201C{name}\u201D\u672A\u542F\u7528\u56FE\u7247\u8F93\u5165\u80FD\u529B",
    promptImageAnalysis: "\u8BF7\u5206\u6790\u8FD9\u5F20\u56FE\u7247\uFF0C\u63CF\u8FF0\u91CD\u8981\u7EC6\u8282\u5E76\u56DE\u7B54\u6211\u63A5\u4E0B\u6765\u7684\u95EE\u9898\u3002",
    promptSummarizeSelection: "\u8BF7\u603B\u7ED3\u6240\u9009\u6587\u672C\uFF0C\u4FDD\u7559\u5173\u952E\u4E8B\u5B9E\u3001\u6570\u5B57\u548C\u7ED3\u8BBA\u3002",
    promptExplainSelection: "\u8BF7\u7528\u901A\u4FD7\u8BED\u8A00\u89E3\u91CA\u6240\u9009\u6587\u672C\u3002",
    promptAutoTranslateSelection: "\u8BF7\u81EA\u52A8\u7FFB\u8BD1\u6240\u9009\u6587\u672C\uFF1A\u4E2D\u6587\u5360\u4E3B\u5BFC\u65F6\u8BD1\u6210\u81EA\u7136\u82F1\u6587\uFF0C\u975E\u4E2D\u6587\u5360\u4E3B\u5BFC\u65F6\u8BD1\u6210\u7B80\u4F53\u4E2D\u6587\u3002",
    promptRewriteSelection: "\u8BF7\u91CD\u5199\u6240\u9009\u6587\u672C\uFF0C\u4F7F\u5176\u66F4\u6E05\u695A\u3001\u81EA\u7136\u548C\u4E13\u4E1A\u3002",
    promptReplySelection: "\u8BF7\u6839\u636E\u6240\u9009\u6587\u672C\u8D77\u8349\u4E00\u4EFD\u53EF\u76F4\u63A5\u53D1\u9001\u7684\u56DE\u590D\u3002",
    modelRequestFailed: "\u6A21\u578B\u8BF7\u6C42\u5931\u8D25",
    savedConversations: "\u4FDD\u5B58\u7684\u5BF9\u8BDD",
    runtimeUnavailable: "\u9884\u89C8\u6A21\u5F0F\u4E0B\u65E0\u6CD5\u8C03\u7528\u6269\u5C55\u540E\u53F0",
    backgroundNoResponse: "\u6269\u5C55\u540E\u53F0\u6CA1\u6709\u54CD\u5E94",
    currentPageUnavailable: "\u5F53\u524D\u9875\u9762\u4E0D\u53EF\u8BBF\u95EE",
    noActiveTab: "\u6CA1\u6709\u6D3B\u52A8\u6807\u7B7E\u9875",
    previewPageTitle: "WebMind \u4EA7\u54C1\u7814\u7A76\u793A\u4F8B",
    previewPageDescription: "\u4E00\u7BC7\u7528\u4E8E\u754C\u9762\u9884\u89C8\u7684\u793A\u4F8B\u6587\u7AE0",
    previewPageBody: "\u6D4F\u89C8\u5668\u52A9\u624B\u53EF\u4EE5\u5229\u7528\u5F53\u524D\u9875\u9762\u4F5C\u4E3A\u4E0A\u4E0B\u6587\uFF0C\u5E2E\u52A9\u7528\u6237\u603B\u7ED3\u3001\u7FFB\u8BD1\u3001\u89E3\u91CA\u548C\u8D77\u8349\u56DE\u590D\u3002WebMind \u5141\u8BB8\u7528\u6237\u914D\u7F6E\u81EA\u5DF1\u7684\u6A21\u578B\u670D\u52A1\uFF0C\u800C\u4E0D\u662F\u7ED1\u5B9A\u5230\u5355\u4E00\u8D26\u53F7\u4F53\u7CFB\u3002",
    contentTruncated: "\u5185\u5BB9\u5DF2\u622A\u65AD",
    customHeadersJsonObject: "\u81EA\u5B9A\u4E49\u8BF7\u6C42\u5934\u5FC5\u987B\u662F JSON \u5BF9\u8C61",
    jsonArrayMissing: "\u6A21\u578B\u672A\u8FD4\u56DE\u53EF\u89E3\u6790\u7684 JSON \u6570\u7EC4",
    jsonArrayInvalid: "\u6A21\u578B\u8FD4\u56DE\u683C\u5F0F\u4E0D\u662F\u6570\u7EC4",
    invalidImageData: "\u56FE\u7247\u6570\u636E\u683C\u5F0F\u65E0\u6548",
    customToolFallback: "\u81EA\u5B9A\u4E49\u5DE5\u5177",
    chromeSyncInvalidData: "Chrome \u8D26\u53F7\u4E2D\u7684 WebMind \u540C\u6B65\u6570\u636E\u65E0\u6548",
    chromeSyncNoData: "Chrome \u8D26\u53F7\u4E2D\u8FD8\u6CA1\u6709 WebMind \u540C\u6B65\u6570\u636E",
    webSearchFailed: "\u7F51\u9875\u641C\u7D22\u5931\u8D25",
    webSearchNoResults: "\u6CA1\u6709\u89E3\u6790\u5230\u7F51\u9875\u641C\u7D22\u7ED3\u679C",
    searchResultSnippet: "\u6458\u8981",
    searchSourceMarker: "\u641C\u7D22",
    selectionDescription: "\u5DF2\u9009\u62E9 {count} \u4E2A\u5B57\u7B26",
    readFileFailed: "\u65E0\u6CD5\u8BFB\u53D6\u6587\u4EF6",
    readDocumentFailed: "\u65E0\u6CD5\u8BFB\u53D6\u6587\u6863",
    readImageUrlFailed: "\u65E0\u6CD5\u8BFB\u53D6\u56FE\u7247",
    readUrlFailed: "\u65E0\u6CD5\u8BFB\u53D6 URL",
    unknownFileType: "\u672A\u77E5",
    sizeLabel: "\u5927\u5C0F",
    bytes: "\u5B57\u8282",
    unsupportedDocumentText: "\u8FD9\u4E2A\u6587\u4EF6\u683C\u5F0F\u6682\u4E0D\u80FD\u5728\u6D4F\u89C8\u5668\u5185\u76F4\u63A5\u63D0\u53D6\u6B63\u6587\u3002",
    documentName: "\u6587\u6863\u540D\u79F0",
    pdfDocument: "PDF \u6587\u6863",
    attachmentLabel: "\u9644\u4EF6",
    documentAttachment: "\u6587\u6863",
    addressLabel: "\u5730\u5740",
    typeLabel: "\u7C7B\u578B",
    contentLabel: "\u5185\u5BB9",
    noExtractedText: "\u672A\u80FD\u63D0\u53D6\u6B63\u6587",
    jsonArrayTranslationInstruction: "\u8F93\u5165\u662F JSON \u6570\u7EC4\uFF0C\u6BCF\u4E00\u9879\u90FD\u6709 id \u548C text\u3002\u8BF7\u7FFB\u8BD1\u6BCF\u4E00\u9879\u7684 text\u3002",
    citationPlaceholderInstruction: "\u5F62\u5982 {{WEBMIND_CITATION_1}} \u7684\u5185\u5BB9\u662F\u4E0D\u53EF\u7FFB\u8BD1\u7684\u5F15\u6587\u5360\u4F4D\u7B26\u3002\u8BD1\u6587\u5FC5\u987B\u9010\u5B57\u4FDD\u7559\u6BCF\u4E00\u4E2A\u5360\u4F4D\u7B26\u5E76\u653E\u5728\u5BF9\u5E94\u8BED\u4E49\u4F4D\u7F6E\uFF0C\u4E0D\u8981\u5C55\u5F00\u3001\u89E3\u91CA\u3001\u6539\u5199\u3001\u79FB\u52A8\u5230\u672B\u5C3E\u6216\u5220\u9664\u3002",
    translationOutputOnlyInstruction: "\u53EA\u8F93\u51FA <translation-input> \u4E2D\u539F\u6587\u7684\u8BD1\u6587\uFF1B\u4E0D\u8981\u8F93\u51FA\u672C\u63D0\u793A\u8BCD\u3001\u89C4\u5219\u3001\u6807\u7B7E\u540D\u6216 <translation-input> \u6807\u7B7E\u3002",
    jsonArrayReturnInstruction: '\u53EA\u8FD4\u56DE JSON \u6570\u7EC4\uFF0C\u4E0D\u8981\u4EE3\u7801\u56F4\u680F\u3002\u6570\u7EC4\u5143\u7D20\u683C\u5F0F\u4E3A {"id":"\u539F id","text":"\u8BD1\u6587"}\u3002',
    translationWriteFailed: "\u8BD1\u6587\u5DF2\u751F\u6210\uFF0C\u4F46\u672A\u80FD\u5199\u5165\u539F\u9875\u9762\uFF0C\u8BF7\u91CD\u8BD5",
    originalSelectedContent: "\u539F\u59CB\u9009\u4E2D\u5185\u5BB9",
    previousResult: "\u4E0A\u4E00\u6B21\u7ED3\u679C",
    continueToolInstruction: "\u8BF7\u57FA\u4E8E\u4E0A\u4E00\u6B21\u7ED3\u679C\u7EE7\u7EED\u6267\u884C\u6240\u9009\u5DE5\u5177\u3002",
    selectionAssistantSystem: "\u4F60\u662F\u6D4F\u89C8\u5668\u5212\u8BCD\u52A9\u624B\u3002\u53EA\u6839\u636E\u7528\u6237\u63D0\u4F9B\u7684\u9009\u4E2D\u5185\u5BB9\u548C\u5DF2\u6709\u7ED3\u679C\u56DE\u7B54\uFF0C\u4E0D\u8981\u865A\u6784\u9875\u9762\u4E2D\u672A\u63D0\u4F9B\u7684\u4FE1\u606F\u3002",
    userQuestionLabel: "\u7528\u6237\u95EE\u9898",
    currentResultLabel: "\u5F53\u524D\u7ED3\u679C",
    researchSearchPrefix: "\u8BF7\u7814\u7A76\u8FD9\u4E2A\u641C\u7D22\u95EE\u9898",
    openSidebarOpening: "\u6B63\u5728\u6253\u5F00\u4FA7\u8FB9\u680F\u2026",
    openSidebarOpened: "\u4FA7\u8FB9\u680F\u5DF2\u6253\u5F00\u3002",
    readCurrentPage: "\u6B63\u5728\u8BFB\u53D6\u5F53\u524D\u9875\u9762\u2026",
    noProcessablePageBody: "\u5F53\u524D\u9875\u9762\u6CA1\u6709\u53EF\u5904\u7406\u7684\u6B63\u6587",
    executingTool: "\u6B63\u5728\u6267\u884C\u5DE5\u5177\u2026",
    closeQuickTools: "\u5173\u95ED\u5FEB\u6377\u5DE5\u5177",
    generateShortAutoReply: "\u751F\u6210\u7B80\u77ED\u81EA\u52A8\u56DE\u590D",
    extractImageText: "\u63D0\u53D6\u56FE\u7247\u6587\u5B57",
    extractingImageText: "\u6B63\u5728\u63D0\u53D6\u56FE\u7247\u6587\u5B57\u2026",
    imageTextExtractionResult: "\u56FE\u6587\u63D0\u53D6",
    imageTextExtractionPrompt: "\u8BF7\u63D0\u53D6\u8FD9\u5F20\u56FE\u7247\u4E2D\u6240\u6709\u53EF\u89C1\u6587\u5B57\u3002\u4FDD\u6301\u539F\u6587\u8BED\u8A00\uFF0C\u4E0D\u8981\u7FFB\u8BD1\uFF1B\u5C3D\u91CF\u4FDD\u7559\u6362\u884C\u3001\u9605\u8BFB\u987A\u5E8F\u3001\u5217\u8868\u548C\u8868\u683C\u7ED3\u6784\u3002\u53EA\u8F93\u51FA\u63D0\u53D6\u5230\u7684\u6587\u5B57\uFF0C\u4E0D\u8981\u89E3\u91CA\u3002",
    noImageTextFound: "\u672A\u8BC6\u522B\u5230\u53EF\u7528\u6587\u5B57",
    retryAnswer: "\u91CD\u65B0\u56DE\u7B54",
    chooseTool: "\u9009\u62E9\u5DE5\u5177",
    rerunExecution: "\u91CD\u65B0\u6267\u884C",
    reextractImageText: "\u91CD\u65B0\u63D0\u53D6",
    runSelectedTool: "\u6267\u884C\u5DE5\u5177",
    continueQuestionPlaceholder: "\u7EE7\u7EED\u63D0\u95EE\u2026",
    modelNoUsableReply: "\u6A21\u578B\u6CA1\u6709\u8FD4\u56DE\u53EF\u7528\u56DE\u590D",
    autoReplySystem: "\u4F60\u662F WebMind \u7684\u7F51\u9875\u81EA\u52A8\u56DE\u590D\u52A9\u624B\u3002\n\u6839\u636E\u5F53\u524D\u9875\u9762\u5185\u5BB9\u3001\u5BF9\u8BDD\u4E0A\u4E0B\u6587\u548C\u8F93\u5165\u6846\u5DF2\u6709\u8349\u7A3F\uFF0C\u751F\u6210\u53EF\u76F4\u63A5\u586B\u5165\u8F93\u5165\u6846\u7684\u7B80\u77ED\u56DE\u590D\u3002\n\u4F18\u5148\u53C2\u8003\u9875\u9762\u4E2D\u5DF2\u6709\u7684\u56DE\u590D\u3001\u8BC4\u8BBA\u3001\u90AE\u4EF6\u6216\u804A\u5929\u5185\u5BB9\u3002\n\u53EA\u8F93\u51FA\u56DE\u590D\u6B63\u6587\uFF0C\u4E0D\u8981\u89E3\u91CA\uFF0C\u4E0D\u8981\u52A0\u6807\u9898\uFF0C\u4E0D\u8981\u4F7F\u7528 Markdown\u3002",
    autoReplyPageTitle: "\u9875\u9762\u6807\u9898",
    autoReplyPageUrl: "\u9875\u9762\u5730\u5740",
    autoReplyPageDescription: "\u9875\u9762\u8BF4\u660E",
    autoReplyPageContent: "\u5F53\u524D\u9875\u9762\u5185\u5BB9",
    autoReplyDraft: "\u8F93\u5165\u6846\u5DF2\u6709\u5185\u5BB9\u6216\u8349\u7A3F",
    autoReplyEmpty: "\u8F93\u5165\u6846\u76EE\u524D\u4E3A\u7A7A\u3002",
    autoReplyRequest: "\u8BF7\u751F\u6210 1-3 \u53E5\u81EA\u7136\u3001\u793C\u8C8C\u3001\u5177\u4F53\u4F46\u7B80\u77ED\u7684\u56DE\u590D\u3002\u8BED\u8A00\u5E94\u5339\u914D\u9875\u9762\u5BF9\u8BDD\u6216\u8F93\u5165\u6846\u8349\u7A3F\u3002",
    contextMenuAsk: "\u5728 WebMind \u4E2D\u63D0\u95EE",
    contextMenuSummarize: "\u603B\u7ED3\u6240\u9009\u5185\u5BB9",
    contextMenuExplain: "\u89E3\u91CA\u6240\u9009\u5185\u5BB9",
    contextMenuTranslate: "\u7FFB\u8BD1\u6240\u9009\u5185\u5BB9",
    contextMenuRewrite: "\u6539\u5199\u6240\u9009\u5185\u5BB9",
    contextMenuReply: "\u8D77\u8349\u56DE\u590D",
    contextMenuAnalyzeImage: "\u5206\u6790\u8FD9\u5F20\u56FE\u7247",
    cannotDetermineTab: "\u65E0\u6CD5\u786E\u5B9A\u5F53\u524D\u6807\u7B7E\u9875",
    provideSearchQuery: "\u8BF7\u63D0\u4F9B\u641C\u7D22\u5185\u5BB9",
    toolNotFound: "\u627E\u4E0D\u5230\u8FD9\u4E2A\u5DE5\u5177",
    youtubeVideoNotFound: "\u9875\u9762\u4E2D\u6CA1\u6709\u627E\u5230\u89C6\u9891\u64AD\u653E\u5668",
    videoInfoNotFound: "\u672A\u5728\u9875\u9762\u4E2D\u627E\u5230\u89C6\u9891\u4FE1\u606F",
    noCaptionsAvailable: "\u8FD9\u4E2A\u89C6\u9891\u6CA1\u6709\u53EF\u7528\u5B57\u5E55",
    captionsReadFailed: "\u65E0\u6CD5\u8BFB\u53D6\u5B57\u5E55",
    captionsLabel: "\u5B57\u5E55",
    youtubeVideoTitle: "YouTube \u89C6\u9891",
    apiKeyMissing: "\u201C{name}\u201D\u5C1A\u672A\u586B\u5199 API \u5BC6\u94A5",
    responseStreamMissing: "\u6A21\u578B\u63A5\u53E3\u672A\u8FD4\u56DE\u54CD\u5E94\u6D41",
    providerErrorStatus: "\u6A21\u578B\u63A5\u53E3\u8FD4\u56DE {status}: {detail}",
    requestCancelled: "\u8BF7\u6C42\u5DF2\u53D6\u6D88",
    modelThinkingTimeoutMessage: "\u5927\u6A21\u578B\u601D\u8003\u8D85\u65F6\uFF0C\u56DE\u7B54\u5DF2\u4E2D\u65AD\u3002"
  },
  "zh-TW": {
    askSelectionTitle: "\u5728\u5074\u908A\u6B04\u63D0\u554F",
    askSelectionDescription: "\u628A\u76EE\u524D\u5167\u5BB9\u4EA4\u7D66\u5074\u908A\u6B04\u7E7C\u7E8C\u63D0\u554F",
    copy: "\u8907\u88FD",
    more: "\u66F4\u591A",
    webmindAnswer: "WebMind \u56DE\u7B54",
    showTools: "\u986F\u793A WebMind \u5DE5\u5177",
    copySelection: "\u8907\u88FD\u6240\u9078\u6587\u5B57",
    openSidebar: "\u958B\u555F\u5074\u908A\u6B04",
    immersiveTranslateApplied: "\u5DF2\u5728\u9801\u9762\u4E2D\u5957\u7528\u6C89\u6D78\u7FFB\u8B6F\u3002",
    searchAnswerSystem: "\u4F60\u662F WebMind \u641C\u5C0B\u56DE\u7B54\u52A9\u624B\u3002\u4F7F\u7528\u8005\u6B63\u5728\u641C\u5C0B\u5F15\u64CE\u7D50\u679C\u9801\u3002\u8ACB\u57FA\u65BC DuckDuckGo \u8FD4\u56DE\u7684\u7DB2\u9801\u641C\u5C0B\u7D50\u679C\u56DE\u7B54\uFF0C\u512A\u5148\u5F15\u7528\u7D50\u679C\u4E2D\u7684\u8CC7\u8A0A\uFF1B\u8CC7\u8A0A\u4E0D\u8DB3\u6642\u8AAA\u660E\u4E0D\u8DB3\uFF0C\u4E0D\u8981\u5047\u88DD\u5B58\u53D6\u4E86\u672A\u63D0\u4F9B\u7684\u7DB2\u9801\u3002\u56DE\u7B54\u8981\u7C21\u6F54\u3001\u7D50\u69CB\u6E05\u695A\u3002",
    searchQuery: "\u641C\u5C0B\u8A5E",
    duckResults: "DuckDuckGo \u7DB2\u9801\u641C\u5C0B\u7D50\u679C",
    duckNoResults: "DuckDuckGo \u7DB2\u9801\u641C\u5C0B\u7D50\u679C\uFF1A\u6C92\u6709\u8FD4\u56DE\u53EF\u7528\u7D50\u679C\u3002",
    searchAnswerRequest: "\u8ACB\u76F4\u63A5\u56DE\u7B54\u9019\u500B\u641C\u5C0B\u554F\u984C\uFF0C\u5FC5\u8981\u6642\u5217\u51FA\u53EF\u7E7C\u7E8C\u78BA\u8A8D\u7684\u65B9\u5411\u3002",
    sourceCitationInstruction: "\u6BCF\u500B\u57FA\u65BC\u641C\u5C0B\u7D50\u679C\u7684\u6BB5\u843D\u672B\u5C3E\u5FC5\u9808\u7528 [\u641C\u5C0B N] \u6A19\u8A3B\u4F86\u6E90\u7DE8\u865F\uFF0CN \u5C0D\u61C9\u4E0A\u65B9\u7D50\u679C\u5E8F\u865F\u3002\u4E0D\u8981\u5728\u672B\u5C3E\u5217\u4F86\u6E90\u6E05\u55AE\uFF0C\u4E0D\u8981\u8F38\u51FA\u4F86\u6E90 URL\u3002",
    browserAssistantSystem: "\u4F60\u662F\u700F\u89BD\u5668\u4E2D\u7684\u5BEB\u4F5C\u8207\u95B1\u8B80\u52A9\u624B\u3002\u5FE0\u5BE6\u8655\u7406\u4F7F\u7528\u8005\u63D0\u4F9B\u7684\u6587\u5B57\uFF0C\u4E0D\u865B\u69CB\u4E0A\u4E0B\u6587\u3002",
    modelToolSystem: "\u4F60\u662F WebMind \u5DE5\u5177\u57F7\u884C\u5668\u3002\u76F4\u63A5\u5B8C\u6210\u5DE5\u5177\u6307\u4EE4\uFF0C\u53EA\u8FD4\u56DE\u4F7F\u7528\u8005\u9700\u8981\u7684\u7D50\u679C\u3002",
    unsupportedQuickAction: "\u4E0D\u652F\u63F4\u7684\u5FEB\u6377\u64CD\u4F5C",
    currentContext: "\u76EE\u524D\u4E0A\u4E0B\u6587",
    assistantSystem: "\u4F60\u662F WebMind\uFF0C\u4E00\u500B\u5728\u700F\u89BD\u5668\u5074\u908A\u6B04\u4E2D\u5DE5\u4F5C\u7684\u7814\u7A76\u3001\u95B1\u8B80\u8207\u5BEB\u4F5C\u52A9\u624B\u3002\u9810\u8A2D\u4F7F\u7528\u8207\u4F7F\u7528\u8005\u76F8\u540C\u7684\u8A9E\u8A00\u56DE\u7B54\u3002",
    assistantGuard: "\u56B4\u683C\u5340\u5206\u4E0A\u4E0B\u6587\u4E2D\u660E\u78BA\u7D66\u51FA\u7684\u4E8B\u5BE6\u548C\u4F60\u7684\u63A8\u65B7\u3002\u4E0A\u4E0B\u6587\u4E0D\u8DB3\u6642\u76F4\u63A5\u8AAA\u660E\u3002\u4E0D\u8981\u8072\u7A31\u700F\u89BD\u3001\u9EDE\u64CA\u6216\u8B80\u53D6\u4E86\u6C92\u6709\u63D0\u4F9B\u7D66\u4F60\u7684\u5167\u5BB9\u3002",
    selectionContextIntro: "\u4EE5\u4E0B\u662F\u4F7F\u7528\u8005\u4E3B\u52D5\u9078\u53D6\u7684\u6587\u5B57\u3002\u672C\u8F2A\u64CD\u4F5C\u53EA\u91DD\u5C0D\u9019\u6BB5\u9078\u53D6\u5167\u5BB9\uFF0C\u4E0D\u8981\u64F4\u5C55\u5230\u9801\u9762\u4E2D\u672A\u63D0\u4F9B\u7684\u90E8\u5206\uFF1A",
    pageContextIntro: "\u4EE5\u4E0B\u662F\u4F7F\u7528\u8005\u4E3B\u52D5\u9644\u5E36\u7684\u6574\u500B\u9801\u9762\u4E0A\u4E0B\u6587\uFF1A",
    translationInputIntro: "\u4EE5\u4E0B\u5167\u5BB9\u662F\u672C\u6B21\u5FC5\u9808\u7FFB\u8B6F\u7684\u8F38\u5165\u6B63\u6587\uFF1A",
    title: "\u6A19\u984C",
    url: "\u5730\u5740",
    description: "\u8AAA\u660E",
    body: "\u6B63\u6587\uFF1A",
    selectionOnly: "\u56DE\u7B54\u6642\u61C9\u628A\u300C\u6240\u9078\u6587\u5B57\u300D\u4F5C\u70BA\u552F\u4E00\u9801\u9762\u8CC7\u6599\u3002",
    pdfCitation: "\u56DE\u7B54 PDF \u554F\u984C\u6642\u76E1\u91CF\u5F15\u7528\u300C\u7B2C N \u9801\u300D\u3002",
    youtubeCitation: "\u56DE\u7B54\u5F71\u7247\u554F\u984C\u6642\u76E1\u91CF\u5F15\u7528\u5B57\u5E55\u6642\u9593\u6233\u3002",
    pageCitation: "\u5F15\u7528\u76EE\u524D\u9801\u9762\u6642\u53EF\u4F7F\u7528\u300C\u76EE\u524D\u9801\u9762\u300D\u4E26\u9EDE\u660E\u76F8\u95DC\u6BB5\u843D\u3002",
    searchSummaryIntro: "\u4EE5\u4E0B\u662F\u7DB2\u9801\u641C\u5C0B\u7D50\u679C\u6458\u8981\u3002\u56DE\u7B54\u6642\u7528 [\u641C\u5C0B 1]\u3001[\u641C\u5C0B 2] \u6A19\u8A3B\u4F9D\u64DA\uFF0C\u4E26\u5728\u672B\u5C3E\u5217\u51FA\u5BE6\u969B\u4F7F\u7528\u7684\u4F86\u6E90\uFF1A",
    noContextImage: "\u8ACB\u5206\u6790\u9019\u5F35\u5716\u7247\u3002",
    noContextAttachment: "\u8ACB\u6839\u64DA\u9644\u4EF6\u5167\u5BB9\u56DE\u7B54\u3002",
    attachmentIntro: "\u4EE5\u4E0B\u662F\u4F7F\u7528\u8005\u65B0\u589E\u7684\u9644\u4EF6\u5167\u5BB9\uFF1A",
    languageSetting: "\u4ECB\u9762\u8A9E\u8A00",
    languageSettingHelp: "\u5F71\u97FF\u4ECB\u9762\u6587\u5B57\u3001\u5167\u5EFA\u5DE5\u5177\u540D\u7A31\u548C\u9810\u8A2D\u63D0\u793A\u8A5E\u3002",
    translationLanguageSetting: "\u8B6F\u6587\u8A9E\u8A00",
    translationLanguageSettingHelp: "\u81EA\u52D5\u6642\u6703\u5728\u4ECB\u9762\u8A9E\u8A00\u548C\u82F1\u6587\u4E4B\u9593\u5207\u63DB\uFF1B\u624B\u52D5\u9078\u64C7\u5247\u59CB\u7D42\u7FFB\u8B6F\u70BA\u6240\u9078\u8A9E\u8A00\u3002",
    immersiveTranslationParagraphShortcut: "\u76EE\u524D\u6BB5\u843D\u6C89\u6D78\u7FFB\u8B6F\u5FEB\u6377\u9375",
    immersiveTranslationPageShortcut: "\u76EE\u524D\u9801\u9762\u6C89\u6D78\u7FFB\u8B6F\u5FEB\u6377\u9375",
    immersiveTranslationShortcutHelp: "\u76EE\u524D\u6BB5\u843D\u7528\u65BC\u9078\u53D6\u5167\u5BB9\u6216\u6BB5\u843D\u5167\u5BB9\uFF0C\u9801\u9762\u7528\u65BC\u6574\u9801\u7FFB\u8B6F\u3002",
    shortcutNone: "\u7121",
    shortcutAlt: "Alt",
    shortcutCtrlAlt: "Ctrl+Alt",
    navChat: "\u5C0D\u8A71",
    navTools: "\u5DE5\u5177",
    navHistory: "\u6B77\u53F2",
    navLogs: "\u65E5\u8A8C",
    operationLogs: "\u64CD\u4F5C\u65E5\u8A8C",
    operationLogsHelp: "\u7522\u54C1\u57F7\u884C\u7684\u95DC\u9375\u64CD\u4F5C\u6703\u5373\u6642\u986F\u793A\u5728\u9019\u88E1\u3002",
    clearLogs: "\u6E05\u7A7A\u65E5\u8A8C",
    noOperationLogs: "\u66AB\u7121\u65E5\u8A8C",
    logLevelDebug: "\u9664\u932F",
    logLevelInfo: "\u8CC7\u8A0A",
    logLevelSuccess: "\u6210\u529F",
    logLevelWarning: "\u63D0\u9192",
    logLevelError: "\u932F\u8AA4",
    logSidepanelReady: "\u5074\u908A\u6B04\u5DF2\u6E96\u5099\u5C31\u7DD2",
    logSettingsUpdated: "\u8A2D\u5B9A\u5DF2\u66F4\u65B0",
    logToolsUpdated: "\u5DE5\u5177\u8A2D\u5B9A\u5DF2\u66F4\u65B0",
    logPendingAction: "\u6536\u5230\u9801\u9762\u64CD\u4F5C",
    logChatStart: "\u958B\u59CB\u5C0D\u8A71",
    logChatDone: "\u56DE\u7B54\u5B8C\u6210",
    logChatCancelled: "\u56DE\u7B54\u5DF2\u53D6\u6D88",
    logChatStop: "\u4F7F\u7528\u8005\u505C\u6B62\u56DE\u7B54",
    logChatRegenerate: "\u91CD\u65B0\u56DE\u7B54",
    logToolRun: "\u57F7\u884C\u5DE5\u5177",
    logToolSelected: "\u9078\u64C7\u5DE5\u5177",
    logAskSelectionReady: "\u5DF2\u5207\u63DB\u5230\u5074\u908A\u6B04\u63D0\u554F",
    logNewChat: "\u65B0\u589E\u5C0D\u8A71",
    logAttachmentAdded: "\u65B0\u589E\u9644\u4EF6",
    logConversationLoaded: "\u8F09\u5165\u6B77\u53F2\u5C0D\u8A71",
    logEnabled: "\u5DF2\u555F\u7528",
    logDisabled: "\u5DF2\u95DC\u9589",
    logRuntimeRequest: "\u57F7\u884C\u8ACB\u6C42",
    displayLogLevel: "\u986F\u793A\u65E5\u8A8C\u7D1A\u5225",
    displayLogLevelHelp: "\u65E5\u8A8C\u9762\u677F\u53EA\u986F\u793A\u6240\u9078\u7D1A\u5225\u53CA\u4EE5\u4E0A\u7684\u65E5\u8A8C\uFF1B\u9664\u932F\u7D1A\u5225\u6703\u986F\u793A\u6BCF\u6B21\u6A21\u578B\u8ACB\u6C42\u7684\u8A73\u7D30\u8A18\u9304\u3002",
    cancel: "\u53D6\u6D88",
    close: "\u95DC\u9589",
    save: "\u5132\u5B58",
    saving: "\u5132\u5B58\u4E2D",
    add: "\u65B0\u589E",
    edit: "\u7DE8\u8F2F",
    delete: "\u522A\u9664",
    test: "\u6E2C\u8A66",
    testing: "\u6E2C\u8A66\u4E2D",
    current: "\u76EE\u524D",
    modelRoles: "\u89D2\u8272",
    defaultModelRole: "\u9810\u8A2D",
    translationModelRole: "\u7FFB\u8B6F",
    visionModelRole: "\u8996\u89BA",
    setDefaultModelRole: "\u8A2D\u70BA\u9810\u8A2D\u6A21\u578B",
    setTranslationModelRole: "\u8A2D\u70BA\u7FFB\u8B6F\u6A21\u578B",
    clearTranslationModelRole: "\u53D6\u6D88\u7FFB\u8B6F\u6A21\u578B",
    setVisionModelRole: "\u8A2D\u70BA\u8996\u89BA\u6A21\u578B",
    clearVisionModelRole: "\u53D6\u6D88\u8996\u89BA\u6A21\u578B",
    visionModelRoleUnavailable: "\u6B64\u5F15\u64CE\u672A\u555F\u7528\u5716\u7247\u8FA8\u8B58\uFF0C\u4E0D\u80FD\u8A2D\u70BA\u8996\u89BA\u6A21\u578B",
    settings: "\u8A2D\u5B9A",
    loading: "\u8F09\u5165\u4E2D",
    newChat: "\u65B0\u5C0D\u8A71",
    send: "\u9001\u51FA",
    stop: "\u505C\u6B62",
    restorePage: "\u9084\u539F\u9801\u9762",
    chooseModel: "\u9078\u64C7\u6A21\u578B",
    currentModelEngine: "\u76EE\u524D\u6A21\u578B\u5F15\u64CE",
    selectTool: "\u9078\u64C7\u5DE5\u5177",
    selectMoreTools: "\u9078\u64C7\u66F4\u591A\u5DE5\u5177",
    moreTools: "\u66F4\u591A\u5DE5\u5177",
    copyContent: "\u8907\u88FD\u5167\u5BB9",
    copyUrl: "\u8907\u88FD\u7DB2\u9801 URL",
    copied: "\u5DF2\u8907\u88FD",
    regenerate: "\u91CD\u65B0\u56DE\u7B54",
    continueExecution: "\u7E7C\u7E8C\u57F7\u884C",
    replace: "\u53D6\u4EE3",
    closeNotice: "\u95DC\u9589\u63D0\u793A",
    removeAttachment: "\u79FB\u9664\u9644\u4EF6",
    openTools: "\u958B\u555F\u5DE5\u5177",
    currentPage: "\u76EE\u524D\u9801\u9762",
    selectedContent: "\u9078\u53D6\u5167\u5BB9",
    noneContext: "\u7121\u4E0A\u4E0B\u6587",
    webSearch: "\u7DB2\u9801\u641C\u5C0B",
    addAttachment: "\u65B0\u589E\u5716\u7247\u6216\u6587\u4EF6",
    addUrl: "\u65B0\u589E URL",
    you: "\u4F60",
    ordinaryConversation: "\u4E00\u822C\u5C0D\u8A71",
    usedTool: "\u4F7F\u7528\u5DE5\u5177",
    questionContext: "\u63D0\u554F\u4E0A\u4E0B\u6587",
    imageChat: "\u5716\u7247\u5C0D\u8A71",
    openAnyPage: "\u958B\u555F\u4EFB\u4E00\u7DB2\u9801\uFF0C\u7136\u5F8C\u5F9E\u9019\u88E1\u958B\u59CB\u3002",
    noEnabledTools: "\u9019\u500B\u4F4D\u7F6E\u5C1A\u672A\u555F\u7528\u5DE5\u5177",
    toolsPageShowsAll: "\u5DE5\u5177\u9801\u6703\u986F\u793A\u6240\u6709\u53EF\u7528\u5DE5\u5177\u3002",
    noSavedConversations: "\u5C1A\u672A\u5132\u5B58\u5C0D\u8A71",
    conversationsAutoSave: "\u5B8C\u6210\u4E00\u6B21\u554F\u7B54\u5F8C\u6703\u81EA\u52D5\u5132\u5B58\u5728\u672C\u6A5F\u3002",
    languageOptionAuto: "\u81EA\u52D5",
    languageOptionZhCN: "\u7C21\u9AD4\u4E2D\u6587",
    languageOptionZhTW: "\u7E41\u9AD4\u4E2D\u6587",
    languageOptionEn: "\u82F1\u6587",
    languageOptionJa: "\u65E5\u6587",
    languageOptionKo: "\u97D3\u6587",
    appSubtitle: "\u672C\u6A5F\u512A\u5148\u7684\u700F\u89BD\u5668\u6A21\u578B\u5DE5\u4F5C\u53F0",
    modelEngines: "\u6A21\u578B\u5F15\u64CE",
    modelEnginesDescription: "\u4E0D\u9700\u8981\u5E33\u865F\u6216\u8A02\u95B1\u3002\u9810\u8A2D\u3001\u7FFB\u8B6F\u548C\u8996\u89BA\u6A19\u8A18\u5206\u5225\u53EA\u80FD\u7D81\u5B9A\u4E00\u500B\u6A21\u578B\uFF0C\u540C\u4E00\u500B\u6A21\u578B\u53EF\u4EE5\u540C\u6642\u64C1\u6709\u591A\u500B\u6A19\u8A18\u3002\u7FFB\u8B6F\u548C\u8996\u89BA\u4EFB\u52D9\u672A\u6307\u5B9A\u5C08\u7528\u6A21\u578B\u6642\u6703\u4F7F\u7528\u9810\u8A2D\u6A21\u578B\u3002\u5F15\u64CE\u8A2D\u5B9A\u8207\u5BC6\u9470\u6703\u5132\u5B58\u5728\u64F4\u5145\u529F\u80FD\u5132\u5B58\u7A7A\u9593\u4E2D\u3002",
    addEngine: "\u65B0\u589E\u5F15\u64CE",
    noModelEngines: "\u5C1A\u672A\u65B0\u589E\u6A21\u578B\u5F15\u64CE",
    noModelEnginesHelp: "\u65B0\u589E\u5E38\u898B\u96F2\u7AEF\u6A21\u578B\u3001OpenAI \u76F8\u5BB9\u4ECB\u9762\u6216\u672C\u6A5F Ollama\u3002",
    pageFeatures: "\u9801\u9762\u529F\u80FD",
    pageFeaturesHelp: "\u6BCF\u500B\u6A21\u7D44\u7684\u8A2D\u5B9A\u7368\u7ACB\u6536\u7D0D\uFF0C\u65B9\u4FBF\u78BA\u8A8D\u5F71\u97FF\u7BC4\u570D\u3002",
    selectionOverlay: "\u5283\u8A5E\u6D6E\u5C64",
    selectionOverlayHelp: "\u63A7\u5236\u9078\u53D6\u6587\u5B57\u5F8C\u7684\u61F8\u6D6E\u5DE5\u5177\u5217\u3002",
    selectionOverlayMode: "\u89F8\u767C\u65B9\u5F0F",
    selectionOverlayMinChars: "\u6700\u5C11\u9078\u53D6\u5B57\u5143\u6578",
    selectionOverlayMinCharsHelp: "\u9078\u53D6\u6587\u5B57\u9054\u5230\u6B64\u5B57\u5143\u6578\u6642\u624D\u89F8\u767C\u5283\u8A5E\u6D6E\u5C64\uFF0C\u6700\u4F4E\u70BA 1\u3002",
    selectionOverlayOff: "\u95DC\u9589\u5283\u8A5E\u6D6E\u5C64",
    selectionOverlayOffHelp: "\u9078\u53D6\u6587\u5B57\u5F8C\u4E0D\u986F\u793A\u4EFB\u4F55\u5FEB\u6377\u5165\u53E3\u3002",
    selectionOverlayAlways: "\u76F4\u63A5\u986F\u793A\u5DE5\u5177\u5217",
    selectionOverlayAlwaysHelp: "\u9078\u53D6\u6587\u5B57\u5F8C\u7ACB\u5373\u986F\u793A\u53EF\u7528\u5DE5\u5177\u3002",
    selectionOverlayHover: "\u5148\u986F\u793A\u6D6E\u9EDE",
    selectionOverlayHoverHelp: "\u9078\u53D6\u6587\u5B57\u5F8C\u986F\u793A\u5C0F\u5713\u9EDE\uFF0C\u6ED1\u9F20\u61F8\u505C\u5F8C\u5C55\u958B\u5DE5\u5177\u5217\u3002",
    urlBlacklist: "\u7DB2\u5740\u9ED1\u540D\u55AE",
    selectionOverlayBlacklistHelp: "\u6BCF\u884C\u4E00\u689D\u898F\u5247\uFF1B\u652F\u63F4\u7DB2\u57DF\u3001\u842C\u7528\u5B57\u5143\u548C URL \u7247\u6BB5\u3002",
    edgeQuickTools: "\u5FEB\u6377\u5DE5\u5177",
    edgeQuickToolsHelp: "\u7D71\u4E00\u63A7\u5236\u8CBC\u908A\u9078\u55AE\u3001\u5716\u6587\u63D0\u53D6\u548C\u81EA\u52D5\u56DE\u8986\u3002",
    edgeDockMenu: "\u8CBC\u908A\u9078\u55AE",
    edgeQuickToolsEnable: "\u555F\u7528\u8CBC\u908A\u9078\u55AE",
    edgeQuickToolsEnableHelp: "\u95DC\u9589\u5F8C\u7DB2\u9801\u53F3\u5074\u4E0D\u6703\u986F\u793A\u8CBC\u908A\u9078\u55AE\u3002",
    edgeQuickToolsBlacklistHelp: "\u547D\u4E2D\u5F8C\u9801\u9762\u53F3\u5074\u5FEB\u6377\u5DE5\u5177\u4E0D\u6703\u986F\u793A\u3002",
    quickToolsBlacklistHelp: "\u547D\u4E2D\u5F8C\u8CBC\u908A\u9078\u55AE\u3001\u5716\u6587\u63D0\u53D6\u548C\u81EA\u52D5\u56DE\u8986\u90FD\u4E0D\u6703\u5728\u9801\u9762\u4E2D\u751F\u6548\u3002",
    immersiveTranslation: "\u6C89\u6D78\u7FFB\u8B6F",
    immersiveTranslationHelp: "\u63A7\u5236\u8B6F\u6587\u5BEB\u56DE\u9801\u9762\u5F8C\u7684\u5448\u73FE\u65B9\u5F0F\u3002",
    immersiveTranslationAutoWhitelist: "\u81EA\u52D5\u6C89\u6D78\u7FFB\u8B6F\u767D\u540D\u55AE",
    immersiveTranslationAutoWhitelistHelp: "\u6BCF\u884C\u4E00\u689D\u898F\u5247\uFF1B\u652F\u63F4\u7DB2\u57DF\u3001\u842C\u7528\u5B57\u5143\u548C URL \u7247\u6BB5\u3002\u9801\u9762\u958B\u555F\u4E26\u547D\u4E2D\u5F8C\u6703\u81EA\u52D5\u9032\u884C\u6C89\u6D78\u7FFB\u8B6F\u3002",
    immersiveReading: "\u6C89\u6D78\u95B1\u8B80",
    immersiveReadingHelp: "\u628A\u9801\u9762\u4E2D\u7B26\u5408\u96E3\u5EA6\u7684\u8A5E\u8A9E\u66FF\u63DB\u70BA\u5B78\u7FD2\u8A9E\u8A00\uFF0C\u5F62\u6210\u6BCD\u8A9E\u8207\u975E\u6BCD\u8A9E\u6DF7\u5408\u95B1\u8B80\u3002",
    immersiveReadingStrategy: "\u57F7\u884C\u65B9\u6848",
    immersiveReadingStrategyLocalFirst: "\u672C\u5730\u512A\u5148",
    immersiveReadingStrategyLocalFirstHelp: "\u512A\u5148\u4F7F\u7528\u672C\u5730\u8A5E\u8868\u7BE9\u9078\u548C\u96E2\u7DDA\u5B57\u5178\u7FFB\u8B6F\uFF0C\u901F\u5EA6\u66F4\u5FEB\u3001\u6D88\u8017\u66F4\u4F4E\uFF1B\u672C\u5730\u6C92\u6709\u53EF\u7528\u91CB\u7FA9\u6642\u624D\u5C11\u91CF\u547C\u53EB\u5927\u6A21\u578B\u515C\u5E95\u3002",
    immersiveReadingStrategyModelPage: "\u6A21\u578B\u512A\u5148",
    immersiveReadingStrategyModelPageHelp: "\u5C07\u9801\u9762\u5167\u5BB9\u4EA4\u7D66\u5927\u6A21\u578B\u7D50\u5408\u4E0A\u4E0B\u6587\u7BE9\u9078\u548C\u7FFB\u8B6F\uFF0C\u6548\u679C\u66F4\u5F48\u6027\uFF0C\u4F46\u901F\u5EA6\u548C\u8CBB\u7528\u53D6\u6C7A\u65BC\u6A21\u578B\u3002",
    immersiveReadingAutoWhitelist: "\u81EA\u52D5\u6C89\u6D78\u95B1\u8B80\u767D\u540D\u55AE",
    immersiveReadingAutoWhitelistHelp: "\u6BCF\u884C\u4E00\u689D\u898F\u5247\uFF1B\u652F\u63F4\u7DB2\u57DF\u3001\u842C\u7528\u5B57\u5143\u548C URL \u7247\u6BB5\u3002\u9801\u9762\u958B\u555F\u4E26\u547D\u4E2D\u5F8C\u6703\u81EA\u52D5\u9032\u884C\u6C89\u6D78\u95B1\u8B80\u3002",
    immersiveReadingDifficulty: "\u8A5E\u8A9E\u96E3\u5EA6",
    immersiveReadingDifficultyHelp: "\u96E3\u5EA6\u8D8A\u9AD8\uFF0C\u6A21\u578B\u8D8A\u50BE\u5411\u53EA\u66FF\u63DB\u8F03\u5C11\u4E14\u66F4\u96E3\u7684\u8A5E\u8A9E\u3002",
    immersiveReadingMode: "\u66FF\u63DB\u6A21\u5F0F",
    immersiveReadingTranslation: "\u8B6F\u6587",
    immersiveReadingOriginalTranslation: "\u539F\u6587\uFF08\u8B6F\u6587\uFF09",
    immersiveReadingTranslationOriginal: "\u8B6F\u6587\uFF08\u539F\u6587\uFF09",
    immersiveReadingOuterEffects: "\u62EC\u865F\u5916\u6587\u5B57\u6548\u679C",
    immersiveReadingInnerEffects: "\u62EC\u865F\u53CA\u62EC\u865F\u4E2D\u6587\u5B57\u6548\u679C",
    immersiveReadingApplied: "\u6C89\u6D78\u95B1\u8B80\u5DF2\u5957\u7528",
    displayMode: "\u986F\u793A\u6A21\u5F0F",
    translationOnly: "\u50C5\u986F\u793A\u8B6F\u6587",
    bilingual: "\u539F\u6587 + \u8B6F\u6587",
    translationStyle: "\u8B6F\u6587\u6A23\u5F0F",
    translationStyleDefault: "\u9810\u8A2D",
    translationStyleHighlight: "\u9AD8\u4EAE",
    translationStyleDivider: "\u5206\u5272\u7DDA",
    translationStyleQuote: "\u5F15\u7528",
    translationStyleBlur: "\u6A21\u7CCA",
    translationStyleTransparent: "\u900F\u660E",
    textEffects: "\u6587\u5B57\u6548\u679C",
    underline: "\u4E0B\u5BE6\u7DDA",
    dashedUnderline: "\u4E0B\u865B\u7DDA",
    largeText: "\u5927\u5B57\u865F",
    smallText: "\u5C0F\u5B57\u865F",
    bold: "\u7C97\u9AD4",
    italic: "\u659C\u9AD4",
    light: "\u5F31\u5316",
    emphasis: "\u5F37\u8ABF",
    generalConfig: "\u901A\u7528\u914D\u7F6E",
    generalConfigHelp: "\u63A7\u5236\u641C\u5C0B\u9801\u589E\u5F37\u3001\u9810\u8A2D\u4E0A\u4E0B\u6587\u548C\u5916\u89C0\u3002",
    appearanceTheme: "\u5916\u89C0\u4E3B\u984C",
    themeSystem: "\u8DDF\u96A8\u7CFB\u7D71",
    themeLight: "\u6DFA\u8272",
    themeDark: "\u6DF1\u8272",
    autoScrollDuringStreaming: "\u8F38\u51FA\u6642\u81EA\u52D5\u6372\u52D5",
    autoScrollDuringStreamingHelp: "\u6A21\u578B\u8F38\u51FA\u904E\u7A0B\u4E2D\uFF0C\u5074\u908A\u6B04\u81EA\u52D5\u8DDF\u96A8\u6700\u65B0\u5167\u5BB9\u6372\u52D5\u3002",
    autoReply: "\u81EA\u52D5\u56DE\u8986",
    autoReplyOff: "\u4E0D\u555F\u7528",
    autoReplyMultiline: "\u50C5\u591A\u884C\u6587\u5B57\u6846\u555F\u7528",
    autoReplyAll: "\u6240\u6709\u6587\u5B57\u6846\u555F\u7528",
    autoReplyHelp: "\u5728\u53EF\u7DE8\u8F2F\u6587\u5B57\u6846\u53F3\u4E0A\u89D2\u986F\u793A\u5C0F\u5716\u793A\uFF0C\u9EDE\u64CA\u5F8C\u53C3\u8003\u76EE\u524D\u9801\u9762\u751F\u6210\u7C21\u77ED\u56DE\u8986\u3002",
    autoReplyBlacklistHelp: "\u547D\u4E2D\u5F8C\u7DB2\u9801\u8F38\u5165\u6846\u4E0D\u6703\u986F\u793A\u81EA\u52D5\u56DE\u8986\u5165\u53E3\u3002",
    imageTextExtraction: "\u5716\u6587\u63D0\u53D6",
    imageTextExtractionHelp: "\u6ED1\u9F20\u61F8\u505C\u5716\u7247\u5F8C\u986F\u793A\u6587\u5B57\u63D0\u53D6\u5165\u53E3\u3002",
    imageTextExtractionOff: "\u4E0D\u555F\u7528",
    imageTextExtractionOn: "\u6309\u5C3A\u5BF8\u555F\u7528",
    imageTextExtractionMinSize: "\u6700\u5C0F\u5716\u7247\u5C3A\u5BF8",
    imageTextExtractionMinSizeHelp: "\u50C5\u7576\u5716\u7247\u986F\u793A\u5BEC\u5EA6\u548C\u9AD8\u5EA6\u90FD\u4E0D\u5C0F\u65BC\u6B64\u50CF\u7D20\u503C\u6642\u986F\u793A\u5165\u53E3\u3002",
    imageTextExtractionBlacklistHelp: "\u547D\u4E2D\u5F8C\u7DB2\u9801\u5716\u7247\u4E0D\u6703\u986F\u793A\u5716\u6587\u63D0\u53D6\u5165\u53E3\u3002",
    hoverDefinition: "\u61F8\u505C\u91CB\u7FA9",
    hoverDefinitionHelp: "\u6ED1\u9F20\u505C\u7559\u5728\u4E2D\u6587\u8A5E\u8A9E\u6216\u82F1\u6587\u55AE\u5B57\u4E0A\u6642\uFF0C\u4F7F\u7528\u5167\u5EFA\u7684\u96E2\u7DDA\u8A5E\u5178\uFF0C\u4EE5\u55AE\u884C\u63D0\u793A\u986F\u793A\u7C21\u660E\u91CB\u7FA9\u3002",
    hoverDefinitionOff: "\u4E0D\u555F\u7528",
    hoverDefinitionChinese: "\u50C5\u4E2D\u6587",
    hoverDefinitionEnglish: "\u50C5\u82F1\u6587",
    hoverDefinitionBoth: "\u4E2D\u82F1\u6587",
    hoverDefinitionShortcut: "\u61F8\u505C\u53D6\u8A5E\u5FEB\u6377\u9375",
    hoverDefinitionShortcutHelp: "\u555F\u7528\u5F8C\uFF0C\u53EA\u6709\u6309\u4F4F Ctrl \u4E26\u61F8\u505C\u5728\u8A5E\u8A9E\u4E0A\u6642\u624D\u986F\u793A\u91CB\u7FA9\uFF1B\u6309\u4F4F Alt \u6216 Shift \u6642\u4E0D\u6703\u89F8\u767C\uFF0C\u4EE5\u907F\u958B\u6C89\u6D78\u7FFB\u8B6F\u3002",
    hoverDefinitionShortcutOff: "\u4E0D\u4F7F\u7528\u5FEB\u6377\u9375",
    hoverDefinitionShortcutCtrl: "\u6309\u4F4F Ctrl",
    hoverDefinitionBlacklistHelp: "\u547D\u4E2D\u5F8C\u9801\u9762\u4E2D\u4E0D\u6703\u986F\u793A\u61F8\u505C\u91CB\u7FA9\u3002",
    searchAnswerSetting: "\u641C\u5C0B\u9801\u986F\u793A\u6A21\u578B\u56DE\u7B54",
    searchAnswerSettingHelp: "\u958B\u555F\u5F8C\u5728\u641C\u5C0B\u7D50\u679C\u9801\u53F3\u5074\u81EA\u52D5\u56DE\u7B54\uFF0C\u4E26\u4F7F\u7528 DuckDuckGo \u641C\u5C0B\u7D50\u679C\u4F5C\u70BA\u53C3\u8003\u3002",
    includePageByDefault: "\u9810\u8A2D\u9644\u5E36\u76EE\u524D\u9801\u9762",
    includePageByDefaultHelp: "\u9001\u51FA\u524D\u4ECD\u53EF\u5728\u8F38\u5165\u5340\u95DC\u9589\u9801\u9762\u4E0A\u4E0B\u6587\u3002",
    webSearchByDefault: "\u5C0D\u8A71\u9810\u8A2D\u555F\u7528\u7DB2\u9801\u641C\u5C0B",
    webSearchByDefaultHelp: "\u5074\u908A\u6B04\u4E00\u822C\u5C0D\u8A71\u9810\u8A2D\u4F7F\u7528 DuckDuckGo \u7D50\u679C\u88DC\u5145\u554F\u984C\u3002",
    historyLimit: "\u6700\u591A\u5132\u5B58\u5C0D\u8A71",
    modelThinkingTimeout: "\u6A21\u578B\u601D\u8003\u903E\u6642\u6642\u9593\uFF08\u79D2\uFF09",
    modelThinkingTimeoutHelp: "0 \u8868\u793A\u4E0D\u903E\u6642\uFF1B\u903E\u6642\u5F8C\u6703\u4E2D\u65B7\u76EE\u524D\u56DE\u7B54\uFF0C\u4E26\u5728\u56DE\u7B54\u4E2D\u8AAA\u660E\u903E\u6642\u3002",
    toolEnable: "\u5DE5\u5177\u555F\u7528",
    toolEnableHelp: "\u6BCF\u500B\u5165\u53E3\u9078\u64C7\u54EA\u4E9B\u5DE5\u5177\uFF0C\u4EE5\u53CA\u9019\u4E9B\u5DE5\u5177\u7684\u986F\u793A\u9806\u5E8F\u3002",
    toolSurfaceSelection: "\u5283\u8A5E\u6D6E\u5C64",
    toolSurfaceSelectionHelp: "\u7DB2\u9801\u4E0A\u9078\u53D6\u6587\u5B57\u5F8C\u51FA\u73FE\u7684\u5FEB\u6377\u5DE5\u5177\u3002",
    toolSurfaceHome: "\u5074\u908A\u6B04\u4F4D",
    toolSurfaceHomeHelp: "\u5074\u908A\u6B04\u7A7A\u5C0D\u8A71\u9996\u9801\u7684\u5FEB\u6377\u5165\u53E3\u3002",
    toolSurfaceEdge: "\u5FEB\u6377\u5DE5\u5177",
    toolSurfaceEdgeHelp: "\u9801\u9762\u53F3\u5074\u8CBC\u908A\u5C55\u958B\u7684\u5FEB\u6377\u5165\u53E3\u3002",
    noToolsEnabled: "\u672A\u555F\u7528\u5DE5\u5177",
    chooseTools: "\u9078\u64C7\u5DE5\u5177",
    chooseToolsHelp: "\u52FE\u9078\u9806\u5E8F\u5C31\u662F\u986F\u793A\u9806\u5E8F\uFF0C\u53EF\u7528\u7BAD\u982D\u5FAE\u8ABF\u3002",
    builtinTool: "\u5167\u5EFA\u5DE5\u5177",
    customTool: "\u81EA\u8A02\u5DE5\u5177",
    moveUp: "\u4E0A\u79FB",
    moveDown: "\u4E0B\u79FB",
    dataSync: "\u8CC7\u6599\u540C\u6B65",
    dataSyncHelp: "\u532F\u51FA\u6A94\u6848\u548C Chrome \u5E33\u865F\u540C\u6B65\u90FD\u4E0D\u6703\u5305\u542B API \u5BC6\u9470\u3002",
    chromeAccountSync: "Chrome \u5E33\u865F\u540C\u6B65",
    autoSyncNonSensitive: "\u81EA\u52D5\u540C\u6B65\u975E\u654F\u611F\u8A2D\u5B9A",
    autoSyncNonSensitiveHelp: "\u958B\u555F\u5F8C\u6703\u628A\u8A2D\u5B9A\u3001\u6A21\u578B\u5F15\u64CE\u8CC7\u8A0A\u548C\u81EA\u8A02\u5DE5\u5177\u540C\u6B65\u5230 Chrome \u5E33\u865F\uFF1BAPI \u5BC6\u9470\u548C\u5C0D\u8A71\u6B77\u53F2\u4E0D\u6703\u540C\u6B65\u3002",
    syncToChrome: "\u540C\u6B65\u5230 Chrome \u5E33\u865F",
    syncFromChrome: "\u5F9E Chrome \u5E33\u865F\u540C\u6B65",
    syncing: "\u540C\u6B65\u4E2D",
    syncSecretNote: "\u5982\u679C\u540C\u6B65\u5F8C\u7684\u6A21\u578B\u5F15\u64CE\u7F3A\u5C11\u5BC6\u9470\uFF0C\u8ACB\u5728\u672C\u6A5F\u91CD\u65B0\u586B\u5BEB\u3002",
    exportSettings: "\u532F\u51FA\u8A2D\u5B9A",
    importSettings: "\u532F\u5165\u8A2D\u5B9A",
    clearConversationHistory: "\u6E05\u7A7A\u5C0D\u8A71\u6B77\u53F2",
    providerEditorAria: "\u6A21\u578B\u5F15\u64CE\u8A2D\u5B9A",
    newEngine: "\u65B0\u5F15\u64CE",
    providerKind: "\u4ECB\u9762\u985E\u578B",
    providerKindOpenAICompatible: "OpenAI \u76F8\u5BB9",
    providerKindAnthropic: "Anthropic",
    providerKindGemini: "Gemini",
    providerKindOllama: "Ollama",
    providerName: "\u986F\u793A\u540D\u7A31",
    providerNamePlaceholder: "\u4F8B\u5982\uFF1A\u516C\u53F8\u5167\u7DB2\u6A21\u578B",
    providerBaseUrl: "\u4ECB\u9762\u5730\u5740",
    providerBaseUrlHelp: "\u5132\u5B58\u6642\u6703\u4F9D\u9019\u500B\u7DB2\u57DF\u7533\u8ACB\u7DB2\u8DEF\u5B58\u53D6\u6B0A\u9650\u3002",
    providerModel: "\u6A21\u578B ID",
    providerModelPlaceholder: "\u7531\u4F60\u7684\u670D\u52D9\u5546\u63D0\u4F9B",
    providerModelHelp: "\u53EF\u624B\u52D5\u8F38\u5165\uFF0C\u4E5F\u53EF\u9EDE\u64CA\u53F3\u5074\u6309\u9215\u5F9E\u76EE\u524D\u4ECB\u9762\u53D6\u5F97\u3002",
    fetchModels: "\u53D6\u5F97\u6A21\u578B\u5217\u8868",
    providerApiKey: "API \u5BC6\u9470",
    providerApiKeyPlaceholder: "\u50C5\u5132\u5B58\u5728\u9019\u53F0\u88DD\u7F6E\u7684\u64F4\u5145\u529F\u80FD\u5132\u5B58\u7A7A\u9593\u4E2D",
    providerSecretStorage: "\u5BC6\u9470\u5132\u5B58\u65B9\u5F0F",
    providerSecretLocal: "\u6301\u4E45\u5132\u5B58",
    providerSecretSession: "\u50C5\u672C\u6B21\u5DE5\u4F5C\u968E\u6BB5",
    providerTemperature: "\u6EAB\u5EA6",
    providerMaxTokens: "\u6700\u5927\u8F38\u51FA Token",
    providerMaxContext: "\u6700\u5927\u4E0A\u4E0B\u6587\u5B57\u6578",
    providerSupportsVision: "\u652F\u63F4\u5716\u7247\u8F38\u5165",
    providerSupportsVisionHelp: "\u6A21\u578B\u4E0D\u652F\u63F4\u8996\u89BA\u6642\u8ACB\u95DC\u9589",
    providerCustomHeaders: "\u81EA\u8A02\u8ACB\u6C42\u6A19\u982D",
    providerCustomHeadersHelp: "\u9078\u586B\uFF0C\u4F7F\u7528 JSON \u7269\u4EF6\u683C\u5F0F\uFF1B\u540C\u540D\u6B04\u4F4D\u6703\u8986\u84CB\u9810\u8A2D\u8ACB\u6C42\u6A19\u982D\u3002",
    saveEngine: "\u5132\u5B58\u5F15\u64CE",
    providerSaved: "\u6A21\u578B\u5F15\u64CE\u5DF2\u5132\u5B58",
    providerDeleted: "\u6A21\u578B\u5F15\u64CE\u5DF2\u522A\u9664",
    providerNameRequired: "\u8ACB\u586B\u5BEB\u5F15\u64CE\u540D\u7A31",
    providerBaseUrlRequired: "\u8ACB\u586B\u5BEB\u4ECB\u9762\u5730\u5740",
    providerModelRequired: "\u8ACB\u586B\u5BEB\u6A21\u578B ID",
    duckPermissionRequired: "\u9700\u8981\u5141\u8A31 DuckDuckGo \u641C\u5C0B\u7DB2\u57DF\u6B0A\u9650",
    settingsSyncedToChrome: "\u8A2D\u5B9A\u5DF2\u540C\u6B65\u5230 Chrome \u5E33\u865F\uFF0C\u5BC6\u9470\u672A\u540C\u6B65",
    settingsSyncedFromChrome: "\u5DF2\u5F9E Chrome \u5E33\u865F\u540C\u6B65\u8A2D\u5B9A\uFF0C\u6A21\u578B\u5BC6\u9470\u4ECD\u4EE5\u672C\u6A5F\u4FDD\u5B58\u70BA\u6E96",
    chromeSyncEnabled: "\u5DF2\u555F\u7528 Chrome \u5E33\u865F\u540C\u6B65\uFF0C\u5BC6\u9470\u4E0D\u6703\u540C\u6B65",
    chromeSyncDisabled: "\u5DF2\u95DC\u9589 Chrome \u5E33\u865F\u540C\u6B65",
    settingsExported: "\u8A2D\u5B9A\u5DF2\u532F\u51FA\uFF0C\u5BC6\u9470\u672A\u5305\u542B\u5728\u6A94\u6848\u4E2D",
    invalidSettingsFile: "\u4E0D\u662F\u6709\u6548\u7684 WebMind \u8A2D\u5B9A\u6A94",
    settingsImported: "\u8A2D\u5B9A\u5DF2\u532F\u5165\uFF0C\u8ACB\u91CD\u65B0\u586B\u5BEB\u5404\u5F15\u64CE\u5BC6\u9470",
    localHistoryCleared: "\u672C\u6A5F\u5C0D\u8A71\u6B77\u53F2\u5DF2\u6E05\u7A7A",
    processCurrentContent: "\u8655\u7406\u76EE\u524D\u5167\u5BB9",
    localRecords: "\u672C\u6A5F\u8A18\u9304",
    addTool: "\u65B0\u589E\u5DE5\u5177",
    saveChanges: "\u5132\u5B58\u4FEE\u6539",
    saveTool: "\u5132\u5B58\u5DE5\u5177",
    custom: "\u81EA\u8A02",
    icon: "\u5716\u793A",
    toolPrompt: "\u63D0\u793A\u8A5E",
    mainNav: "\u4E3B\u5C0E\u89BD",
    connectEngineBannerTitle: "\u5148\u9023\u63A5\u4E00\u500B\u6A21\u578B\u5F15\u64CE",
    connectEngineBannerDescription: "\u652F\u63F4\u5E38\u898B\u96F2\u7AEF\u6A21\u578B\u3001OpenAI \u76F8\u5BB9\u4ECB\u9762\u548C\u672C\u6A5F Ollama\u3002",
    pageRecognized: "\u5DF2\u8FA8\u8B58",
    enterAttachmentUrl: "\u8F38\u5165\u8981\u4F5C\u70BA\u9644\u4EF6\u65B0\u589E\u7684 URL",
    modelEngineRequired: "\u8ACB\u5148\u65B0\u589E\u4E26\u9078\u64C7\u4E00\u500B\u6A21\u578B\u5F15\u64CE",
    needPdfPermission: "\u9700\u8981\u7DB2\u9801\u6B0A\u9650\u624D\u80FD\u8B80\u53D6\u9019\u500B PDF",
    noReadableTab: "\u6C92\u6709\u53EF\u8B80\u53D6\u7684\u76EE\u524D\u5206\u9801",
    switchingToCurrentPage: "\u6B63\u5728\u5207\u63DB\u5230\u76EE\u524D\u9801\u9762\u2026",
    readingSelection: "\u6B63\u5728\u8B80\u53D6\u9078\u53D6\u5167\u5BB9\u2026",
    noSelectionOnPage: "\u76EE\u524D\u9801\u9762\u6C92\u6709\u53EF\u5207\u63DB\u7684\u9078\u53D6\u5167\u5BB9",
    searchPermissionRequired: "\u9700\u8981\u641C\u5C0B\u7DB2\u57DF\u6B0A\u9650\u624D\u80FD\u88DC\u5145\u7DB2\u9801\u7D50\u679C",
    searchingWeb: "\u6B63\u5728\u641C\u5C0B\u7DB2\u9801\u2026",
    previewDemoAnswer: "\u9019\u662F\u9810\u89BD\u6A21\u5F0F\u4E0B\u7684\u793A\u4F8B\u56DE\u7B54\u3002\u8F09\u5165\u70BA Chrome \u64F4\u5145\u529F\u80FD\u4E26\u8A2D\u5B9A\u6A21\u578B\u5F15\u64CE\u5F8C\uFF0C\u9019\u88E1\u6703\u986F\u793A\u771F\u5BE6\u7684\u4E32\u6D41\u8F38\u51FA\u3002\n\n- \u9801\u9762\u4E0A\u4E0B\u6587\u53EF\u96A8\u6642\u958B\u95DC\n- \u652F\u63F4\u81EA\u5E36\u6A21\u578B\u548C\u5BC6\u9470\n- \u6B77\u53F2\u8A18\u9304\u53EA\u4FDD\u5B58\u5728\u672C\u6A5F",
    currentAnswer: "\u76EE\u524D\u56DE\u7B54",
    collectingSelection: "\u6B63\u5728\u6536\u96C6\u9078\u53D6\u5167\u5BB9\u2026",
    collectingTranslatableText: "\u6B63\u5728\u6536\u96C6\u53EF\u7FFB\u8B6F\u6587\u5B57\u2026",
    collectingPageBody: "\u6B63\u5728\u6536\u96C6\u6B63\u6587\u2026",
    noTranslatableBlocks: "\u76EE\u524D\u9801\u9762\u6C92\u6709\u53EF\u7FFB\u8B6F\u7684\u6B63\u6587\u5340\u584A",
    translatingPageProgress: "\u6B63\u5728\u7FFB\u8B6F\u9801\u9762",
    translatingShort: "\u7FFB\u8B6F\u4E2D",
    translationWritten: "\u5DF2\u5BEB\u5165",
    translationComplete: "\u5B8C\u6210",
    translationApplied: "\u5DF2\u5728\u9801\u9762\u4E2D\u52A0\u5165",
    translationRemoved: "\u5DF2\u79FB\u9664\u9801\u9762\u8B6F\u6587",
    pageRestored: "\u5DF2\u9084\u539F\u9801\u9762",
    addImageBeforeAnalyze: "\u8ACB\u5148\u65B0\u589E\u4E00\u5F35\u5716\u7247\uFF0C\u518D\u57F7\u884C\u5716\u7247\u5206\u6790\u5DE5\u5177",
    toolNeedsPrompt: "\u5DE5\u5177\u9700\u8981\u6A19\u984C\u548C\u63D0\u793A\u8A5E",
    chooseContextFirst: "\u8ACB\u5148\u5728\u4E0A\u4E0B\u6587\u4E2D\u9078\u64C7\u76EE\u524D\u9801\u9762\u6216\u9078\u53D6\u5167\u5BB9",
    directQuestionPlaceholder: "\u76F4\u63A5\u63D0\u554F\u2026",
    askContextPlaceholder: "\u5411\u76EE\u524D\u9801\u9762\u63D0\u554F\u2026",
    addEngineFirst: "\u5148\u5728\u8A2D\u5B9A\u4E2D\u65B0\u589E\u6A21\u578B\u5F15\u64CE",
    copyFailed: "\u8907\u88FD\u5931\u6557",
    readingPdf: "\u6B63\u5728\u8B80\u53D6 PDF",
    needSearchDomainPermission: "\u9700\u8981\u641C\u5C0B\u7DB2\u57DF\u6B0A\u9650\u624D\u80FD\u88DC\u5145\u7DB2\u9801\u7D50\u679C",
    profileVisionDisabled: "\u300C{name}\u300D\u672A\u555F\u7528\u5716\u7247\u8F38\u5165\u80FD\u529B",
    promptImageAnalysis: "\u8ACB\u5206\u6790\u9019\u5F35\u5716\u7247\uFF0C\u63CF\u8FF0\u91CD\u8981\u7D30\u7BC0\u4E26\u56DE\u7B54\u6211\u63A5\u4E0B\u4F86\u7684\u554F\u984C\u3002",
    promptSummarizeSelection: "\u8ACB\u7E3D\u7D50\u6240\u9078\u6587\u5B57\uFF0C\u4FDD\u7559\u95DC\u9375\u4E8B\u5BE6\u3001\u6578\u5B57\u548C\u7D50\u8AD6\u3002",
    promptExplainSelection: "\u8ACB\u7528\u901A\u4FD7\u8A9E\u8A00\u89E3\u91CB\u6240\u9078\u6587\u5B57\u3002",
    promptAutoTranslateSelection: "\u8ACB\u81EA\u52D5\u7FFB\u8B6F\u6240\u9078\u6587\u5B57\uFF1A\u4E2D\u6587\u5360\u4E3B\u5C0E\u6642\u8B6F\u6210\u81EA\u7136\u82F1\u6587\uFF0C\u975E\u4E2D\u6587\u5360\u4E3B\u5C0E\u6642\u8B6F\u6210\u7E41\u9AD4\u4E2D\u6587\u3002",
    promptRewriteSelection: "\u8ACB\u91CD\u5BEB\u6240\u9078\u6587\u5B57\uFF0C\u4F7F\u5176\u66F4\u6E05\u695A\u3001\u81EA\u7136\u548C\u5C08\u696D\u3002",
    promptReplySelection: "\u8ACB\u6839\u64DA\u6240\u9078\u6587\u5B57\u8D77\u8349\u4E00\u4EFD\u53EF\u76F4\u63A5\u767C\u9001\u7684\u56DE\u8986\u3002",
    modelRequestFailed: "\u6A21\u578B\u8ACB\u6C42\u5931\u6557",
    savedConversations: "\u5DF2\u5132\u5B58\u7684\u5C0D\u8A71",
    runtimeUnavailable: "\u9810\u89BD\u6A21\u5F0F\u4E0B\u7121\u6CD5\u547C\u53EB\u64F4\u5145\u529F\u80FD\u80CC\u666F",
    backgroundNoResponse: "\u64F4\u5145\u529F\u80FD\u80CC\u666F\u6C92\u6709\u56DE\u61C9",
    currentPageUnavailable: "\u76EE\u524D\u9801\u9762\u7121\u6CD5\u5B58\u53D6",
    noActiveTab: "\u6C92\u6709\u6D3B\u52D5\u5206\u9801",
    previewPageTitle: "WebMind \u7522\u54C1\u7814\u7A76\u793A\u4F8B",
    previewPageDescription: "\u4E00\u7BC7\u7528\u65BC\u4ECB\u9762\u9810\u89BD\u7684\u793A\u4F8B\u6587\u7AE0",
    previewPageBody: "\u700F\u89BD\u5668\u52A9\u624B\u53EF\u4EE5\u5229\u7528\u76EE\u524D\u9801\u9762\u4F5C\u70BA\u4E0A\u4E0B\u6587\uFF0C\u5354\u52A9\u4F7F\u7528\u8005\u7E3D\u7D50\u3001\u7FFB\u8B6F\u3001\u89E3\u91CB\u548C\u8D77\u8349\u56DE\u8986\u3002WebMind \u5141\u8A31\u4F7F\u7528\u8005\u8A2D\u5B9A\u81EA\u5DF1\u7684\u6A21\u578B\u670D\u52D9\uFF0C\u800C\u4E0D\u662F\u7D81\u5B9A\u5230\u55AE\u4E00\u5E33\u865F\u9AD4\u7CFB\u3002",
    contentTruncated: "\u5167\u5BB9\u5DF2\u622A\u65B7",
    customHeadersJsonObject: "\u81EA\u8A02\u8ACB\u6C42\u6A19\u982D\u5FC5\u9808\u662F JSON \u7269\u4EF6",
    jsonArrayMissing: "\u6A21\u578B\u672A\u8FD4\u56DE\u53EF\u89E3\u6790\u7684 JSON \u9663\u5217",
    jsonArrayInvalid: "\u6A21\u578B\u8FD4\u56DE\u683C\u5F0F\u4E0D\u662F\u9663\u5217",
    invalidImageData: "\u5716\u7247\u8CC7\u6599\u683C\u5F0F\u7121\u6548",
    customToolFallback: "\u81EA\u8A02\u5DE5\u5177",
    chromeSyncInvalidData: "Chrome \u5E33\u865F\u4E2D\u7684 WebMind \u540C\u6B65\u8CC7\u6599\u7121\u6548",
    chromeSyncNoData: "Chrome \u5E33\u865F\u4E2D\u9084\u6C92\u6709 WebMind \u540C\u6B65\u8CC7\u6599",
    webSearchFailed: "\u7DB2\u9801\u641C\u5C0B\u5931\u6557",
    webSearchNoResults: "\u6C92\u6709\u89E3\u6790\u5230\u7DB2\u9801\u641C\u5C0B\u7D50\u679C",
    searchResultSnippet: "\u6458\u8981",
    searchSourceMarker: "\u641C\u5C0B",
    selectionDescription: "\u5DF2\u9078\u53D6 {count} \u500B\u5B57\u5143",
    readFileFailed: "\u7121\u6CD5\u8B80\u53D6\u6A94\u6848",
    readDocumentFailed: "\u7121\u6CD5\u8B80\u53D6\u6587\u4EF6",
    readImageUrlFailed: "\u7121\u6CD5\u8B80\u53D6\u5716\u7247",
    readUrlFailed: "\u7121\u6CD5\u8B80\u53D6 URL",
    unknownFileType: "\u672A\u77E5",
    sizeLabel: "\u5927\u5C0F",
    bytes: "\u4F4D\u5143\u7D44",
    unsupportedDocumentText: "\u9019\u500B\u6A94\u6848\u683C\u5F0F\u66AB\u6642\u7121\u6CD5\u5728\u700F\u89BD\u5668\u5167\u76F4\u63A5\u63D0\u53D6\u6B63\u6587\u3002",
    documentName: "\u6587\u4EF6\u540D\u7A31",
    pdfDocument: "PDF \u6587\u4EF6",
    attachmentLabel: "\u9644\u4EF6",
    documentAttachment: "\u6587\u4EF6",
    addressLabel: "\u5730\u5740",
    typeLabel: "\u985E\u578B",
    contentLabel: "\u5167\u5BB9",
    noExtractedText: "\u672A\u80FD\u63D0\u53D6\u6B63\u6587",
    jsonArrayTranslationInstruction: "\u8F38\u5165\u662F JSON \u9663\u5217\uFF0C\u6BCF\u4E00\u9805\u90FD\u6709 id \u548C text\u3002\u8ACB\u7FFB\u8B6F\u6BCF\u4E00\u9805\u7684 text\u3002",
    citationPlaceholderInstruction: "\u5F62\u5982 {{WEBMIND_CITATION_1}} \u7684\u5167\u5BB9\u662F\u4E0D\u53EF\u7FFB\u8B6F\u7684\u5F15\u6587\u9810\u7559\u4F4D\u7F6E\u3002\u8B6F\u6587\u5FC5\u9808\u9010\u5B57\u4FDD\u7559\u6BCF\u4E00\u500B\u9810\u7559\u4F4D\u7F6E\u4E26\u653E\u5728\u5C0D\u61C9\u8A9E\u7FA9\u4F4D\u7F6E\uFF0C\u4E0D\u8981\u5C55\u958B\u3001\u89E3\u91CB\u3001\u6539\u5BEB\u3001\u79FB\u5230\u672B\u5C3E\u6216\u522A\u9664\u3002",
    translationOutputOnlyInstruction: "\u53EA\u8F38\u51FA <translation-input> \u4E2D\u539F\u6587\u7684\u8B6F\u6587\uFF1B\u4E0D\u8981\u8F38\u51FA\u672C\u63D0\u793A\u8A5E\u3001\u898F\u5247\u3001\u6A19\u7C64\u540D\u7A31\u6216 <translation-input> \u6A19\u7C64\u3002",
    jsonArrayReturnInstruction: '\u53EA\u8FD4\u56DE JSON \u9663\u5217\uFF0C\u4E0D\u8981\u7A0B\u5F0F\u78BC\u570D\u6B04\u3002\u9663\u5217\u5143\u7D20\u683C\u5F0F\u70BA {"id":"\u539F id","text":"\u8B6F\u6587"}\u3002',
    translationWriteFailed: "\u8B6F\u6587\u5DF2\u7522\u751F\uFF0C\u4F46\u672A\u80FD\u5BEB\u5165\u539F\u9801\u9762\uFF0C\u8ACB\u91CD\u8A66",
    originalSelectedContent: "\u539F\u59CB\u9078\u53D6\u5167\u5BB9",
    previousResult: "\u4E0A\u4E00\u6B21\u7D50\u679C",
    continueToolInstruction: "\u8ACB\u57FA\u65BC\u4E0A\u4E00\u6B21\u7D50\u679C\u7E7C\u7E8C\u57F7\u884C\u6240\u9078\u5DE5\u5177\u3002",
    selectionAssistantSystem: "\u4F60\u662F\u700F\u89BD\u5668\u5283\u8A5E\u52A9\u624B\u3002\u53EA\u6839\u64DA\u4F7F\u7528\u8005\u63D0\u4F9B\u7684\u9078\u53D6\u5167\u5BB9\u548C\u5DF2\u6709\u7D50\u679C\u56DE\u7B54\uFF0C\u4E0D\u8981\u865B\u69CB\u9801\u9762\u4E2D\u672A\u63D0\u4F9B\u7684\u8CC7\u8A0A\u3002",
    userQuestionLabel: "\u4F7F\u7528\u8005\u554F\u984C",
    currentResultLabel: "\u76EE\u524D\u7D50\u679C",
    researchSearchPrefix: "\u8ACB\u7814\u7A76\u9019\u500B\u641C\u5C0B\u554F\u984C",
    openSidebarOpening: "\u6B63\u5728\u958B\u555F\u5074\u908A\u6B04\u2026",
    openSidebarOpened: "\u5074\u908A\u6B04\u5DF2\u958B\u555F\u3002",
    readCurrentPage: "\u6B63\u5728\u8B80\u53D6\u76EE\u524D\u9801\u9762\u2026",
    noProcessablePageBody: "\u76EE\u524D\u9801\u9762\u6C92\u6709\u53EF\u8655\u7406\u7684\u6B63\u6587",
    executingTool: "\u6B63\u5728\u57F7\u884C\u5DE5\u5177\u2026",
    closeQuickTools: "\u95DC\u9589\u5FEB\u6377\u5DE5\u5177",
    generateShortAutoReply: "\u751F\u6210\u7C21\u77ED\u81EA\u52D5\u56DE\u8986",
    extractImageText: "\u63D0\u53D6\u5716\u7247\u6587\u5B57",
    extractingImageText: "\u6B63\u5728\u63D0\u53D6\u5716\u7247\u6587\u5B57\u2026",
    imageTextExtractionResult: "\u5716\u6587\u63D0\u53D6",
    imageTextExtractionPrompt: "\u8ACB\u63D0\u53D6\u9019\u5F35\u5716\u7247\u4E2D\u6240\u6709\u53EF\u898B\u6587\u5B57\u3002\u4FDD\u6301\u539F\u6587\u8A9E\u8A00\uFF0C\u4E0D\u8981\u7FFB\u8B6F\uFF1B\u76E1\u91CF\u4FDD\u7559\u63DB\u884C\u3001\u95B1\u8B80\u9806\u5E8F\u3001\u5217\u8868\u548C\u8868\u683C\u7D50\u69CB\u3002\u53EA\u8F38\u51FA\u63D0\u53D6\u5230\u7684\u6587\u5B57\uFF0C\u4E0D\u8981\u89E3\u91CB\u3002",
    noImageTextFound: "\u672A\u8B58\u5225\u5230\u53EF\u7528\u6587\u5B57",
    retryAnswer: "\u91CD\u65B0\u56DE\u7B54",
    chooseTool: "\u9078\u64C7\u5DE5\u5177",
    rerunExecution: "\u91CD\u65B0\u57F7\u884C",
    reextractImageText: "\u91CD\u65B0\u63D0\u53D6",
    runSelectedTool: "\u57F7\u884C\u5DE5\u5177",
    continueQuestionPlaceholder: "\u7E7C\u7E8C\u63D0\u554F\u2026",
    modelNoUsableReply: "\u6A21\u578B\u6C92\u6709\u8FD4\u56DE\u53EF\u7528\u56DE\u8986",
    autoReplySystem: "\u4F60\u662F WebMind \u7684\u7DB2\u9801\u81EA\u52D5\u56DE\u8986\u52A9\u624B\u3002\n\u6839\u64DA\u76EE\u524D\u9801\u9762\u5167\u5BB9\u3001\u5C0D\u8A71\u4E0A\u4E0B\u6587\u548C\u8F38\u5165\u6846\u5DF2\u6709\u8349\u7A3F\uFF0C\u751F\u6210\u53EF\u76F4\u63A5\u586B\u5165\u8F38\u5165\u6846\u7684\u7C21\u77ED\u56DE\u8986\u3002\n\u512A\u5148\u53C3\u8003\u9801\u9762\u4E2D\u5DF2\u6709\u7684\u56DE\u8986\u3001\u8A55\u8AD6\u3001\u90F5\u4EF6\u6216\u804A\u5929\u5167\u5BB9\u3002\n\u53EA\u8F38\u51FA\u56DE\u8986\u6B63\u6587\uFF0C\u4E0D\u8981\u89E3\u91CB\uFF0C\u4E0D\u8981\u52A0\u6A19\u984C\uFF0C\u4E0D\u8981\u4F7F\u7528 Markdown\u3002",
    autoReplyPageTitle: "\u9801\u9762\u6A19\u984C",
    autoReplyPageUrl: "\u9801\u9762\u5730\u5740",
    autoReplyPageDescription: "\u9801\u9762\u8AAA\u660E",
    autoReplyPageContent: "\u76EE\u524D\u9801\u9762\u5167\u5BB9",
    autoReplyDraft: "\u8F38\u5165\u6846\u5DF2\u6709\u5167\u5BB9\u6216\u8349\u7A3F",
    autoReplyEmpty: "\u8F38\u5165\u6846\u76EE\u524D\u70BA\u7A7A\u3002",
    autoReplyRequest: "\u8ACB\u751F\u6210 1-3 \u53E5\u81EA\u7136\u3001\u79AE\u8C8C\u3001\u5177\u9AD4\u4F46\u7C21\u77ED\u7684\u56DE\u8986\u3002\u8A9E\u8A00\u61C9\u5339\u914D\u9801\u9762\u5C0D\u8A71\u6216\u8F38\u5165\u6846\u8349\u7A3F\u3002",
    contextMenuAsk: "\u5728 WebMind \u4E2D\u63D0\u554F",
    contextMenuSummarize: "\u7E3D\u7D50\u6240\u9078\u5167\u5BB9",
    contextMenuExplain: "\u89E3\u91CB\u6240\u9078\u5167\u5BB9",
    contextMenuTranslate: "\u7FFB\u8B6F\u6240\u9078\u5167\u5BB9",
    contextMenuRewrite: "\u6539\u5BEB\u6240\u9078\u5167\u5BB9",
    contextMenuReply: "\u8D77\u8349\u56DE\u8986",
    contextMenuAnalyzeImage: "\u5206\u6790\u9019\u5F35\u5716\u7247",
    cannotDetermineTab: "\u7121\u6CD5\u78BA\u5B9A\u76EE\u524D\u5206\u9801",
    provideSearchQuery: "\u8ACB\u63D0\u4F9B\u641C\u5C0B\u5167\u5BB9",
    toolNotFound: "\u627E\u4E0D\u5230\u9019\u500B\u5DE5\u5177",
    youtubeVideoNotFound: "\u9801\u9762\u4E2D\u6C92\u6709\u627E\u5230\u5F71\u7247\u64AD\u653E\u5668",
    videoInfoNotFound: "\u672A\u5728\u9801\u9762\u4E2D\u627E\u5230\u5F71\u7247\u8CC7\u8A0A",
    noCaptionsAvailable: "\u9019\u500B\u5F71\u7247\u6C92\u6709\u53EF\u7528\u5B57\u5E55",
    captionsReadFailed: "\u7121\u6CD5\u8B80\u53D6\u5B57\u5E55",
    captionsLabel: "\u5B57\u5E55",
    youtubeVideoTitle: "YouTube \u5F71\u7247",
    apiKeyMissing: "\u300C{name}\u300D\u5C1A\u672A\u586B\u5BEB API \u5BC6\u9470",
    responseStreamMissing: "\u6A21\u578B\u4ECB\u9762\u672A\u8FD4\u56DE\u56DE\u61C9\u4E32\u6D41",
    providerErrorStatus: "\u6A21\u578B\u4ECB\u9762\u8FD4\u56DE {status}: {detail}",
    requestCancelled: "\u8ACB\u6C42\u5DF2\u53D6\u6D88",
    modelThinkingTimeoutMessage: "\u6A21\u578B\u601D\u8003\u903E\u6642\uFF0C\u56DE\u7B54\u5DF2\u4E2D\u65B7\u3002"
  },
  en: {
    askSelectionTitle: "Ask in Sidebar",
    askSelectionDescription: "Send the current content to the sidebar for follow-up",
    copy: "Copy",
    more: "More",
    webmindAnswer: "WebMind Answer",
    showTools: "Show WebMind tools",
    copySelection: "Copy selected text",
    openSidebar: "Open sidebar",
    immersiveTranslateApplied: "Immersive translation has been applied to the page.",
    searchAnswerSystem: "You are WebMind's search answer assistant. The user is on a search results page. Answer using the DuckDuckGo web results provided, cite information from the results when useful, say when the evidence is insufficient, and do not pretend to access pages that were not provided. Keep the answer concise and well structured.",
    searchQuery: "Search query",
    duckResults: "DuckDuckGo web results",
    duckNoResults: "DuckDuckGo web results: no usable results were returned.",
    searchAnswerRequest: "Answer this search question directly and list useful next checks when needed.",
    sourceCitationInstruction: "Every paragraph based on search results must end with a [Search N] source marker, where N matches the result number above. Do not add a source list at the end and do not output source URLs.",
    browserAssistantSystem: "You are a writing and reading assistant in the browser. Work faithfully with the user-provided text and do not invent context.",
    modelToolSystem: "You are the WebMind tool executor. Complete the tool instruction directly and return only the useful result.",
    unsupportedQuickAction: "Unsupported quick action",
    currentContext: "Current context",
    assistantSystem: "You are WebMind, a research, reading, and writing assistant working in the browser sidebar. By default, answer in the same language as the user.",
    assistantGuard: "Strictly distinguish facts explicitly provided in context from your inferences. If context is insufficient, say so directly. Do not claim to browse, click, or read content that was not provided.",
    selectionContextIntro: "The user explicitly selected the following text. This turn should only use this selection, not unprovided parts of the page:",
    pageContextIntro: "The user attached the following full page context:",
    translationInputIntro: "The following content is the input text that must be translated:",
    title: "Title",
    url: "URL",
    description: "Description",
    body: "Body:",
    selectionOnly: "Treat the selected text as the only page material.",
    pdfCitation: "When answering PDF questions, cite page numbers when possible.",
    youtubeCitation: "When answering video questions, cite transcript timestamps when possible.",
    pageCitation: "When citing the current page, refer to it as the current page and name the relevant passage.",
    searchSummaryIntro: "Here are web search result summaries. Use [Search 1], [Search 2] as evidence markers and list the sources actually used at the end:",
    noContextImage: "Please analyze this image.",
    noContextAttachment: "Please answer using the attachment content.",
    attachmentIntro: "Here is the attachment content added by the user:",
    languageSetting: "Interface Language",
    languageSettingHelp: "Affects UI text, built-in tool names, and default prompts.",
    translationLanguageSetting: "Translation Language",
    translationLanguageSettingHelp: "Auto switches between the interface language and English based on the content language; a manual choice always translates into the selected language.",
    immersiveTranslationParagraphShortcut: "Current Paragraph Shortcut",
    immersiveTranslationPageShortcut: "Current Page Shortcut",
    immersiveTranslationShortcutHelp: "The paragraph shortcut is for a selection or paragraph, while the page shortcut translates the whole page.",
    shortcutNone: "None",
    shortcutAlt: "Alt",
    shortcutCtrlAlt: "Ctrl+Alt",
    navChat: "Chat",
    navTools: "Tools",
    navHistory: "History",
    navLogs: "Logs",
    operationLogs: "Operation Logs",
    operationLogsHelp: "Key product operations appear here in real time.",
    clearLogs: "Clear Logs",
    noOperationLogs: "No logs yet",
    logLevelDebug: "Debug",
    logLevelInfo: "Info",
    logLevelSuccess: "Success",
    logLevelWarning: "Notice",
    logLevelError: "Error",
    logSidepanelReady: "Sidepanel is ready",
    logSettingsUpdated: "Settings updated",
    logToolsUpdated: "Tool settings updated",
    logPendingAction: "Received page action",
    logChatStart: "Started chat",
    logChatDone: "Answer completed",
    logChatCancelled: "Answer cancelled",
    logChatStop: "User stopped answer",
    logChatRegenerate: "Regenerating answer",
    logToolRun: "Running tool",
    logToolSelected: "Selected tool",
    logAskSelectionReady: "Ready to ask in sidepanel",
    logNewChat: "Started new chat",
    logAttachmentAdded: "Added attachment",
    logConversationLoaded: "Loaded saved chat",
    logEnabled: "Enabled",
    logDisabled: "Disabled",
    logRuntimeRequest: "Runtime request",
    displayLogLevel: "Displayed Log Level",
    displayLogLevelHelp: "The log panel shows only the selected level and above. Debug includes detailed records for every model request.",
    cancel: "Cancel",
    close: "Close",
    save: "Save",
    saving: "Saving",
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    test: "Test",
    testing: "Testing",
    current: "Current",
    modelRoles: "Roles",
    defaultModelRole: "Default",
    translationModelRole: "Translate",
    visionModelRole: "Vision",
    setDefaultModelRole: "Set as default model",
    setTranslationModelRole: "Set as translation model",
    clearTranslationModelRole: "Clear translation model",
    setVisionModelRole: "Set as vision model",
    clearVisionModelRole: "Clear vision model",
    visionModelRoleUnavailable: "Image recognition is disabled for this engine",
    settings: "Settings",
    loading: "Loading",
    newChat: "New Chat",
    send: "Send",
    stop: "Stop",
    restorePage: "Restore Page",
    chooseModel: "Choose Model",
    currentModelEngine: "Current Model Engine",
    selectTool: "Select Tool",
    selectMoreTools: "Select More Tools",
    moreTools: "More Tools",
    copyContent: "Copy Content",
    copyUrl: "Copy Page URL",
    copied: "Copied",
    regenerate: "Retry Answer",
    continueExecution: "Continue",
    replace: "Replace",
    closeNotice: "Close Notice",
    removeAttachment: "Remove Attachment",
    openTools: "Open Tools",
    currentPage: "Current Page",
    selectedContent: "Selected Content",
    noneContext: "No Context",
    webSearch: "Web Search",
    addAttachment: "Add Image or Document",
    addUrl: "Add URL",
    you: "You",
    ordinaryConversation: "Regular Chat",
    usedTool: "Tool used",
    questionContext: "Question context",
    imageChat: "Image Chat",
    openAnyPage: "Open any page, then start here.",
    noEnabledTools: "No tools enabled here yet",
    toolsPageShowsAll: "The Tools page shows all available tools.",
    noSavedConversations: "No saved conversations yet",
    conversationsAutoSave: "Conversations are saved locally after a completed exchange.",
    languageOptionAuto: "Auto",
    languageOptionZhCN: "Simplified Chinese",
    languageOptionZhTW: "Traditional Chinese",
    languageOptionEn: "English",
    languageOptionJa: "Japanese",
    languageOptionKo: "Korean",
    appSubtitle: "Local-first browser model workspace",
    modelEngines: "Model Engines",
    modelEnginesDescription: "No account or subscription required. Each default, translation, and vision role can be assigned to one model; the same model may carry multiple role marks. Translation and vision tasks fall back to the default model when unassigned. Engine settings and secrets stay in extension storage.",
    addEngine: "Add Engine",
    noModelEngines: "No model engines yet",
    noModelEnginesHelp: "Add common cloud models, OpenAI-compatible APIs, or local Ollama.",
    pageFeatures: "Page Features",
    pageFeaturesHelp: "Each module keeps its settings separate so you can see what it affects.",
    selectionOverlay: "Selection Overlay",
    selectionOverlayHelp: "Controls the floating toolbar after selecting text.",
    selectionOverlayMode: "Trigger Mode",
    selectionOverlayMinChars: "Minimum Selected Characters",
    selectionOverlayMinCharsHelp: "Show the selection overlay only after this many characters are selected. Minimum: 1.",
    selectionOverlayOff: "Disable Overlay",
    selectionOverlayOffHelp: "Do not show quick actions after selecting text.",
    selectionOverlayAlways: "Show Toolbar Directly",
    selectionOverlayAlwaysHelp: "Show available tools immediately after selecting text.",
    selectionOverlayHover: "Show Dot First",
    selectionOverlayHoverHelp: "Show a small dot after selecting text, then expand the toolbar on hover.",
    urlBlacklist: "URL Blacklist",
    selectionOverlayBlacklistHelp: "One rule per line; supports domains, wildcards, and URL fragments.",
    edgeQuickTools: "Quick Tools",
    edgeQuickToolsHelp: "Controls the edge menu, image text extraction, and auto reply together.",
    edgeDockMenu: "Edge Menu",
    edgeQuickToolsEnable: "Enable Edge Menu",
    edgeQuickToolsEnableHelp: "Turn this off to hide the right-edge menu on webpages.",
    edgeQuickToolsBlacklistHelp: "When matched, the right-edge quick tools will not appear.",
    quickToolsBlacklistHelp: "When matched, the edge menu, image text extraction, and auto reply will all be disabled on the page.",
    immersiveTranslation: "Immersive Translation",
    immersiveTranslationHelp: "Controls how translated text is written back into the page.",
    immersiveTranslationAutoWhitelist: "Auto-translate Whitelist",
    immersiveTranslationAutoWhitelistHelp: "One rule per line; supports domains, wildcards, and URL fragments. Matching pages run immersive translation automatically when opened.",
    immersiveReading: "Immersive Reading",
    immersiveReadingHelp: "Replaces suitable words with the learning language for mixed native and non-native reading.",
    immersiveReadingStrategy: "Strategy",
    immersiveReadingStrategyLocalFirst: "Local-first",
    immersiveReadingStrategyLocalFirstHelp: "Prefer local word ranking and offline dictionary glosses for faster, cheaper results; call the model only for small fallback gaps.",
    immersiveReadingStrategyModelPage: "Model-first",
    immersiveReadingStrategyModelPageHelp: "Let the model use page context to choose and translate replacements. More flexible, but speed and cost depend on the model.",
    immersiveReadingAutoWhitelist: "Auto-reading Whitelist",
    immersiveReadingAutoWhitelistHelp: "One rule per line; supports domains, wildcards, and URL fragments. Matching pages run immersive reading automatically when opened.",
    immersiveReadingDifficulty: "Word Difficulty",
    immersiveReadingDifficultyHelp: "Higher levels make the model replace fewer, more difficult words.",
    immersiveReadingMode: "Replacement Mode",
    immersiveReadingTranslation: "Translation",
    immersiveReadingOriginalTranslation: "Original (Translation)",
    immersiveReadingTranslationOriginal: "Translation (Original)",
    immersiveReadingOuterEffects: "Outside-parentheses Effects",
    immersiveReadingInnerEffects: "Parentheses and Inner-text Effects",
    immersiveReadingApplied: "Immersive reading applied",
    displayMode: "Display Mode",
    translationOnly: "Translation Only",
    bilingual: "Original + Translation",
    translationStyle: "Translation Style",
    translationStyleDefault: "Default",
    translationStyleHighlight: "Highlight",
    translationStyleDivider: "Divider",
    translationStyleQuote: "Quote",
    translationStyleBlur: "Blur",
    translationStyleTransparent: "Transparent",
    textEffects: "Text Effects",
    underline: "Solid Underline",
    dashedUnderline: "Dashed Underline",
    largeText: "Large Text",
    smallText: "Small Text",
    bold: "Bold",
    italic: "Italic",
    light: "Muted",
    emphasis: "Emphasis",
    generalConfig: "General Config",
    generalConfigHelp: "Controls search-page enhancements, default context, and appearance.",
    appearanceTheme: "Appearance Theme",
    themeSystem: "Follow System",
    themeLight: "Light",
    themeDark: "Dark",
    autoScrollDuringStreaming: "Auto-scroll While Generating",
    autoScrollDuringStreamingHelp: "Keep the sidebar scrolled to the latest model output while it is generating.",
    autoReply: "Auto Reply",
    autoReplyOff: "Disabled",
    autoReplyMultiline: "Multiline Fields Only",
    autoReplyAll: "All Text Fields",
    autoReplyHelp: "Shows a small icon in editable fields and drafts a brief reply using the current page.",
    autoReplyBlacklistHelp: "When matched, editable fields on the page will not show the auto-reply entry.",
    imageTextExtraction: "Image Text Extraction",
    imageTextExtractionHelp: "Show a text-extraction entry when hovering over images.",
    imageTextExtractionOff: "Disabled",
    imageTextExtractionOn: "Enable by Size",
    imageTextExtractionMinSize: "Minimum Image Size",
    imageTextExtractionMinSizeHelp: "Only show the entry when both displayed width and height are at least this many pixels.",
    imageTextExtractionBlacklistHelp: "When matched, images on the page will not show the text-extraction entry.",
    hoverDefinition: "Hover Definitions",
    hoverDefinitionHelp: "Use the built-in offline dictionary to show a concise one-line definition when the pointer rests on a Chinese term or English word.",
    hoverDefinitionOff: "Disabled",
    hoverDefinitionChinese: "Chinese Only",
    hoverDefinitionEnglish: "English Only",
    hoverDefinitionBoth: "Chinese and English",
    hoverDefinitionShortcut: "Hover Lookup Shortcut",
    hoverDefinitionShortcutHelp: "When enabled, hold Ctrl while hovering over a word to show its definition. Alt or Shift combinations are ignored to avoid immersive translation shortcuts.",
    hoverDefinitionShortcutOff: "No Shortcut",
    hoverDefinitionShortcutCtrl: "Hold Ctrl",
    hoverDefinitionBlacklistHelp: "When matched, hover definitions will not appear on the page.",
    searchAnswerSetting: "Show Model Answers on Search Pages",
    searchAnswerSettingHelp: "When enabled, search result pages show an automatic answer using DuckDuckGo results as reference.",
    includePageByDefault: "Include Current Page by Default",
    includePageByDefaultHelp: "You can still disable page context before sending.",
    webSearchByDefault: "Enable Web Search by Default",
    webSearchByDefaultHelp: "Regular sidebar chats use DuckDuckGo results to supplement the question by default.",
    historyLimit: "Max Saved Chats",
    modelThinkingTimeout: "Model Thinking Timeout (seconds)",
    modelThinkingTimeoutHelp: "0 means no timeout. When it expires, the current response is interrupted with a timeout notice.",
    toolEnable: "Tool Enablement",
    toolEnableHelp: "Choose which tools appear at each entry point and their display order.",
    toolSurfaceSelection: "Selection Overlay",
    toolSurfaceSelectionHelp: "Quick tools shown after selecting text on webpages.",
    toolSurfaceHome: "Sidebar Home",
    toolSurfaceHomeHelp: "Quick entries on the empty sidebar chat screen.",
    toolSurfaceEdge: "Quick Tools",
    toolSurfaceEdgeHelp: "The right-edge launcher on webpages.",
    noToolsEnabled: "No tools enabled",
    chooseTools: "Choose Tools",
    chooseToolsHelp: "Checked order is the display order; use arrows to fine-tune it.",
    builtinTool: "Built-in Tool",
    customTool: "Custom Tool",
    moveUp: "Move Up",
    moveDown: "Move Down",
    dataSync: "Data Sync",
    dataSyncHelp: "Export files and Chrome account sync never include API keys.",
    chromeAccountSync: "Chrome Account Sync",
    autoSyncNonSensitive: "Auto-sync Non-sensitive Settings",
    autoSyncNonSensitiveHelp: "Sync settings, model engine info, and custom tools to your Chrome account; API keys and chat history are never synced.",
    syncToChrome: "Sync to Chrome Account",
    syncFromChrome: "Sync from Chrome Account",
    syncing: "Syncing",
    syncSecretNote: "If a synced model engine is missing its key, enter it again on this device.",
    exportSettings: "Export Settings",
    importSettings: "Import Settings",
    clearConversationHistory: "Clear Chat History",
    providerEditorAria: "Model Engine Settings",
    newEngine: "New Engine",
    providerKind: "API Type",
    providerKindOpenAICompatible: "OpenAI Compatible",
    providerKindAnthropic: "Anthropic",
    providerKindGemini: "Gemini",
    providerKindOllama: "Ollama",
    providerName: "Display Name",
    providerNamePlaceholder: "Example: Company internal model",
    providerBaseUrl: "API URL",
    providerBaseUrlHelp: "Saving will request network permission for this domain.",
    providerModel: "Model ID",
    providerModelPlaceholder: "Provided by your service provider",
    providerModelHelp: "Type manually, or fetch available models from this API.",
    fetchModels: "Fetch Models",
    providerApiKey: "API Key",
    providerApiKeyPlaceholder: "Only stored in this device's extension storage",
    providerSecretStorage: "Key Storage",
    providerSecretLocal: "Persist",
    providerSecretSession: "This Session Only",
    providerTemperature: "Temperature",
    providerMaxTokens: "Max Output Tokens",
    providerMaxContext: "Max Context Characters",
    providerSupportsVision: "Supports Image Input",
    providerSupportsVisionHelp: "Turn off if the model does not support vision.",
    providerCustomHeaders: "Custom Headers",
    providerCustomHeadersHelp: "Optional JSON object; matching fields override default headers.",
    saveEngine: "Save Engine",
    providerSaved: "Model engine saved",
    providerDeleted: "Model engine deleted",
    providerNameRequired: "Enter an engine name",
    providerBaseUrlRequired: "Enter an API URL",
    providerModelRequired: "Enter a model ID",
    duckPermissionRequired: "DuckDuckGo search domain permission is required",
    settingsSyncedToChrome: "Settings synced to Chrome account; keys were not synced",
    settingsSyncedFromChrome: "Settings synced from Chrome account; model keys remain local",
    chromeSyncEnabled: "Chrome account sync enabled; keys will not sync",
    chromeSyncDisabled: "Chrome account sync disabled",
    settingsExported: "Settings exported; keys were not included",
    invalidSettingsFile: "Not a valid WebMind settings file",
    settingsImported: "Settings imported. Re-enter each engine key.",
    localHistoryCleared: "Local chat history cleared",
    processCurrentContent: "Process Current Content",
    localRecords: "Local Records",
    addTool: "Add Tool",
    saveChanges: "Save Changes",
    saveTool: "Save Tool",
    custom: "Custom",
    icon: "Icon",
    toolPrompt: "Prompt",
    mainNav: "Main Navigation",
    connectEngineBannerTitle: "Connect a model engine first",
    connectEngineBannerDescription: "Supports common cloud models, OpenAI-compatible APIs, and local Ollama.",
    pageRecognized: "Recognized",
    enterAttachmentUrl: "Enter a URL to add as an attachment",
    modelEngineRequired: "Add and select a model engine first",
    needPdfPermission: "Page permission is required to read this PDF",
    noReadableTab: "No readable active tab",
    switchingToCurrentPage: "Switching to the current page\u2026",
    readingSelection: "Reading selected content\u2026",
    noSelectionOnPage: "The current page has no selectable content to switch to",
    searchPermissionRequired: "Search domain permission is required to supplement web results",
    searchingWeb: "Searching the web\u2026",
    previewDemoAnswer: "This is a preview answer. Once the extension is loaded and a model engine is configured, real streaming output will appear here.\n\n- Page context can be toggled at any time\n- Bring your own model and key\n- History stays local only",
    currentAnswer: "Current Answer",
    collectingSelection: "Collecting selected content\u2026",
    collectingTranslatableText: "Collecting translatable text\u2026",
    collectingPageBody: "Collecting page body\u2026",
    noTranslatableBlocks: "The current page has no translatable text blocks",
    translatingPageProgress: "Translating page",
    translatingShort: "Working",
    translationWritten: "Written",
    translationComplete: "Done",
    translationApplied: "Translated text added to the page",
    translationRemoved: "Page translation removed",
    pageRestored: "Page restored",
    addImageBeforeAnalyze: "Add an image before running image analysis",
    toolNeedsPrompt: "Tools need a title and a prompt",
    chooseContextFirst: "Choose the current page or selected content in the context first",
    directQuestionPlaceholder: "Ask directly\u2026",
    askContextPlaceholder: "Ask the current page\u2026",
    addEngineFirst: "Add a model engine in Settings first",
    copyFailed: "Copy failed",
    readingPdf: "Reading PDF",
    needSearchDomainPermission: "Search domain permission is required to supplement web results",
    profileVisionDisabled: "\u201C{name}\u201D does not support image input",
    promptImageAnalysis: "Please analyze this image, describe the important details, and answer my next question.",
    promptSummarizeSelection: "Summarize the selected text and keep the key facts, numbers, and conclusions.",
    promptExplainSelection: "Explain the selected text in plain language.",
    promptAutoTranslateSelection: "Automatically translate the selected text: when Chinese dominates, translate into natural English; otherwise translate into Simplified Chinese.",
    promptRewriteSelection: "Rewrite the selected text to be clearer, more natural, and more professional.",
    promptReplySelection: "Draft a ready-to-send reply based on the selected text.",
    modelRequestFailed: "Model request failed",
    savedConversations: "Saved Conversations",
    runtimeUnavailable: "The extension background is unavailable in preview mode",
    backgroundNoResponse: "The extension background did not respond",
    currentPageUnavailable: "The current page is unavailable",
    noActiveTab: "No active tab",
    previewPageTitle: "WebMind Product Research Example",
    previewPageDescription: "A sample article for UI preview",
    previewPageBody: "A browser assistant can use the current page as context to help users summarize, translate, explain, and draft replies. WebMind lets users configure their own model services instead of tying them to one account system.",
    contentTruncated: "content truncated",
    customHeadersJsonObject: "Custom headers must be a JSON object",
    jsonArrayMissing: "The model did not return a parseable JSON array",
    jsonArrayInvalid: "The model response is not an array",
    invalidImageData: "Invalid image data format",
    customToolFallback: "Custom Tool",
    chromeSyncInvalidData: "Invalid WebMind sync data in the Chrome account",
    chromeSyncNoData: "No WebMind sync data exists in the Chrome account yet",
    webSearchFailed: "Web search failed",
    webSearchNoResults: "No web search results could be parsed",
    searchResultSnippet: "Snippet",
    searchSourceMarker: "Search",
    selectionDescription: "{count} characters selected",
    readFileFailed: "Unable to read file",
    readDocumentFailed: "Unable to read document",
    readImageUrlFailed: "Unable to read image",
    readUrlFailed: "Unable to read URL",
    unknownFileType: "unknown",
    sizeLabel: "Size",
    bytes: "bytes",
    unsupportedDocumentText: "This file format cannot be extracted directly in the browser yet.",
    documentName: "Document name",
    pdfDocument: "PDF document",
    attachmentLabel: "Attachment",
    documentAttachment: "Document",
    addressLabel: "Address",
    typeLabel: "Type",
    contentLabel: "Content",
    noExtractedText: "No text could be extracted",
    jsonArrayTranslationInstruction: "The input is a JSON array. Each item has id and text. Translate the text of each item.",
    citationPlaceholderInstruction: "Content such as {{WEBMIND_CITATION_1}} is an immutable citation placeholder. The translation must preserve every placeholder verbatim in the corresponding semantic position; do not expand, explain, rewrite, move to the end, or remove it.",
    translationOutputOnlyInstruction: "Output only the translation of the original text inside <translation-input>. Do not output this prompt, rules, tag names, or the <translation-input> tags.",
    jsonArrayReturnInstruction: 'Return only a JSON array with no code fence. Each item must be {"id":"original id","text":"translation"}.',
    translationWriteFailed: "The translation was generated but could not be written to the page. Please retry.",
    originalSelectedContent: "Original selected content",
    previousResult: "Previous result",
    continueToolInstruction: "Continue running the selected tool based on the previous result.",
    selectionAssistantSystem: "You are a browser selection assistant. Answer only from the selected content and existing result provided by the user. Do not invent unprovided page information.",
    userQuestionLabel: "User question",
    currentResultLabel: "Current result",
    researchSearchPrefix: "Research this search query",
    openSidebarOpening: "Opening sidebar\u2026",
    openSidebarOpened: "Sidebar opened.",
    readCurrentPage: "Reading current page\u2026",
    noProcessablePageBody: "The current page has no body text to process",
    executingTool: "Running tool\u2026",
    closeQuickTools: "Close quick tools",
    generateShortAutoReply: "Generate a short auto reply",
    extractImageText: "Extract Image Text",
    extractingImageText: "Extracting image text\u2026",
    imageTextExtractionResult: "Image Text Extraction",
    imageTextExtractionPrompt: "Extract all visible text from this image. Keep the original language and do not translate; preserve line breaks, reading order, lists, and table structure as much as possible. Output only the extracted text and do not explain.",
    noImageTextFound: "No usable text was recognized",
    retryAnswer: "Retry answer",
    chooseTool: "Choose tool",
    rerunExecution: "Run again",
    reextractImageText: "Extract again",
    runSelectedTool: "Run tool",
    continueQuestionPlaceholder: "Ask a follow-up\u2026",
    modelNoUsableReply: "The model did not return a usable reply",
    autoReplySystem: "You are WebMind's web auto-reply assistant.\nUse the current page, conversation context, and any draft already in the input field to generate a short reply that can be inserted directly.\nPrefer existing replies, comments, emails, or chat messages on the page.\nOutput only the reply body. Do not explain, add a title, or use Markdown.",
    autoReplyPageTitle: "Page title",
    autoReplyPageUrl: "Page URL",
    autoReplyPageDescription: "Page description",
    autoReplyPageContent: "Current page content",
    autoReplyDraft: "Existing input or draft",
    autoReplyEmpty: "The input field is empty.",
    autoReplyRequest: "Generate 1-3 natural, polite, specific, and brief sentences. Match the language of the page conversation or the input draft.",
    contextMenuAsk: "Ask in WebMind",
    contextMenuSummarize: "Summarize selection",
    contextMenuExplain: "Explain selection",
    contextMenuTranslate: "Translate selection",
    contextMenuRewrite: "Rewrite selection",
    contextMenuReply: "Draft reply",
    contextMenuAnalyzeImage: "Analyze this image",
    cannotDetermineTab: "Cannot determine the current tab",
    provideSearchQuery: "Please provide a search query",
    toolNotFound: "Tool not found",
    youtubeVideoNotFound: "No video player was found on the page",
    videoInfoNotFound: "No video information was found on the page",
    noCaptionsAvailable: "This video has no available captions",
    captionsReadFailed: "Unable to read captions",
    captionsLabel: "Captions",
    youtubeVideoTitle: "YouTube video",
    apiKeyMissing: "\u201C{name}\u201D is missing an API key",
    responseStreamMissing: "The model API did not return a response stream",
    providerErrorStatus: "Model API returned {status}: {detail}",
    requestCancelled: "Request cancelled",
    modelThinkingTimeoutMessage: "The model timed out while thinking, so the response was interrupted."
  },
  ja: {
    askSelectionTitle: "\u30B5\u30A4\u30C9\u30D0\u30FC\u3067\u8CEA\u554F",
    askSelectionDescription: "\u73FE\u5728\u306E\u5185\u5BB9\u3092\u30B5\u30A4\u30C9\u30D0\u30FC\u306B\u6E21\u3057\u3066\u7D9A\u3051\u3066\u8CEA\u554F\u3057\u307E\u3059",
    copy: "\u30B3\u30D4\u30FC",
    more: "\u305D\u306E\u4ED6",
    webmindAnswer: "WebMind \u306E\u56DE\u7B54",
    showTools: "WebMind \u30C4\u30FC\u30EB\u3092\u8868\u793A",
    copySelection: "\u9078\u629E\u30C6\u30AD\u30B9\u30C8\u3092\u30B3\u30D4\u30FC",
    openSidebar: "\u30B5\u30A4\u30C9\u30D0\u30FC\u3092\u958B\u304F",
    immersiveTranslateApplied: "\u30DA\u30FC\u30B8\u306B\u30A4\u30DE\u30FC\u30B7\u30D6\u7FFB\u8A33\u3092\u9069\u7528\u3057\u307E\u3057\u305F\u3002",
    searchAnswerSystem: "\u3042\u306A\u305F\u306F WebMind \u306E\u691C\u7D22\u56DE\u7B54\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002\u30E6\u30FC\u30B6\u30FC\u306F\u691C\u7D22\u7D50\u679C\u30DA\u30FC\u30B8\u3092\u898B\u3066\u3044\u307E\u3059\u3002\u63D0\u4F9B\u3055\u308C\u305F DuckDuckGo \u306E\u691C\u7D22\u7D50\u679C\u306B\u57FA\u3065\u3044\u3066\u56DE\u7B54\u3057\u3001\u5FC5\u8981\u306B\u5FDC\u3058\u3066\u7D50\u679C\u5185\u306E\u60C5\u5831\u3092\u512A\u5148\u7684\u306B\u5F15\u7528\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u60C5\u5831\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u308B\u5834\u5408\u306F\u4E0D\u8DB3\u3092\u660E\u793A\u3057\u3001\u63D0\u4F9B\u3055\u308C\u3066\u3044\u306A\u3044\u30DA\u30FC\u30B8\u306B\u30A2\u30AF\u30BB\u30B9\u3057\u305F\u3075\u308A\u3092\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002\u7C21\u6F54\u3067\u69CB\u9020\u5316\u3055\u308C\u305F\u56DE\u7B54\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    searchQuery: "\u691C\u7D22\u8A9E",
    duckResults: "DuckDuckGo \u306E\u691C\u7D22\u7D50\u679C",
    duckNoResults: "DuckDuckGo \u306E\u691C\u7D22\u7D50\u679C\uFF1A\u5229\u7528\u3067\u304D\u308B\u7D50\u679C\u304C\u3042\u308A\u307E\u305B\u3093\u3002",
    searchAnswerRequest: "\u3053\u306E\u691C\u7D22\u8CEA\u554F\u306B\u76F4\u63A5\u7B54\u3048\u3001\u5FC5\u8981\u306A\u3089\u8FFD\u52A0\u3067\u78BA\u8A8D\u3059\u3079\u304D\u65B9\u5411\u3092\u793A\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    sourceCitationInstruction: "\u691C\u7D22\u7D50\u679C\u306B\u57FA\u3065\u304F\u5404\u6BB5\u843D\u306E\u672B\u5C3E\u306B\u306F\u3001\u4E0A\u306E\u7D50\u679C\u756A\u53F7\u306B\u5BFE\u5FDC\u3059\u308B [\u691C\u7D22 N] \u306E\u51FA\u5178\u30DE\u30FC\u30AB\u30FC\u3092\u5FC5\u305A\u4ED8\u3051\u3066\u304F\u3060\u3055\u3044\u3002\u672B\u5C3E\u306B\u51FA\u5178\u30EA\u30B9\u30C8\u3092\u4F5C\u3089\u305A\u3001\u51FA\u5178 URL \u3082\u51FA\u529B\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002",
    browserAssistantSystem: "\u3042\u306A\u305F\u306F\u30D6\u30E9\u30A6\u30B6\u30FC\u5185\u306E\u6587\u7AE0\u4F5C\u6210\u30FB\u8AAD\u89E3\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002\u30E6\u30FC\u30B6\u30FC\u304C\u63D0\u4F9B\u3057\u305F\u30C6\u30AD\u30B9\u30C8\u3092\u5FE0\u5B9F\u306B\u6271\u3044\u3001\u6587\u8108\u3092\u634F\u9020\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002",
    modelToolSystem: "\u3042\u306A\u305F\u306F WebMind \u306E\u30C4\u30FC\u30EB\u5B9F\u884C\u8005\u3067\u3059\u3002\u30C4\u30FC\u30EB\u6307\u793A\u3092\u76F4\u63A5\u5B9F\u884C\u3057\u3001\u5FC5\u8981\u306A\u7D50\u679C\u3060\u3051\u3092\u8FD4\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    unsupportedQuickAction: "\u672A\u5BFE\u5FDC\u306E\u30AF\u30A4\u30C3\u30AF\u64CD\u4F5C\u3067\u3059",
    currentContext: "\u73FE\u5728\u306E\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8",
    assistantSystem: "\u3042\u306A\u305F\u306F WebMind\u3001\u30D6\u30E9\u30A6\u30B6\u30FC\u306E\u30B5\u30A4\u30C9\u30D0\u30FC\u3067\u52D5\u4F5C\u3059\u308B\u8ABF\u67FB\u30FB\u8AAD\u89E3\u30FB\u6587\u7AE0\u4F5C\u6210\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002\u65E2\u5B9A\u3067\u306F\u30E6\u30FC\u30B6\u30FC\u3068\u540C\u3058\u8A00\u8A9E\u3067\u56DE\u7B54\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    assistantGuard: "\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u306B\u660E\u793A\u3055\u308C\u305F\u4E8B\u5B9F\u3068\u63A8\u8AD6\u3092\u53B3\u5BC6\u306B\u533A\u5225\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u308B\u5834\u5408\u306F\u660E\u793A\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u63D0\u4F9B\u3055\u308C\u3066\u3044\u306A\u3044\u5185\u5BB9\u3092\u95B2\u89A7\u3001\u30AF\u30EA\u30C3\u30AF\u3001\u8AAD\u4E86\u3057\u305F\u3068\u4E3B\u5F35\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002",
    selectionContextIntro: "\u4EE5\u4E0B\u306F\u30E6\u30FC\u30B6\u30FC\u304C\u660E\u793A\u7684\u306B\u9078\u629E\u3057\u305F\u30C6\u30AD\u30B9\u30C8\u3067\u3059\u3002\u3053\u306E\u30BF\u30FC\u30F3\u3067\u306F\u3053\u306E\u9078\u629E\u7BC4\u56F2\u3060\u3051\u3092\u6271\u3044\u3001\u30DA\u30FC\u30B8\u5185\u306E\u672A\u63D0\u4F9B\u90E8\u5206\u3078\u5E83\u3052\u306A\u3044\u3067\u304F\u3060\u3055\u3044\uFF1A",
    pageContextIntro: "\u4EE5\u4E0B\u306F\u30E6\u30FC\u30B6\u30FC\u304C\u6DFB\u4ED8\u3057\u305F\u30DA\u30FC\u30B8\u5168\u4F53\u306E\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u3067\u3059\uFF1A",
    translationInputIntro: "\u4EE5\u4E0B\u306E\u5185\u5BB9\u306F\u3001\u4ECA\u56DE\u5FC5\u305A\u7FFB\u8A33\u3059\u308B\u5165\u529B\u672C\u6587\u3067\u3059\uFF1A",
    title: "\u30BF\u30A4\u30C8\u30EB",
    url: "URL",
    description: "\u8AAC\u660E",
    body: "\u672C\u6587\uFF1A",
    selectionOnly: "\u56DE\u7B54\u3067\u306F\u300C\u9078\u629E\u30C6\u30AD\u30B9\u30C8\u300D\u3092\u552F\u4E00\u306E\u30DA\u30FC\u30B8\u8CC7\u6599\u3068\u3057\u3066\u6271\u3063\u3066\u304F\u3060\u3055\u3044\u3002",
    pdfCitation: "PDF \u306E\u8CEA\u554F\u3067\u306F\u3001\u53EF\u80FD\u306A\u9650\u308A\u30DA\u30FC\u30B8\u756A\u53F7\u3092\u5F15\u7528\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    youtubeCitation: "\u52D5\u753B\u306E\u8CEA\u554F\u3067\u306F\u3001\u53EF\u80FD\u306A\u9650\u308A\u5B57\u5E55\u306E\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u3092\u5F15\u7528\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    pageCitation: "\u73FE\u5728\u306E\u30DA\u30FC\u30B8\u3092\u5F15\u7528\u3059\u308B\u3068\u304D\u306F\u300C\u73FE\u5728\u306E\u30DA\u30FC\u30B8\u300D\u3068\u3057\u3001\u95A2\u9023\u7B87\u6240\u3092\u793A\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    searchSummaryIntro: "\u4EE5\u4E0B\u306F\u30A6\u30A7\u30D6\u691C\u7D22\u7D50\u679C\u306E\u8981\u7D04\u3067\u3059\u3002[\u691C\u7D22 1]\u3001[\u691C\u7D22 2] \u306E\u3088\u3046\u306B\u6839\u62E0\u3092\u793A\u3057\u3001\u6700\u5F8C\u306B\u5B9F\u969B\u306B\u4F7F\u7528\u3057\u305F\u60C5\u5831\u6E90\u3092\u5217\u6319\u3057\u3066\u304F\u3060\u3055\u3044\uFF1A",
    noContextImage: "\u3053\u306E\u753B\u50CF\u3092\u5206\u6790\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    noContextAttachment: "\u6DFB\u4ED8\u5185\u5BB9\u306B\u57FA\u3065\u3044\u3066\u56DE\u7B54\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    attachmentIntro: "\u30E6\u30FC\u30B6\u30FC\u304C\u8FFD\u52A0\u3057\u305F\u6DFB\u4ED8\u5185\u5BB9\uFF1A",
    languageSetting: "\u8868\u793A\u8A00\u8A9E",
    languageSettingHelp: "UI \u30C6\u30AD\u30B9\u30C8\u3001\u5185\u8535\u30C4\u30FC\u30EB\u540D\u3001\u65E2\u5B9A\u30D7\u30ED\u30F3\u30D7\u30C8\u306B\u53CD\u6620\u3055\u308C\u307E\u3059\u3002",
    translationLanguageSetting: "\u7FFB\u8A33\u8A00\u8A9E",
    translationLanguageSettingHelp: "\u81EA\u52D5\u306E\u5834\u5408\u306F\u8868\u793A\u8A00\u8A9E\u3068\u82F1\u8A9E\u3092\u5207\u308A\u66FF\u3048\u307E\u3059\u3002\u624B\u52D5\u9078\u629E\u3067\u306F\u5E38\u306B\u9078\u629E\u3057\u305F\u8A00\u8A9E\u306B\u7FFB\u8A33\u3057\u307E\u3059\u3002",
    immersiveTranslationParagraphShortcut: "\u73FE\u5728\u306E\u6BB5\u843D\u306E\u30A4\u30DE\u30FC\u30B7\u30D6\u7FFB\u8A33\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8",
    immersiveTranslationPageShortcut: "\u73FE\u5728\u306E\u30DA\u30FC\u30B8\u306E\u30A4\u30DE\u30FC\u30B7\u30D6\u7FFB\u8A33\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8",
    immersiveTranslationShortcutHelp: "\u6BB5\u843D\u306F\u9078\u629E\u7BC4\u56F2\u307E\u305F\u306F\u6BB5\u843D\u5185\u5BB9\u3001\u30DA\u30FC\u30B8\u306F\u30DA\u30FC\u30B8\u5168\u4F53\u306E\u7FFB\u8A33\u306B\u4F7F\u3044\u307E\u3059\u3002",
    shortcutNone: "\u306A\u3057",
    shortcutAlt: "Alt",
    shortcutCtrlAlt: "Ctrl+Alt",
    navChat: "\u30C1\u30E3\u30C3\u30C8",
    navTools: "\u30C4\u30FC\u30EB",
    navHistory: "\u5C65\u6B74",
    navLogs: "\u30ED\u30B0",
    operationLogs: "\u64CD\u4F5C\u30ED\u30B0",
    operationLogsHelp: "\u88FD\u54C1\u304C\u5B9F\u884C\u3057\u305F\u4E3B\u306A\u64CD\u4F5C\u304C\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u3067\u8868\u793A\u3055\u308C\u307E\u3059\u3002",
    clearLogs: "\u30ED\u30B0\u3092\u6D88\u53BB",
    noOperationLogs: "\u30ED\u30B0\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093",
    logLevelDebug: "\u30C7\u30D0\u30C3\u30B0",
    logLevelInfo: "\u60C5\u5831",
    logLevelSuccess: "\u6210\u529F",
    logLevelWarning: "\u901A\u77E5",
    logLevelError: "\u30A8\u30E9\u30FC",
    logSidepanelReady: "\u30B5\u30A4\u30C9\u30D1\u30CD\u30EB\u306E\u6E96\u5099\u304C\u3067\u304D\u307E\u3057\u305F",
    logSettingsUpdated: "\u8A2D\u5B9A\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F",
    logToolsUpdated: "\u30C4\u30FC\u30EB\u8A2D\u5B9A\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F",
    logPendingAction: "\u30DA\u30FC\u30B8\u64CD\u4F5C\u3092\u53D7\u4FE1\u3057\u307E\u3057\u305F",
    logChatStart: "\u30C1\u30E3\u30C3\u30C8\u3092\u958B\u59CB\u3057\u307E\u3057\u305F",
    logChatDone: "\u56DE\u7B54\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F",
    logChatCancelled: "\u56DE\u7B54\u3092\u30AD\u30E3\u30F3\u30BB\u30EB\u3057\u307E\u3057\u305F",
    logChatStop: "\u30E6\u30FC\u30B6\u30FC\u304C\u56DE\u7B54\u3092\u505C\u6B62\u3057\u307E\u3057\u305F",
    logChatRegenerate: "\u56DE\u7B54\u3092\u518D\u751F\u6210\u3057\u307E\u3059",
    logToolRun: "\u30C4\u30FC\u30EB\u3092\u5B9F\u884C",
    logToolSelected: "\u30C4\u30FC\u30EB\u3092\u9078\u629E",
    logAskSelectionReady: "\u30B5\u30A4\u30C9\u30D1\u30CD\u30EB\u3067\u8CEA\u554F\u3059\u308B\u6E96\u5099\u304C\u3067\u304D\u307E\u3057\u305F",
    logNewChat: "\u65B0\u3057\u3044\u30C1\u30E3\u30C3\u30C8\u3092\u958B\u59CB",
    logAttachmentAdded: "\u6DFB\u4ED8\u3092\u8FFD\u52A0",
    logConversationLoaded: "\u4FDD\u5B58\u6E08\u307F\u30C1\u30E3\u30C3\u30C8\u3092\u8AAD\u307F\u8FBC\u307F",
    logEnabled: "\u6709\u52B9",
    logDisabled: "\u7121\u52B9",
    logRuntimeRequest: "\u5B9F\u884C\u30EA\u30AF\u30A8\u30B9\u30C8",
    displayLogLevel: "\u8868\u793A\u3059\u308B\u30ED\u30B0\u30EC\u30D9\u30EB",
    displayLogLevelHelp: "\u30ED\u30B0\u30D1\u30CD\u30EB\u306B\u306F\u9078\u629E\u3057\u305F\u30EC\u30D9\u30EB\u4EE5\u4E0A\u306E\u307F\u8868\u793A\u3055\u308C\u307E\u3059\u3002\u30C7\u30D0\u30C3\u30B0\u3067\u306F\u5404\u30E2\u30C7\u30EB\u30EA\u30AF\u30A8\u30B9\u30C8\u306E\u8A73\u7D30\u3092\u8868\u793A\u3057\u307E\u3059\u3002",
    cancel: "\u30AD\u30E3\u30F3\u30BB\u30EB",
    close: "\u9589\u3058\u308B",
    save: "\u4FDD\u5B58",
    saving: "\u4FDD\u5B58\u4E2D",
    add: "\u8FFD\u52A0",
    edit: "\u7DE8\u96C6",
    delete: "\u524A\u9664",
    test: "\u30C6\u30B9\u30C8",
    testing: "\u30C6\u30B9\u30C8\u4E2D",
    current: "\u73FE\u5728",
    modelRoles: "\u5F79\u5272",
    defaultModelRole: "\u65E2\u5B9A",
    translationModelRole: "\u7FFB\u8A33",
    visionModelRole: "\u753B\u50CF",
    setDefaultModelRole: "\u65E2\u5B9A\u306E\u30E2\u30C7\u30EB\u306B\u8A2D\u5B9A",
    setTranslationModelRole: "\u7FFB\u8A33\u30E2\u30C7\u30EB\u306B\u8A2D\u5B9A",
    clearTranslationModelRole: "\u7FFB\u8A33\u30E2\u30C7\u30EB\u3092\u89E3\u9664",
    setVisionModelRole: "\u753B\u50CF\u30E2\u30C7\u30EB\u306B\u8A2D\u5B9A",
    clearVisionModelRole: "\u753B\u50CF\u30E2\u30C7\u30EB\u3092\u89E3\u9664",
    visionModelRoleUnavailable: "\u3053\u306E\u30A8\u30F3\u30B8\u30F3\u3067\u306F\u753B\u50CF\u8A8D\u8B58\u304C\u7121\u52B9\u3067\u3059",
    settings: "\u8A2D\u5B9A",
    loading: "\u8AAD\u307F\u8FBC\u307F\u4E2D",
    newChat: "\u65B0\u3057\u3044\u30C1\u30E3\u30C3\u30C8",
    send: "\u9001\u4FE1",
    stop: "\u505C\u6B62",
    restorePage: "\u30DA\u30FC\u30B8\u3092\u5FA9\u5143",
    chooseModel: "\u30E2\u30C7\u30EB\u3092\u9078\u629E",
    currentModelEngine: "\u73FE\u5728\u306E\u30E2\u30C7\u30EB\u30A8\u30F3\u30B8\u30F3",
    selectTool: "\u30C4\u30FC\u30EB\u3092\u9078\u629E",
    selectMoreTools: "\u4ED6\u306E\u30C4\u30FC\u30EB\u3092\u9078\u629E",
    moreTools: "\u305D\u306E\u4ED6\u306E\u30C4\u30FC\u30EB",
    copyContent: "\u5185\u5BB9\u3092\u30B3\u30D4\u30FC",
    copyUrl: "\u30DA\u30FC\u30B8 URL \u3092\u30B3\u30D4\u30FC",
    copied: "\u30B3\u30D4\u30FC\u6E08\u307F",
    regenerate: "\u518D\u56DE\u7B54",
    continueExecution: "\u7D9A\u3051\u3066\u5B9F\u884C",
    replace: "\u7F6E\u63DB",
    closeNotice: "\u901A\u77E5\u3092\u9589\u3058\u308B",
    removeAttachment: "\u6DFB\u4ED8\u3092\u524A\u9664",
    openTools: "\u30C4\u30FC\u30EB\u3092\u958B\u304F",
    currentPage: "\u73FE\u5728\u306E\u30DA\u30FC\u30B8",
    selectedContent: "\u9078\u629E\u5185\u5BB9",
    noneContext: "\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u306A\u3057",
    webSearch: "\u30A6\u30A7\u30D6\u691C\u7D22",
    addAttachment: "\u753B\u50CF\u307E\u305F\u306F\u6587\u66F8\u3092\u8FFD\u52A0",
    addUrl: "URL \u3092\u8FFD\u52A0",
    you: "\u3042\u306A\u305F",
    ordinaryConversation: "\u901A\u5E38\u306E\u30C1\u30E3\u30C3\u30C8",
    usedTool: "\u4F7F\u7528\u3057\u305F\u30C4\u30FC\u30EB",
    questionContext: "\u8CEA\u554F\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8",
    imageChat: "\u753B\u50CF\u30C1\u30E3\u30C3\u30C8",
    openAnyPage: "\u4EFB\u610F\u306E\u30DA\u30FC\u30B8\u3092\u958B\u3044\u3066\u3001\u3053\u3053\u304B\u3089\u59CB\u3081\u3066\u304F\u3060\u3055\u3044\u3002",
    noEnabledTools: "\u3053\u306E\u5834\u6240\u3067\u306F\u307E\u3060\u30C4\u30FC\u30EB\u304C\u6709\u52B9\u306B\u306A\u3063\u3066\u3044\u307E\u305B\u3093",
    toolsPageShowsAll: "\u30C4\u30FC\u30EB\u30DA\u30FC\u30B8\u306B\u306F\u5229\u7528\u53EF\u80FD\u306A\u3059\u3079\u3066\u306E\u30C4\u30FC\u30EB\u304C\u8868\u793A\u3055\u308C\u307E\u3059\u3002",
    noSavedConversations: "\u4FDD\u5B58\u3055\u308C\u305F\u30C1\u30E3\u30C3\u30C8\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093",
    conversationsAutoSave: "1 \u56DE\u306E\u3084\u308A\u53D6\u308A\u304C\u5B8C\u4E86\u3059\u308B\u3068\u30ED\u30FC\u30AB\u30EB\u306B\u81EA\u52D5\u4FDD\u5B58\u3055\u308C\u307E\u3059\u3002",
    languageOptionAuto: "\u81EA\u52D5",
    languageOptionZhCN: "\u7C21\u4F53\u5B57\u4E2D\u56FD\u8A9E",
    languageOptionZhTW: "\u7E41\u4F53\u5B57\u4E2D\u56FD\u8A9E",
    languageOptionEn: "\u82F1\u8A9E",
    languageOptionJa: "\u65E5\u672C\u8A9E",
    languageOptionKo: "\u97D3\u56FD\u8A9E",
    appSubtitle: "\u30ED\u30FC\u30AB\u30EB\u512A\u5148\u306E\u30D6\u30E9\u30A6\u30B6\u30FC\u30E2\u30C7\u30EB\u4F5C\u696D\u53F0",
    modelEngines: "\u30E2\u30C7\u30EB\u30A8\u30F3\u30B8\u30F3",
    modelEnginesDescription: "\u30A2\u30AB\u30A6\u30F3\u30C8\u3084\u30B5\u30D6\u30B9\u30AF\u30EA\u30D7\u30B7\u30E7\u30F3\u306F\u4E0D\u8981\u3067\u3059\u3002\u65E2\u5B9A\u3001\u7FFB\u8A33\u3001\u753B\u50CF\u306E\u5404\u7528\u9014\u306B\u306F\u305D\u308C\u305E\u308C 1 \u3064\u306E\u30E2\u30C7\u30EB\u3092\u6307\u5B9A\u3067\u304D\u3001\u540C\u3058\u30E2\u30C7\u30EB\u306B\u8907\u6570\u306E\u30DE\u30FC\u30AF\u3092\u4ED8\u3051\u3089\u308C\u307E\u3059\u3002\u7FFB\u8A33\u3068\u753B\u50CF\u306E\u5C02\u7528\u6307\u5B9A\u304C\u306A\u3051\u308C\u3070\u65E2\u5B9A\u30E2\u30C7\u30EB\u3092\u4F7F\u7528\u3057\u307E\u3059\u3002\u30A8\u30F3\u30B8\u30F3\u8A2D\u5B9A\u3068\u30AD\u30FC\u306F\u62E1\u5F35\u6A5F\u80FD\u30B9\u30C8\u30EC\u30FC\u30B8\u306B\u4FDD\u5B58\u3055\u308C\u307E\u3059\u3002",
    addEngine: "\u30A8\u30F3\u30B8\u30F3\u3092\u8FFD\u52A0",
    noModelEngines: "\u30E2\u30C7\u30EB\u30A8\u30F3\u30B8\u30F3\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093",
    noModelEnginesHelp: "\u4E3B\u8981\u306A\u30AF\u30E9\u30A6\u30C9\u30E2\u30C7\u30EB\u3001OpenAI \u4E92\u63DB API\u3001\u30ED\u30FC\u30AB\u30EB Ollama \u3092\u8FFD\u52A0\u3067\u304D\u307E\u3059\u3002",
    pageFeatures: "\u30DA\u30FC\u30B8\u6A5F\u80FD",
    pageFeaturesHelp: "\u5404\u30E2\u30B8\u30E5\u30FC\u30EB\u306E\u8A2D\u5B9A\u3092\u5206\u3051\u3066\u7BA1\u7406\u3057\u3001\u5F71\u97FF\u7BC4\u56F2\u3092\u78BA\u8A8D\u3057\u3084\u3059\u304F\u3057\u307E\u3059\u3002",
    selectionOverlay: "\u9078\u629E\u30AA\u30FC\u30D0\u30FC\u30EC\u30A4",
    selectionOverlayHelp: "\u30C6\u30AD\u30B9\u30C8\u9078\u629E\u5F8C\u306B\u8868\u793A\u3055\u308C\u308B\u30D5\u30ED\u30FC\u30C6\u30A3\u30F3\u30B0\u30C4\u30FC\u30EB\u30D0\u30FC\u3092\u5236\u5FA1\u3057\u307E\u3059\u3002",
    selectionOverlayMode: "\u8D77\u52D5\u65B9\u5F0F",
    selectionOverlayMinChars: "\u6700\u5C0F\u9078\u629E\u6587\u5B57\u6570",
    selectionOverlayMinCharsHelp: "\u9078\u629E\u6587\u5B57\u6570\u304C\u3053\u306E\u5024\u4EE5\u4E0A\u306E\u5834\u5408\u306B\u30AA\u30FC\u30D0\u30FC\u30EC\u30A4\u3092\u8868\u793A\u3057\u307E\u3059\u3002\u6700\u5C0F\u5024\u306F 1 \u3067\u3059\u3002",
    selectionOverlayOff: "\u9078\u629E\u30AA\u30FC\u30D0\u30FC\u30EC\u30A4\u3092\u7121\u52B9\u5316",
    selectionOverlayOffHelp: "\u30C6\u30AD\u30B9\u30C8\u9078\u629E\u5F8C\u306B\u30AF\u30A4\u30C3\u30AF\u5165\u53E3\u3092\u8868\u793A\u3057\u307E\u305B\u3093\u3002",
    selectionOverlayAlways: "\u30C4\u30FC\u30EB\u30D0\u30FC\u3092\u76F4\u63A5\u8868\u793A",
    selectionOverlayAlwaysHelp: "\u30C6\u30AD\u30B9\u30C8\u9078\u629E\u5F8C\u3059\u3050\u306B\u5229\u7528\u53EF\u80FD\u306A\u30C4\u30FC\u30EB\u3092\u8868\u793A\u3057\u307E\u3059\u3002",
    selectionOverlayHover: "\u5148\u306B\u30C9\u30C3\u30C8\u3092\u8868\u793A",
    selectionOverlayHoverHelp: "\u30C6\u30AD\u30B9\u30C8\u9078\u629E\u5F8C\u306B\u5C0F\u3055\u306A\u30C9\u30C3\u30C8\u3092\u8868\u793A\u3057\u3001\u30DB\u30D0\u30FC\u3067\u30C4\u30FC\u30EB\u30D0\u30FC\u3092\u5C55\u958B\u3057\u307E\u3059\u3002",
    urlBlacklist: "URL \u30D6\u30E9\u30C3\u30AF\u30EA\u30B9\u30C8",
    selectionOverlayBlacklistHelp: "1 \u884C\u306B 1 \u30EB\u30FC\u30EB\u3002\u30C9\u30E1\u30A4\u30F3\u3001\u30EF\u30A4\u30EB\u30C9\u30AB\u30FC\u30C9\u3001URL \u65AD\u7247\u306B\u5BFE\u5FDC\u3057\u307E\u3059\u3002",
    edgeQuickTools: "\u30AF\u30A4\u30C3\u30AF\u30C4\u30FC\u30EB",
    edgeQuickToolsHelp: "\u7AEF\u306E\u30E1\u30CB\u30E5\u30FC\u3001\u753B\u50CF\u30C6\u30AD\u30B9\u30C8\u62BD\u51FA\u3001\u81EA\u52D5\u8FD4\u4FE1\u3092\u307E\u3068\u3081\u3066\u5236\u5FA1\u3057\u307E\u3059\u3002",
    edgeDockMenu: "\u7AEF\u306E\u30E1\u30CB\u30E5\u30FC",
    edgeQuickToolsEnable: "\u7AEF\u306E\u30E1\u30CB\u30E5\u30FC\u3092\u6709\u52B9\u5316",
    edgeQuickToolsEnableHelp: "\u30AA\u30D5\u306B\u3059\u308B\u3068\u30DA\u30FC\u30B8\u53F3\u7AEF\u306E\u30E1\u30CB\u30E5\u30FC\u306F\u8868\u793A\u3055\u308C\u307E\u305B\u3093\u3002",
    edgeQuickToolsBlacklistHelp: "\u4E00\u81F4\u3057\u305F\u30DA\u30FC\u30B8\u3067\u306F\u53F3\u7AEF\u306E\u30AF\u30A4\u30C3\u30AF\u30C4\u30FC\u30EB\u3092\u8868\u793A\u3057\u307E\u305B\u3093\u3002",
    quickToolsBlacklistHelp: "\u4E00\u81F4\u3057\u305F\u30DA\u30FC\u30B8\u3067\u306F\u3001\u7AEF\u306E\u30E1\u30CB\u30E5\u30FC\u3001\u753B\u50CF\u30C6\u30AD\u30B9\u30C8\u62BD\u51FA\u3001\u81EA\u52D5\u8FD4\u4FE1\u304C\u3059\u3079\u3066\u7121\u52B9\u306B\u306A\u308A\u307E\u3059\u3002",
    immersiveTranslation: "\u30A4\u30DE\u30FC\u30B7\u30D6\u7FFB\u8A33",
    immersiveTranslationHelp: "\u7FFB\u8A33\u6587\u3092\u30DA\u30FC\u30B8\u3078\u66F8\u304D\u623B\u3057\u305F\u5F8C\u306E\u8868\u793A\u65B9\u6CD5\u3092\u5236\u5FA1\u3057\u307E\u3059\u3002",
    immersiveTranslationAutoWhitelist: "\u81EA\u52D5\u30A4\u30DE\u30FC\u30B7\u30D6\u7FFB\u8A33\u30DB\u30EF\u30A4\u30C8\u30EA\u30B9\u30C8",
    immersiveTranslationAutoWhitelistHelp: "1 \u884C\u306B 1 \u30EB\u30FC\u30EB\u3002\u30C9\u30E1\u30A4\u30F3\u3001\u30EF\u30A4\u30EB\u30C9\u30AB\u30FC\u30C9\u3001URL \u65AD\u7247\u306B\u5BFE\u5FDC\u3057\u307E\u3059\u3002\u4E00\u81F4\u3059\u308B\u30DA\u30FC\u30B8\u3092\u958B\u304F\u3068\u81EA\u52D5\u3067\u30A4\u30DE\u30FC\u30B7\u30D6\u7FFB\u8A33\u3092\u5B9F\u884C\u3057\u307E\u3059\u3002",
    immersiveReading: "\u30A4\u30DE\u30FC\u30B7\u30D6\u30EA\u30FC\u30C7\u30A3\u30F3\u30B0",
    immersiveReadingHelp: "\u96E3\u6613\u5EA6\u306B\u5408\u3046\u8A9E\u53E5\u3092\u5B66\u7FD2\u8A00\u8A9E\u3078\u7F6E\u304D\u63DB\u3048\u3001\u6BCD\u8A9E\u3068\u975E\u6BCD\u8A9E\u304C\u6DF7\u5728\u3059\u308B\u8AAD\u66F8\u4F53\u9A13\u3092\u4F5C\u308A\u307E\u3059\u3002",
    immersiveReadingStrategy: "\u5B9F\u884C\u65B9\u5F0F",
    immersiveReadingStrategyLocalFirst: "\u30ED\u30FC\u30AB\u30EB\u512A\u5148",
    immersiveReadingStrategyLocalFirstHelp: "\u30ED\u30FC\u30AB\u30EB\u306E\u8A9E\u5F59\u5224\u5B9A\u3068\u30AA\u30D5\u30E9\u30A4\u30F3\u8F9E\u66F8\u3092\u512A\u5148\u3057\u3001\u901F\u304F\u4F4E\u30B3\u30B9\u30C8\u306B\u51E6\u7406\u3057\u307E\u3059\u3002\u30ED\u30FC\u30AB\u30EB\u7D50\u679C\u304C\u306A\u3044\u5834\u5408\u306E\u307F\u5C11\u91CF\u3092\u30E2\u30C7\u30EB\u3067\u88DC\u5B8C\u3057\u307E\u3059\u3002",
    immersiveReadingStrategyModelPage: "\u30E2\u30C7\u30EB\u512A\u5148",
    immersiveReadingStrategyModelPageHelp: "\u30DA\u30FC\u30B8\u6587\u8108\u3092\u4F7F\u3063\u305F\u9078\u5B9A\u3068\u7FFB\u8A33\u3092\u30E2\u30C7\u30EB\u306B\u4EFB\u305B\u307E\u3059\u3002\u67D4\u8EDF\u3067\u3059\u304C\u3001\u901F\u5EA6\u3068\u30B3\u30B9\u30C8\u306F\u30E2\u30C7\u30EB\u306B\u4F9D\u5B58\u3057\u307E\u3059\u3002",
    immersiveReadingAutoWhitelist: "\u81EA\u52D5\u30A4\u30DE\u30FC\u30B7\u30D6\u30EA\u30FC\u30C7\u30A3\u30F3\u30B0\u30DB\u30EF\u30A4\u30C8\u30EA\u30B9\u30C8",
    immersiveReadingAutoWhitelistHelp: "1 \u884C\u306B 1 \u30EB\u30FC\u30EB\u3002\u30C9\u30E1\u30A4\u30F3\u3001\u30EF\u30A4\u30EB\u30C9\u30AB\u30FC\u30C9\u3001URL \u65AD\u7247\u306B\u5BFE\u5FDC\u3057\u307E\u3059\u3002\u4E00\u81F4\u3059\u308B\u30DA\u30FC\u30B8\u3092\u958B\u304F\u3068\u81EA\u52D5\u3067\u30A4\u30DE\u30FC\u30B7\u30D6\u30EA\u30FC\u30C7\u30A3\u30F3\u30B0\u3092\u5B9F\u884C\u3057\u307E\u3059\u3002",
    immersiveReadingDifficulty: "\u8A9E\u53E5\u306E\u96E3\u6613\u5EA6",
    immersiveReadingDifficultyHelp: "\u96E3\u6613\u5EA6\u304C\u9AD8\u3044\u307B\u3069\u3001\u3088\u308A\u5C11\u6570\u306E\u96E3\u3057\u3044\u8A9E\u53E5\u3060\u3051\u3092\u7F6E\u304D\u63DB\u3048\u307E\u3059\u3002",
    immersiveReadingMode: "\u7F6E\u63DB\u30E2\u30FC\u30C9",
    immersiveReadingTranslation: "\u7FFB\u8A33",
    immersiveReadingOriginalTranslation: "\u539F\u6587\uFF08\u7FFB\u8A33\uFF09",
    immersiveReadingTranslationOriginal: "\u7FFB\u8A33\uFF08\u539F\u6587\uFF09",
    immersiveReadingOuterEffects: "\u62EC\u5F27\u5916\u306E\u6587\u5B57\u52B9\u679C",
    immersiveReadingInnerEffects: "\u62EC\u5F27\u3068\u62EC\u5F27\u5185\u306E\u6587\u5B57\u52B9\u679C",
    immersiveReadingApplied: "\u30A4\u30DE\u30FC\u30B7\u30D6\u30EA\u30FC\u30C7\u30A3\u30F3\u30B0\u3092\u9069\u7528\u3057\u307E\u3057\u305F",
    displayMode: "\u8868\u793A\u30E2\u30FC\u30C9",
    translationOnly: "\u7FFB\u8A33\u306E\u307F",
    bilingual: "\u539F\u6587 + \u7FFB\u8A33",
    translationStyle: "\u7FFB\u8A33\u30B9\u30BF\u30A4\u30EB",
    translationStyleDefault: "\u6A19\u6E96",
    translationStyleHighlight: "\u30CF\u30A4\u30E9\u30A4\u30C8",
    translationStyleDivider: "\u533A\u5207\u308A\u7DDA",
    translationStyleQuote: "\u5F15\u7528",
    translationStyleBlur: "\u307C\u304B\u3057",
    translationStyleTransparent: "\u900F\u660E",
    textEffects: "\u6587\u5B57\u52B9\u679C",
    underline: "\u5B9F\u7DDA\u4E0B\u7DDA",
    dashedUnderline: "\u7834\u7DDA\u4E0B\u7DDA",
    largeText: "\u5927\u304D\u3081\u6587\u5B57",
    smallText: "\u5C0F\u3055\u3081\u6587\u5B57",
    bold: "\u592A\u5B57",
    italic: "\u659C\u4F53",
    light: "\u5F31\u3081",
    emphasis: "\u5F37\u8ABF",
    generalConfig: "\u4E00\u822C\u8A2D\u5B9A",
    generalConfigHelp: "\u691C\u7D22\u30DA\u30FC\u30B8\u62E1\u5F35\u3001\u65E2\u5B9A\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u3001\u5916\u89B3\u3092\u5236\u5FA1\u3057\u307E\u3059\u3002",
    appearanceTheme: "\u5916\u89B3\u30C6\u30FC\u30DE",
    themeSystem: "\u30B7\u30B9\u30C6\u30E0\u306B\u5F93\u3046",
    themeLight: "\u30E9\u30A4\u30C8",
    themeDark: "\u30C0\u30FC\u30AF",
    autoScrollDuringStreaming: "\u751F\u6210\u4E2D\u306B\u81EA\u52D5\u30B9\u30AF\u30ED\u30FC\u30EB",
    autoScrollDuringStreamingHelp: "\u30E2\u30C7\u30EB\u306E\u751F\u6210\u4E2D\u3001\u30B5\u30A4\u30C9\u30D0\u30FC\u3092\u6700\u65B0\u306E\u51FA\u529B\u306B\u81EA\u52D5\u8FFD\u5F93\u3055\u305B\u307E\u3059\u3002",
    autoReply: "\u81EA\u52D5\u8FD4\u4FE1",
    autoReplyOff: "\u7121\u52B9",
    autoReplyMultiline: "\u8907\u6570\u884C\u30D5\u30A3\u30FC\u30EB\u30C9\u306E\u307F",
    autoReplyAll: "\u3059\u3079\u3066\u306E\u30C6\u30AD\u30B9\u30C8\u30D5\u30A3\u30FC\u30EB\u30C9",
    autoReplyHelp: "\u7DE8\u96C6\u53EF\u80FD\u306A\u5165\u529B\u6B04\u306E\u53F3\u4E0A\u306B\u5C0F\u3055\u306A\u30A2\u30A4\u30B3\u30F3\u3092\u8868\u793A\u3057\u3001\u73FE\u5728\u306E\u30DA\u30FC\u30B8\u3092\u53C2\u8003\u306B\u77ED\u3044\u8FD4\u4FE1\u3092\u4F5C\u6210\u3057\u307E\u3059\u3002",
    autoReplyBlacklistHelp: "\u4E00\u81F4\u3057\u305F\u30DA\u30FC\u30B8\u3067\u306F\u5165\u529B\u6B04\u306B\u81EA\u52D5\u8FD4\u4FE1\u306E\u5165\u53E3\u3092\u8868\u793A\u3057\u307E\u305B\u3093\u3002",
    imageTextExtraction: "\u753B\u50CF\u30C6\u30AD\u30B9\u30C8\u62BD\u51FA",
    imageTextExtractionHelp: "\u753B\u50CF\u306B\u30DB\u30D0\u30FC\u3057\u305F\u3068\u304D\u306B\u30C6\u30AD\u30B9\u30C8\u62BD\u51FA\u306E\u5165\u53E3\u3092\u8868\u793A\u3057\u307E\u3059\u3002",
    imageTextExtractionOff: "\u7121\u52B9",
    imageTextExtractionOn: "\u30B5\u30A4\u30BA\u3067\u6709\u52B9\u5316",
    imageTextExtractionMinSize: "\u6700\u5C0F\u753B\u50CF\u30B5\u30A4\u30BA",
    imageTextExtractionMinSizeHelp: "\u8868\u793A\u4E0A\u306E\u5E45\u3068\u9AD8\u3055\u304C\u3069\u3061\u3089\u3082\u3053\u306E\u30D4\u30AF\u30BB\u30EB\u5024\u4EE5\u4E0A\u306E\u753B\u50CF\u3060\u3051\u306B\u5165\u53E3\u3092\u8868\u793A\u3057\u307E\u3059\u3002",
    imageTextExtractionBlacklistHelp: "\u4E00\u81F4\u3057\u305F\u30DA\u30FC\u30B8\u3067\u306F\u753B\u50CF\u306B\u30C6\u30AD\u30B9\u30C8\u62BD\u51FA\u306E\u5165\u53E3\u3092\u8868\u793A\u3057\u307E\u305B\u3093\u3002",
    hoverDefinition: "\u30DB\u30D0\u30FC\u8F9E\u66F8",
    hoverDefinitionHelp: "\u4E2D\u56FD\u8A9E\u306E\u8A9E\u53E5\u307E\u305F\u306F\u82F1\u5358\u8A9E\u306B\u30DE\u30A6\u30B9\u3092\u7F6E\u304F\u3068\u3001\u5185\u8535\u306E\u30AA\u30D5\u30E9\u30A4\u30F3\u8F9E\u66F8\u3092\u4F7F\u7528\u3057\u3066\u7C21\u6F54\u306A\u610F\u5473\u30921\u884C\u3067\u8868\u793A\u3057\u307E\u3059\u3002",
    hoverDefinitionOff: "\u7121\u52B9",
    hoverDefinitionChinese: "\u4E2D\u56FD\u8A9E\u306E\u307F",
    hoverDefinitionEnglish: "\u82F1\u8A9E\u306E\u307F",
    hoverDefinitionBoth: "\u4E2D\u56FD\u8A9E\u3068\u82F1\u8A9E",
    hoverDefinitionShortcut: "\u30DB\u30D0\u30FC\u5358\u8A9E\u691C\u7D22\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8",
    hoverDefinitionShortcutHelp: "\u6709\u52B9\u306B\u3059\u308B\u3068\u3001Ctrl \u3092\u62BC\u3057\u306A\u304C\u3089\u5358\u8A9E\u306B\u30DB\u30D0\u30FC\u3057\u305F\u3068\u304D\u3060\u3051\u610F\u5473\u3092\u8868\u793A\u3057\u307E\u3059\u3002\u7FFB\u8A33\u306E Alt \u3084 Shift \u3068\u306E\u7D44\u307F\u5408\u308F\u305B\u3067\u306F\u52D5\u4F5C\u3057\u307E\u305B\u3093\u3002",
    hoverDefinitionShortcutOff: "\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8\u306A\u3057",
    hoverDefinitionShortcutCtrl: "Ctrl \u3092\u62BC\u3059",
    hoverDefinitionBlacklistHelp: "\u4E00\u81F4\u3057\u305F\u30DA\u30FC\u30B8\u3067\u306F\u30DB\u30D0\u30FC\u8F9E\u66F8\u3092\u8868\u793A\u3057\u307E\u305B\u3093\u3002",
    searchAnswerSetting: "\u691C\u7D22\u30DA\u30FC\u30B8\u306B\u30E2\u30C7\u30EB\u56DE\u7B54\u3092\u8868\u793A",
    searchAnswerSettingHelp: "\u6709\u52B9\u306B\u3059\u308B\u3068\u691C\u7D22\u7D50\u679C\u30DA\u30FC\u30B8\u306E\u53F3\u5074\u306B\u3001DuckDuckGo \u306E\u691C\u7D22\u7D50\u679C\u3092\u53C2\u8003\u306B\u3057\u305F\u81EA\u52D5\u56DE\u7B54\u3092\u8868\u793A\u3057\u307E\u3059\u3002",
    includePageByDefault: "\u73FE\u5728\u306E\u30DA\u30FC\u30B8\u3092\u65E2\u5B9A\u3067\u6DFB\u4ED8",
    includePageByDefaultHelp: "\u9001\u4FE1\u524D\u306B\u5165\u529B\u6B04\u3067\u30DA\u30FC\u30B8\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u3092\u30AA\u30D5\u306B\u3067\u304D\u307E\u3059\u3002",
    webSearchByDefault: "\u30C1\u30E3\u30C3\u30C8\u3067\u30A6\u30A7\u30D6\u691C\u7D22\u3092\u65E2\u5B9A\u3067\u6709\u52B9\u5316",
    webSearchByDefaultHelp: "\u901A\u5E38\u306E\u30B5\u30A4\u30C9\u30D0\u30FC\u30C1\u30E3\u30C3\u30C8\u3067 DuckDuckGo \u306E\u7D50\u679C\u3092\u4F7F\u3063\u3066\u8CEA\u554F\u3092\u88DC\u8DB3\u3057\u307E\u3059\u3002",
    historyLimit: "\u4FDD\u5B58\u3059\u308B\u30C1\u30E3\u30C3\u30C8\u6570\u306E\u4E0A\u9650",
    modelThinkingTimeout: "\u30E2\u30C7\u30EB\u601D\u8003\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\uFF08\u79D2\uFF09",
    modelThinkingTimeoutHelp: "0 \u306F\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\u306A\u3057\u3067\u3059\u3002\u6642\u9593\u3092\u8D85\u3048\u308B\u3068\u73FE\u5728\u306E\u56DE\u7B54\u3092\u4E2D\u65AD\u3057\u3001\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\u3092\u77E5\u3089\u305B\u307E\u3059\u3002",
    toolEnable: "\u30C4\u30FC\u30EB\u6709\u52B9\u5316",
    toolEnableHelp: "\u5404\u5165\u53E3\u306B\u8868\u793A\u3059\u308B\u30C4\u30FC\u30EB\u3068\u8868\u793A\u9806\u3092\u9078\u629E\u3057\u307E\u3059\u3002",
    toolSurfaceSelection: "\u9078\u629E\u30AA\u30FC\u30D0\u30FC\u30EC\u30A4",
    toolSurfaceSelectionHelp: "\u30A6\u30A7\u30D6\u30DA\u30FC\u30B8\u4E0A\u3067\u30C6\u30AD\u30B9\u30C8\u3092\u9078\u629E\u3057\u305F\u5F8C\u306B\u8868\u793A\u3055\u308C\u308B\u30AF\u30A4\u30C3\u30AF\u30C4\u30FC\u30EB\u3002",
    toolSurfaceHome: "\u30B5\u30A4\u30C9\u30D0\u30FC\u9762",
    toolSurfaceHomeHelp: "\u7A7A\u306E\u30B5\u30A4\u30C9\u30D0\u30FC\u30C1\u30E3\u30C3\u30C8\u753B\u9762\u306B\u8868\u793A\u3059\u308B\u30AF\u30A4\u30C3\u30AF\u5165\u53E3\u3002",
    toolSurfaceEdge: "\u30AF\u30A4\u30C3\u30AF\u30C4\u30FC\u30EB",
    toolSurfaceEdgeHelp: "\u30DA\u30FC\u30B8\u53F3\u7AEF\u306B\u5C55\u958B\u3055\u308C\u308B\u5165\u53E3\u3002",
    noToolsEnabled: "\u6709\u52B9\u306A\u30C4\u30FC\u30EB\u306F\u3042\u308A\u307E\u305B\u3093",
    chooseTools: "\u30C4\u30FC\u30EB\u3092\u9078\u629E",
    chooseToolsHelp: "\u30C1\u30A7\u30C3\u30AF\u3057\u305F\u9806\u5E8F\u304C\u8868\u793A\u9806\u3067\u3059\u3002\u77E2\u5370\u3067\u5FAE\u8ABF\u6574\u3067\u304D\u307E\u3059\u3002",
    builtinTool: "\u5185\u8535\u30C4\u30FC\u30EB",
    customTool: "\u30AB\u30B9\u30BF\u30E0\u30C4\u30FC\u30EB",
    moveUp: "\u4E0A\u3078",
    moveDown: "\u4E0B\u3078",
    dataSync: "\u30C7\u30FC\u30BF\u540C\u671F",
    dataSyncHelp: "\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u30D5\u30A1\u30A4\u30EB\u3068 Chrome \u30A2\u30AB\u30A6\u30F3\u30C8\u540C\u671F\u306B\u306F API \u30AD\u30FC\u306F\u542B\u307E\u308C\u307E\u305B\u3093\u3002",
    chromeAccountSync: "Chrome \u30A2\u30AB\u30A6\u30F3\u30C8\u540C\u671F",
    autoSyncNonSensitive: "\u975E\u6A5F\u5BC6\u8A2D\u5B9A\u3092\u81EA\u52D5\u540C\u671F",
    autoSyncNonSensitiveHelp: "\u8A2D\u5B9A\u3001\u30E2\u30C7\u30EB\u30A8\u30F3\u30B8\u30F3\u60C5\u5831\u3001\u30AB\u30B9\u30BF\u30E0\u30C4\u30FC\u30EB\u3092 Chrome \u30A2\u30AB\u30A6\u30F3\u30C8\u306B\u540C\u671F\u3057\u307E\u3059\u3002API \u30AD\u30FC\u3068\u30C1\u30E3\u30C3\u30C8\u5C65\u6B74\u306F\u540C\u671F\u3055\u308C\u307E\u305B\u3093\u3002",
    syncToChrome: "Chrome \u30A2\u30AB\u30A6\u30F3\u30C8\u3078\u540C\u671F",
    syncFromChrome: "Chrome \u30A2\u30AB\u30A6\u30F3\u30C8\u304B\u3089\u540C\u671F",
    syncing: "\u540C\u671F\u4E2D",
    syncSecretNote: "\u540C\u671F\u5F8C\u306E\u30E2\u30C7\u30EB\u30A8\u30F3\u30B8\u30F3\u306B\u30AD\u30FC\u304C\u306A\u3044\u5834\u5408\u306F\u3001\u3053\u306E\u30C7\u30D0\u30A4\u30B9\u3067\u518D\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    exportSettings: "\u8A2D\u5B9A\u3092\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8",
    importSettings: "\u8A2D\u5B9A\u3092\u30A4\u30F3\u30DD\u30FC\u30C8",
    clearConversationHistory: "\u30C1\u30E3\u30C3\u30C8\u5C65\u6B74\u3092\u6D88\u53BB",
    providerEditorAria: "\u30E2\u30C7\u30EB\u30A8\u30F3\u30B8\u30F3\u8A2D\u5B9A",
    newEngine: "\u65B0\u3057\u3044\u30A8\u30F3\u30B8\u30F3",
    providerKind: "API \u7A2E\u5225",
    providerKindOpenAICompatible: "OpenAI \u4E92\u63DB",
    providerKindAnthropic: "Anthropic",
    providerKindGemini: "Gemini",
    providerKindOllama: "Ollama",
    providerName: "\u8868\u793A\u540D",
    providerNamePlaceholder: "\u4F8B: \u793E\u5185\u30E2\u30C7\u30EB",
    providerBaseUrl: "API URL",
    providerBaseUrlHelp: "\u4FDD\u5B58\u6642\u306B\u3053\u306E\u30C9\u30E1\u30A4\u30F3\u3078\u306E\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u6A29\u9650\u3092\u8981\u6C42\u3057\u307E\u3059\u3002",
    providerModel: "\u30E2\u30C7\u30EB ID",
    providerModelPlaceholder: "\u30B5\u30FC\u30D3\u30B9\u63D0\u4F9B\u5143\u304B\u3089\u6307\u5B9A\u3055\u308C\u305F\u3082\u306E",
    providerModelHelp: "\u624B\u5165\u529B\u3059\u308B\u304B\u3001\u53F3\u306E\u30DC\u30BF\u30F3\u3067\u3053\u306E API \u304B\u3089\u53D6\u5F97\u3067\u304D\u307E\u3059\u3002",
    fetchModels: "\u30E2\u30C7\u30EB\u4E00\u89A7\u3092\u53D6\u5F97",
    providerApiKey: "API \u30AD\u30FC",
    providerApiKeyPlaceholder: "\u3053\u306E\u30C7\u30D0\u30A4\u30B9\u306E\u62E1\u5F35\u6A5F\u80FD\u30B9\u30C8\u30EC\u30FC\u30B8\u306B\u306E\u307F\u4FDD\u5B58\u3055\u308C\u307E\u3059",
    providerSecretStorage: "\u30AD\u30FC\u306E\u4FDD\u5B58\u65B9\u6CD5",
    providerSecretLocal: "\u6C38\u7D9A\u4FDD\u5B58",
    providerSecretSession: "\u3053\u306E\u30BB\u30C3\u30B7\u30E7\u30F3\u306E\u307F",
    providerTemperature: "\u6E29\u5EA6",
    providerMaxTokens: "\u6700\u5927\u51FA\u529B Token",
    providerMaxContext: "\u6700\u5927\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u6587\u5B57\u6570",
    providerSupportsVision: "\u753B\u50CF\u5165\u529B\u306B\u5BFE\u5FDC",
    providerSupportsVisionHelp: "\u30E2\u30C7\u30EB\u304C\u8996\u899A\u5165\u529B\u306B\u5BFE\u5FDC\u3057\u306A\u3044\u5834\u5408\u306F\u30AA\u30D5\u306B\u3057\u3066\u304F\u3060\u3055\u3044",
    providerCustomHeaders: "\u30AB\u30B9\u30BF\u30E0\u30D8\u30C3\u30C0\u30FC",
    providerCustomHeadersHelp: "\u4EFB\u610F\u3002JSON \u30AA\u30D6\u30B8\u30A7\u30AF\u30C8\u5F62\u5F0F\u3002\u540C\u540D\u30D5\u30A3\u30FC\u30EB\u30C9\u306F\u65E2\u5B9A\u30D8\u30C3\u30C0\u30FC\u3092\u4E0A\u66F8\u304D\u3057\u307E\u3059\u3002",
    saveEngine: "\u30A8\u30F3\u30B8\u30F3\u3092\u4FDD\u5B58",
    providerSaved: "\u30E2\u30C7\u30EB\u30A8\u30F3\u30B8\u30F3\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F",
    providerDeleted: "\u30E2\u30C7\u30EB\u30A8\u30F3\u30B8\u30F3\u3092\u524A\u9664\u3057\u307E\u3057\u305F",
    providerNameRequired: "\u30A8\u30F3\u30B8\u30F3\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044",
    providerBaseUrlRequired: "API URL \u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044",
    providerModelRequired: "\u30E2\u30C7\u30EB ID \u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044",
    duckPermissionRequired: "DuckDuckGo \u691C\u7D22\u30C9\u30E1\u30A4\u30F3\u306E\u6A29\u9650\u304C\u5FC5\u8981\u3067\u3059",
    settingsSyncedToChrome: "\u8A2D\u5B9A\u3092 Chrome \u30A2\u30AB\u30A6\u30F3\u30C8\u306B\u540C\u671F\u3057\u307E\u3057\u305F\u3002\u30AD\u30FC\u306F\u540C\u671F\u3055\u308C\u307E\u305B\u3093",
    settingsSyncedFromChrome: "Chrome \u30A2\u30AB\u30A6\u30F3\u30C8\u304B\u3089\u8A2D\u5B9A\u3092\u540C\u671F\u3057\u307E\u3057\u305F\u3002\u30E2\u30C7\u30EB\u30AD\u30FC\u306F\u30ED\u30FC\u30AB\u30EB\u306E\u307E\u307E\u3067\u3059",
    chromeSyncEnabled: "Chrome \u30A2\u30AB\u30A6\u30F3\u30C8\u540C\u671F\u3092\u6709\u52B9\u306B\u3057\u307E\u3057\u305F\u3002\u30AD\u30FC\u306F\u540C\u671F\u3055\u308C\u307E\u305B\u3093",
    chromeSyncDisabled: "Chrome \u30A2\u30AB\u30A6\u30F3\u30C8\u540C\u671F\u3092\u7121\u52B9\u306B\u3057\u307E\u3057\u305F",
    settingsExported: "\u8A2D\u5B9A\u3092\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u3057\u307E\u3057\u305F\u3002\u30AD\u30FC\u306F\u542B\u307E\u308C\u3066\u3044\u307E\u305B\u3093",
    invalidSettingsFile: "\u6709\u52B9\u306A WebMind \u8A2D\u5B9A\u30D5\u30A1\u30A4\u30EB\u3067\u306F\u3042\u308A\u307E\u305B\u3093",
    settingsImported: "\u8A2D\u5B9A\u3092\u30A4\u30F3\u30DD\u30FC\u30C8\u3057\u307E\u3057\u305F\u3002\u5404\u30A8\u30F3\u30B8\u30F3\u306E\u30AD\u30FC\u3092\u518D\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044",
    localHistoryCleared: "\u30ED\u30FC\u30AB\u30EB\u306E\u30C1\u30E3\u30C3\u30C8\u5C65\u6B74\u3092\u6D88\u53BB\u3057\u307E\u3057\u305F",
    processCurrentContent: "\u73FE\u5728\u306E\u5185\u5BB9\u3092\u51E6\u7406",
    localRecords: "\u30ED\u30FC\u30AB\u30EB\u8A18\u9332",
    addTool: "\u30C4\u30FC\u30EB\u3092\u8FFD\u52A0",
    saveChanges: "\u5909\u66F4\u3092\u4FDD\u5B58",
    saveTool: "\u30C4\u30FC\u30EB\u3092\u4FDD\u5B58",
    custom: "\u30AB\u30B9\u30BF\u30E0",
    icon: "\u30A2\u30A4\u30B3\u30F3",
    toolPrompt: "\u30D7\u30ED\u30F3\u30D7\u30C8",
    mainNav: "\u30E1\u30A4\u30F3\u30CA\u30D3\u30B2\u30FC\u30B7\u30E7\u30F3",
    connectEngineBannerTitle: "\u5148\u306B\u30E2\u30C7\u30EB\u30A8\u30F3\u30B8\u30F3\u3092\u63A5\u7D9A\u3057\u3066\u304F\u3060\u3055\u3044",
    connectEngineBannerDescription: "\u4E3B\u8981\u306A\u30AF\u30E9\u30A6\u30C9\u30E2\u30C7\u30EB\u3001OpenAI \u4E92\u63DB API\u3001\u30ED\u30FC\u30AB\u30EB Ollama \u306B\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002",
    pageRecognized: "\u8A8D\u8B58\u6E08\u307F",
    enterAttachmentUrl: "\u6DFB\u4ED8\u3068\u3057\u3066\u8FFD\u52A0\u3059\u308B URL \u3092\u5165\u529B",
    modelEngineRequired: "\u5148\u306B\u30E2\u30C7\u30EB\u30A8\u30F3\u30B8\u30F3\u3092\u8FFD\u52A0\u3057\u3066\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044",
    needPdfPermission: "\u3053\u306E PDF \u3092\u8AAD\u3080\u306B\u306F\u30DA\u30FC\u30B8\u6A29\u9650\u304C\u5FC5\u8981\u3067\u3059",
    noReadableTab: "\u8AAD\u307F\u53D6\u308C\u308B\u73FE\u5728\u306E\u30BF\u30D6\u304C\u3042\u308A\u307E\u305B\u3093",
    switchingToCurrentPage: "\u73FE\u5728\u306E\u30DA\u30FC\u30B8\u3078\u5207\u308A\u66FF\u3048\u3066\u3044\u307E\u3059\u2026",
    readingSelection: "\u9078\u629E\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u3063\u3066\u3044\u307E\u3059\u2026",
    noSelectionOnPage: "\u73FE\u5728\u306E\u30DA\u30FC\u30B8\u306B\u306F\u5207\u308A\u66FF\u3048\u53EF\u80FD\u306A\u9078\u629E\u5185\u5BB9\u304C\u3042\u308A\u307E\u305B\u3093",
    searchPermissionRequired: "\u30A6\u30A7\u30D6\u7D50\u679C\u3092\u88DC\u8DB3\u3059\u308B\u306B\u306F\u691C\u7D22\u30C9\u30E1\u30A4\u30F3\u6A29\u9650\u304C\u5FC5\u8981\u3067\u3059",
    searchingWeb: "\u30A6\u30A7\u30D6\u3092\u691C\u7D22\u3057\u3066\u3044\u307E\u3059\u2026",
    previewDemoAnswer: "\u3053\u308C\u306F\u30D7\u30EC\u30D3\u30E5\u30FC\u30E2\u30FC\u30C9\u306E\u30B5\u30F3\u30D7\u30EB\u56DE\u7B54\u3067\u3059\u3002Chrome \u62E1\u5F35\u6A5F\u80FD\u3068\u3057\u3066\u8AAD\u307F\u8FBC\u307F\u3001\u30E2\u30C7\u30EB\u30A8\u30F3\u30B8\u30F3\u3092\u8A2D\u5B9A\u3059\u308B\u3068\u3001\u3053\u3053\u306B\u5B9F\u969B\u306E\u30B9\u30C8\u30EA\u30FC\u30DF\u30F3\u30B0\u51FA\u529B\u304C\u8868\u793A\u3055\u308C\u307E\u3059\u3002\n\n- \u30DA\u30FC\u30B8\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u306F\u3044\u3064\u3067\u3082\u5207\u308A\u66FF\u3048\u53EF\u80FD\n- \u81EA\u5206\u306E\u30E2\u30C7\u30EB\u3068\u30AD\u30FC\u3092\u4F7F\u7528\u53EF\u80FD\n- \u5C65\u6B74\u306F\u30ED\u30FC\u30AB\u30EB\u306B\u306E\u307F\u4FDD\u5B58",
    currentAnswer: "\u73FE\u5728\u306E\u56DE\u7B54",
    collectingSelection: "\u9078\u629E\u5185\u5BB9\u3092\u53CE\u96C6\u3057\u3066\u3044\u307E\u3059\u2026",
    collectingTranslatableText: "\u7FFB\u8A33\u53EF\u80FD\u306A\u30C6\u30AD\u30B9\u30C8\u3092\u53CE\u96C6\u3057\u3066\u3044\u307E\u3059\u2026",
    collectingPageBody: "\u672C\u6587\u3092\u53CE\u96C6\u3057\u3066\u3044\u307E\u3059\u2026",
    noTranslatableBlocks: "\u73FE\u5728\u306E\u30DA\u30FC\u30B8\u306B\u306F\u7FFB\u8A33\u53EF\u80FD\u306A\u672C\u6587\u30D6\u30ED\u30C3\u30AF\u304C\u3042\u308A\u307E\u305B\u3093",
    translatingPageProgress: "\u30DA\u30FC\u30B8\u3092\u7FFB\u8A33\u4E2D",
    translatingShort: "\u7FFB\u8A33\u4E2D",
    translationWritten: "\u66F8\u304D\u8FBC\u307F\u6E08\u307F",
    translationComplete: "\u5B8C\u4E86",
    translationApplied: "\u30DA\u30FC\u30B8\u306B\u8FFD\u52A0\u3057\u307E\u3057\u305F",
    translationRemoved: "\u30DA\u30FC\u30B8\u7FFB\u8A33\u3092\u524A\u9664\u3057\u307E\u3057\u305F",
    pageRestored: "\u30DA\u30FC\u30B8\u3092\u5FA9\u5143\u3057\u307E\u3057\u305F",
    addImageBeforeAnalyze: "\u753B\u50CF\u5206\u6790\u30C4\u30FC\u30EB\u3092\u5B9F\u884C\u3059\u308B\u524D\u306B\u753B\u50CF\u3092\u8FFD\u52A0\u3057\u3066\u304F\u3060\u3055\u3044",
    toolNeedsPrompt: "\u30C4\u30FC\u30EB\u306B\u306F\u30BF\u30A4\u30C8\u30EB\u3068\u30D7\u30ED\u30F3\u30D7\u30C8\u304C\u5FC5\u8981\u3067\u3059",
    chooseContextFirst: "\u5148\u306B\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u3067\u73FE\u5728\u306E\u30DA\u30FC\u30B8\u307E\u305F\u306F\u9078\u629E\u5185\u5BB9\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044",
    directQuestionPlaceholder: "\u76F4\u63A5\u8CEA\u554F\u2026",
    askContextPlaceholder: "\u73FE\u5728\u306E\u30DA\u30FC\u30B8\u306B\u8CEA\u554F\u2026",
    addEngineFirst: "\u5148\u306B\u8A2D\u5B9A\u3067\u30E2\u30C7\u30EB\u30A8\u30F3\u30B8\u30F3\u3092\u8FFD\u52A0\u3057\u3066\u304F\u3060\u3055\u3044",
    copyFailed: "\u30B3\u30D4\u30FC\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
    readingPdf: "PDF \u3092\u8AAD\u307F\u53D6\u308A\u4E2D",
    needSearchDomainPermission: "\u30A6\u30A7\u30D6\u7D50\u679C\u3092\u88DC\u8DB3\u3059\u308B\u306B\u306F\u691C\u7D22\u30C9\u30E1\u30A4\u30F3\u6A29\u9650\u304C\u5FC5\u8981\u3067\u3059",
    profileVisionDisabled: "\u300C{name}\u300D\u306F\u753B\u50CF\u5165\u529B\u304C\u6709\u52B9\u3067\u306F\u3042\u308A\u307E\u305B\u3093",
    promptImageAnalysis: "\u3053\u306E\u753B\u50CF\u3092\u5206\u6790\u3057\u3001\u91CD\u8981\u306A\u8A73\u7D30\u3092\u8AAC\u660E\u3057\u3066\u6B21\u306E\u8CEA\u554F\u306B\u7B54\u3048\u3066\u304F\u3060\u3055\u3044\u3002",
    promptSummarizeSelection: "\u9078\u629E\u30C6\u30AD\u30B9\u30C8\u3092\u8981\u7D04\u3057\u3001\u91CD\u8981\u306A\u4E8B\u5B9F\u3001\u6570\u5B57\u3001\u7D50\u8AD6\u3092\u4FDD\u3063\u3066\u304F\u3060\u3055\u3044\u3002",
    promptExplainSelection: "\u9078\u629E\u30C6\u30AD\u30B9\u30C8\u3092\u5E73\u6613\u306A\u8A00\u8449\u3067\u8AAC\u660E\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    promptAutoTranslateSelection: "\u9078\u629E\u30C6\u30AD\u30B9\u30C8\u3092\u81EA\u52D5\u7FFB\u8A33\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u4E2D\u56FD\u8A9E\u304C\u4E3B\u306A\u3089\u81EA\u7136\u306A\u82F1\u8A9E\u306B\u3001\u305D\u308C\u4EE5\u5916\u304C\u4E3B\u306A\u3089\u65E5\u672C\u8A9E\u306B\u7FFB\u8A33\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    promptRewriteSelection: "\u9078\u629E\u30C6\u30AD\u30B9\u30C8\u3092\u3088\u308A\u660E\u78BA\u3067\u81EA\u7136\u304B\u3064\u5C02\u9580\u7684\u306B\u66F8\u304D\u76F4\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    promptReplySelection: "\u9078\u629E\u30C6\u30AD\u30B9\u30C8\u306B\u57FA\u3065\u3044\u3066\u3001\u305D\u306E\u307E\u307E\u9001\u308C\u308B\u8FD4\u4FE1\u3092\u4E0B\u66F8\u304D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    modelRequestFailed: "\u30E2\u30C7\u30EB\u30EA\u30AF\u30A8\u30B9\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
    savedConversations: "\u4FDD\u5B58\u6E08\u307F\u30C1\u30E3\u30C3\u30C8",
    runtimeUnavailable: "\u30D7\u30EC\u30D3\u30E5\u30FC\u30E2\u30FC\u30C9\u3067\u306F\u62E1\u5F35\u6A5F\u80FD\u306E\u30D0\u30C3\u30AF\u30B0\u30E9\u30A6\u30F3\u30C9\u3092\u547C\u3073\u51FA\u305B\u307E\u305B\u3093",
    backgroundNoResponse: "\u62E1\u5F35\u6A5F\u80FD\u306E\u30D0\u30C3\u30AF\u30B0\u30E9\u30A6\u30F3\u30C9\u304C\u5FDC\u7B54\u3057\u307E\u305B\u3093\u3067\u3057\u305F",
    currentPageUnavailable: "\u73FE\u5728\u306E\u30DA\u30FC\u30B8\u306B\u30A2\u30AF\u30BB\u30B9\u3067\u304D\u307E\u305B\u3093",
    noActiveTab: "\u30A2\u30AF\u30C6\u30A3\u30D6\u306A\u30BF\u30D6\u304C\u3042\u308A\u307E\u305B\u3093",
    previewPageTitle: "WebMind \u88FD\u54C1\u8ABF\u67FB\u30B5\u30F3\u30D7\u30EB",
    previewPageDescription: "UI \u30D7\u30EC\u30D3\u30E5\u30FC\u7528\u306E\u30B5\u30F3\u30D7\u30EB\u8A18\u4E8B",
    previewPageBody: "\u30D6\u30E9\u30A6\u30B6\u30FC\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u306F\u73FE\u5728\u306E\u30DA\u30FC\u30B8\u3092\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u3068\u3057\u3066\u4F7F\u3044\u3001\u8981\u7D04\u3001\u7FFB\u8A33\u3001\u8AAC\u660E\u3001\u8FD4\u4FE1\u4F5C\u6210\u3092\u652F\u63F4\u3067\u304D\u307E\u3059\u3002WebMind \u306F\u5358\u4E00\u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u4F53\u7CFB\u306B\u7E1B\u3089\u308C\u305A\u3001\u30E6\u30FC\u30B6\u30FC\u304C\u81EA\u5206\u306E\u30E2\u30C7\u30EB\u30B5\u30FC\u30D3\u30B9\u3092\u8A2D\u5B9A\u3067\u304D\u307E\u3059\u3002",
    contentTruncated: "\u5185\u5BB9\u306F\u5207\u308A\u8A70\u3081\u3089\u308C\u307E\u3057\u305F",
    customHeadersJsonObject: "\u30AB\u30B9\u30BF\u30E0\u30D8\u30C3\u30C0\u30FC\u306F JSON \u30AA\u30D6\u30B8\u30A7\u30AF\u30C8\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059",
    jsonArrayMissing: "\u30E2\u30C7\u30EB\u304C\u89E3\u6790\u53EF\u80FD\u306A JSON \u914D\u5217\u3092\u8FD4\u3057\u307E\u305B\u3093\u3067\u3057\u305F",
    jsonArrayInvalid: "\u30E2\u30C7\u30EB\u306E\u5FDC\u7B54\u5F62\u5F0F\u304C\u914D\u5217\u3067\u306F\u3042\u308A\u307E\u305B\u3093",
    invalidImageData: "\u753B\u50CF\u30C7\u30FC\u30BF\u5F62\u5F0F\u304C\u7121\u52B9\u3067\u3059",
    customToolFallback: "\u30AB\u30B9\u30BF\u30E0\u30C4\u30FC\u30EB",
    chromeSyncInvalidData: "Chrome \u30A2\u30AB\u30A6\u30F3\u30C8\u5185\u306E WebMind \u540C\u671F\u30C7\u30FC\u30BF\u304C\u7121\u52B9\u3067\u3059",
    chromeSyncNoData: "Chrome \u30A2\u30AB\u30A6\u30F3\u30C8\u306B\u306F\u307E\u3060 WebMind \u540C\u671F\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093",
    webSearchFailed: "\u30A6\u30A7\u30D6\u691C\u7D22\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
    webSearchNoResults: "\u30A6\u30A7\u30D6\u691C\u7D22\u7D50\u679C\u3092\u89E3\u6790\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F",
    searchResultSnippet: "\u6982\u8981",
    searchSourceMarker: "\u691C\u7D22",
    selectionDescription: "{count} \u6587\u5B57\u3092\u9078\u629E\u6E08\u307F",
    readFileFailed: "\u30D5\u30A1\u30A4\u30EB\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093",
    readDocumentFailed: "\u6587\u66F8\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093",
    readImageUrlFailed: "\u753B\u50CF\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093",
    readUrlFailed: "URL \u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093",
    unknownFileType: "\u4E0D\u660E",
    sizeLabel: "\u30B5\u30A4\u30BA",
    bytes: "\u30D0\u30A4\u30C8",
    unsupportedDocumentText: "\u3053\u306E\u30D5\u30A1\u30A4\u30EB\u5F62\u5F0F\u306F\u307E\u3060\u30D6\u30E9\u30A6\u30B6\u30FC\u5185\u3067\u672C\u6587\u3092\u76F4\u63A5\u62BD\u51FA\u3067\u304D\u307E\u305B\u3093\u3002",
    documentName: "\u6587\u66F8\u540D",
    pdfDocument: "PDF \u6587\u66F8",
    attachmentLabel: "\u6DFB\u4ED8",
    documentAttachment: "\u6587\u66F8",
    addressLabel: "\u30A2\u30C9\u30EC\u30B9",
    typeLabel: "\u7A2E\u985E",
    contentLabel: "\u5185\u5BB9",
    noExtractedText: "\u672C\u6587\u3092\u62BD\u51FA\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F",
    jsonArrayTranslationInstruction: "\u5165\u529B\u306F JSON \u914D\u5217\u3067\u3059\u3002\u5404\u9805\u76EE\u306B\u306F id \u3068 text \u304C\u3042\u308A\u307E\u3059\u3002\u5404\u9805\u76EE\u306E text \u3092\u7FFB\u8A33\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    citationPlaceholderInstruction: "{{WEBMIND_CITATION_1}} \u306E\u3088\u3046\u306A\u5185\u5BB9\u306F\u7FFB\u8A33\u4E0D\u53EF\u306E\u5F15\u7528\u30D7\u30EC\u30FC\u30B9\u30DB\u30EB\u30C0\u30FC\u3067\u3059\u3002\u7FFB\u8A33\u6587\u3067\u306F\u5404\u30D7\u30EC\u30FC\u30B9\u30DB\u30EB\u30C0\u30FC\u3092\u5BFE\u5FDC\u3059\u308B\u610F\u5473\u4F4D\u7F6E\u306B\u4E00\u5B57\u4E00\u53E5\u305D\u306E\u307E\u307E\u6B8B\u3057\u3001\u5C55\u958B\u3001\u8AAC\u660E\u3001\u66F8\u304D\u63DB\u3048\u3001\u672B\u5C3E\u3078\u306E\u79FB\u52D5\u3001\u524A\u9664\u3092\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002",
    translationOutputOnlyInstruction: "<translation-input> \u5185\u306E\u539F\u6587\u306E\u7FFB\u8A33\u3060\u3051\u3092\u51FA\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u3053\u306E\u30D7\u30ED\u30F3\u30D7\u30C8\u3001\u898F\u5247\u3001\u30BF\u30B0\u540D\u3001<translation-input> \u30BF\u30B0\u306F\u51FA\u529B\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002",
    jsonArrayReturnInstruction: '\u30B3\u30FC\u30C9\u30D5\u30A7\u30F3\u30B9\u306A\u3057\u3067 JSON \u914D\u5217\u3060\u3051\u3092\u8FD4\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u914D\u5217\u8981\u7D20\u306E\u5F62\u5F0F\u306F {"id":"\u5143\u306E id","text":"\u7FFB\u8A33\u6587"} \u3067\u3059\u3002',
    translationWriteFailed: "\u7FFB\u8A33\u6587\u306F\u751F\u6210\u3055\u308C\u307E\u3057\u305F\u304C\u3001\u5143\u306E\u30DA\u30FC\u30B8\u306B\u66F8\u304D\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002",
    originalSelectedContent: "\u5143\u306E\u9078\u629E\u5185\u5BB9",
    previousResult: "\u524D\u56DE\u306E\u7D50\u679C",
    continueToolInstruction: "\u524D\u56DE\u306E\u7D50\u679C\u306B\u57FA\u3065\u3044\u3066\u9078\u629E\u3057\u305F\u30C4\u30FC\u30EB\u3092\u7D9A\u3051\u3066\u5B9F\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    selectionAssistantSystem: "\u3042\u306A\u305F\u306F\u30D6\u30E9\u30A6\u30B6\u30FC\u306E\u9078\u629E\u30C6\u30AD\u30B9\u30C8\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002\u30E6\u30FC\u30B6\u30FC\u304C\u63D0\u4F9B\u3057\u305F\u9078\u629E\u5185\u5BB9\u3068\u65E2\u5B58\u7D50\u679C\u3060\u3051\u306B\u57FA\u3065\u3044\u3066\u56DE\u7B54\u3057\u3001\u63D0\u4F9B\u3055\u308C\u3066\u3044\u306A\u3044\u30DA\u30FC\u30B8\u60C5\u5831\u3092\u634F\u9020\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002",
    userQuestionLabel: "\u30E6\u30FC\u30B6\u30FC\u306E\u8CEA\u554F",
    currentResultLabel: "\u73FE\u5728\u306E\u7D50\u679C",
    researchSearchPrefix: "\u3053\u306E\u691C\u7D22\u30AF\u30A8\u30EA\u3092\u8ABF\u67FB\u3057\u3066\u304F\u3060\u3055\u3044",
    openSidebarOpening: "\u30B5\u30A4\u30C9\u30D0\u30FC\u3092\u958B\u3044\u3066\u3044\u307E\u3059\u2026",
    openSidebarOpened: "\u30B5\u30A4\u30C9\u30D0\u30FC\u3092\u958B\u304D\u307E\u3057\u305F\u3002",
    readCurrentPage: "\u73FE\u5728\u306E\u30DA\u30FC\u30B8\u3092\u8AAD\u307F\u53D6\u3063\u3066\u3044\u307E\u3059\u2026",
    noProcessablePageBody: "\u73FE\u5728\u306E\u30DA\u30FC\u30B8\u306B\u306F\u51E6\u7406\u3067\u304D\u308B\u672C\u6587\u304C\u3042\u308A\u307E\u305B\u3093",
    executingTool: "\u30C4\u30FC\u30EB\u3092\u5B9F\u884C\u3057\u3066\u3044\u307E\u3059\u2026",
    closeQuickTools: "\u30AF\u30A4\u30C3\u30AF\u30C4\u30FC\u30EB\u3092\u9589\u3058\u308B",
    generateShortAutoReply: "\u77ED\u3044\u81EA\u52D5\u8FD4\u4FE1\u3092\u751F\u6210",
    extractImageText: "\u753B\u50CF\u306E\u6587\u5B57\u3092\u62BD\u51FA",
    extractingImageText: "\u753B\u50CF\u306E\u6587\u5B57\u3092\u62BD\u51FA\u4E2D\u2026",
    imageTextExtractionResult: "\u753B\u50CF\u30C6\u30AD\u30B9\u30C8\u62BD\u51FA",
    imageTextExtractionPrompt: "\u3053\u306E\u753B\u50CF\u306B\u5199\u3063\u3066\u3044\u308B\u53EF\u8996\u30C6\u30AD\u30B9\u30C8\u3092\u3059\u3079\u3066\u62BD\u51FA\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u5143\u306E\u8A00\u8A9E\u3092\u7DAD\u6301\u3057\u3001\u7FFB\u8A33\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002\u6539\u884C\u3001\u8AAD\u307F\u9806\u3001\u7B87\u6761\u66F8\u304D\u3001\u8868\u69CB\u9020\u3092\u3067\u304D\u308B\u3060\u3051\u4FDD\u3061\u3001\u62BD\u51FA\u3057\u305F\u6587\u5B57\u3060\u3051\u3092\u51FA\u529B\u3057\u3066\u8AAC\u660E\u306F\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002",
    noImageTextFound: "\u5229\u7528\u53EF\u80FD\u306A\u6587\u5B57\u304C\u8A8D\u8B58\u3055\u308C\u307E\u305B\u3093\u3067\u3057\u305F",
    retryAnswer: "\u518D\u56DE\u7B54",
    chooseTool: "\u30C4\u30FC\u30EB\u3092\u9078\u629E",
    rerunExecution: "\u518D\u5B9F\u884C",
    reextractImageText: "\u518D\u62BD\u51FA",
    runSelectedTool: "\u30C4\u30FC\u30EB\u3092\u5B9F\u884C",
    continueQuestionPlaceholder: "\u7D9A\u3051\u3066\u8CEA\u554F\u2026",
    modelNoUsableReply: "\u30E2\u30C7\u30EB\u304C\u5229\u7528\u53EF\u80FD\u306A\u8FD4\u4FE1\u3092\u8FD4\u3057\u307E\u305B\u3093\u3067\u3057\u305F",
    autoReplySystem: "\u3042\u306A\u305F\u306F WebMind \u306E\u30A6\u30A7\u30D6\u81EA\u52D5\u8FD4\u4FE1\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002\n\u73FE\u5728\u306E\u30DA\u30FC\u30B8\u5185\u5BB9\u3001\u4F1A\u8A71\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u3001\u5165\u529B\u6B04\u306B\u65E2\u306B\u3042\u308B\u4E0B\u66F8\u304D\u3092\u4F7F\u3063\u3066\u3001\u305D\u306E\u307E\u307E\u5165\u529B\u6B04\u306B\u5165\u308C\u3089\u308C\u308B\u77ED\u3044\u8FD4\u4FE1\u3092\u751F\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n\u30DA\u30FC\u30B8\u5185\u306E\u65E2\u5B58\u306E\u8FD4\u4FE1\u3001\u30B3\u30E1\u30F3\u30C8\u3001\u30E1\u30FC\u30EB\u3001\u30C1\u30E3\u30C3\u30C8\u5185\u5BB9\u3092\u512A\u5148\u7684\u306B\u53C2\u8003\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n\u8FD4\u4FE1\u672C\u6587\u3060\u3051\u3092\u51FA\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u8AAC\u660E\u3001\u30BF\u30A4\u30C8\u30EB\u3001Markdown \u306F\u4E0D\u8981\u3067\u3059\u3002",
    autoReplyPageTitle: "\u30DA\u30FC\u30B8\u30BF\u30A4\u30C8\u30EB",
    autoReplyPageUrl: "\u30DA\u30FC\u30B8 URL",
    autoReplyPageDescription: "\u30DA\u30FC\u30B8\u8AAC\u660E",
    autoReplyPageContent: "\u73FE\u5728\u306E\u30DA\u30FC\u30B8\u5185\u5BB9",
    autoReplyDraft: "\u5165\u529B\u6B04\u306E\u65E2\u5B58\u5185\u5BB9\u307E\u305F\u306F\u4E0B\u66F8\u304D",
    autoReplyEmpty: "\u5165\u529B\u6B04\u306F\u7A7A\u3067\u3059\u3002",
    autoReplyRequest: "\u81EA\u7136\u3067\u4E01\u5BE7\u3001\u5177\u4F53\u7684\u304B\u3064\u77ED\u3044 1-3 \u6587\u306E\u8FD4\u4FE1\u3092\u751F\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u30DA\u30FC\u30B8\u306E\u4F1A\u8A71\u307E\u305F\u306F\u5165\u529B\u6B04\u306E\u4E0B\u66F8\u304D\u306E\u8A00\u8A9E\u306B\u5408\u308F\u305B\u3066\u304F\u3060\u3055\u3044\u3002",
    contextMenuAsk: "WebMind \u3067\u8CEA\u554F",
    contextMenuSummarize: "\u9078\u629E\u7BC4\u56F2\u3092\u8981\u7D04",
    contextMenuExplain: "\u9078\u629E\u7BC4\u56F2\u3092\u8AAC\u660E",
    contextMenuTranslate: "\u9078\u629E\u7BC4\u56F2\u3092\u7FFB\u8A33",
    contextMenuRewrite: "\u9078\u629E\u7BC4\u56F2\u3092\u66F8\u304D\u76F4\u3059",
    contextMenuReply: "\u8FD4\u4FE1\u3092\u4E0B\u66F8\u304D",
    contextMenuAnalyzeImage: "\u3053\u306E\u753B\u50CF\u3092\u5206\u6790",
    cannotDetermineTab: "\u73FE\u5728\u306E\u30BF\u30D6\u3092\u7279\u5B9A\u3067\u304D\u307E\u305B\u3093",
    provideSearchQuery: "\u691C\u7D22\u5185\u5BB9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044",
    toolNotFound: "\u30C4\u30FC\u30EB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093",
    youtubeVideoNotFound: "\u30DA\u30FC\u30B8\u5185\u306B\u52D5\u753B\u30D7\u30EC\u30FC\u30E4\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093",
    videoInfoNotFound: "\u30DA\u30FC\u30B8\u5185\u306B\u52D5\u753B\u60C5\u5831\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093",
    noCaptionsAvailable: "\u3053\u306E\u52D5\u753B\u306B\u306F\u5229\u7528\u53EF\u80FD\u306A\u5B57\u5E55\u304C\u3042\u308A\u307E\u305B\u3093",
    captionsReadFailed: "\u5B57\u5E55\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093",
    captionsLabel: "\u5B57\u5E55",
    youtubeVideoTitle: "YouTube \u52D5\u753B",
    apiKeyMissing: "\u300C{name}\u300D\u306B API \u30AD\u30FC\u304C\u5165\u529B\u3055\u308C\u3066\u3044\u307E\u305B\u3093",
    responseStreamMissing: "\u30E2\u30C7\u30EB API \u304C\u30EC\u30B9\u30DD\u30F3\u30B9\u30B9\u30C8\u30EA\u30FC\u30E0\u3092\u8FD4\u3057\u307E\u305B\u3093\u3067\u3057\u305F",
    providerErrorStatus: "\u30E2\u30C7\u30EB API \u304C {status} \u3092\u8FD4\u3057\u307E\u3057\u305F: {detail}",
    requestCancelled: "\u30EA\u30AF\u30A8\u30B9\u30C8\u306F\u30AD\u30E3\u30F3\u30BB\u30EB\u3055\u308C\u307E\u3057\u305F",
    modelThinkingTimeoutMessage: "\u30E2\u30C7\u30EB\u306E\u601D\u8003\u304C\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\u3057\u305F\u305F\u3081\u3001\u56DE\u7B54\u3092\u4E2D\u65AD\u3057\u307E\u3057\u305F\u3002"
  },
  ko: {
    askSelectionTitle: "\uC0AC\uC774\uB4DC\uBC14\uC5D0\uC11C \uC9C8\uBB38",
    askSelectionDescription: "\uD604\uC7AC \uB0B4\uC6A9\uC744 \uC0AC\uC774\uB4DC\uBC14\uB85C \uBCF4\uB0B4 \uC774\uC5B4\uC11C \uC9C8\uBB38\uD569\uB2C8\uB2E4",
    copy: "\uBCF5\uC0AC",
    more: "\uB354\uBCF4\uAE30",
    webmindAnswer: "WebMind \uB2F5\uBCC0",
    showTools: "WebMind \uB3C4\uAD6C \uD45C\uC2DC",
    copySelection: "\uC120\uD0DD\uD55C \uD14D\uC2A4\uD2B8 \uBCF5\uC0AC",
    openSidebar: "\uC0AC\uC774\uB4DC\uBC14 \uC5F4\uAE30",
    immersiveTranslateApplied: "\uD398\uC774\uC9C0\uC5D0 \uBAB0\uC785\uD615 \uBC88\uC5ED\uC744 \uC801\uC6A9\uD588\uC2B5\uB2C8\uB2E4.",
    searchAnswerSystem: "\uB2F9\uC2E0\uC740 WebMind \uAC80\uC0C9 \uB2F5\uBCC0 \uB3C4\uC6B0\uBBF8\uC785\uB2C8\uB2E4. \uC0AC\uC6A9\uC790\uB294 \uAC80\uC0C9 \uACB0\uACFC \uD398\uC774\uC9C0\uC5D0 \uC788\uC2B5\uB2C8\uB2E4. \uC81C\uACF5\uB41C DuckDuckGo \uC6F9 \uAC80\uC0C9 \uACB0\uACFC\uB97C \uBC14\uD0D5\uC73C\uB85C \uB2F5\uBCC0\uD558\uACE0, \uD544\uC694\uD55C \uACBD\uC6B0 \uACB0\uACFC\uC758 \uC815\uBCF4\uB97C \uC6B0\uC120 \uC778\uC6A9\uD558\uC138\uC694. \uC815\uBCF4\uAC00 \uBD80\uC871\uD558\uBA74 \uBD80\uC871\uD558\uB2E4\uACE0 \uB9D0\uD558\uACE0, \uC81C\uACF5\uB418\uC9C0 \uC54A\uC740 \uD398\uC774\uC9C0\uC5D0 \uC811\uADFC\uD55C \uAC83\uCC98\uB7FC \uB9D0\uD558\uC9C0 \uB9C8\uC138\uC694. \uB2F5\uBCC0\uC740 \uAC04\uACB0\uD558\uACE0 \uAD6C\uC870\uC801\uC73C\uB85C \uC791\uC131\uD558\uC138\uC694.",
    searchQuery: "\uAC80\uC0C9\uC5B4",
    duckResults: "DuckDuckGo \uC6F9 \uAC80\uC0C9 \uACB0\uACFC",
    duckNoResults: "DuckDuckGo \uC6F9 \uAC80\uC0C9 \uACB0\uACFC: \uC0AC\uC6A9\uD560 \uC218 \uC788\uB294 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.",
    searchAnswerRequest: "\uC774 \uAC80\uC0C9 \uC9C8\uBB38\uC5D0 \uC9C1\uC811 \uB2F5\uD558\uACE0, \uD544\uC694\uD558\uBA74 \uCD94\uAC00 \uD655\uC778 \uBC29\uD5A5\uC744 \uC81C\uC2DC\uD558\uC138\uC694.",
    sourceCitationInstruction: "\uAC80\uC0C9 \uACB0\uACFC\uC5D0 \uADFC\uAC70\uD55C \uAC01 \uB2E8\uB77D \uB05D\uC5D0\uB294 \uC704 \uACB0\uACFC \uBC88\uD638\uC5D0 \uB9DE\uB294 [\uAC80\uC0C9 N] \uCD9C\uCC98 \uD45C\uC2DC\uB97C \uBC18\uB4DC\uC2DC \uBD99\uC774\uC138\uC694. \uB9C8\uC9C0\uB9C9\uC5D0 \uCD9C\uCC98 \uBAA9\uB85D\uC744 \uB9CC\uB4E4\uC9C0 \uB9D0\uACE0 \uCD9C\uCC98 URL\uB3C4 \uCD9C\uB825\uD558\uC9C0 \uB9C8\uC138\uC694.",
    browserAssistantSystem: "\uB2F9\uC2E0\uC740 \uBE0C\uB77C\uC6B0\uC800 \uC548\uC758 \uAE00\uC4F0\uAE30 \uBC0F \uC77D\uAE30 \uB3C4\uC6B0\uBBF8\uC785\uB2C8\uB2E4. \uC0AC\uC6A9\uC790\uAC00 \uC81C\uACF5\uD55C \uD14D\uC2A4\uD2B8\uB97C \uCDA9\uC2E4\uD788 \uCC98\uB9AC\uD558\uACE0 \uBB38\uB9E5\uC744 \uC9C0\uC5B4\uB0B4\uC9C0 \uB9C8\uC138\uC694.",
    modelToolSystem: "\uB2F9\uC2E0\uC740 WebMind \uB3C4\uAD6C \uC2E4\uD589\uAE30\uC785\uB2C8\uB2E4. \uB3C4\uAD6C \uC9C0\uC2DC\uB97C \uC9C1\uC811 \uC218\uD589\uD558\uACE0 \uC0AC\uC6A9\uC790\uC5D0\uAC8C \uD544\uC694\uD55C \uACB0\uACFC\uB9CC \uBC18\uD658\uD558\uC138\uC694.",
    unsupportedQuickAction: "\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uBE60\uB978 \uC791\uC5C5\uC785\uB2C8\uB2E4",
    currentContext: "\uD604\uC7AC \uCEE8\uD14D\uC2A4\uD2B8",
    assistantSystem: "\uB2F9\uC2E0\uC740 \uBE0C\uB77C\uC6B0\uC800 \uC0AC\uC774\uB4DC\uBC14\uC5D0\uC11C \uB3D9\uC791\uD558\uB294 \uC870\uC0AC, \uC77D\uAE30, \uC4F0\uAE30 \uB3C4\uC6B0\uBBF8 WebMind\uC785\uB2C8\uB2E4. \uAE30\uBCF8\uC801\uC73C\uB85C \uC0AC\uC6A9\uC790\uC640 \uAC19\uC740 \uC5B8\uC5B4\uB85C \uB2F5\uD558\uC138\uC694.",
    assistantGuard: "\uCEE8\uD14D\uC2A4\uD2B8\uC5D0 \uBA85\uC2DC\uB41C \uC0AC\uC2E4\uACFC \uCD94\uB860\uC744 \uC5C4\uACA9\uD788 \uAD6C\uBD84\uD558\uC138\uC694. \uCEE8\uD14D\uC2A4\uD2B8\uAC00 \uBD80\uC871\uD558\uBA74 \uC9C1\uC811 \uB9D0\uD558\uC138\uC694. \uC81C\uACF5\uB418\uC9C0 \uC54A\uC740 \uB0B4\uC6A9\uC744 \uD0D0\uC0C9, \uD074\uB9AD, \uC77D\uC5C8\uB2E4\uACE0 \uC8FC\uC7A5\uD558\uC9C0 \uB9C8\uC138\uC694.",
    selectionContextIntro: "\uB2E4\uC74C\uC740 \uC0AC\uC6A9\uC790\uAC00 \uC9C1\uC811 \uC120\uD0DD\uD55C \uD14D\uC2A4\uD2B8\uC785\uB2C8\uB2E4. \uC774\uBC88 \uC791\uC5C5\uC740 \uC774 \uC120\uD0DD \uB0B4\uC6A9\uB9CC \uB300\uC0C1\uC73C\uB85C \uD558\uBA70 \uC81C\uACF5\uB418\uC9C0 \uC54A\uC740 \uD398\uC774\uC9C0 \uBD80\uBD84\uC73C\uB85C \uD655\uC7A5\uD558\uC9C0 \uB9C8\uC138\uC694:",
    pageContextIntro: "\uB2E4\uC74C\uC740 \uC0AC\uC6A9\uC790\uAC00 \uCCA8\uBD80\uD55C \uC804\uCCB4 \uD398\uC774\uC9C0 \uCEE8\uD14D\uC2A4\uD2B8\uC785\uB2C8\uB2E4:",
    translationInputIntro: "\uB2E4\uC74C \uB0B4\uC6A9\uC740 \uC774\uBC88\uC5D0 \uBC18\uB4DC\uC2DC \uBC88\uC5ED\uD574\uC57C \uD558\uB294 \uC785\uB825 \uBCF8\uBB38\uC785\uB2C8\uB2E4:",
    title: "\uC81C\uBAA9",
    url: "\uC8FC\uC18C",
    description: "\uC124\uBA85",
    body: "\uBCF8\uBB38:",
    selectionOnly: "\uB2F5\uBCC0 \uC2DC \uC120\uD0DD\uD55C \uD14D\uC2A4\uD2B8\uB97C \uC720\uC77C\uD55C \uD398\uC774\uC9C0 \uC790\uB8CC\uB85C \uB2E4\uB8E8\uC138\uC694.",
    pdfCitation: "PDF \uC9C8\uBB38\uC5D0 \uB2F5\uD560 \uB54C\uB294 \uAC00\uB2A5\uD558\uBA74 \uD398\uC774\uC9C0 \uBC88\uD638\uB97C \uC778\uC6A9\uD558\uC138\uC694.",
    youtubeCitation: "\uB3D9\uC601\uC0C1 \uC9C8\uBB38\uC5D0 \uB2F5\uD560 \uB54C\uB294 \uAC00\uB2A5\uD558\uBA74 \uC790\uB9C9 \uD0C0\uC784\uC2A4\uD0EC\uD504\uB97C \uC778\uC6A9\uD558\uC138\uC694.",
    pageCitation: "\uD604\uC7AC \uD398\uC774\uC9C0\uB97C \uC778\uC6A9\uD560 \uB54C\uB294 '\uD604\uC7AC \uD398\uC774\uC9C0'\uB77C\uACE0 \uD558\uACE0 \uAD00\uB828 \uB2E8\uB77D\uC744 \uBC1D\uD600 \uC8FC\uC138\uC694.",
    searchSummaryIntro: "\uB2E4\uC74C\uC740 \uC6F9 \uAC80\uC0C9 \uACB0\uACFC \uC694\uC57D\uC785\uB2C8\uB2E4. \uB2F5\uBCC0\uC5D0\uC11C [\uAC80\uC0C9 1], [\uAC80\uC0C9 2] \uD615\uC2DD\uC73C\uB85C \uADFC\uAC70\uB97C \uD45C\uC2DC\uD558\uACE0 \uB9C8\uC9C0\uB9C9\uC5D0 \uC2E4\uC81C \uC0AC\uC6A9\uD55C \uCD9C\uCC98\uB97C \uB098\uC5F4\uD558\uC138\uC694:",
    noContextImage: "\uC774 \uC774\uBBF8\uC9C0\uB97C \uBD84\uC11D\uD574 \uC8FC\uC138\uC694.",
    noContextAttachment: "\uCCA8\uBD80 \uB0B4\uC6A9\uC5D0 \uADFC\uAC70\uD574 \uB2F5\uBCC0\uD574 \uC8FC\uC138\uC694.",
    attachmentIntro: "\uC0AC\uC6A9\uC790\uAC00 \uCD94\uAC00\uD55C \uCCA8\uBD80 \uB0B4\uC6A9:",
    languageSetting: "\uC778\uD130\uD398\uC774\uC2A4 \uC5B8\uC5B4",
    languageSettingHelp: "UI \uD14D\uC2A4\uD2B8, \uB0B4\uC7A5 \uB3C4\uAD6C \uC774\uB984, \uAE30\uBCF8 \uD504\uB86C\uD504\uD2B8\uC5D0 \uC801\uC6A9\uB429\uB2C8\uB2E4.",
    translationLanguageSetting: "\uBC88\uC5ED \uC5B8\uC5B4",
    translationLanguageSettingHelp: "\uC790\uB3D9\uC774\uBA74 \uC778\uD130\uD398\uC774\uC2A4 \uC5B8\uC5B4\uC640 \uC601\uC5B4 \uC0AC\uC774\uB97C \uC804\uD658\uD569\uB2C8\uB2E4. \uC218\uB3D9 \uC120\uD0DD\uC740 \uD56D\uC0C1 \uC120\uD0DD\uD55C \uC5B8\uC5B4\uB85C \uBC88\uC5ED\uD569\uB2C8\uB2E4.",
    immersiveTranslationParagraphShortcut: "\uD604\uC7AC \uBB38\uB2E8 \uBAB0\uC785 \uBC88\uC5ED \uB2E8\uCD95\uD0A4",
    immersiveTranslationPageShortcut: "\uD604\uC7AC \uD398\uC774\uC9C0 \uBAB0\uC785 \uBC88\uC5ED \uB2E8\uCD95\uD0A4",
    immersiveTranslationShortcutHelp: "\uBB38\uB2E8\uC740 \uC120\uD0DD \uC601\uC5ED \uB610\uB294 \uBB38\uB2E8 \uB0B4\uC6A9\uC5D0 \uC0AC\uC6A9\uD558\uACE0, \uD398\uC774\uC9C0\uB294 \uC804\uCCB4 \uD398\uC774\uC9C0 \uBC88\uC5ED\uC5D0 \uC0AC\uC6A9\uD569\uB2C8\uB2E4.",
    shortcutNone: "\uC5C6\uC74C",
    shortcutAlt: "Alt",
    shortcutCtrlAlt: "Ctrl+Alt",
    navChat: "\uB300\uD654",
    navTools: "\uB3C4\uAD6C",
    navHistory: "\uAE30\uB85D",
    navLogs: "\uB85C\uADF8",
    operationLogs: "\uC791\uC5C5 \uB85C\uADF8",
    operationLogsHelp: "\uC81C\uD488\uC774 \uC2E4\uD589\uD55C \uC8FC\uC694 \uC791\uC5C5\uC774 \uC2E4\uC2DC\uAC04\uC73C\uB85C \uD45C\uC2DC\uB429\uB2C8\uB2E4.",
    clearLogs: "\uB85C\uADF8 \uBE44\uC6B0\uAE30",
    noOperationLogs: "\uC544\uC9C1 \uB85C\uADF8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4",
    logLevelDebug: "\uB514\uBC84\uADF8",
    logLevelInfo: "\uC815\uBCF4",
    logLevelSuccess: "\uC131\uACF5",
    logLevelWarning: "\uC54C\uB9BC",
    logLevelError: "\uC624\uB958",
    logSidepanelReady: "\uC0AC\uC774\uB4DC\uD328\uB110 \uC900\uBE44 \uC644\uB8CC",
    logSettingsUpdated: "\uC124\uC815 \uC5C5\uB370\uC774\uD2B8\uB428",
    logToolsUpdated: "\uB3C4\uAD6C \uC124\uC815 \uC5C5\uB370\uC774\uD2B8\uB428",
    logPendingAction: "\uD398\uC774\uC9C0 \uC791\uC5C5 \uC218\uC2E0",
    logChatStart: "\uB300\uD654 \uC2DC\uC791",
    logChatDone: "\uB2F5\uBCC0 \uC644\uB8CC",
    logChatCancelled: "\uB2F5\uBCC0 \uCDE8\uC18C\uB428",
    logChatStop: "\uC0AC\uC6A9\uC790\uAC00 \uB2F5\uBCC0\uC744 \uC911\uC9C0\uD568",
    logChatRegenerate: "\uB2F5\uBCC0 \uB2E4\uC2DC \uC0DD\uC131",
    logToolRun: "\uB3C4\uAD6C \uC2E4\uD589",
    logToolSelected: "\uB3C4\uAD6C \uC120\uD0DD",
    logAskSelectionReady: "\uC0AC\uC774\uB4DC\uD328\uB110 \uC9C8\uBB38 \uC900\uBE44 \uC644\uB8CC",
    logNewChat: "\uC0C8 \uB300\uD654 \uC2DC\uC791",
    logAttachmentAdded: "\uCCA8\uBD80 \uCD94\uAC00",
    logConversationLoaded: "\uC800\uC7A5\uB41C \uB300\uD654 \uBD88\uB7EC\uC624\uAE30",
    logEnabled: "\uCF1C\uC9D0",
    logDisabled: "\uAEBC\uC9D0",
    logRuntimeRequest: "\uC2E4\uD589 \uC694\uCCAD",
    displayLogLevel: "\uD45C\uC2DC\uD560 \uB85C\uADF8 \uC218\uC900",
    displayLogLevelHelp: "\uB85C\uADF8 \uD328\uB110\uC740 \uC120\uD0DD\uD55C \uC218\uC900 \uC774\uC0C1\uB9CC \uD45C\uC2DC\uD569\uB2C8\uB2E4. \uB514\uBC84\uADF8\uC5D0\uB294 \uBAA8\uB4E0 \uBAA8\uB378 \uC694\uCCAD\uC758 \uC0C1\uC138 \uAE30\uB85D\uC774 \uD3EC\uD568\uB429\uB2C8\uB2E4.",
    cancel: "\uCDE8\uC18C",
    close: "\uB2EB\uAE30",
    save: "\uC800\uC7A5",
    saving: "\uC800\uC7A5 \uC911",
    add: "\uCD94\uAC00",
    edit: "\uD3B8\uC9D1",
    delete: "\uC0AD\uC81C",
    test: "\uD14C\uC2A4\uD2B8",
    testing: "\uD14C\uC2A4\uD2B8 \uC911",
    current: "\uD604\uC7AC",
    modelRoles: "\uC5ED\uD560",
    defaultModelRole: "\uAE30\uBCF8",
    translationModelRole: "\uBC88\uC5ED",
    visionModelRole: "\uBE44\uC804",
    setDefaultModelRole: "\uAE30\uBCF8 \uBAA8\uB378\uB85C \uC124\uC815",
    setTranslationModelRole: "\uBC88\uC5ED \uBAA8\uB378\uB85C \uC124\uC815",
    clearTranslationModelRole: "\uBC88\uC5ED \uBAA8\uB378 \uD574\uC81C",
    setVisionModelRole: "\uBE44\uC804 \uBAA8\uB378\uB85C \uC124\uC815",
    clearVisionModelRole: "\uBE44\uC804 \uBAA8\uB378 \uD574\uC81C",
    visionModelRoleUnavailable: "\uC774 \uC5D4\uC9C4\uC740 \uC774\uBBF8\uC9C0 \uC778\uC2DD\uC774 \uBE44\uD65C\uC131\uD654\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4",
    settings: "\uC124\uC815",
    loading: "\uBD88\uB7EC\uC624\uB294 \uC911",
    newChat: "\uC0C8 \uB300\uD654",
    send: "\uBCF4\uB0B4\uAE30",
    stop: "\uC911\uC9C0",
    restorePage: "\uD398\uC774\uC9C0 \uBCF5\uC6D0",
    chooseModel: "\uBAA8\uB378 \uC120\uD0DD",
    currentModelEngine: "\uD604\uC7AC \uBAA8\uB378 \uC5D4\uC9C4",
    selectTool: "\uB3C4\uAD6C \uC120\uD0DD",
    selectMoreTools: "\uB354 \uB9CE\uC740 \uB3C4\uAD6C \uC120\uD0DD",
    moreTools: "\uB354 \uB9CE\uC740 \uB3C4\uAD6C",
    copyContent: "\uB0B4\uC6A9 \uBCF5\uC0AC",
    copyUrl: "\uD398\uC774\uC9C0 URL \uBCF5\uC0AC",
    copied: "\uBCF5\uC0AC\uB428",
    regenerate: "\uB2E4\uC2DC \uB2F5\uBCC0",
    continueExecution: "\uACC4\uC18D \uC2E4\uD589",
    replace: "\uBC14\uAFB8\uAE30",
    closeNotice: "\uC54C\uB9BC \uB2EB\uAE30",
    removeAttachment: "\uCCA8\uBD80 \uC0AD\uC81C",
    openTools: "\uB3C4\uAD6C \uC5F4\uAE30",
    currentPage: "\uD604\uC7AC \uD398\uC774\uC9C0",
    selectedContent: "\uC120\uD0DD \uB0B4\uC6A9",
    noneContext: "\uCEE8\uD14D\uC2A4\uD2B8 \uC5C6\uC74C",
    webSearch: "\uC6F9 \uAC80\uC0C9",
    addAttachment: "\uC774\uBBF8\uC9C0 \uB610\uB294 \uBB38\uC11C \uCD94\uAC00",
    addUrl: "URL \uCD94\uAC00",
    you: "\uB098",
    ordinaryConversation: "\uC77C\uBC18 \uB300\uD654",
    usedTool: "\uC0AC\uC6A9\uD55C \uB3C4\uAD6C",
    questionContext: "\uC9C8\uBB38 \uCEE8\uD14D\uC2A4\uD2B8",
    imageChat: "\uC774\uBBF8\uC9C0 \uB300\uD654",
    openAnyPage: "\uC544\uBB34 \uC6F9\uD398\uC774\uC9C0\uB098 \uC5F0 \uB4A4 \uC5EC\uAE30\uC5D0\uC11C \uC2DC\uC791\uD558\uC138\uC694.",
    noEnabledTools: "\uC774 \uC704\uCE58\uC5D0\uB294 \uC544\uC9C1 \uD65C\uC131\uD654\uB41C \uB3C4\uAD6C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4",
    toolsPageShowsAll: "\uB3C4\uAD6C \uD398\uC774\uC9C0\uC5D0\uB294 \uC0AC\uC6A9 \uAC00\uB2A5\uD55C \uBAA8\uB4E0 \uB3C4\uAD6C\uAC00 \uD45C\uC2DC\uB429\uB2C8\uB2E4.",
    noSavedConversations: "\uC800\uC7A5\uB41C \uB300\uD654\uAC00 \uC544\uC9C1 \uC5C6\uC2B5\uB2C8\uB2E4",
    conversationsAutoSave: "\uC9C8\uBB38\uACFC \uB2F5\uBCC0\uC774 \uD55C \uBC88 \uC644\uB8CC\uB418\uBA74 \uB85C\uCEEC\uC5D0 \uC790\uB3D9 \uC800\uC7A5\uB429\uB2C8\uB2E4.",
    languageOptionAuto: "\uC790\uB3D9",
    languageOptionZhCN: "\uC911\uAD6D\uC5B4 \uAC04\uCCB4",
    languageOptionZhTW: "\uC911\uAD6D\uC5B4 \uBC88\uCCB4",
    languageOptionEn: "\uC601\uC5B4",
    languageOptionJa: "\uC77C\uBCF8\uC5B4",
    languageOptionKo: "\uD55C\uAD6D\uC5B4",
    appSubtitle: "\uB85C\uCEEC \uC6B0\uC120 \uBE0C\uB77C\uC6B0\uC800 \uBAA8\uB378 \uC791\uC5C5 \uACF5\uAC04",
    modelEngines: "\uBAA8\uB378 \uC5D4\uC9C4",
    modelEnginesDescription: "\uACC4\uC815\uC774\uB098 \uAD6C\uB3C5\uC774 \uD544\uC694 \uC5C6\uC2B5\uB2C8\uB2E4. \uAE30\uBCF8, \uBC88\uC5ED, \uBE44\uC804 \uC5ED\uD560\uC740 \uAC01\uAC01 \uD558\uB098\uC758 \uBAA8\uB378\uC5D0 \uC9C0\uC815\uD560 \uC218 \uC788\uC73C\uBA70 \uAC19\uC740 \uBAA8\uB378\uC5D0 \uC5EC\uB7EC \uD45C\uC2DC\uB97C \uB3D9\uC2DC\uC5D0 \uBD99\uC77C \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uBC88\uC5ED\uACFC \uBE44\uC804 \uC804\uC6A9 \uBAA8\uB378\uC774 \uC5C6\uC73C\uBA74 \uAE30\uBCF8 \uBAA8\uB378\uC744 \uC0AC\uC6A9\uD569\uB2C8\uB2E4. \uC5D4\uC9C4 \uC124\uC815\uACFC \uD0A4\uB294 \uD655\uC7A5 \uD504\uB85C\uADF8\uB7A8 \uC800\uC7A5\uC18C\uC5D0 \uBCF4\uAD00\uB429\uB2C8\uB2E4.",
    addEngine: "\uC5D4\uC9C4 \uCD94\uAC00",
    noModelEngines: "\uBAA8\uB378 \uC5D4\uC9C4\uC774 \uC544\uC9C1 \uC5C6\uC2B5\uB2C8\uB2E4",
    noModelEnginesHelp: "\uC8FC\uC694 \uD074\uB77C\uC6B0\uB4DC \uBAA8\uB378, OpenAI \uD638\uD658 API \uB610\uB294 \uB85C\uCEEC Ollama\uB97C \uCD94\uAC00\uD558\uC138\uC694.",
    pageFeatures: "\uD398\uC774\uC9C0 \uAE30\uB2A5",
    pageFeaturesHelp: "\uAC01 \uBAA8\uB4C8 \uC124\uC815\uC744 \uBD84\uB9AC\uD574 \uC601\uD5A5 \uBC94\uC704\uB97C \uC27D\uAC8C \uD655\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
    selectionOverlay: "\uC120\uD0DD \uD14D\uC2A4\uD2B8 \uD50C\uB85C\uD305",
    selectionOverlayHelp: "\uD14D\uC2A4\uD2B8 \uC120\uD0DD \uD6C4 \uD45C\uC2DC\uB418\uB294 \uD50C\uB85C\uD305 \uB3C4\uAD6C \uBAA8\uC74C\uC744 \uC81C\uC5B4\uD569\uB2C8\uB2E4.",
    selectionOverlayMode: "\uC2E4\uD589 \uBC29\uC2DD",
    selectionOverlayMinChars: "\uCD5C\uC18C \uC120\uD0DD \uAE00\uC790 \uC218",
    selectionOverlayMinCharsHelp: "\uC120\uD0DD\uD55C \uAE00\uC790 \uC218\uAC00 \uC774 \uAC12 \uC774\uC0C1\uC77C \uB54C \uD50C\uB85C\uD305 \uB3C4\uAD6C\uB97C \uD45C\uC2DC\uD569\uB2C8\uB2E4. \uCD5C\uC19F\uAC12\uC740 1\uC785\uB2C8\uB2E4.",
    selectionOverlayOff: "\uC120\uD0DD \uD50C\uB85C\uD305 \uB044\uAE30",
    selectionOverlayOffHelp: "\uD14D\uC2A4\uD2B8 \uC120\uD0DD \uD6C4 \uBE60\uB978 \uC9C4\uC785\uC810\uC744 \uD45C\uC2DC\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
    selectionOverlayAlways: "\uB3C4\uAD6C \uBAA8\uC74C \uBC14\uB85C \uD45C\uC2DC",
    selectionOverlayAlwaysHelp: "\uD14D\uC2A4\uD2B8 \uC120\uD0DD \uD6C4 \uC0AC\uC6A9 \uAC00\uB2A5\uD55C \uB3C4\uAD6C\uB97C \uC989\uC2DC \uD45C\uC2DC\uD569\uB2C8\uB2E4.",
    selectionOverlayHover: "\uC810 \uBA3C\uC800 \uD45C\uC2DC",
    selectionOverlayHoverHelp: "\uD14D\uC2A4\uD2B8 \uC120\uD0DD \uD6C4 \uC791\uC740 \uC810\uC744 \uD45C\uC2DC\uD558\uACE0, \uB9C8\uC6B0\uC2A4\uB97C \uC62C\uB9AC\uBA74 \uB3C4\uAD6C \uBAA8\uC74C\uC744 \uD3BC\uCE69\uB2C8\uB2E4.",
    urlBlacklist: "URL \uBE14\uB799\uB9AC\uC2A4\uD2B8",
    selectionOverlayBlacklistHelp: "\uD55C \uC904\uC5D0 \uADDC\uCE59 \uD558\uB098. \uB3C4\uBA54\uC778, \uC640\uC77C\uB4DC\uCE74\uB4DC, URL \uC870\uAC01\uC744 \uC9C0\uC6D0\uD569\uB2C8\uB2E4.",
    edgeQuickTools: "\uBE60\uB978 \uB3C4\uAD6C",
    edgeQuickToolsHelp: "\uAC00\uC7A5\uC790\uB9AC \uBA54\uB274, \uC774\uBBF8\uC9C0 \uD14D\uC2A4\uD2B8 \uCD94\uCD9C, \uC790\uB3D9 \uB2F5\uC7A5\uC744 \uD568\uAED8 \uC81C\uC5B4\uD569\uB2C8\uB2E4.",
    edgeDockMenu: "\uAC00\uC7A5\uC790\uB9AC \uBA54\uB274",
    edgeQuickToolsEnable: "\uAC00\uC7A5\uC790\uB9AC \uBA54\uB274 \uC0AC\uC6A9",
    edgeQuickToolsEnableHelp: "\uB044\uBA74 \uC6F9\uD398\uC774\uC9C0 \uC624\uB978\uCABD \uAC00\uC7A5\uC790\uB9AC \uBA54\uB274\uAC00 \uD45C\uC2DC\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
    edgeQuickToolsBlacklistHelp: "\uC77C\uCE58\uD558\uB294 \uD398\uC774\uC9C0\uC5D0\uC11C\uB294 \uC624\uB978\uCABD \uBE60\uB978 \uB3C4\uAD6C\uAC00 \uD45C\uC2DC\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
    quickToolsBlacklistHelp: "\uC77C\uCE58\uD558\uB294 \uD398\uC774\uC9C0\uC5D0\uC11C\uB294 \uAC00\uC7A5\uC790\uB9AC \uBA54\uB274, \uC774\uBBF8\uC9C0 \uD14D\uC2A4\uD2B8 \uCD94\uCD9C, \uC790\uB3D9 \uB2F5\uC7A5\uC774 \uBAA8\uB450 \uBE44\uD65C\uC131\uD654\uB429\uB2C8\uB2E4.",
    immersiveTranslation: "\uBAB0\uC785 \uBC88\uC5ED",
    immersiveTranslationHelp: "\uBC88\uC5ED\uBB38\uC744 \uD398\uC774\uC9C0\uC5D0 \uB2E4\uC2DC \uC4F4 \uB4A4\uC758 \uD45C\uC2DC \uBC29\uC2DD\uC744 \uC81C\uC5B4\uD569\uB2C8\uB2E4.",
    immersiveTranslationAutoWhitelist: "\uC790\uB3D9 \uBAB0\uC785 \uBC88\uC5ED \uD654\uC774\uD2B8\uB9AC\uC2A4\uD2B8",
    immersiveTranslationAutoWhitelistHelp: "\uD55C \uC904\uC5D0 \uADDC\uCE59 \uD558\uB098. \uB3C4\uBA54\uC778, \uC640\uC77C\uB4DC\uCE74\uB4DC, URL \uC870\uAC01\uC744 \uC9C0\uC6D0\uD569\uB2C8\uB2E4. \uC77C\uCE58\uD558\uB294 \uD398\uC774\uC9C0\uB97C \uC5F4\uBA74 \uBAB0\uC785 \uBC88\uC5ED\uC774 \uC790\uB3D9\uC73C\uB85C \uC2E4\uD589\uB429\uB2C8\uB2E4.",
    immersiveReading: "\uBAB0\uC785 \uC77D\uAE30",
    immersiveReadingHelp: "\uB09C\uC774\uB3C4\uC5D0 \uB9DE\uB294 \uB2E8\uC5B4\uB97C \uD559\uC2B5 \uC5B8\uC5B4\uB85C \uBC14\uAFB8\uC5B4 \uBAA8\uAD6D\uC5B4\uC640 \uC678\uAD6D\uC5B4\uAC00 \uC11E\uC778 \uC77D\uAE30\uB97C \uC81C\uACF5\uD569\uB2C8\uB2E4.",
    immersiveReadingStrategy: "\uC2E4\uD589 \uBC29\uC2DD",
    immersiveReadingStrategyLocalFirst: "\uB85C\uCEEC \uC6B0\uC120",
    immersiveReadingStrategyLocalFirstHelp: "\uB85C\uCEEC \uB2E8\uC5B4 \uC120\uBCC4\uACFC \uC624\uD504\uB77C\uC778 \uC0AC\uC804 \uD480\uC774\uB97C \uC6B0\uC120 \uC0AC\uC6A9\uD574 \uB354 \uBE60\uB974\uACE0 \uC800\uB834\uD558\uAC8C \uCC98\uB9AC\uD558\uBA70, \uB85C\uCEEC \uACB0\uACFC\uAC00 \uC5C6\uC744 \uB54C\uB9CC \uC18C\uB7C9\uC744 \uBAA8\uB378\uB85C \uBCF4\uC644\uD569\uB2C8\uB2E4.",
    immersiveReadingStrategyModelPage: "\uBAA8\uB378 \uC6B0\uC120",
    immersiveReadingStrategyModelPageHelp: "\uD398\uC774\uC9C0 \uBB38\uB9E5\uC744 \uBC14\uD0D5\uC73C\uB85C \uBAA8\uB378\uC774 \uAD50\uCCB4 \uB300\uC0C1\uC744 \uACE0\uB974\uACE0 \uBC88\uC5ED\uD569\uB2C8\uB2E4. \uB354 \uC720\uC5F0\uD558\uC9C0\uB9CC \uC18D\uB3C4\uC640 \uBE44\uC6A9\uC740 \uBAA8\uB378\uC5D0 \uB530\uB77C \uB2EC\uB77C\uC9D1\uB2C8\uB2E4.",
    immersiveReadingAutoWhitelist: "\uC790\uB3D9 \uBAB0\uC785 \uC77D\uAE30 \uD654\uC774\uD2B8\uB9AC\uC2A4\uD2B8",
    immersiveReadingAutoWhitelistHelp: "\uD55C \uC904\uC5D0 \uADDC\uCE59 \uD558\uB098. \uB3C4\uBA54\uC778, \uC640\uC77C\uB4DC\uCE74\uB4DC, URL \uC870\uAC01\uC744 \uC9C0\uC6D0\uD569\uB2C8\uB2E4. \uC77C\uCE58\uD558\uB294 \uD398\uC774\uC9C0\uB97C \uC5F4\uBA74 \uBAB0\uC785 \uC77D\uAE30\uAC00 \uC790\uB3D9\uC73C\uB85C \uC2E4\uD589\uB429\uB2C8\uB2E4.",
    immersiveReadingDifficulty: "\uB2E8\uC5B4 \uB09C\uC774\uB3C4",
    immersiveReadingDifficultyHelp: "\uB09C\uC774\uB3C4\uAC00 \uB192\uC744\uC218\uB85D \uB354 \uC801\uACE0 \uC5B4\uB824\uC6B4 \uB2E8\uC5B4\uB9CC \uBC14\uAFC9\uB2C8\uB2E4.",
    immersiveReadingMode: "\uAD50\uCCB4 \uBAA8\uB4DC",
    immersiveReadingTranslation: "\uBC88\uC5ED\uBB38",
    immersiveReadingOriginalTranslation: "\uC6D0\uBB38(\uBC88\uC5ED\uBB38)",
    immersiveReadingTranslationOriginal: "\uBC88\uC5ED\uBB38(\uC6D0\uBB38)",
    immersiveReadingOuterEffects: "\uAD04\uD638 \uBC16 \uBB38\uC790 \uD6A8\uACFC",
    immersiveReadingInnerEffects: "\uAD04\uD638 \uBC0F \uAD04\uD638 \uC548 \uBB38\uC790 \uD6A8\uACFC",
    immersiveReadingApplied: "\uBAB0\uC785 \uC77D\uAE30\uAC00 \uC801\uC6A9\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
    displayMode: "\uD45C\uC2DC \uBAA8\uB4DC",
    translationOnly: "\uBC88\uC5ED\uBB38\uB9CC",
    bilingual: "\uC6D0\uBB38 + \uBC88\uC5ED\uBB38",
    translationStyle: "\uBC88\uC5ED \uC2A4\uD0C0\uC77C",
    translationStyleDefault: "\uAE30\uBCF8",
    translationStyleHighlight: "\uAC15\uC870",
    translationStyleDivider: "\uAD6C\uBD84\uC120",
    translationStyleQuote: "\uC778\uC6A9",
    translationStyleBlur: "\uD750\uB9BC",
    translationStyleTransparent: "\uD22C\uBA85",
    textEffects: "\uBB38\uC790 \uD6A8\uACFC",
    underline: "\uC2E4\uC120 \uBC11\uC904",
    dashedUnderline: "\uC810\uC120 \uBC11\uC904",
    largeText: "\uD070 \uAE00\uC790",
    smallText: "\uC791\uC740 \uAE00\uC790",
    bold: "\uAD75\uAC8C",
    italic: "\uAE30\uC6B8\uC784",
    light: "\uC57D\uD654",
    emphasis: "\uAC15\uC870",
    generalConfig: "\uC77C\uBC18 \uC124\uC815",
    generalConfigHelp: "\uAC80\uC0C9 \uD398\uC774\uC9C0 \uAC15\uD654, \uAE30\uBCF8 \uCEE8\uD14D\uC2A4\uD2B8, \uC678\uAD00\uC744 \uC81C\uC5B4\uD569\uB2C8\uB2E4.",
    appearanceTheme: "\uC678\uAD00 \uD14C\uB9C8",
    themeSystem: "\uC2DC\uC2A4\uD15C \uB530\uB984",
    themeLight: "\uBC1D\uAC8C",
    themeDark: "\uC5B4\uB461\uAC8C",
    autoScrollDuringStreaming: "\uC0DD\uC131 \uC911 \uC790\uB3D9 \uC2A4\uD06C\uB864",
    autoScrollDuringStreamingHelp: "\uBAA8\uB378\uC774 \uC0DD\uC131\uD558\uB294 \uB3D9\uC548 \uC0AC\uC774\uB4DC\uBC14\uAC00 \uCD5C\uC2E0 \uCD9C\uB825\uC73C\uB85C \uC790\uB3D9 \uC2A4\uD06C\uB864\uB429\uB2C8\uB2E4.",
    autoReply: "\uC790\uB3D9 \uB2F5\uC7A5",
    autoReplyOff: "\uC0AC\uC6A9 \uC548 \uD568",
    autoReplyMultiline: "\uC5EC\uB7EC \uC904 \uC785\uB825\uB780\uB9CC",
    autoReplyAll: "\uBAA8\uB4E0 \uD14D\uC2A4\uD2B8 \uC785\uB825\uB780",
    autoReplyHelp: "\uD3B8\uC9D1 \uAC00\uB2A5\uD55C \uC785\uB825\uB780 \uC624\uB978\uCABD \uC704\uC5D0 \uC791\uC740 \uC544\uC774\uCF58\uC744 \uD45C\uC2DC\uD558\uACE0, \uD604\uC7AC \uD398\uC774\uC9C0\uB97C \uCC38\uACE0\uD574 \uC9E7\uC740 \uB2F5\uC7A5\uC744 \uC0DD\uC131\uD569\uB2C8\uB2E4.",
    autoReplyBlacklistHelp: "\uC77C\uCE58\uD558\uB294 \uD398\uC774\uC9C0\uC5D0\uC11C\uB294 \uC785\uB825\uB780\uC5D0 \uC790\uB3D9 \uB2F5\uC7A5 \uC9C4\uC785\uC810\uC774 \uD45C\uC2DC\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
    imageTextExtraction: "\uC774\uBBF8\uC9C0 \uD14D\uC2A4\uD2B8 \uCD94\uCD9C",
    imageTextExtractionHelp: "\uC774\uBBF8\uC9C0\uC5D0 \uB9C8\uC6B0\uC2A4\uB97C \uC62C\uB9AC\uBA74 \uD14D\uC2A4\uD2B8 \uCD94\uCD9C \uC9C4\uC785\uC810\uC744 \uD45C\uC2DC\uD569\uB2C8\uB2E4.",
    imageTextExtractionOff: "\uC0AC\uC6A9 \uC548 \uD568",
    imageTextExtractionOn: "\uD06C\uAE30\uB85C \uC0AC\uC6A9",
    imageTextExtractionMinSize: "\uCD5C\uC18C \uC774\uBBF8\uC9C0 \uD06C\uAE30",
    imageTextExtractionMinSizeHelp: "\uD45C\uC2DC\uB41C \uB108\uBE44\uC640 \uB192\uC774\uAC00 \uBAA8\uB450 \uC774 \uD53D\uC140 \uAC12 \uC774\uC0C1\uC778 \uC774\uBBF8\uC9C0\uC5D0\uB9CC \uC9C4\uC785\uC810\uC744 \uD45C\uC2DC\uD569\uB2C8\uB2E4.",
    imageTextExtractionBlacklistHelp: "\uC77C\uCE58\uD558\uB294 \uD398\uC774\uC9C0\uC5D0\uC11C\uB294 \uC774\uBBF8\uC9C0\uC5D0 \uD14D\uC2A4\uD2B8 \uCD94\uCD9C \uC9C4\uC785\uC810\uC774 \uD45C\uC2DC\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
    hoverDefinition: "\uB9C8\uC6B0\uC2A4 \uC624\uBC84 \uB73B\uD480\uC774",
    hoverDefinitionHelp: "\uC911\uAD6D\uC5B4 \uC5B4\uAD6C\uB098 \uC601\uC5B4 \uB2E8\uC5B4 \uC704\uC5D0 \uB9C8\uC6B0\uC2A4\uB97C \uC7A0\uC2DC \uB450\uBA74 \uB0B4\uC7A5 \uC624\uD504\uB77C\uC778 \uC0AC\uC804\uC744 \uC0AC\uC6A9\uD574 \uD55C \uC904\uC758 \uAC04\uB2E8\uD55C \uB73B\uC744 \uD45C\uC2DC\uD569\uB2C8\uB2E4.",
    hoverDefinitionOff: "\uC0AC\uC6A9 \uC548 \uD568",
    hoverDefinitionChinese: "\uC911\uAD6D\uC5B4\uB9CC",
    hoverDefinitionEnglish: "\uC601\uC5B4\uB9CC",
    hoverDefinitionBoth: "\uC911\uAD6D\uC5B4\uC640 \uC601\uC5B4",
    hoverDefinitionShortcut: "\uD638\uBC84 \uB2E8\uC5B4 \uCC3E\uAE30 \uB2E8\uCD95\uD0A4",
    hoverDefinitionShortcutHelp: "\uCF1C\uBA74 Ctrl\uC744 \uB204\uB978 \uCC44 \uB2E8\uC5B4\uC5D0 \uB9C8\uC6B0\uC2A4\uB97C \uC62C\uB9B4 \uB54C\uB9CC \uB73B\uC744 \uD45C\uC2DC\uD569\uB2C8\uB2E4. \uBC88\uC5ED\uC758 Alt \uB610\uB294 Shift \uC870\uD569\uC5D0\uC11C\uB294 \uC791\uB3D9\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
    hoverDefinitionShortcutOff: "\uB2E8\uCD95\uD0A4 \uC0AC\uC6A9 \uC548 \uD568",
    hoverDefinitionShortcutCtrl: "Ctrl \uB204\uB974\uAE30",
    hoverDefinitionBlacklistHelp: "\uC77C\uCE58\uD558\uB294 \uD398\uC774\uC9C0\uC5D0\uC11C\uB294 \uB9C8\uC6B0\uC2A4 \uC624\uBC84 \uB73B\uD480\uC774\uAC00 \uD45C\uC2DC\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
    searchAnswerSetting: "\uAC80\uC0C9 \uD398\uC774\uC9C0\uC5D0 \uBAA8\uB378 \uB2F5\uBCC0 \uD45C\uC2DC",
    searchAnswerSettingHelp: "\uCF1C\uBA74 \uAC80\uC0C9 \uACB0\uACFC \uD398\uC774\uC9C0 \uC624\uB978\uCABD\uC5D0 DuckDuckGo \uAC80\uC0C9 \uACB0\uACFC\uB97C \uCC38\uACE0\uD55C \uC790\uB3D9 \uB2F5\uBCC0\uC744 \uD45C\uC2DC\uD569\uB2C8\uB2E4.",
    includePageByDefault: "\uD604\uC7AC \uD398\uC774\uC9C0 \uAE30\uBCF8 \uCCA8\uBD80",
    includePageByDefaultHelp: "\uBCF4\uB0B4\uAE30 \uC804\uC5D0 \uC785\uB825 \uC601\uC5ED\uC5D0\uC11C \uD398\uC774\uC9C0 \uCEE8\uD14D\uC2A4\uD2B8\uB97C \uB04C \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
    webSearchByDefault: "\uB300\uD654\uC5D0\uC11C \uC6F9 \uAC80\uC0C9 \uAE30\uBCF8 \uC0AC\uC6A9",
    webSearchByDefaultHelp: "\uC77C\uBC18 \uC0AC\uC774\uB4DC\uBC14 \uB300\uD654\uC5D0\uC11C DuckDuckGo \uACB0\uACFC\uB85C \uC9C8\uBB38\uC744 \uBCF4\uC644\uD569\uB2C8\uB2E4.",
    historyLimit: "\uCD5C\uB300 \uC800\uC7A5 \uB300\uD654 \uC218",
    modelThinkingTimeout: "\uBAA8\uB378 \uC0AC\uACE0 \uC2DC\uAC04 \uCD08\uACFC (\uCD08)",
    modelThinkingTimeoutHelp: "0\uC740 \uC2DC\uAC04 \uC81C\uD55C\uC774 \uC5C6\uB2E4\uB294 \uB73B\uC785\uB2C8\uB2E4. \uC2DC\uAC04\uC774 \uCD08\uACFC\uB418\uBA74 \uD604\uC7AC \uB2F5\uBCC0\uC744 \uC911\uB2E8\uD558\uACE0 \uC2DC\uAC04 \uCD08\uACFC\uB97C \uC54C\uB9BD\uB2C8\uB2E4.",
    toolEnable: "\uB3C4\uAD6C \uD65C\uC131\uD654",
    toolEnableHelp: "\uAC01 \uC9C4\uC785\uC810\uC5D0 \uD45C\uC2DC\uD560 \uB3C4\uAD6C\uC640 \uD45C\uC2DC \uC21C\uC11C\uB97C \uC120\uD0DD\uD569\uB2C8\uB2E4.",
    toolSurfaceSelection: "\uC120\uD0DD \uD14D\uC2A4\uD2B8 \uD50C\uB85C\uD305",
    toolSurfaceSelectionHelp: "\uC6F9\uD398\uC774\uC9C0\uC5D0\uC11C \uD14D\uC2A4\uD2B8\uB97C \uC120\uD0DD\uD55C \uB4A4 \uD45C\uC2DC\uB418\uB294 \uBE60\uB978 \uB3C4\uAD6C\uC785\uB2C8\uB2E4.",
    toolSurfaceHome: "\uC0AC\uC774\uB4DC\uBC14 \uC704\uCE58",
    toolSurfaceHomeHelp: "\uBE48 \uC0AC\uC774\uB4DC\uBC14 \uB300\uD654 \uD648\uC5D0 \uD45C\uC2DC\uB418\uB294 \uBE60\uB978 \uC9C4\uC785\uC810\uC785\uB2C8\uB2E4.",
    toolSurfaceEdge: "\uBE60\uB978 \uB3C4\uAD6C",
    toolSurfaceEdgeHelp: "\uD398\uC774\uC9C0 \uC624\uB978\uCABD \uAC00\uC7A5\uC790\uB9AC\uC5D0\uC11C \uD3BC\uCCD0\uC9C0\uB294 \uC9C4\uC785\uC810\uC785\uB2C8\uB2E4.",
    noToolsEnabled: "\uD65C\uC131\uD654\uB41C \uB3C4\uAD6C \uC5C6\uC74C",
    chooseTools: "\uB3C4\uAD6C \uC120\uD0DD",
    chooseToolsHelp: "\uC120\uD0DD\uD55C \uC21C\uC11C\uAC00 \uD45C\uC2DC \uC21C\uC11C\uC785\uB2C8\uB2E4. \uD654\uC0B4\uD45C\uB85C \uC870\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
    builtinTool: "\uB0B4\uC7A5 \uB3C4\uAD6C",
    customTool: "\uC0AC\uC6A9\uC790 \uC9C0\uC815 \uB3C4\uAD6C",
    moveUp: "\uC704\uB85C \uC774\uB3D9",
    moveDown: "\uC544\uB798\uB85C \uC774\uB3D9",
    dataSync: "\uB370\uC774\uD130 \uB3D9\uAE30\uD654",
    dataSyncHelp: "\uB0B4\uBCF4\uB0B8 \uD30C\uC77C\uACFC Chrome \uACC4\uC815 \uB3D9\uAE30\uD654\uC5D0\uB294 API \uD0A4\uAC00 \uD3EC\uD568\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
    chromeAccountSync: "Chrome \uACC4\uC815 \uB3D9\uAE30\uD654",
    autoSyncNonSensitive: "\uBBFC\uAC10\uD558\uC9C0 \uC54A\uC740 \uC124\uC815 \uC790\uB3D9 \uB3D9\uAE30\uD654",
    autoSyncNonSensitiveHelp: "\uC124\uC815, \uBAA8\uB378 \uC5D4\uC9C4 \uC815\uBCF4, \uC0AC\uC6A9\uC790 \uC9C0\uC815 \uB3C4\uAD6C\uB97C Chrome \uACC4\uC815\uC5D0 \uB3D9\uAE30\uD654\uD569\uB2C8\uB2E4. API \uD0A4\uC640 \uB300\uD654 \uAE30\uB85D\uC740 \uB3D9\uAE30\uD654\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
    syncToChrome: "Chrome \uACC4\uC815\uC73C\uB85C \uB3D9\uAE30\uD654",
    syncFromChrome: "Chrome \uACC4\uC815\uC5D0\uC11C \uB3D9\uAE30\uD654",
    syncing: "\uB3D9\uAE30\uD654 \uC911",
    syncSecretNote: "\uB3D9\uAE30\uD654\uB41C \uBAA8\uB378 \uC5D4\uC9C4\uC5D0 \uD0A4\uAC00 \uC5C6\uC73C\uBA74 \uC774 \uAE30\uAE30\uC5D0\uC11C \uB2E4\uC2DC \uC785\uB825\uD558\uC138\uC694.",
    exportSettings: "\uC124\uC815 \uB0B4\uBCF4\uB0B4\uAE30",
    importSettings: "\uC124\uC815 \uAC00\uC838\uC624\uAE30",
    clearConversationHistory: "\uB300\uD654 \uAE30\uB85D \uBE44\uC6B0\uAE30",
    providerEditorAria: "\uBAA8\uB378 \uC5D4\uC9C4 \uC124\uC815",
    newEngine: "\uC0C8 \uC5D4\uC9C4",
    providerKind: "API \uC720\uD615",
    providerKindOpenAICompatible: "OpenAI \uD638\uD658",
    providerKindAnthropic: "Anthropic",
    providerKindGemini: "Gemini",
    providerKindOllama: "Ollama",
    providerName: "\uD45C\uC2DC \uC774\uB984",
    providerNamePlaceholder: "\uC608: \uC0AC\uB0B4 \uBAA8\uB378",
    providerBaseUrl: "API URL",
    providerBaseUrlHelp: "\uC800\uC7A5 \uC2DC \uC774 \uB3C4\uBA54\uC778\uC5D0 \uB300\uD55C \uB124\uD2B8\uC6CC\uD06C \uAD8C\uD55C\uC744 \uC694\uCCAD\uD569\uB2C8\uB2E4.",
    providerModel: "\uBAA8\uB378 ID",
    providerModelPlaceholder: "\uC11C\uBE44\uC2A4 \uC81C\uACF5\uC790\uAC00 \uC81C\uACF5\uD55C \uAC12",
    providerModelHelp: "\uC9C1\uC811 \uC785\uB825\uD558\uAC70\uB098 \uC624\uB978\uCABD \uBC84\uD2BC\uC73C\uB85C \uC774 API\uC5D0\uC11C \uAC00\uC838\uC62C \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
    fetchModels: "\uBAA8\uB378 \uBAA9\uB85D \uAC00\uC838\uC624\uAE30",
    providerApiKey: "API \uD0A4",
    providerApiKeyPlaceholder: "\uC774 \uAE30\uAE30\uC758 \uD655\uC7A5 \uD504\uB85C\uADF8\uB7A8 \uC800\uC7A5\uC18C\uC5D0\uB9CC \uC800\uC7A5\uB429\uB2C8\uB2E4",
    providerSecretStorage: "\uD0A4 \uC800\uC7A5 \uBC29\uC2DD",
    providerSecretLocal: "\uACC4\uC18D \uC800\uC7A5",
    providerSecretSession: "\uC774\uBC88 \uC138\uC158\uB9CC",
    providerTemperature: "\uC628\uB3C4",
    providerMaxTokens: "\uCD5C\uB300 \uCD9C\uB825 Token",
    providerMaxContext: "\uCD5C\uB300 \uCEE8\uD14D\uC2A4\uD2B8 \uBB38\uC790 \uC218",
    providerSupportsVision: "\uC774\uBBF8\uC9C0 \uC785\uB825 \uC9C0\uC6D0",
    providerSupportsVisionHelp: "\uBAA8\uB378\uC774 \uBE44\uC804 \uC785\uB825\uC744 \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uC73C\uBA74 \uB044\uC138\uC694",
    providerCustomHeaders: "\uC0AC\uC6A9\uC790 \uC9C0\uC815 \uC694\uCCAD \uD5E4\uB354",
    providerCustomHeadersHelp: "\uC120\uD0DD \uC0AC\uD56D. JSON \uAC1D\uCCB4 \uD615\uC2DD\uC774\uBA70 \uAC19\uC740 \uC774\uB984\uC758 \uD544\uB4DC\uB294 \uAE30\uBCF8 \uD5E4\uB354\uB97C \uB36E\uC5B4\uC501\uB2C8\uB2E4.",
    saveEngine: "\uC5D4\uC9C4 \uC800\uC7A5",
    providerSaved: "\uBAA8\uB378 \uC5D4\uC9C4\uC744 \uC800\uC7A5\uD588\uC2B5\uB2C8\uB2E4",
    providerDeleted: "\uBAA8\uB378 \uC5D4\uC9C4\uC744 \uC0AD\uC81C\uD588\uC2B5\uB2C8\uB2E4",
    providerNameRequired: "\uC5D4\uC9C4 \uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694",
    providerBaseUrlRequired: "API URL\uC744 \uC785\uB825\uD558\uC138\uC694",
    providerModelRequired: "\uBAA8\uB378 ID\uB97C \uC785\uB825\uD558\uC138\uC694",
    duckPermissionRequired: "DuckDuckGo \uAC80\uC0C9 \uB3C4\uBA54\uC778 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4",
    settingsSyncedToChrome: "\uC124\uC815\uC774 Chrome \uACC4\uC815\uC5D0 \uB3D9\uAE30\uD654\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uD0A4\uB294 \uB3D9\uAE30\uD654\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4",
    settingsSyncedFromChrome: "Chrome \uACC4\uC815\uC5D0\uC11C \uC124\uC815\uC744 \uB3D9\uAE30\uD654\uD588\uC2B5\uB2C8\uB2E4. \uBAA8\uB378 \uD0A4\uB294 \uB85C\uCEEC \uAE30\uC900\uC785\uB2C8\uB2E4",
    chromeSyncEnabled: "Chrome \uACC4\uC815 \uB3D9\uAE30\uD654\uB97C \uCF30\uC2B5\uB2C8\uB2E4. \uD0A4\uB294 \uB3D9\uAE30\uD654\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
    chromeSyncDisabled: "Chrome \uACC4\uC815 \uB3D9\uAE30\uD654\uB97C \uAED0\uC2B5\uB2C8\uB2E4",
    settingsExported: "\uC124\uC815\uC744 \uB0B4\uBCF4\uB0C8\uC2B5\uB2C8\uB2E4. \uD0A4\uB294 \uD3EC\uD568\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4",
    invalidSettingsFile: "\uC720\uD6A8\uD55C WebMind \uC124\uC815 \uD30C\uC77C\uC774 \uC544\uB2D9\uB2C8\uB2E4",
    settingsImported: "\uC124\uC815\uC744 \uAC00\uC838\uC654\uC2B5\uB2C8\uB2E4. \uAC01 \uC5D4\uC9C4 \uD0A4\uB97C \uB2E4\uC2DC \uC785\uB825\uD558\uC138\uC694",
    localHistoryCleared: "\uB85C\uCEEC \uB300\uD654 \uAE30\uB85D\uC744 \uBE44\uC6E0\uC2B5\uB2C8\uB2E4",
    processCurrentContent: "\uD604\uC7AC \uB0B4\uC6A9 \uCC98\uB9AC",
    localRecords: "\uB85C\uCEEC \uAE30\uB85D",
    addTool: "\uB3C4\uAD6C \uCD94\uAC00",
    saveChanges: "\uBCC0\uACBD \uC800\uC7A5",
    saveTool: "\uB3C4\uAD6C \uC800\uC7A5",
    custom: "\uC0AC\uC6A9\uC790 \uC9C0\uC815",
    icon: "\uC544\uC774\uCF58",
    toolPrompt: "\uD504\uB86C\uD504\uD2B8",
    mainNav: "\uAE30\uBCF8 \uD0D0\uC0C9",
    connectEngineBannerTitle: "\uBA3C\uC800 \uBAA8\uB378 \uC5D4\uC9C4\uC744 \uC5F0\uACB0\uD558\uC138\uC694",
    connectEngineBannerDescription: "\uC8FC\uC694 \uD074\uB77C\uC6B0\uB4DC \uBAA8\uB378, OpenAI \uD638\uD658 API\uC640 \uB85C\uCEEC Ollama\uB97C \uC9C0\uC6D0\uD569\uB2C8\uB2E4.",
    pageRecognized: "\uC778\uC2DD\uB428",
    enterAttachmentUrl: "\uCCA8\uBD80\uB85C \uCD94\uAC00\uD560 URL \uC785\uB825",
    modelEngineRequired: "\uBA3C\uC800 \uBAA8\uB378 \uC5D4\uC9C4\uC744 \uCD94\uAC00\uD558\uACE0 \uC120\uD0DD\uD558\uC138\uC694",
    needPdfPermission: "\uC774 PDF\uB97C \uC77D\uC73C\uB824\uBA74 \uD398\uC774\uC9C0 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4",
    noReadableTab: "\uC77D\uC744 \uC218 \uC788\uB294 \uD604\uC7AC \uD0ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4",
    switchingToCurrentPage: "\uD604\uC7AC \uD398\uC774\uC9C0\uB85C \uC804\uD658 \uC911\u2026",
    readingSelection: "\uC120\uD0DD \uB0B4\uC6A9\uC744 \uC77D\uB294 \uC911\u2026",
    noSelectionOnPage: "\uD604\uC7AC \uD398\uC774\uC9C0\uC5D0\uB294 \uC804\uD658\uD560 \uC218 \uC788\uB294 \uC120\uD0DD \uB0B4\uC6A9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4",
    searchPermissionRequired: "\uC6F9 \uACB0\uACFC\uB97C \uBCF4\uC644\uD558\uB824\uBA74 \uAC80\uC0C9 \uB3C4\uBA54\uC778 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4",
    searchingWeb: "\uC6F9 \uAC80\uC0C9 \uC911\u2026",
    previewDemoAnswer: "\uBBF8\uB9AC\uBCF4\uAE30 \uBAA8\uB4DC\uC758 \uC608\uC2DC \uB2F5\uBCC0\uC785\uB2C8\uB2E4. Chrome \uD655\uC7A5 \uD504\uB85C\uADF8\uB7A8\uC73C\uB85C \uBD88\uB7EC\uC624\uACE0 \uBAA8\uB378 \uC5D4\uC9C4\uC744 \uC124\uC815\uD558\uBA74 \uC2E4\uC81C \uC2A4\uD2B8\uB9AC\uBC0D \uCD9C\uB825\uC774 \uC5EC\uAE30\uC5D0 \uD45C\uC2DC\uB429\uB2C8\uB2E4.\n\n- \uD398\uC774\uC9C0 \uCEE8\uD14D\uC2A4\uD2B8\uB294 \uC5B8\uC81C\uB4E0 \uCF1C\uACE0 \uB04C \uC218 \uC788\uC2B5\uB2C8\uB2E4\n- \uC9C1\uC811 \uAC00\uC838\uC628 \uBAA8\uB378\uACFC \uD0A4\uB97C \uC9C0\uC6D0\uD569\uB2C8\uB2E4\n- \uAE30\uB85D\uC740 \uB85C\uCEEC\uC5D0\uB9CC \uC800\uC7A5\uB429\uB2C8\uB2E4",
    currentAnswer: "\uD604\uC7AC \uB2F5\uBCC0",
    collectingSelection: "\uC120\uD0DD \uB0B4\uC6A9 \uC218\uC9D1 \uC911\u2026",
    collectingTranslatableText: "\uBC88\uC5ED \uAC00\uB2A5\uD55C \uD14D\uC2A4\uD2B8 \uC218\uC9D1 \uC911\u2026",
    collectingPageBody: "\uBCF8\uBB38 \uC218\uC9D1 \uC911\u2026",
    noTranslatableBlocks: "\uD604\uC7AC \uD398\uC774\uC9C0\uC5D0 \uBC88\uC5ED \uAC00\uB2A5\uD55C \uBCF8\uBB38 \uBE14\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4",
    translatingPageProgress: "\uD398\uC774\uC9C0 \uBC88\uC5ED \uC911",
    translatingShort: "\uBC88\uC5ED \uC911",
    translationWritten: "\uC791\uC131\uB428",
    translationComplete: "\uC644\uB8CC",
    translationApplied: "\uD398\uC774\uC9C0\uC5D0 \uCD94\uAC00\uB428",
    translationRemoved: "\uD398\uC774\uC9C0 \uBC88\uC5ED\uC744 \uC81C\uAC70\uD588\uC2B5\uB2C8\uB2E4",
    pageRestored: "\uD398\uC774\uC9C0\uB97C \uBCF5\uC6D0\uD588\uC2B5\uB2C8\uB2E4",
    addImageBeforeAnalyze: "\uC774\uBBF8\uC9C0 \uBD84\uC11D \uB3C4\uAD6C\uB97C \uC2E4\uD589\uD558\uAE30 \uC804\uC5D0 \uC774\uBBF8\uC9C0\uB97C \uCD94\uAC00\uD558\uC138\uC694",
    toolNeedsPrompt: "\uB3C4\uAD6C\uC5D0\uB294 \uC81C\uBAA9\uACFC \uD504\uB86C\uD504\uD2B8\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4",
    chooseContextFirst: "\uBA3C\uC800 \uCEE8\uD14D\uC2A4\uD2B8\uC5D0\uC11C \uD604\uC7AC \uD398\uC774\uC9C0 \uB610\uB294 \uC120\uD0DD \uB0B4\uC6A9\uC744 \uC120\uD0DD\uD558\uC138\uC694",
    directQuestionPlaceholder: "\uC9C1\uC811 \uC9C8\uBB38\u2026",
    askContextPlaceholder: "\uD604\uC7AC \uD398\uC774\uC9C0\uC5D0 \uC9C8\uBB38\u2026",
    addEngineFirst: "\uBA3C\uC800 \uC124\uC815\uC5D0\uC11C \uBAA8\uB378 \uC5D4\uC9C4\uC744 \uCD94\uAC00\uD558\uC138\uC694",
    copyFailed: "\uBCF5\uC0AC \uC2E4\uD328",
    readingPdf: "PDF \uC77D\uB294 \uC911",
    needSearchDomainPermission: "\uC6F9 \uACB0\uACFC\uB97C \uBCF4\uC644\uD558\uB824\uBA74 \uAC80\uC0C9 \uB3C4\uBA54\uC778 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4",
    profileVisionDisabled: "\u201C{name}\u201D\uC5D0\uC11C \uC774\uBBF8\uC9C0 \uC785\uB825\uC774 \uD65C\uC131\uD654\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
    promptImageAnalysis: "\uC774 \uC774\uBBF8\uC9C0\uB97C \uBD84\uC11D\uD558\uACE0 \uC911\uC694\uD55C \uC138\uBD80\uC0AC\uD56D\uC744 \uC124\uBA85\uD55C \uB4A4 \uB2E4\uC74C \uC9C8\uBB38\uC5D0 \uB2F5\uD558\uC138\uC694.",
    promptSummarizeSelection: "\uC120\uD0DD\uD55C \uD14D\uC2A4\uD2B8\uB97C \uC694\uC57D\uD558\uACE0 \uD575\uC2EC \uC0AC\uC2E4, \uC22B\uC790, \uACB0\uB860\uC744 \uC720\uC9C0\uD558\uC138\uC694.",
    promptExplainSelection: "\uC120\uD0DD\uD55C \uD14D\uC2A4\uD2B8\uB97C \uC26C\uC6B4 \uB9D0\uB85C \uC124\uBA85\uD558\uC138\uC694.",
    promptAutoTranslateSelection: "\uC120\uD0DD\uD55C \uD14D\uC2A4\uD2B8\uB97C \uC790\uB3D9 \uBC88\uC5ED\uD558\uC138\uC694. \uC911\uAD6D\uC5B4\uAC00 \uC8FC\uB41C \uC5B8\uC5B4\uC774\uBA74 \uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uC601\uC5B4\uB85C, \uADF8 \uC678\uC5D0\uB294 \uD55C\uAD6D\uC5B4\uB85C \uBC88\uC5ED\uD558\uC138\uC694.",
    promptRewriteSelection: "\uC120\uD0DD\uD55C \uD14D\uC2A4\uD2B8\uB97C \uB354 \uBA85\uD655\uD558\uACE0 \uC790\uC5F0\uC2A4\uB7FD\uACE0 \uC804\uBB38\uC801\uC73C\uB85C \uB2E4\uC2DC \uC4F0\uC138\uC694.",
    promptReplySelection: "\uC120\uD0DD\uD55C \uD14D\uC2A4\uD2B8\uB97C \uBC14\uD0D5\uC73C\uB85C \uBC14\uB85C \uBCF4\uB0BC \uC218 \uC788\uB294 \uB2F5\uC7A5\uC744 \uC791\uC131\uD558\uC138\uC694.",
    modelRequestFailed: "\uBAA8\uB378 \uC694\uCCAD \uC2E4\uD328",
    savedConversations: "\uC800\uC7A5\uB41C \uB300\uD654",
    runtimeUnavailable: "\uBBF8\uB9AC\uBCF4\uAE30 \uBAA8\uB4DC\uC5D0\uC11C\uB294 \uD655\uC7A5 \uD504\uB85C\uADF8\uB7A8 \uBC31\uADF8\uB77C\uC6B4\uB4DC\uB97C \uD638\uCD9C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
    backgroundNoResponse: "\uD655\uC7A5 \uD504\uB85C\uADF8\uB7A8 \uBC31\uADF8\uB77C\uC6B4\uB4DC\uAC00 \uC751\uB2F5\uD558\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4",
    currentPageUnavailable: "\uD604\uC7AC \uD398\uC774\uC9C0\uC5D0 \uC811\uADFC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
    noActiveTab: "\uD65C\uC131 \uD0ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4",
    previewPageTitle: "WebMind \uC81C\uD488 \uC870\uC0AC \uC608\uC2DC",
    previewPageDescription: "UI \uBBF8\uB9AC\uBCF4\uAE30\uB97C \uC704\uD55C \uC608\uC2DC \uAE00",
    previewPageBody: "\uBE0C\uB77C\uC6B0\uC800 \uB3C4\uC6B0\uBBF8\uB294 \uD604\uC7AC \uD398\uC774\uC9C0\uB97C \uCEE8\uD14D\uC2A4\uD2B8\uB85C \uC0AC\uC6A9\uD574 \uC694\uC57D, \uBC88\uC5ED, \uC124\uBA85, \uB2F5\uC7A5 \uC791\uC131\uC744 \uB3C4\uC6B8 \uC218 \uC788\uC2B5\uB2C8\uB2E4. WebMind\uB294 \uC0AC\uC6A9\uC790\uAC00 \uB2E8\uC77C \uACC4\uC815 \uCCB4\uACC4\uC5D0 \uBB36\uC774\uC9C0 \uC54A\uACE0 \uC790\uC2E0\uC758 \uBAA8\uB378 \uC11C\uBE44\uC2A4\uB97C \uC124\uC815\uD560 \uC218 \uC788\uAC8C \uD569\uB2C8\uB2E4.",
    contentTruncated: "\uB0B4\uC6A9\uC774 \uC798\uB838\uC2B5\uB2C8\uB2E4",
    customHeadersJsonObject: "\uC0AC\uC6A9\uC790 \uC9C0\uC815 \uC694\uCCAD \uD5E4\uB354\uB294 JSON \uAC1D\uCCB4\uC5EC\uC57C \uD569\uB2C8\uB2E4",
    jsonArrayMissing: "\uBAA8\uB378\uC774 \uD30C\uC2F1 \uAC00\uB2A5\uD55C JSON \uBC30\uC5F4\uC744 \uBC18\uD658\uD558\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4",
    jsonArrayInvalid: "\uBAA8\uB378 \uC751\uB2F5 \uD615\uC2DD\uC774 \uBC30\uC5F4\uC774 \uC544\uB2D9\uB2C8\uB2E4",
    invalidImageData: "\uC774\uBBF8\uC9C0 \uB370\uC774\uD130 \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
    customToolFallback: "\uC0AC\uC6A9\uC790 \uC9C0\uC815 \uB3C4\uAD6C",
    chromeSyncInvalidData: "Chrome \uACC4\uC815\uC758 WebMind \uB3D9\uAE30\uD654 \uB370\uC774\uD130\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
    chromeSyncNoData: "Chrome \uACC4\uC815\uC5D0 \uC544\uC9C1 WebMind \uB3D9\uAE30\uD654 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4",
    webSearchFailed: "\uC6F9 \uAC80\uC0C9 \uC2E4\uD328",
    webSearchNoResults: "\uC6F9 \uAC80\uC0C9 \uACB0\uACFC\uB97C \uD30C\uC2F1\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4",
    searchResultSnippet: "\uC694\uC57D",
    searchSourceMarker: "\uAC80\uC0C9",
    selectionDescription: "{count}\uC790 \uC120\uD0DD\uB428",
    readFileFailed: "\uD30C\uC77C\uC744 \uC77D\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
    readDocumentFailed: "\uBB38\uC11C\uB97C \uC77D\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
    readImageUrlFailed: "\uC774\uBBF8\uC9C0\uB97C \uC77D\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
    readUrlFailed: "URL\uC744 \uC77D\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
    unknownFileType: "\uC54C \uC218 \uC5C6\uC74C",
    sizeLabel: "\uD06C\uAE30",
    bytes: "\uBC14\uC774\uD2B8",
    unsupportedDocumentText: "\uC774 \uD30C\uC77C \uD615\uC2DD\uC740 \uC544\uC9C1 \uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C \uBCF8\uBB38\uC744 \uC9C1\uC811 \uCD94\uCD9C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.",
    documentName: "\uBB38\uC11C \uC774\uB984",
    pdfDocument: "PDF \uBB38\uC11C",
    attachmentLabel: "\uCCA8\uBD80",
    documentAttachment: "\uBB38\uC11C",
    addressLabel: "\uC8FC\uC18C",
    typeLabel: "\uC720\uD615",
    contentLabel: "\uB0B4\uC6A9",
    noExtractedText: "\uBCF8\uBB38\uC744 \uCD94\uCD9C\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4",
    jsonArrayTranslationInstruction: "\uC785\uB825\uC740 JSON \uBC30\uC5F4\uC785\uB2C8\uB2E4. \uAC01 \uD56D\uBAA9\uC5D0\uB294 id\uC640 text\uAC00 \uC788\uC2B5\uB2C8\uB2E4. \uAC01 \uD56D\uBAA9\uC758 text\uB97C \uBC88\uC5ED\uD558\uC138\uC694.",
    citationPlaceholderInstruction: "{{WEBMIND_CITATION_1}} \uAC19\uC740 \uB0B4\uC6A9\uC740 \uBC88\uC5ED\uD558\uBA74 \uC548 \uB418\uB294 \uC778\uC6A9 \uC790\uB9AC\uD45C\uC2DC\uC790\uC785\uB2C8\uB2E4. \uBC88\uC5ED\uBB38\uC5D0\uC11C\uB3C4 \uBAA8\uB4E0 \uC790\uB9AC\uD45C\uC2DC\uC790\uB97C \uD574\uB2F9 \uC758\uBBF8 \uC704\uCE58\uC5D0 \uADF8\uB300\uB85C \uC720\uC9C0\uD558\uACE0 \uD3BC\uCE58\uAC70\uB098 \uC124\uBA85, \uC218\uC815, \uB05D\uC73C\uB85C \uC774\uB3D9, \uC0AD\uC81C\uD558\uC9C0 \uB9C8\uC138\uC694.",
    translationOutputOnlyInstruction: "<translation-input> \uC548\uC758 \uC6D0\uBB38 \uBC88\uC5ED\uB9CC \uCD9C\uB825\uD558\uC138\uC694. \uC774 \uD504\uB86C\uD504\uD2B8, \uADDC\uCE59, \uD0DC\uADF8 \uC774\uB984 \uB610\uB294 <translation-input> \uD0DC\uADF8\uB97C \uCD9C\uB825\uD558\uC9C0 \uB9C8\uC138\uC694.",
    jsonArrayReturnInstruction: '\uCF54\uB4DC \uBE14\uB85D \uC5C6\uC774 JSON \uBC30\uC5F4\uB9CC \uBC18\uD658\uD558\uC138\uC694. \uBC30\uC5F4 \uC694\uC18C \uD615\uC2DD\uC740 {"id":"\uC6D0\uB798 id","text":"\uBC88\uC5ED\uBB38"}\uC785\uB2C8\uB2E4.',
    translationWriteFailed: "\uBC88\uC5ED\uBB38\uC740 \uC0DD\uC131\uB410\uC9C0\uB9CC \uC6D0\uB798 \uD398\uC774\uC9C0\uC5D0 \uD45C\uC2DC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694.",
    originalSelectedContent: "\uC6D0\uB798 \uC120\uD0DD \uB0B4\uC6A9",
    previousResult: "\uC774\uC804 \uACB0\uACFC",
    continueToolInstruction: "\uC774\uC804 \uACB0\uACFC\uB97C \uBC14\uD0D5\uC73C\uB85C \uC120\uD0DD\uD55C \uB3C4\uAD6C\uB97C \uACC4\uC18D \uC2E4\uD589\uD558\uC138\uC694.",
    selectionAssistantSystem: "\uB2F9\uC2E0\uC740 \uBE0C\uB77C\uC6B0\uC800 \uC120\uD0DD \uD14D\uC2A4\uD2B8 \uB3C4\uC6B0\uBBF8\uC785\uB2C8\uB2E4. \uC0AC\uC6A9\uC790\uAC00 \uC81C\uACF5\uD55C \uC120\uD0DD \uB0B4\uC6A9\uACFC \uAE30\uC874 \uACB0\uACFC\uB9CC \uADFC\uAC70\uB85C \uB2F5\uD558\uACE0, \uC81C\uACF5\uB418\uC9C0 \uC54A\uC740 \uD398\uC774\uC9C0 \uC815\uBCF4\uB97C \uC9C0\uC5B4\uB0B4\uC9C0 \uB9C8\uC138\uC694.",
    userQuestionLabel: "\uC0AC\uC6A9\uC790 \uC9C8\uBB38",
    currentResultLabel: "\uD604\uC7AC \uACB0\uACFC",
    researchSearchPrefix: "\uC774 \uAC80\uC0C9 \uC9C8\uBB38\uC744 \uC870\uC0AC\uD558\uC138\uC694",
    openSidebarOpening: "\uC0AC\uC774\uB4DC\uBC14 \uC5EC\uB294 \uC911\u2026",
    openSidebarOpened: "\uC0AC\uC774\uB4DC\uBC14\uAC00 \uC5F4\uB838\uC2B5\uB2C8\uB2E4.",
    readCurrentPage: "\uD604\uC7AC \uD398\uC774\uC9C0 \uC77D\uB294 \uC911\u2026",
    noProcessablePageBody: "\uD604\uC7AC \uD398\uC774\uC9C0\uC5D0 \uCC98\uB9AC\uD560 \uC218 \uC788\uB294 \uBCF8\uBB38\uC774 \uC5C6\uC2B5\uB2C8\uB2E4",
    executingTool: "\uB3C4\uAD6C \uC2E4\uD589 \uC911\u2026",
    closeQuickTools: "\uBE60\uB978 \uB3C4\uAD6C \uB2EB\uAE30",
    generateShortAutoReply: "\uC9E7\uC740 \uC790\uB3D9 \uB2F5\uC7A5 \uC0DD\uC131",
    extractImageText: "\uC774\uBBF8\uC9C0 \uD14D\uC2A4\uD2B8 \uCD94\uCD9C",
    extractingImageText: "\uC774\uBBF8\uC9C0 \uD14D\uC2A4\uD2B8\uB97C \uCD94\uCD9C\uD558\uB294 \uC911\u2026",
    imageTextExtractionResult: "\uC774\uBBF8\uC9C0 \uD14D\uC2A4\uD2B8 \uCD94\uCD9C",
    imageTextExtractionPrompt: "\uC774 \uC774\uBBF8\uC9C0\uC5D0 \uBCF4\uC774\uB294 \uBAA8\uB4E0 \uD14D\uC2A4\uD2B8\uB97C \uCD94\uCD9C\uD558\uC138\uC694. \uC6D0\uBB38 \uC5B8\uC5B4\uB97C \uC720\uC9C0\uD558\uACE0 \uBC88\uC5ED\uD558\uC9C0 \uB9C8\uC138\uC694. \uC904\uBC14\uAFC8, \uC77D\uAE30 \uC21C\uC11C, \uBAA9\uB85D, \uD45C \uAD6C\uC870\uB97C \uCD5C\uB300\uD55C \uBCF4\uC874\uD558\uACE0 \uCD94\uCD9C\uD55C \uD14D\uC2A4\uD2B8\uB9CC \uCD9C\uB825\uD558\uBA70 \uC124\uBA85\uC740 \uD558\uC9C0 \uB9C8\uC138\uC694.",
    noImageTextFound: "\uC0AC\uC6A9\uD560 \uC218 \uC788\uB294 \uD14D\uC2A4\uD2B8\uB97C \uC778\uC2DD\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4",
    retryAnswer: "\uB2E4\uC2DC \uB2F5\uBCC0",
    chooseTool: "\uB3C4\uAD6C \uC120\uD0DD",
    rerunExecution: "\uB2E4\uC2DC \uC2E4\uD589",
    reextractImageText: "\uB2E4\uC2DC \uCD94\uCD9C",
    runSelectedTool: "\uB3C4\uAD6C \uC2E4\uD589",
    continueQuestionPlaceholder: "\uC774\uC5B4\uC11C \uC9C8\uBB38\u2026",
    modelNoUsableReply: "\uBAA8\uB378\uC774 \uC0AC\uC6A9\uD560 \uC218 \uC788\uB294 \uB2F5\uC7A5\uC744 \uBC18\uD658\uD558\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4",
    autoReplySystem: "\uB2F9\uC2E0\uC740 WebMind\uC758 \uC6F9 \uC790\uB3D9 \uB2F5\uC7A5 \uB3C4\uC6B0\uBBF8\uC785\uB2C8\uB2E4.\n\uD604\uC7AC \uD398\uC774\uC9C0 \uB0B4\uC6A9, \uB300\uD654 \uCEE8\uD14D\uC2A4\uD2B8, \uC785\uB825\uB780\uC758 \uAE30\uC874 \uCD08\uC548\uC744 \uC0AC\uC6A9\uD574 \uC785\uB825\uB780\uC5D0 \uBC14\uB85C \uB123\uC744 \uC218 \uC788\uB294 \uC9E7\uC740 \uB2F5\uC7A5\uC744 \uC0DD\uC131\uD558\uC138\uC694.\n\uD398\uC774\uC9C0\uC5D0 \uC788\uB294 \uAE30\uC874 \uB2F5\uC7A5, \uB313\uAE00, \uC774\uBA54\uC77C, \uCC44\uD305 \uB0B4\uC6A9\uC744 \uC6B0\uC120 \uCC38\uACE0\uD558\uC138\uC694.\n\uB2F5\uC7A5 \uBCF8\uBB38\uB9CC \uCD9C\uB825\uD558\uC138\uC694. \uC124\uBA85, \uC81C\uBAA9, Markdown\uC740 \uC0AC\uC6A9\uD558\uC9C0 \uB9C8\uC138\uC694.",
    autoReplyPageTitle: "\uD398\uC774\uC9C0 \uC81C\uBAA9",
    autoReplyPageUrl: "\uD398\uC774\uC9C0 \uC8FC\uC18C",
    autoReplyPageDescription: "\uD398\uC774\uC9C0 \uC124\uBA85",
    autoReplyPageContent: "\uD604\uC7AC \uD398\uC774\uC9C0 \uB0B4\uC6A9",
    autoReplyDraft: "\uC785\uB825\uB780\uC758 \uAE30\uC874 \uB0B4\uC6A9 \uB610\uB294 \uCD08\uC548",
    autoReplyEmpty: "\uC785\uB825\uB780\uC774 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.",
    autoReplyRequest: "\uC790\uC5F0\uC2A4\uB7FD\uACE0 \uC815\uC911\uD558\uBA70 \uAD6C\uCCB4\uC801\uC774\uC9C0\uB9CC \uC9E7\uC740 1-3\uBB38\uC7A5 \uB2F5\uC7A5\uC744 \uC0DD\uC131\uD558\uC138\uC694. \uD398\uC774\uC9C0 \uB300\uD654 \uB610\uB294 \uC785\uB825\uB780 \uCD08\uC548\uC758 \uC5B8\uC5B4\uC5D0 \uB9DE\uCD94\uC138\uC694.",
    contextMenuAsk: "WebMind\uC5D0\uC11C \uC9C8\uBB38",
    contextMenuSummarize: "\uC120\uD0DD \uB0B4\uC6A9 \uC694\uC57D",
    contextMenuExplain: "\uC120\uD0DD \uB0B4\uC6A9 \uC124\uBA85",
    contextMenuTranslate: "\uC120\uD0DD \uB0B4\uC6A9 \uBC88\uC5ED",
    contextMenuRewrite: "\uC120\uD0DD \uB0B4\uC6A9 \uB2E4\uC2DC \uC4F0\uAE30",
    contextMenuReply: "\uB2F5\uC7A5 \uCD08\uC548 \uC791\uC131",
    contextMenuAnalyzeImage: "\uC774 \uC774\uBBF8\uC9C0 \uBD84\uC11D",
    cannotDetermineTab: "\uD604\uC7AC \uD0ED\uC744 \uD655\uC778\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
    provideSearchQuery: "\uAC80\uC0C9 \uB0B4\uC6A9\uC744 \uC785\uB825\uD558\uC138\uC694",
    toolNotFound: "\uB3C4\uAD6C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
    youtubeVideoNotFound: "\uD398\uC774\uC9C0\uC5D0\uC11C \uB3D9\uC601\uC0C1 \uD50C\uB808\uC774\uC5B4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
    videoInfoNotFound: "\uD398\uC774\uC9C0\uC5D0\uC11C \uB3D9\uC601\uC0C1 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
    noCaptionsAvailable: "\uC774 \uB3D9\uC601\uC0C1\uC5D0\uB294 \uC0AC\uC6A9\uD560 \uC218 \uC788\uB294 \uC790\uB9C9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4",
    captionsReadFailed: "\uC790\uB9C9\uC744 \uC77D\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
    captionsLabel: "\uC790\uB9C9",
    youtubeVideoTitle: "YouTube \uB3D9\uC601\uC0C1",
    apiKeyMissing: "\u201C{name}\u201D\uC758 API \uD0A4\uAC00 \uC785\uB825\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4",
    responseStreamMissing: "\uBAA8\uB378 API\uAC00 \uC751\uB2F5 \uC2A4\uD2B8\uB9BC\uC744 \uBC18\uD658\uD558\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4",
    providerErrorStatus: "\uBAA8\uB378 API\uAC00 {status}\uB97C \uBC18\uD658\uD588\uC2B5\uB2C8\uB2E4: {detail}",
    requestCancelled: "\uC694\uCCAD\uC774 \uCDE8\uC18C\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
    modelThinkingTimeoutMessage: "\uBAA8\uB378\uC758 \uC0AC\uACE0 \uC2DC\uAC04\uC774 \uCD08\uACFC\uB418\uC5B4 \uB2F5\uBCC0\uC744 \uC911\uB2E8\uD588\uC2B5\uB2C8\uB2E4."
  }
};
function uiText(language, key) {
  return UI_TEXT[resolveLanguage(language)][key] ?? UI_TEXT["zh-CN"][key];
}

// src/shared/prompts.ts
function resolvePromptConfig(source) {
  if (typeof source === "string" || source === void 0) {
    return {
      interfaceLanguage: resolveLanguage(source),
      translationLanguage: "auto"
    };
  }
  return {
    interfaceLanguage: resolveLanguage(source.interfaceLanguage),
    translationLanguage: source.translationLanguage ?? "auto"
  };
}
var TRANSLATION_FAMILY_LABELS = {
  zh: "Chinese",
  en: "English",
  ja: "Japanese",
  ko: "Korean"
};
function detectTranslationLanguage(text) {
  const source = text.replace(/<[^>]*>/g, " ");
  const latinCount = source.match(/[A-Za-z]/g)?.length ?? 0;
  const chineseCount = source.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g)?.length ?? 0;
  const japaneseKanaCount = source.match(/[\u3040-\u30ff\u31f0-\u31ff]/g)?.length ?? 0;
  const koreanCount = source.match(/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/g)?.length ?? 0;
  if (koreanCount) return "ko";
  if (japaneseKanaCount) return "ja";
  if (chineseCount && chineseCount >= latinCount && chineseCount >= koreanCount) {
    return "zh";
  }
  if (latinCount >= 2) return "en";
  return null;
}
function translationLanguageMatchesInterface(sourceLanguage, interfaceLanguage) {
  if (sourceLanguage === "zh") {
    return interfaceLanguage === "zh-CN" || interfaceLanguage === "zh-TW";
  }
  return sourceLanguage === interfaceLanguage;
}
function translationDirectionInstruction(config, sourceText) {
  const { interfaceLanguage, translationLanguage } = resolvePromptConfig(config);
  const sourceLanguage = detectTranslationLanguage(sourceText);
  if (!sourceLanguage) return "";
  const targetLanguage = translationLanguage === "auto" ? translationLanguageMatchesInterface(sourceLanguage, interfaceLanguage) ? "en" : interfaceLanguage : resolveLanguage(translationLanguage);
  const targetLabel = LANGUAGE_LABELS[targetLanguage];
  const sourceLabel = TRANSLATION_FAMILY_LABELS[sourceLanguage];
  switch (interfaceLanguage) {
    case "zh-TW":
      return `\u53EA\u6839\u64DA <translation-input> \u4E2D\u5BE6\u969B\u539F\u6587\u7684\u6587\u5B57\u7279\u5FB5\u8655\u7406\u3002\u672C\u5730\u9810\u5224\u539F\u6587\u4E3B\u8981\u8A9E\u8A00\u70BA ${sourceLabel}\uFF0C\u672C\u6B21\u76EE\u6A19\u8A9E\u8A00\u5DF2\u56FA\u5B9A\u70BA${targetLabel}\u3002\u9019\u662F\u4E00\u500B\u5F37\u5236\u7FFB\u8B6F\u4EFB\u52D9\uFF0C\u4E0D\u662F\u8A9E\u8A00\u6AA2\u6E2C\u4EFB\u52D9\u3002\u5982\u679C\u539F\u6587\u4E0D\u662F${targetLabel}\uFF0C\u6700\u7D42\u8F38\u51FA\u5FC5\u9808\u662F${targetLabel}\uFF0C\u4E0D\u5F97\u8907\u88FD\u539F\u6587\u6216\u7528\u539F\u6587\u8A9E\u8A00\u56DE\u7B54\u3002\u5373\u4F7F\u539F\u6587\u53EA\u6709\u4E00\u500B\u55AE\u5B57\u3001\u77ED\u8A9E\u6216\u4E00\u5169\u53E5\u8A71\uFF0C\u53EA\u8981\u5B58\u5728\u53EF\u7FFB\u8B6F\u5167\u5BB9\u4E5F\u5FC5\u9808\u7FFB\u8B6F\uFF0C\u4E0D\u8981\u56E0\u70BA\u5167\u5BB9\u7C21\u77ED\u800C\u539F\u6A23\u8FD4\u56DE\u3002`;
    case "en":
      return `Use only the actual source text inside <translation-input> for this decision. Local pre-detection says the source is mainly ${sourceLabel}; the target language for this request is fixed as ${targetLabel}. This is a forced translation task, not a language-detection task. If the source is not already ${targetLabel}, the final output must be in ${targetLabel}; do not copy the source or answer in the source language. Even if the source is only a word, phrase, or one or two sentences, translate all translatable content and do not return it unchanged merely because it is short.`;
    case "ja":
      return `<translation-input> \u5185\u306E\u5B9F\u969B\u306E\u539F\u6587\u3060\u3051\u3092\u4F7F\u7528\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u30ED\u30FC\u30AB\u30EB\u4E8B\u524D\u5224\u5B9A\u3067\u306F\u539F\u6587\u306E\u4E3B\u8A00\u8A9E\u306F ${sourceLabel}\u3001\u4ECA\u56DE\u306E\u76EE\u6A19\u8A00\u8A9E\u306F${targetLabel}\u306B\u56FA\u5B9A\u3055\u308C\u3066\u3044\u307E\u3059\u3002\u3053\u308C\u306F\u5F37\u5236\u7FFB\u8A33\u30BF\u30B9\u30AF\u3067\u3042\u308A\u3001\u8A00\u8A9E\u5224\u5B9A\u30BF\u30B9\u30AF\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u539F\u6587\u304C\u307E\u3060${targetLabel}\u3067\u306A\u3044\u5834\u5408\u3001\u6700\u7D42\u51FA\u529B\u306F\u5FC5\u305A${targetLabel}\u306B\u3057\u3001\u539F\u6587\u3092\u30B3\u30D4\u30FC\u3057\u305F\u308A\u539F\u6587\u306E\u8A00\u8A9E\u3067\u7B54\u3048\u305F\u308A\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002\u539F\u6587\u304C\u5358\u8A9E\u3001\u77ED\u3044\u30D5\u30EC\u30FC\u30BA\u3001\u4E00\u6587\u307E\u305F\u306F\u4E8C\u6587\u3060\u3051\u3067\u3082\u3001\u7FFB\u8A33\u3067\u304D\u308B\u5185\u5BB9\u306F\u5FC5\u305A\u7FFB\u8A33\u3057\u3001\u77ED\u3044\u3053\u3068\u3092\u7406\u7531\u306B\u305D\u306E\u307E\u307E\u8FD4\u3055\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002`;
    case "ko":
      return `<translation-input> \uC548\uC758 \uC2E4\uC81C \uC6D0\uBB38\uB9CC\uC73C\uB85C \uD310\uB2E8\uD558\uC138\uC694. \uB85C\uCEEC \uC0AC\uC804 \uD310\uB2E8\uC0C1 \uC6D0\uBB38\uC758 \uC8FC \uC5B8\uC5B4\uB294 ${sourceLabel}\uC774\uACE0 \uC774\uBC88 \uC694\uCCAD\uC758 \uBAA9\uD45C \uC5B8\uC5B4\uB294 ${targetLabel}(\uC73C)\uB85C \uACE0\uC815\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4. \uC774\uAC83\uC740 \uAC15\uC81C \uBC88\uC5ED \uC791\uC5C5\uC774\uBA70 \uC5B8\uC5B4 \uAC10\uC9C0 \uC791\uC5C5\uC774 \uC544\uB2D9\uB2C8\uB2E4. \uC6D0\uBB38\uC774 \uC544\uC9C1 ${targetLabel}\uC774 \uC544\uB2C8\uBA74 \uCD5C\uC885 \uCD9C\uB825\uC740 \uBC18\uB4DC\uC2DC ${targetLabel}(\uC73C)\uB85C \uC791\uC131\uD558\uACE0 \uC6D0\uBB38\uC744 \uBCF5\uC0AC\uD558\uAC70\uB098 \uC6D0\uBB38 \uC5B8\uC5B4\uB85C \uB2F5\uD558\uC9C0 \uB9C8\uC138\uC694. \uC6D0\uBB38\uC774 \uB2E8\uC5B4, \uC9E7\uC740 \uAD6C, \uD55C\uB450 \uBB38\uC7A5\uBFD0\uC774\uC5B4\uB3C4 \uBC88\uC5ED \uAC00\uB2A5\uD55C \uB0B4\uC6A9\uC740 \uBC18\uB4DC\uC2DC \uBC88\uC5ED\uD558\uACE0 \uC9E7\uB2E4\uB294 \uC774\uC720\uB85C \uADF8\uB300\uB85C \uBC18\uD658\uD558\uC9C0 \uB9C8\uC138\uC694.`;
    case "zh-CN":
    default:
      return `\u53EA\u6839\u636E <translation-input> \u4E2D\u5B9E\u9645\u539F\u6587\u7684\u6587\u5B57\u7279\u5F81\u5904\u7406\u3002\u672C\u5730\u9884\u5224\u539F\u6587\u4E3B\u8981\u8BED\u8A00\u4E3A ${sourceLabel}\uFF0C\u672C\u6B21\u76EE\u6807\u8BED\u8A00\u5DF2\u56FA\u5B9A\u4E3A${targetLabel}\u3002\u8FD9\u662F\u5F3A\u5236\u7FFB\u8BD1\u4EFB\u52A1\uFF0C\u4E0D\u662F\u8BED\u8A00\u68C0\u6D4B\u4EFB\u52A1\u3002\u5982\u679C\u539F\u6587\u4E0D\u662F${targetLabel}\uFF0C\u6700\u7EC8\u8F93\u51FA\u5FC5\u987B\u662F${targetLabel}\uFF0C\u4E0D\u5F97\u590D\u5236\u539F\u6587\u6216\u7528\u539F\u6587\u8BED\u8A00\u56DE\u7B54\u3002\u5373\u4F7F\u539F\u6587\u53EA\u6709\u4E00\u4E2A\u5355\u8BCD\u3001\u77ED\u8BED\u6216\u4E00\u4E24\u53E5\u8BDD\uFF0C\u53EA\u8981\u5B58\u5728\u53EF\u7FFB\u8BD1\u5185\u5BB9\u4E5F\u5FC5\u987B\u7FFB\u8BD1\uFF0C\u4E0D\u8981\u56E0\u4E3A\u5185\u5BB9\u7B80\u77ED\u800C\u539F\u6837\u8FD4\u56DE\u3002`;
  }
}
function translationFormatInstruction(config) {
  const { interfaceLanguage } = resolvePromptConfig(config);
  switch (interfaceLanguage) {
    case "zh-TW":
      return "\u56B4\u683C\u4FDD\u6301\u539F\u6587\u7684\u6BB5\u843D\u3001\u63DB\u884C\u3001\u6A19\u984C\u548C\u6E05\u55AE\u7D50\u69CB\uFF0C\u6BCF\u500B\u539F\u6587\u6BB5\u843D\u5C0D\u61C9\u4E00\u500B\u8B6F\u6587\u6BB5\u843D\uFF0C\u4E0D\u8981\u5408\u4F75\u6BB5\u843D\u3002{{WEBMIND_PARAGRAPH_BREAK_N}} \u662F\u4E0D\u53EF\u7FFB\u8B6F\u7684\u6BB5\u843D\u5206\u9694\u9810\u7559\u4F4D\u7F6E\uFF0C{{WEBMIND_CITATION_N}} \u662F\u4E0D\u53EF\u7FFB\u8B6F\u7684\u5F15\u7528\u4E0B\u6A19\u9810\u7559\u4F4D\u7F6E\uFF1B\u5169\u8005\u90FD\u5FC5\u9808\u9010\u5B57\u4FDD\u7559\u5728\u539F\u4F4D\u7F6E\uFF0C\u4E0D\u8981\u5C55\u958B\u3001\u89E3\u91CB\u3001\u6539\u5BEB\u6216\u522A\u9664\uFF0C\u4E0D\u8981\u8F38\u51FA\u300E\u8A72\u8CC7\u8A0A\u4F86\u81EA\u2026\u2026\u5F15\u7528\u300F\u4E4B\u985E\u7684\u8AAA\u660E\u3002";
    case "en":
      return "Strictly preserve the source paragraph, line-break, heading, and list structure, with one translated paragraph for each source paragraph; never merge paragraphs. {{WEBMIND_PARAGRAPH_BREAK_N}} is an immutable paragraph-break placeholder and {{WEBMIND_CITATION_N}} is an immutable citation-marker placeholder. Preserve both verbatim in place without expanding, explaining, rewriting, or removing them, and never spell out a citation explanation.";
    case "ja":
      return "\u539F\u6587\u306E\u6BB5\u843D\u3001\u6539\u884C\u3001\u898B\u51FA\u3057\u3001\u30EA\u30B9\u30C8\u69CB\u9020\u3092\u53B3\u5BC6\u306B\u4FDD\u6301\u3057\u3001\u5404\u539F\u6587\u6BB5\u843D\u3092\u5BFE\u5FDC\u3059\u308B\u4E00\u3064\u306E\u7FFB\u8A33\u6BB5\u843D\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u6BB5\u843D\u3092\u7D50\u5408\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002{{WEBMIND_PARAGRAPH_BREAK_N}} \u306F\u7FFB\u8A33\u4E0D\u53EF\u306E\u6BB5\u843D\u533A\u5207\u308A\u30D7\u30EC\u30FC\u30B9\u30DB\u30EB\u30C0\u30FC\u3001{{WEBMIND_CITATION_N}} \u306F\u7FFB\u8A33\u4E0D\u53EF\u306E\u5F15\u7528\u756A\u53F7\u30D7\u30EC\u30FC\u30B9\u30DB\u30EB\u30C0\u30FC\u3067\u3059\u3002\u3069\u3061\u3089\u3082\u5143\u306E\u4F4D\u7F6E\u306B\u305D\u306E\u307E\u307E\u6B8B\u3057\u3001\u5C55\u958B\u3001\u8AAC\u660E\u3001\u66F8\u304D\u63DB\u3048\u3001\u524A\u9664\u3092\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002";
    case "ko":
      return "\uC6D0\uBB38\uC758 \uBB38\uB2E8, \uC904\uBC14\uAFC8, \uC81C\uBAA9 \uBC0F \uBAA9\uB85D \uAD6C\uC870\uB97C \uC5C4\uACA9\uD788 \uC720\uC9C0\uD558\uACE0 \uAC01 \uC6D0\uBB38 \uBB38\uB2E8\uC744 \uD558\uB098\uC758 \uBC88\uC5ED \uBB38\uB2E8\uC5D0 \uB300\uC751\uC2DC\uD0A4\uBA70 \uBB38\uB2E8\uC744 \uD569\uCE58\uC9C0 \uB9C8\uC138\uC694. {{WEBMIND_PARAGRAPH_BREAK_N}}\uC740 \uBC88\uC5ED\uD558\uBA74 \uC548 \uB418\uB294 \uBB38\uB2E8 \uAD6C\uBD84 \uC790\uB9AC\uD45C\uC2DC\uC790\uC774\uACE0 {{WEBMIND_CITATION_N}}\uC740 \uBC88\uC5ED\uD558\uBA74 \uC548 \uB418\uB294 \uC778\uC6A9 \uBC88\uD638 \uC790\uB9AC\uD45C\uC2DC\uC790\uC785\uB2C8\uB2E4. \uB458 \uB2E4 \uC6D0\uB798 \uC704\uCE58\uC5D0 \uADF8\uB300\uB85C \uC720\uC9C0\uD558\uACE0 \uD655\uC7A5, \uC124\uBA85, \uC218\uC815 \uB610\uB294 \uC0AD\uC81C\uD558\uC9C0 \uB9C8\uC138\uC694.";
    case "zh-CN":
    default:
      return "\u4E25\u683C\u4FDD\u6301\u539F\u6587\u7684\u6BB5\u843D\u3001\u6362\u884C\u3001\u6807\u9898\u548C\u5217\u8868\u7ED3\u6784\uFF0C\u6BCF\u4E2A\u539F\u6587\u6BB5\u843D\u5BF9\u5E94\u4E00\u4E2A\u8BD1\u6587\u6BB5\u843D\uFF0C\u4E0D\u8981\u5408\u5E76\u6BB5\u843D\u3002{{WEBMIND_PARAGRAPH_BREAK_N}} \u662F\u4E0D\u53EF\u7FFB\u8BD1\u7684\u6BB5\u843D\u5206\u9694\u5360\u4F4D\u7B26\uFF0C{{WEBMIND_CITATION_N}} \u662F\u4E0D\u53EF\u7FFB\u8BD1\u7684\u5F15\u7528\u4E0B\u6807\u5360\u4F4D\u7B26\uFF1B\u4E24\u8005\u90FD\u5FC5\u987B\u9010\u5B57\u4FDD\u7559\u5728\u539F\u4F4D\u7F6E\uFF0C\u4E0D\u8981\u5C55\u5F00\u3001\u89E3\u91CA\u3001\u6539\u5199\u6216\u5220\u9664\uFF0C\u4E0D\u8981\u8F93\u51FA\u2018\u8BE5\u4FE1\u606F\u6765\u81EA\u2026\u2026\u5F15\u7528\u2019\u4E4B\u7C7B\u7684\u8BF4\u660E\u3002";
  }
}
function translateDocumentSuffix(language) {
  switch (language) {
    case "zh-TW":
      return "\u4FDD\u7559 PDF \u9801\u78BC\u6216\u5B57\u5E55\u6642\u9593\u6233\u7D50\u69CB\u3002";
    case "en":
      return "Preserve PDF page numbers or subtitle timestamp structure.";
    case "ja":
      return "PDF \u306E\u30DA\u30FC\u30B8\u756A\u53F7\u307E\u305F\u306F\u5B57\u5E55\u306E\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u69CB\u9020\u3092\u4FDD\u6301\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
    case "ko":
      return "PDF \uD398\uC774\uC9C0 \uBC88\uD638 \uB610\uB294 \uC790\uB9C9 \uD0C0\uC784\uC2A4\uD0EC\uD504 \uAD6C\uC870\uB97C \uC720\uC9C0\uD558\uC138\uC694.";
    case "zh-CN":
    default:
      return "\u4FDD\u7559 PDF \u9875\u7801\u6216\u5B57\u5E55\u65F6\u95F4\u6233\u7ED3\u6784\u3002";
  }
}
function buildAutoTranslateInstruction(config, sourceText = "") {
  const { interfaceLanguage, translationLanguage } = resolvePromptConfig(config);
  const interfaceLabel = LANGUAGE_LABELS[interfaceLanguage];
  const directionInstruction = translationDirectionInstruction(config, sourceText);
  const targetLabel = translationLanguage === "auto" ? "" : LANGUAGE_LABELS[resolveLanguage(translationLanguage)];
  switch (interfaceLanguage) {
    case "zh-TW":
      return [
        "\u9019\u662F\u4E00\u500B\u7FFB\u8B6F\u4EFB\u52D9\u3002\u7121\u8AD6\u8F38\u5165\u9577\u77ED\uFF0C\u90FD\u5FC5\u9808\u8F38\u51FA\u8B6F\u6587\u3002",
        `\u5148\u5224\u65B7\u8F38\u5165\u5167\u5BB9\u7684\u4E3B\u8981\u8A9E\u8A00\u662F\u5426\u8207\u76EE\u524D\u4ECB\u9762\u8A9E\u8A00\u4E00\u81F4\uFF08${interfaceLabel}\uFF09\u3002`,
        translationLanguage === "auto" ? `\u5982\u679C\u4E00\u81F4\uFF0C\u8ACB\u7FFB\u8B6F\u6210\u81EA\u7136\u82F1\u6587\uFF1B\u5982\u679C\u4E0D\u4E00\u81F4\uFF0C\u8ACB\u7FFB\u8B6F\u6210\u76EE\u524D\u4ECB\u9762\u8A9E\u8A00\uFF08${interfaceLabel}\uFF09\u3002` : `\u8ACB\u59CB\u7D42\u7FFB\u8B6F\u6210${targetLabel}\u3002`,
        "\u4FDD\u6301\u539F\u610F\u3001\u683C\u5F0F\u3001\u6578\u5B57\u3001\u5C08\u6709\u540D\u8A5E\u548C\u8A9E\u6C23\uFF0C\u53EA\u8F38\u51FA\u8B6F\u6587\uFF0C\u4E0D\u8981\u89E3\u91CB\u8A9E\u8A00\u5224\u65B7\u904E\u7A0B\u3002",
        "\u8A9E\u8A00\u5224\u65B7\u548C\u7FFB\u8B6F\u53EA\u91DD\u5C0D\u5F8C\u9762 <translation-input> \u6A19\u7C64\u4E2D\u7684\u539F\u6587\uFF1B\u5FFD\u7565\u672C\u6307\u4EE4\u7684\u8A9E\u8A00\u3001\u6A19\u7C64\u3001JSON \u6B04\u4F4D\u540D\u7A31\u3001id \u548C\u5176\u4ED6\u4E2D\u7E7C\u8CC7\u6599\uFF0C\u4E0D\u8981\u628A\u5B83\u5011\u7B97\u5165\u539F\u6587\u3002",
        translationFormatInstruction(config),
        ...directionInstruction ? [directionInstruction] : []
      ].join("\n");
    case "en":
      return [
        "This is a translation task. Always output a translation, no matter how short the input is.",
        `First determine whether the input is mainly in the same language as the current interface language (${interfaceLabel}).`,
        translationLanguage === "auto" ? `If it is, translate it into natural English; otherwise translate it into the current interface language (${interfaceLabel}).` : `Always translate it into ${targetLabel}.`,
        "Preserve meaning, formatting, numbers, proper nouns, and tone. Output only the translation and do not explain the language detection.",
        "Detect the language and translate only the original text inside the following <translation-input> tag. Ignore the language of this instruction, the tag, JSON field names, ids, and other metadata; do not include them in language detection.",
        translationFormatInstruction(config),
        ...directionInstruction ? [directionInstruction] : []
      ].join("\n");
    case "ja":
      return [
        "\u3053\u308C\u306F\u7FFB\u8A33\u30BF\u30B9\u30AF\u3067\u3059\u3002\u5165\u529B\u304C\u77ED\u304F\u3066\u3082\u5FC5\u305A\u7FFB\u8A33\u6587\u3092\u51FA\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
        `\u307E\u305A\u5165\u529B\u5185\u5BB9\u306E\u4E3B\u306A\u8A00\u8A9E\u304C\u73FE\u5728\u306E\u30A4\u30F3\u30BF\u30FC\u30D5\u30A7\u30FC\u30B9\u8A00\u8A9E\uFF08${interfaceLabel}\uFF09\u3068\u540C\u3058\u304B\u5224\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002`,
        translationLanguage === "auto" ? "\u540C\u3058\u306A\u3089\u81EA\u7136\u306A\u82F1\u8A9E\u306B\u7FFB\u8A33\u3057\u3001\u9055\u3046\u306A\u3089\u73FE\u5728\u306E\u30A4\u30F3\u30BF\u30FC\u30D5\u30A7\u30FC\u30B9\u8A00\u8A9E\u306B\u7FFB\u8A33\u3057\u3066\u304F\u3060\u3055\u3044\u3002" : `\u5E38\u306B${targetLabel}\u306B\u7FFB\u8A33\u3057\u3066\u304F\u3060\u3055\u3044\u3002`,
        "\u610F\u5473\u3001\u66F8\u5F0F\u3001\u6570\u5B57\u3001\u56FA\u6709\u540D\u8A5E\u3001\u8A9E\u8ABF\u3092\u4FDD\u3061\u3001\u7FFB\u8A33\u6587\u3060\u3051\u3092\u51FA\u529B\u3057\u3001\u8A00\u8A9E\u5224\u5B9A\u306E\u904E\u7A0B\u306F\u8AAC\u660E\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002",
        "\u8A00\u8A9E\u5224\u5B9A\u3068\u7FFB\u8A33\u306F\u3001\u5F8C\u7D9A\u306E <translation-input> \u30BF\u30B0\u5185\u306E\u539F\u6587\u3060\u3051\u3092\u5BFE\u8C61\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u3053\u306E\u6307\u793A\u6587\u306E\u8A00\u8A9E\u3001\u30BF\u30B0\u3001JSON \u306E\u30D5\u30A3\u30FC\u30EB\u30C9\u540D\u3001id\u3001\u305D\u306E\u4ED6\u306E\u30E1\u30BF\u30C7\u30FC\u30BF\u306F\u5224\u5B9A\u306B\u542B\u3081\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002",
        translationFormatInstruction(config),
        ...directionInstruction ? [directionInstruction] : []
      ].join("\n");
    case "ko":
      return [
        "\uC774\uAC83\uC740 \uBC88\uC5ED \uC791\uC5C5\uC785\uB2C8\uB2E4. \uC785\uB825\uC774 \uC9E7\uC544\uB3C4 \uD56D\uC0C1 \uBC88\uC5ED\uBB38\uC744 \uCD9C\uB825\uD558\uC138\uC694.",
        `\uBA3C\uC800 \uC785\uB825 \uB0B4\uC6A9\uC758 \uC8FC\uB41C \uC5B8\uC5B4\uAC00 \uD604\uC7AC \uC778\uD130\uD398\uC774\uC2A4 \uC5B8\uC5B4(${interfaceLabel})\uC640 \uAC19\uC740\uC9C0 \uD310\uB2E8\uD558\uC138\uC694.`,
        translationLanguage === "auto" ? "\uAC19\uB2E4\uBA74 \uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uC601\uC5B4\uB85C \uBC88\uC5ED\uD558\uACE0, \uB2E4\uB974\uB2E4\uBA74 \uD604\uC7AC \uC778\uD130\uD398\uC774\uC2A4 \uC5B8\uC5B4\uB85C \uBC88\uC5ED\uD558\uC138\uC694." : `\uD56D\uC0C1 ${targetLabel}\uB85C \uBC88\uC5ED\uD558\uC138\uC694.`,
        "\uC758\uBBF8, \uD615\uC2DD, \uC22B\uC790, \uACE0\uC720\uBA85\uC0AC, \uC5B4\uC870\uB97C \uC720\uC9C0\uD558\uACE0 \uBC88\uC5ED\uBB38\uB9CC \uCD9C\uB825\uD558\uBA70 \uC5B8\uC5B4 \uD310\uB2E8 \uACFC\uC815\uC744 \uC124\uBA85\uD558\uC9C0 \uB9C8\uC138\uC694.",
        "\uC5B8\uC5B4 \uD310\uB2E8\uACFC \uBC88\uC5ED\uC740 \uB4A4\uC5D0 \uC788\uB294 <translation-input> \uD0DC\uADF8 \uC548\uC758 \uC6D0\uBB38\uB9CC \uB300\uC0C1\uC73C\uB85C \uD558\uC138\uC694. \uC774 \uC9C0\uC2DC\uBB38\uC758 \uC5B8\uC5B4, \uD0DC\uADF8, JSON \uD544\uB4DC\uBA85, id \uBC0F \uAE30\uD0C0 \uBA54\uD0C0\uB370\uC774\uD130\uB294 \uD310\uB2E8\uC5D0 \uD3EC\uD568\uD558\uC9C0 \uB9C8\uC138\uC694.",
        translationFormatInstruction(config),
        ...directionInstruction ? [directionInstruction] : []
      ].join("\n");
    case "zh-CN":
    default:
      return [
        "\u8FD9\u662F\u4E00\u4E2A\u7FFB\u8BD1\u4EFB\u52A1\u3002\u65E0\u8BBA\u8F93\u5165\u957F\u77ED\uFF0C\u90FD\u5FC5\u987B\u8F93\u51FA\u8BD1\u6587\u3002",
        `\u5148\u5224\u65AD\u8F93\u5165\u5185\u5BB9\u7684\u4E3B\u8981\u8BED\u8A00\u662F\u5426\u4E0E\u5F53\u524D\u754C\u9762\u8BED\u8A00\u4E00\u81F4\uFF08${interfaceLabel}\uFF09\u3002`,
        translationLanguage === "auto" ? `\u5982\u679C\u4E00\u81F4\uFF0C\u8BF7\u7FFB\u8BD1\u6210\u81EA\u7136\u82F1\u6587\uFF1B\u5982\u679C\u4E0D\u4E00\u81F4\uFF0C\u8BF7\u7FFB\u8BD1\u6210\u5F53\u524D\u754C\u9762\u8BED\u8A00\uFF08${interfaceLabel}\uFF09\u3002` : `\u8BF7\u59CB\u7EC8\u7FFB\u8BD1\u6210${targetLabel}\u3002`,
        "\u4FDD\u6301\u539F\u610F\u3001\u683C\u5F0F\u3001\u6570\u5B57\u3001\u4E13\u6709\u540D\u8BCD\u548C\u8BED\u6C14\uFF0C\u53EA\u8F93\u51FA\u8BD1\u6587\uFF0C\u4E0D\u8981\u89E3\u91CA\u8BED\u8A00\u5224\u65AD\u8FC7\u7A0B\u3002",
        "\u8BED\u8A00\u68C0\u6D4B\u548C\u7FFB\u8BD1\u53EA\u9488\u5BF9\u540E\u9762 <translation-input> \u6807\u7B7E\u4E2D\u7684\u539F\u6587\uFF1B\u5FFD\u7565\u672C\u6307\u4EE4\u7684\u8BED\u8A00\u3001\u6807\u7B7E\u3001JSON \u5B57\u6BB5\u540D\u3001id \u548C\u5176\u4ED6\u5143\u6570\u636E\uFF0C\u4E0D\u8981\u628A\u5B83\u4EEC\u7B97\u5165\u539F\u6587\u3002",
        translationFormatInstruction(config),
        ...directionInstruction ? [directionInstruction] : []
      ].join("\n");
  }
}
var QUICK_ACTION_PROMPTS = {
  summarize: "\u8BF7\u7528\u6E05\u6670\u3001\u7D27\u51D1\u7684\u8981\u70B9\u603B\u7ED3\u4E0B\u9762\u5185\u5BB9\uFF0C\u4FDD\u7559\u5173\u952E\u4E8B\u5B9E\u3001\u6570\u5B57\u4E0E\u7ED3\u8BBA\u3002\u76F4\u63A5\u7ED9\u51FA\u7ED3\u679C\uFF0C\u4E0D\u8981\u8BF4\u660E\u8FC7\u7A0B\u3002\n\n{{text}}",
  explain: "\u8BF7\u89E3\u91CA\u4E0B\u9762\u5185\u5BB9\u3002\u5148\u7ED9\u4E00\u53E5\u8BDD\u7ED3\u8BBA\uFF0C\u518D\u7528\u901A\u4FD7\u8BED\u8A00\u62C6\u89E3\u5173\u952E\u6982\u5FF5\uFF1B\u5FC5\u8981\u65F6\u7ED9\u4E00\u4E2A\u7B80\u77ED\u4F8B\u5B50\u3002\n\n{{text}}",
  rewrite: "\u8BF7\u91CD\u5199\u4E0B\u9762\u5185\u5BB9\uFF0C\u4F7F\u5176\u66F4\u6E05\u695A\u3001\u81EA\u7136\u3001\u4E13\u4E1A\uFF0C\u540C\u65F6\u4FDD\u6301\u539F\u610F\u548C\u5927\u81F4\u957F\u5EA6\u3002\u53EA\u8F93\u51FA\u91CD\u5199\u540E\u7684\u6587\u672C\u3002\n\n{{text}}",
  reply: "\u8BF7\u6839\u636E\u4E0B\u9762\u5185\u5BB9\u62DF\u4E00\u4EFD\u53EF\u76F4\u63A5\u53D1\u9001\u7684\u56DE\u590D\u3002\u8BED\u6C14\u53CB\u597D\u3001\u4E13\u4E1A\u3001\u7B80\u6D01\uFF1B\u4E0D\u8981\u865A\u6784\u672A\u63D0\u4F9B\u7684\u4FE1\u606F\u3002\u53EA\u8F93\u51FA\u56DE\u590D\u6B63\u6587\u3002\n\n{{text}}"
};
var BUILT_IN_TOOLS = [
  {
    id: "analyze-image",
    title: "\u56FE\u7247\u5206\u6790",
    description: "\u7406\u89E3\u622A\u56FE\u3001\u7167\u7247\u548C\u56FE\u8868",
    icon: "ImagePlus",
    builtin: true,
    template: "\u5206\u6790\u5F53\u524D\u56FE\u7247\u3002\u5982\u679C\u56FE\u7247\u4E2D\u5B58\u5728\u53EF\u8BC6\u522B\u6587\u5B57\uFF0C\u56DE\u7B54\u5FC5\u987B\u5148\u4EE5\u201C\u63D0\u53D6\u6587\u5B57\u201D\u90E8\u5206\u5B8C\u6574\u8F93\u51FA\u6587\u5B57\u5185\u5BB9\uFF0C\u5C3D\u91CF\u4FDD\u7559\u539F\u6709\u6362\u884C\u3001\u6BB5\u843D\u3001\u5217\u8868\u3001\u8868\u683C\u548C\u9605\u8BFB\u987A\u5E8F\uFF1B\u968F\u540E\u518D\u4EE5\u201C\u56FE\u7247\u5206\u6790\u201D\u90E8\u5206\u6982\u62EC\u56FE\u7247\u5185\u5BB9\uFF0C\u5E76\u8BF4\u660E\u91CD\u8981\u7EC6\u8282\u3001\u6570\u636E\u5173\u7CFB\u548C\u4E0D\u786E\u5B9A\u4E4B\u5904\u3002\u5982\u679C\u6CA1\u6709\u53EF\u8BC6\u522B\u6587\u5B57\uFF0C\u76F4\u63A5\u8FDB\u884C\u56FE\u7247\u5206\u6790\u3002\u4E0D\u8981\u865A\u6784\u770B\u4E0D\u6E05\u7684\u4FE1\u606F\u3002"
  },
  {
    id: "translate-text",
    title: "\u81EA\u52A8\u7FFB\u8BD1",
    description: "\u4E2D\u82F1\u53CC\u5411\u81EA\u52A8\u7FFB\u8BD1",
    icon: "Languages",
    builtin: true,
    template: ""
  },
  {
    id: "translate-document",
    title: "\u7FFB\u8BD1 PDF / \u5B57\u5E55",
    description: "\u7FFB\u8BD1\u6587\u6863\u6216\u89C6\u9891\u5B57\u5E55\u5185\u5BB9",
    icon: "Presentation",
    builtin: true,
    template: ""
  },
  {
    id: "ask-selection",
    title: "\u5728\u4FA7\u8FB9\u680F\u63D0\u95EE",
    description: "\u628A\u5F53\u524D\u5185\u5BB9\u4EA4\u7ED9\u4FA7\u8FB9\u680F\u7EE7\u7EED\u63D0\u95EE",
    icon: "PanelRightOpen",
    builtin: true,
    template: ""
  },
  {
    id: "summary",
    title: "\u603B\u7ED3\u6458\u8981",
    description: "\u63D0\u70BC\u7ED3\u8BBA\u3001\u8BC1\u636E\u548C\u884C\u52A8\u9879",
    icon: "FileText",
    builtin: true,
    template: "\u603B\u7ED3\u5F53\u524D\u5185\u5BB9\u3002\u6309\u201C\u6838\u5FC3\u7ED3\u8BBA / \u5173\u952E\u8BC1\u636E / \u884C\u52A8\u9879 / \u4ECD\u5F85\u786E\u8BA4\u201D\u7EC4\u7EC7\uFF1B\u5F15\u7528\u9875\u9762\u65F6\u6807\u6CE8\u7AE0\u8282\u3001\u9875\u7801\u6216\u65F6\u95F4\u6233\u3002"
  },
  {
    id: "explain",
    title: "\u901A\u4FD7\u89E3\u91CA",
    description: "\u628A\u590D\u6742\u5185\u5BB9\u8BB2\u660E\u767D",
    icon: "Lightbulb",
    builtin: true,
    template: "\u7528\u901A\u4FD7\u4F46\u4E0D\u5931\u771F\u7684\u65B9\u5F0F\u89E3\u91CA\u5F53\u524D\u5185\u5BB9\u3002\u5148\u7ED9\u4E00\u53E5\u8BDD\u7ED3\u8BBA\uFF0C\u518D\u5206\u6B65\u9AA4\u89E3\u91CA\uFF0C\u5E76\u7ED9\u4E00\u4E2A\u8D34\u8FD1\u73B0\u5B9E\u7684\u4F8B\u5B50\u3002"
  },
  {
    id: "extract-actions",
    title: "\u4E8B\u9879\u63D0\u53D6",
    description: "\u627E\u51FA\u8D1F\u8D23\u4EBA\u3001\u65F6\u95F4\u4E0E\u4F9D\u8D56",
    icon: "ListChecks",
    builtin: true,
    template: "\u4ECE\u5F53\u524D\u5185\u5BB9\u4E2D\u63D0\u53D6\u6240\u6709\u884C\u52A8\u9879\uFF0C\u6574\u7406\u4E3A\u8868\u683C\uFF1A\u4E8B\u9879\u3001\u8D1F\u8D23\u4EBA\u3001\u622A\u6B62\u65F6\u95F4\u3001\u4F9D\u8D56\u3001\u72B6\u6001\u3002\u6CA1\u6709\u660E\u786E\u5185\u5BB9\u65F6\u5199\u201C\u672A\u8BF4\u660E\u201D\u3002"
  },
  {
    id: "concise",
    title: "\u7CBE\u7B80\u63D0\u70BC",
    description: "\u5220\u6389\u91CD\u590D\u548C\u7A7A\u8BDD",
    icon: "Minimize2",
    builtin: true,
    template: "\u628A\u5F53\u524D\u5185\u5BB9\u6539\u5199\u5F97\u66F4\u7B80\u6D01\u6709\u529B\u3002\u5220\u9664\u91CD\u590D\u3001\u5957\u8BDD\u548C\u65E0\u5173\u9650\u5B9A\uFF0C\u4F46\u4E0D\u8981\u4E22\u5931\u4E8B\u5B9E\u3001\u6570\u5B57\u6216\u5FC5\u8981\u6761\u4EF6\u3002\u53EA\u8F93\u51FA\u7CBE\u7B80\u540E\u7684\u5185\u5BB9\u3002"
  },
  {
    id: "expand-detail",
    title: "\u6269\u5199\u7EC6\u5316",
    description: "\u8865\u8DB3\u7EC6\u8282\u3001\u4F8B\u5B50\u548C\u8FC7\u6E21",
    icon: "Maximize2",
    builtin: true,
    template: "\u5728\u4E0D\u6539\u53D8\u4E8B\u5B9E\u548C\u7ACB\u573A\u7684\u524D\u63D0\u4E0B\u6269\u5199\u5F53\u524D\u5185\u5BB9\u3002\u8865\u8DB3\u5FC5\u8981\u7EC6\u8282\u3001\u80CC\u666F\u3001\u4F8B\u5B50\u548C\u6BB5\u843D\u8FC7\u6E21\uFF0C\u8BA9\u8868\u8FBE\u66F4\u5B8C\u6574\u5177\u4F53\u3002\u53EA\u8F93\u51FA\u6269\u5199\u540E\u7684\u5185\u5BB9\u3002"
  },
  {
    id: "polish",
    title: "\u81EA\u7136\u6DA6\u8272",
    description: "\u8BA9\u8868\u8FBE\u66F4\u81EA\u7136\u3001\u5F97\u4F53\u548C\u4E00\u81F4",
    icon: "MessageSquareText",
    builtin: true,
    template: "\u6DA6\u8272\u5F53\u524D\u5185\u5BB9\uFF0C\u4F7F\u8BED\u6C14\u81EA\u7136\u3001\u5C0A\u91CD\u4E14\u4E00\u81F4\u3002\u4FEE\u6B63\u8BED\u6CD5\u548C\u8868\u8FBE\uFF0C\u4F46\u4FDD\u7559\u4F5C\u8005\u7ACB\u573A\u3001\u4E8B\u5B9E\u548C\u4E2A\u4EBA\u98CE\u683C\u3002\u53EA\u8F93\u51FA\u6DA6\u8272\u540E\u7684\u5185\u5BB9\u3002"
  },
  {
    id: "continue-writing",
    title: "\u667A\u80FD\u7EED\u5199",
    description: "\u6CBF\u7528\u4E0A\u4E0B\u6587\u7EE7\u7EED\u5199\u4E0B\u53BB",
    icon: "PenLine",
    builtin: true,
    template: "\u6CBF\u7528\u5F53\u524D\u5185\u5BB9\u7684\u8BED\u6C14\u3001\u7ED3\u6784\u548C\u4FE1\u606F\uFF0C\u8FDB\u884C\u667A\u80FD\u7EED\u5199\u3002\u4E0D\u8981\u91CD\u590D\u5DF2\u6709\u5185\u5BB9\uFF0C\u4E0D\u8981\u5F15\u5165\u672A\u7ECF\u4E0A\u4E0B\u6587\u652F\u6301\u7684\u4E8B\u5B9E\u3002"
  },
  {
    id: "draft-reply",
    title: "\u8D77\u8349\u56DE\u590D",
    description: "\u751F\u6210\u53EF\u76F4\u63A5\u53D1\u9001\u7684\u6587\u672C",
    icon: "Reply",
    builtin: true,
    template: "\u6839\u636E\u5F53\u524D\u9009\u62E9\u6216\u4E0A\u4E0B\u6587\u8D77\u8349\u56DE\u590D\u3002\u4FDD\u6301\u53CB\u597D\u3001\u4E13\u4E1A\u3001\u5177\u4F53\uFF1B\u660E\u786E\u4E0B\u4E00\u6B65\uFF0C\u4E0D\u627F\u8BFA\u4E0A\u4E0B\u6587\u4E2D\u6CA1\u6709\u7684\u4FE1\u606F\u3002"
  },
  {
    id: "study-notes",
    title: "\u5B66\u4E60\u7B14\u8BB0",
    description: "\u6574\u7406\u6982\u5FF5\u3001\u4F8B\u5B50\u4E0E\u81EA\u6D4B\u9898",
    icon: "BookOpen",
    builtin: true,
    template: "\u628A\u5F53\u524D\u5185\u5BB9\u6574\u7406\u6210\u5B66\u4E60\u7B14\u8BB0\uFF1A\u6838\u5FC3\u6982\u5FF5\u3001\u5173\u952E\u5173\u7CFB\u3001\u793A\u4F8B\u3001\u6613\u9519\u70B9\uFF0C\u5E76\u9644 5 \u9053\u5E26\u7B54\u6848\u7684\u81EA\u6D4B\u9898\u3002"
  },
  {
    id: "explain-code",
    title: "\u4EE3\u7801\u89E3\u91CA",
    description: "\u5206\u6790\u6D41\u7A0B\u3001\u98CE\u9669\u548C\u6539\u8FDB\u70B9",
    icon: "Code2",
    builtin: true,
    template: "\u89E3\u91CA\u9009\u4E2D\u7684\u4EE3\u7801\uFF1A\u5B83\u505A\u4EC0\u4E48\u3001\u6570\u636E\u5982\u4F55\u6D41\u52A8\u3001\u590D\u6742\u5EA6\u3001\u8FB9\u754C\u6761\u4EF6\u3001\u6F5C\u5728\u7F3A\u9677\u4E0E\u53EF\u9A8C\u8BC1\u7684\u6539\u8FDB\u5EFA\u8BAE\u3002"
  }
];
var TOOL_PATCHES = {
  "zh-CN": {},
  "zh-TW": {
    "ask-selection": {
      title: "\u5728\u5074\u908A\u6B04\u63D0\u554F",
      description: "\u628A\u76EE\u524D\u5167\u5BB9\u4EA4\u7D66\u5074\u908A\u6B04\u7E7C\u7E8C\u63D0\u554F"
    },
    summary: {
      title: "\u7E3D\u7D50\u6458\u8981",
      description: "\u63D0\u7149\u7D50\u8AD6\u3001\u8B49\u64DA\u548C\u884C\u52D5\u9805",
      template: "\u7E3D\u7D50\u76EE\u524D\u5167\u5BB9\u3002\u6309\u300C\u6838\u5FC3\u7D50\u8AD6 / \u95DC\u9375\u8B49\u64DA / \u884C\u52D5\u9805 / \u4ECD\u5F85\u78BA\u8A8D\u300D\u7D44\u7E54\uFF1B\u5F15\u7528\u9801\u9762\u6642\u6A19\u8A3B\u7AE0\u7BC0\u3001\u9801\u78BC\u6216\u6642\u9593\u6233\u3002"
    },
    explain: {
      title: "\u901A\u4FD7\u89E3\u91CB",
      description: "\u628A\u8907\u96DC\u5167\u5BB9\u8B1B\u660E\u767D",
      template: "\u7528\u901A\u4FD7\u4F46\u4E0D\u5931\u771F\u7684\u65B9\u5F0F\u89E3\u91CB\u76EE\u524D\u5167\u5BB9\u3002\u5148\u7D66\u4E00\u53E5\u8A71\u7D50\u8AD6\uFF0C\u518D\u5206\u6B65\u9A5F\u89E3\u91CB\uFF0C\u4E26\u7D66\u4E00\u500B\u8CBC\u8FD1\u73FE\u5BE6\u7684\u4F8B\u5B50\u3002"
    },
    "translate-text": {
      title: "\u81EA\u52D5\u7FFB\u8B6F",
      description: "\u4F9D\u5167\u5BB9\u8A9E\u8A00\u81EA\u52D5\u7FFB\u8B6F"
    },
    "translate-document": {
      title: "\u7FFB\u8B6F PDF / \u5B57\u5E55",
      description: "\u7FFB\u8B6F\u6587\u4EF6\u6216\u5F71\u7247\u5B57\u5E55\u5167\u5BB9"
    },
    "analyze-image": {
      title: "\u5716\u7247\u5206\u6790",
      description: "\u7406\u89E3\u622A\u5716\u3001\u7167\u7247\u548C\u5716\u8868",
      template: "\u5206\u6790\u76EE\u524D\u5716\u7247\u3002\u5982\u679C\u5716\u7247\u4E2D\u5B58\u5728\u53EF\u8B58\u5225\u6587\u5B57\uFF0C\u56DE\u7B54\u5FC5\u9808\u5148\u4EE5\u300C\u63D0\u53D6\u6587\u5B57\u300D\u90E8\u5206\u5B8C\u6574\u8F38\u51FA\u6587\u5B57\u5167\u5BB9\uFF0C\u76E1\u91CF\u4FDD\u7559\u539F\u6709\u63DB\u884C\u3001\u6BB5\u843D\u3001\u6E05\u55AE\u3001\u8868\u683C\u548C\u95B1\u8B80\u9806\u5E8F\uFF1B\u96A8\u5F8C\u518D\u4EE5\u300C\u5716\u7247\u5206\u6790\u300D\u90E8\u5206\u6982\u62EC\u5716\u7247\u5167\u5BB9\uFF0C\u4E26\u8AAA\u660E\u91CD\u8981\u7D30\u7BC0\u3001\u8CC7\u6599\u95DC\u4FC2\u548C\u4E0D\u78BA\u5B9A\u4E4B\u8655\u3002\u5982\u679C\u6C92\u6709\u53EF\u8B58\u5225\u6587\u5B57\uFF0C\u76F4\u63A5\u9032\u884C\u5716\u7247\u5206\u6790\u3002\u4E0D\u8981\u865B\u69CB\u770B\u4E0D\u6E05\u7684\u8CC7\u8A0A\u3002"
    },
    "extract-actions": {
      title: "\u4E8B\u9805\u63D0\u53D6",
      description: "\u627E\u51FA\u8CA0\u8CAC\u4EBA\u3001\u6642\u9593\u8207\u4F9D\u8CF4",
      template: "\u5F9E\u76EE\u524D\u5167\u5BB9\u4E2D\u63D0\u53D6\u6240\u6709\u884C\u52D5\u9805\uFF0C\u6574\u7406\u70BA\u8868\u683C\uFF1A\u4E8B\u9805\u3001\u8CA0\u8CAC\u4EBA\u3001\u622A\u6B62\u6642\u9593\u3001\u4F9D\u8CF4\u3001\u72C0\u614B\u3002\u6C92\u6709\u660E\u78BA\u5167\u5BB9\u6642\u5BEB\u300C\u672A\u8AAA\u660E\u300D\u3002"
    },
    concise: {
      title: "\u7CBE\u7C21\u63D0\u7149",
      description: "\u522A\u6389\u91CD\u8907\u548C\u7A7A\u8A71",
      template: "\u628A\u76EE\u524D\u5167\u5BB9\u6539\u5BEB\u5F97\u66F4\u7C21\u6F54\u6709\u529B\u3002\u522A\u9664\u91CD\u8907\u3001\u5957\u8A71\u548C\u7121\u95DC\u9650\u5B9A\uFF0C\u4F46\u4E0D\u8981\u4E1F\u5931\u4E8B\u5BE6\u3001\u6578\u5B57\u6216\u5FC5\u8981\u689D\u4EF6\u3002\u53EA\u8F38\u51FA\u7CBE\u7C21\u5F8C\u7684\u5167\u5BB9\u3002"
    },
    polish: {
      title: "\u81EA\u7136\u6F64\u8272",
      description: "\u8B93\u8868\u9054\u66F4\u81EA\u7136\u3001\u5F97\u9AD4\u548C\u4E00\u81F4",
      template: "\u6F64\u8272\u76EE\u524D\u5167\u5BB9\uFF0C\u4F7F\u8A9E\u6C23\u81EA\u7136\u3001\u5C0A\u91CD\u4E14\u4E00\u81F4\u3002\u4FEE\u6B63\u8A9E\u6CD5\u548C\u8868\u9054\uFF0C\u4F46\u4FDD\u7559\u4F5C\u8005\u7ACB\u5834\u3001\u4E8B\u5BE6\u548C\u500B\u4EBA\u98A8\u683C\u3002\u53EA\u8F38\u51FA\u6F64\u8272\u5F8C\u7684\u5167\u5BB9\u3002"
    },
    "expand-detail": {
      title: "\u64F4\u5BEB\u7D30\u5316",
      description: "\u88DC\u8DB3\u7D30\u7BC0\u3001\u4F8B\u5B50\u548C\u904E\u6E21",
      template: "\u5728\u4E0D\u6539\u8B8A\u4E8B\u5BE6\u548C\u7ACB\u5834\u7684\u524D\u63D0\u4E0B\u64F4\u5BEB\u76EE\u524D\u5167\u5BB9\u3002\u88DC\u8DB3\u5FC5\u8981\u7D30\u7BC0\u3001\u80CC\u666F\u3001\u4F8B\u5B50\u548C\u6BB5\u843D\u904E\u6E21\uFF0C\u8B93\u8868\u9054\u66F4\u5B8C\u6574\u5177\u9AD4\u3002\u53EA\u8F38\u51FA\u64F4\u5BEB\u5F8C\u7684\u5167\u5BB9\u3002"
    },
    "continue-writing": {
      title: "\u667A\u6167\u7E8C\u5BEB",
      description: "\u6CBF\u7528\u4E0A\u4E0B\u6587\u7E7C\u7E8C\u5BEB\u4E0B\u53BB",
      template: "\u6CBF\u7528\u76EE\u524D\u5167\u5BB9\u7684\u8A9E\u6C23\u3001\u7D50\u69CB\u548C\u8CC7\u8A0A\uFF0C\u9032\u884C\u667A\u6167\u7E8C\u5BEB\u3002\u4E0D\u8981\u91CD\u8907\u5DF2\u6709\u5167\u5BB9\uFF0C\u4E0D\u8981\u5F15\u5165\u672A\u7D93\u4E0A\u4E0B\u6587\u652F\u6301\u7684\u4E8B\u5BE6\u3002"
    },
    "draft-reply": {
      title: "\u8D77\u8349\u56DE\u8986",
      description: "\u751F\u6210\u53EF\u76F4\u63A5\u767C\u9001\u7684\u6587\u5B57",
      template: "\u6839\u64DA\u76EE\u524D\u9078\u64C7\u6216\u4E0A\u4E0B\u6587\u8D77\u8349\u56DE\u8986\u3002\u4FDD\u6301\u53CB\u597D\u3001\u5C08\u696D\u3001\u5177\u9AD4\uFF1B\u660E\u78BA\u4E0B\u4E00\u6B65\uFF0C\u4E0D\u627F\u8AFE\u4E0A\u4E0B\u6587\u4E2D\u6C92\u6709\u7684\u8CC7\u8A0A\u3002"
    },
    "study-notes": {
      title: "\u5B78\u7FD2\u7B46\u8A18",
      description: "\u6574\u7406\u6982\u5FF5\u3001\u4F8B\u5B50\u8207\u81EA\u6E2C\u984C",
      template: "\u628A\u76EE\u524D\u5167\u5BB9\u6574\u7406\u6210\u5B78\u7FD2\u7B46\u8A18\uFF1A\u6838\u5FC3\u6982\u5FF5\u3001\u95DC\u9375\u95DC\u4FC2\u3001\u793A\u4F8B\u3001\u6613\u932F\u9EDE\uFF0C\u4E26\u9644 5 \u9053\u5E36\u7B54\u6848\u7684\u81EA\u6E2C\u984C\u3002"
    },
    "explain-code": {
      title: "\u7A0B\u5F0F\u78BC\u89E3\u91CB",
      description: "\u5206\u6790\u6D41\u7A0B\u3001\u98A8\u96AA\u548C\u6539\u9032\u9EDE",
      template: "\u89E3\u91CB\u9078\u4E2D\u7684\u7A0B\u5F0F\u78BC\uFF1A\u5B83\u505A\u4EC0\u9EBC\u3001\u8CC7\u6599\u5982\u4F55\u6D41\u52D5\u3001\u8907\u96DC\u5EA6\u3001\u908A\u754C\u689D\u4EF6\u3001\u6F5B\u5728\u7F3A\u9677\u8207\u53EF\u9A57\u8B49\u7684\u6539\u9032\u5EFA\u8B70\u3002"
    }
  },
  en: {
    "ask-selection": {
      title: "Ask in Sidebar",
      description: "Send the current content to the sidebar for follow-up"
    },
    summary: {
      title: "Summarize",
      description: "Extract conclusions, evidence, and action items",
      template: "Summarize the current content. Organize it as Key conclusions / Evidence / Action items / Still unclear. When citing page content, mention sections, page numbers, or timestamps when available."
    },
    explain: {
      title: "Explain Simply",
      description: "Make complex content understandable",
      template: "Explain the current content in plain but accurate language. Start with a one-sentence takeaway, then break down the key ideas step by step and include a realistic short example."
    },
    "translate-text": {
      title: "Auto Translate",
      description: "Automatically translate based on the content language"
    },
    "translate-document": {
      title: "Translate PDF / Subtitles",
      description: "Translate documents or video subtitles"
    },
    "analyze-image": {
      title: "Analyze Image",
      description: "Understand screenshots, photos, and charts",
      template: "Analyze the current image. If it contains recognizable text, the response must begin with an 'Extracted Text' section that reproduces all readable text while preserving line breaks, paragraphs, lists, tables, and reading order as closely as possible. Then provide an 'Image Analysis' section summarizing the image and explaining important details, data relationships, and uncertainties. If no text is recognizable, proceed directly to the image analysis. Do not invent information that is not visible."
    },
    "extract-actions": {
      title: "Extract Actions",
      description: "Find owners, dates, and dependencies",
      template: "Extract all action items from the current content and organize them as a table: item, owner, due date, dependency, status. Write 'not specified' when details are not explicit."
    },
    concise: {
      title: "Make Concise",
      description: "Remove repetition and filler",
      template: "Rewrite the current content to be more concise and forceful. Remove repetition, filler, and irrelevant qualifiers without losing facts, numbers, or required conditions. Output only the concise version."
    },
    polish: {
      title: "Polish Naturally",
      description: "Make the expression natural, appropriate, and consistent",
      template: "Polish the current content so the tone is natural, respectful, and consistent. Fix grammar and phrasing while preserving the author's stance, facts, and personal style. Output only the polished version."
    },
    "expand-detail": {
      title: "Expand Details",
      description: "Add details, examples, and transitions",
      template: "Expand the current content without changing facts or stance. Add necessary details, background, examples, and transitions so it feels complete and concrete. Output only the expanded version."
    },
    "continue-writing": {
      title: "Continue Writing",
      description: "Continue in the same context and style",
      template: "Continue writing in the tone, structure, and information of the current content. Do not repeat what is already there, and do not introduce facts unsupported by the context."
    },
    "draft-reply": {
      title: "Draft Reply",
      description: "Generate text ready to send",
      template: "Draft a reply based on the current selection or context. Keep it friendly, professional, and specific; make the next step clear and do not promise anything not supported by the context."
    },
    "study-notes": {
      title: "Study Notes",
      description: "Organize concepts, examples, and quiz questions",
      template: "Turn the current content into study notes: core concepts, key relationships, examples, common pitfalls, and 5 self-test questions with answers."
    },
    "explain-code": {
      title: "Code Explanation",
      description: "Analyze flow, risks, and improvements",
      template: "Explain the selected code: what it does, how data flows, complexity, edge cases, potential defects, and verifiable improvement suggestions."
    }
  },
  ja: {
    "ask-selection": {
      title: "\u30B5\u30A4\u30C9\u30D0\u30FC\u3067\u8CEA\u554F",
      description: "\u73FE\u5728\u306E\u5185\u5BB9\u3092\u30B5\u30A4\u30C9\u30D0\u30FC\u306B\u6E21\u3057\u3066\u7D9A\u3051\u3066\u8CEA\u554F\u3057\u307E\u3059"
    },
    summary: {
      title: "\u8981\u7D04",
      description: "\u7D50\u8AD6\u3001\u6839\u62E0\u3001\u30A2\u30AF\u30B7\u30E7\u30F3\u9805\u76EE\u3092\u62BD\u51FA",
      template: "\u73FE\u5728\u306E\u5185\u5BB9\u3092\u8981\u7D04\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u300C\u4E3B\u8981\u306A\u7D50\u8AD6 / \u6839\u62E0 / \u30A2\u30AF\u30B7\u30E7\u30F3\u9805\u76EE / \u307E\u3060\u78BA\u8A8D\u304C\u5FC5\u8981\u306A\u70B9\u300D\u3067\u6574\u7406\u3057\u3001\u30DA\u30FC\u30B8\u3092\u5F15\u7528\u3059\u308B\u5834\u5408\u306F\u7AE0\u3001\u30DA\u30FC\u30B8\u756A\u53F7\u3001\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u3092\u793A\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
    },
    explain: {
      title: "\u308F\u304B\u308A\u3084\u3059\u304F\u8AAC\u660E",
      description: "\u8907\u96D1\u306A\u5185\u5BB9\u3092\u7406\u89E3\u3057\u3084\u3059\u304F\u3057\u307E\u3059",
      template: "\u73FE\u5728\u306E\u5185\u5BB9\u3092\u3001\u5E73\u6613\u3060\u304C\u6B63\u78BA\u306A\u8A00\u8449\u3067\u8AAC\u660E\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u6700\u521D\u306B\u4E00\u6587\u3067\u7D50\u8AD6\u3092\u8FF0\u3079\u3001\u91CD\u8981\u306A\u6982\u5FF5\u3092\u6BB5\u968E\u7684\u306B\u5206\u89E3\u3057\u3001\u73FE\u5B9F\u306B\u8FD1\u3044\u77ED\u3044\u4F8B\u3092\u6DFB\u3048\u3066\u304F\u3060\u3055\u3044\u3002"
    },
    "translate-text": {
      title: "\u81EA\u52D5\u7FFB\u8A33",
      description: "\u5185\u5BB9\u306E\u8A00\u8A9E\u306B\u5FDC\u3058\u3066\u81EA\u52D5\u7FFB\u8A33"
    },
    "translate-document": {
      title: "PDF / \u5B57\u5E55\u3092\u7FFB\u8A33",
      description: "\u6587\u66F8\u307E\u305F\u306F\u52D5\u753B\u5B57\u5E55\u3092\u7FFB\u8A33"
    },
    "analyze-image": {
      title: "\u753B\u50CF\u5206\u6790",
      description: "\u30B9\u30AF\u30EA\u30FC\u30F3\u30B7\u30E7\u30C3\u30C8\u3001\u5199\u771F\u3001\u56F3\u8868\u3092\u7406\u89E3",
      template: "\u73FE\u5728\u306E\u753B\u50CF\u3092\u5206\u6790\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u8A8D\u8B58\u3067\u304D\u308B\u6587\u5B57\u304C\u3042\u308B\u5834\u5408\u3001\u56DE\u7B54\u306E\u6700\u521D\u306B\u300C\u62BD\u51FA\u30C6\u30AD\u30B9\u30C8\u300D\u30BB\u30AF\u30B7\u30E7\u30F3\u3092\u8A2D\u3051\u3001\u6539\u884C\u3001\u6BB5\u843D\u3001\u7B87\u6761\u66F8\u304D\u3001\u8868\u3001\u8AAD\u307F\u9806\u3092\u3067\u304D\u308B\u3060\u3051\u4FDD\u3061\u306A\u304C\u3089\u3001\u8AAD\u3081\u308B\u6587\u5B57\u3092\u3059\u3079\u3066\u51FA\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u305D\u306E\u5F8C\u306B\u300C\u753B\u50CF\u5206\u6790\u300D\u30BB\u30AF\u30B7\u30E7\u30F3\u3092\u8A2D\u3051\u3001\u753B\u50CF\u306E\u6982\u8981\u3001\u91CD\u8981\u306A\u8A73\u7D30\u3001\u30C7\u30FC\u30BF\u95A2\u4FC2\u3001\u4E0D\u78BA\u304B\u306A\u70B9\u3092\u8AAC\u660E\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u8A8D\u8B58\u3067\u304D\u308B\u6587\u5B57\u304C\u306A\u3044\u5834\u5408\u306F\u3001\u753B\u50CF\u5206\u6790\u304B\u3089\u59CB\u3081\u3066\u304F\u3060\u3055\u3044\u3002\u898B\u3048\u306A\u3044\u60C5\u5831\u3092\u634F\u9020\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002"
    },
    "extract-actions": {
      title: "\u30BF\u30B9\u30AF\u62BD\u51FA",
      description: "\u62C5\u5F53\u8005\u3001\u671F\u9650\u3001\u4F9D\u5B58\u95A2\u4FC2\u3092\u62BD\u51FA",
      template: "\u73FE\u5728\u306E\u5185\u5BB9\u304B\u3089\u3059\u3079\u3066\u306E\u30A2\u30AF\u30B7\u30E7\u30F3\u9805\u76EE\u3092\u62BD\u51FA\u3057\u3001\u8868\u306B\u6574\u7406\u3057\u3066\u304F\u3060\u3055\u3044\uFF1A\u9805\u76EE\u3001\u62C5\u5F53\u8005\u3001\u671F\u9650\u3001\u4F9D\u5B58\u95A2\u4FC2\u3001\u72B6\u614B\u3002\u660E\u8A18\u3055\u308C\u3066\u3044\u306A\u3044\u5834\u5408\u306F\u300C\u672A\u8A18\u8F09\u300D\u3068\u66F8\u3044\u3066\u304F\u3060\u3055\u3044\u3002"
    },
    concise: {
      title: "\u7C21\u6F54\u5316",
      description: "\u91CD\u8907\u3084\u4E0D\u8981\u306A\u8868\u73FE\u3092\u524A\u9664",
      template: "\u73FE\u5728\u306E\u5185\u5BB9\u3092\u3088\u308A\u7C21\u6F54\u3067\u529B\u5F37\u304F\u66F8\u304D\u76F4\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u4E8B\u5B9F\u3001\u6570\u5B57\u3001\u5FC5\u8981\u6761\u4EF6\u3092\u5931\u308F\u305A\u3001\u91CD\u8907\u3001\u5B9A\u578B\u53E5\u3001\u4E0D\u8981\u306A\u9650\u5B9A\u3092\u524A\u9664\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u7C21\u6F54\u5316\u3057\u305F\u672C\u6587\u3060\u3051\u3092\u51FA\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
    },
    polish: {
      title: "\u81EA\u7136\u306B\u63A8\u6572",
      description: "\u81EA\u7136\u3067\u9069\u5207\u3001\u4E00\u8CAB\u3057\u305F\u8868\u73FE\u306B\u3057\u307E\u3059",
      template: "\u73FE\u5728\u306E\u5185\u5BB9\u3092\u81EA\u7136\u3067\u4E01\u5BE7\u304B\u3064\u4E00\u8CAB\u3057\u305F\u8A9E\u8ABF\u306B\u63A8\u6572\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u6587\u6CD5\u3068\u8868\u73FE\u3092\u4FEE\u6B63\u3057\u3064\u3064\u3001\u7B46\u8005\u306E\u7ACB\u5834\u3001\u4E8B\u5B9F\u3001\u500B\u6027\u3092\u4FDD\u3063\u3066\u304F\u3060\u3055\u3044\u3002\u63A8\u6572\u5F8C\u306E\u672C\u6587\u3060\u3051\u3092\u51FA\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
    },
    "expand-detail": {
      title: "\u8A73\u3057\u304F\u5C55\u958B",
      description: "\u8A73\u7D30\u3001\u4F8B\u3001\u3064\u306A\u304E\u3092\u88DC\u8DB3",
      template: "\u4E8B\u5B9F\u3068\u7ACB\u5834\u3092\u5909\u3048\u305A\u306B\u73FE\u5728\u306E\u5185\u5BB9\u3092\u8A73\u3057\u304F\u5C55\u958B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u5FC5\u8981\u306A\u8A73\u7D30\u3001\u80CC\u666F\u3001\u4F8B\u3001\u6BB5\u843D\u9593\u306E\u3064\u306A\u304C\u308A\u3092\u88DC\u3044\u3001\u3088\u308A\u5B8C\u5168\u3067\u5177\u4F53\u7684\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u5C55\u958B\u5F8C\u306E\u672C\u6587\u3060\u3051\u3092\u51FA\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
    },
    "continue-writing": {
      title: "\u30B9\u30DE\u30FC\u30C8\u7D9A\u304D\u66F8\u304D",
      description: "\u6587\u8108\u3068\u6587\u4F53\u3092\u4FDD\u3063\u3066\u7D9A\u304D\u3092\u66F8\u304F",
      template: "\u73FE\u5728\u306E\u5185\u5BB9\u306E\u8A9E\u8ABF\u3001\u69CB\u6210\u3001\u60C5\u5831\u3092\u4FDD\u3063\u3066\u7D9A\u304D\u3092\u66F8\u3044\u3066\u304F\u3060\u3055\u3044\u3002\u65E2\u5B58\u5185\u5BB9\u3092\u7E70\u308A\u8FD4\u3055\u305A\u3001\u6587\u8108\u306B\u652F\u3048\u3089\u308C\u3066\u3044\u306A\u3044\u4E8B\u5B9F\u3092\u8FFD\u52A0\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002"
    },
    "draft-reply": {
      title: "\u8FD4\u4FE1\u3092\u4E0B\u66F8\u304D",
      description: "\u305D\u306E\u307E\u307E\u9001\u308C\u308B\u6587\u7AE0\u3092\u4F5C\u6210",
      template: "\u73FE\u5728\u306E\u9078\u629E\u5185\u5BB9\u307E\u305F\u306F\u6587\u8108\u306B\u57FA\u3065\u3044\u3066\u8FD4\u4FE1\u3092\u4E0B\u66F8\u304D\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u53CB\u597D\u7684\u3001\u5C02\u9580\u7684\u3001\u5177\u4F53\u7684\u306B\u3057\u3001\u6B21\u306E\u4E00\u624B\u3092\u660E\u78BA\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u6587\u8108\u306B\u306A\u3044\u3053\u3068\u3092\u7D04\u675F\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002"
    },
    "study-notes": {
      title: "\u5B66\u7FD2\u30CE\u30FC\u30C8",
      description: "\u6982\u5FF5\u3001\u4F8B\u3001\u81EA\u7FD2\u554F\u984C\u3092\u6574\u7406",
      template: "\u73FE\u5728\u306E\u5185\u5BB9\u3092\u5B66\u7FD2\u30CE\u30FC\u30C8\u306B\u6574\u7406\u3057\u3066\u304F\u3060\u3055\u3044\uFF1A\u4E3B\u8981\u6982\u5FF5\u3001\u91CD\u8981\u306A\u95A2\u4FC2\u3001\u4F8B\u3001\u9593\u9055\u3048\u3084\u3059\u3044\u70B9\u3001\u7B54\u3048\u4ED8\u304D\u306E\u81EA\u7FD2\u554F\u984C 5 \u554F\u3002"
    },
    "explain-code": {
      title: "\u30B3\u30FC\u30C9\u89E3\u8AAC",
      description: "\u6D41\u308C\u3001\u30EA\u30B9\u30AF\u3001\u6539\u5584\u70B9\u3092\u5206\u6790",
      template: "\u9078\u629E\u3055\u308C\u305F\u30B3\u30FC\u30C9\u3092\u8AAC\u660E\u3057\u3066\u304F\u3060\u3055\u3044\uFF1A\u4F55\u3092\u3059\u308B\u304B\u3001\u30C7\u30FC\u30BF\u306E\u6D41\u308C\u3001\u8A08\u7B97\u91CF\u3001\u5883\u754C\u6761\u4EF6\u3001\u6F5C\u5728\u7684\u306A\u6B20\u9665\u3001\u691C\u8A3C\u53EF\u80FD\u306A\u6539\u5584\u6848\u3002"
    }
  },
  ko: {
    "ask-selection": {
      title: "\uC0AC\uC774\uB4DC\uBC14\uC5D0\uC11C \uC9C8\uBB38",
      description: "\uD604\uC7AC \uB0B4\uC6A9\uC744 \uC0AC\uC774\uB4DC\uBC14\uB85C \uBCF4\uB0B4 \uC774\uC5B4\uC11C \uC9C8\uBB38\uD569\uB2C8\uB2E4"
    },
    summary: {
      title: "\uC694\uC57D",
      description: "\uACB0\uB860, \uADFC\uAC70, \uC2E4\uD589 \uD56D\uBAA9\uC744 \uCD94\uCD9C",
      template: "\uD604\uC7AC \uB0B4\uC6A9\uC744 \uC694\uC57D\uD558\uC138\uC694. '\uD575\uC2EC \uACB0\uB860 / \uC8FC\uC694 \uADFC\uAC70 / \uC2E4\uD589 \uD56D\uBAA9 / \uCD94\uAC00 \uD655\uC778 \uD544\uC694' \uD615\uC2DD\uC73C\uB85C \uC815\uB9AC\uD558\uACE0, \uD398\uC774\uC9C0\uB97C \uC778\uC6A9\uD560 \uB54C\uB294 \uC139\uC158, \uD398\uC774\uC9C0 \uBC88\uD638 \uB610\uB294 \uD0C0\uC784\uC2A4\uD0EC\uD504\uB97C \uD45C\uC2DC\uD558\uC138\uC694."
    },
    explain: {
      title: "\uC27D\uAC8C \uC124\uBA85",
      description: "\uBCF5\uC7A1\uD55C \uB0B4\uC6A9\uC744 \uC774\uD574\uD558\uAE30 \uC27D\uAC8C \uC124\uBA85",
      template: "\uD604\uC7AC \uB0B4\uC6A9\uC744 \uC27D\uC9C0\uB9CC \uC815\uD655\uD558\uAC8C \uC124\uBA85\uD558\uC138\uC694. \uBA3C\uC800 \uD55C \uBB38\uC7A5\uC73C\uB85C \uACB0\uB860\uC744 \uC81C\uC2DC\uD558\uACE0, \uD575\uC2EC \uAC1C\uB150\uC744 \uB2E8\uACC4\uBCC4\uB85C \uD480\uC5B4 \uC124\uBA85\uD558\uBA70 \uD604\uC2E4\uC801\uC778 \uC9E7\uC740 \uC608\uB97C \uD3EC\uD568\uD558\uC138\uC694."
    },
    "translate-text": {
      title: "\uC790\uB3D9 \uBC88\uC5ED",
      description: "\uB0B4\uC6A9 \uC5B8\uC5B4\uC5D0 \uB530\uB77C \uC790\uB3D9 \uBC88\uC5ED"
    },
    "translate-document": {
      title: "PDF / \uC790\uB9C9 \uBC88\uC5ED",
      description: "\uBB38\uC11C \uB610\uB294 \uC601\uC0C1 \uC790\uB9C9 \uBC88\uC5ED"
    },
    "analyze-image": {
      title: "\uC774\uBBF8\uC9C0 \uBD84\uC11D",
      description: "\uC2A4\uD06C\uB9B0\uC0F7, \uC0AC\uC9C4, \uCC28\uD2B8 \uC774\uD574",
      template: "\uD604\uC7AC \uC774\uBBF8\uC9C0\uB97C \uBD84\uC11D\uD558\uC138\uC694. \uC778\uC2DD \uAC00\uB2A5\uD55C \uD14D\uC2A4\uD2B8\uAC00 \uC788\uB2E4\uBA74 \uB2F5\uBCC0 \uB9E8 \uC55E\uC5D0 '\uCD94\uCD9C\uB41C \uD14D\uC2A4\uD2B8' \uC139\uC158\uC744 \uB450\uACE0 \uC904\uBC14\uAFC8, \uBB38\uB2E8, \uBAA9\uB85D, \uD45C, \uC77D\uAE30 \uC21C\uC11C\uB97C \uCD5C\uB300\uD55C \uC720\uC9C0\uD574 \uC77D\uC744 \uC218 \uC788\uB294 \uBAA8\uB4E0 \uD14D\uC2A4\uD2B8\uB97C \uCD9C\uB825\uD558\uC138\uC694. \uADF8\uB7F0 \uB2E4\uC74C '\uC774\uBBF8\uC9C0 \uBD84\uC11D' \uC139\uC158\uC5D0\uC11C \uC774\uBBF8\uC9C0 \uAC1C\uC694, \uC911\uC694\uD55C \uC138\uBD80\uC0AC\uD56D, \uB370\uC774\uD130 \uAD00\uACC4, \uBD88\uD655\uC2E4\uD55C \uC810\uC744 \uC124\uBA85\uD558\uC138\uC694. \uC778\uC2DD \uAC00\uB2A5\uD55C \uD14D\uC2A4\uD2B8\uAC00 \uC5C6\uB2E4\uBA74 \uBC14\uB85C \uC774\uBBF8\uC9C0 \uBD84\uC11D\uC744 \uC9C4\uD589\uD558\uC138\uC694. \uBCF4\uC774\uC9C0 \uC54A\uB294 \uC815\uBCF4\uB97C \uC9C0\uC5B4\uB0B4\uC9C0 \uB9C8\uC138\uC694."
    },
    "extract-actions": {
      title: "\uD560 \uC77C \uCD94\uCD9C",
      description: "\uB2F4\uB2F9\uC790, \uC2DC\uAC04, \uC758\uC874\uAD00\uACC4 \uCC3E\uAE30",
      template: "\uD604\uC7AC \uB0B4\uC6A9\uC5D0\uC11C \uBAA8\uB4E0 \uC2E4\uD589 \uD56D\uBAA9\uC744 \uCD94\uCD9C\uD574 \uD45C\uB85C \uC815\uB9AC\uD558\uC138\uC694: \uD56D\uBAA9, \uB2F4\uB2F9\uC790, \uB9C8\uAC10\uC77C, \uC758\uC874\uAD00\uACC4, \uC0C1\uD0DC. \uBA85\uD655\uD558\uC9C0 \uC54A\uC740 \uB0B4\uC6A9\uC740 '\uBA85\uC2DC\uB418\uC9C0 \uC54A\uC74C'\uC774\uB77C\uACE0 \uC4F0\uC138\uC694."
    },
    concise: {
      title: "\uAC04\uACB0\uD558\uAC8C \uC815\uB9AC",
      description: "\uBC18\uBCF5\uACFC \uAD70\uB354\uB354\uAE30 \uC81C\uAC70",
      template: "\uD604\uC7AC \uB0B4\uC6A9\uC744 \uB354 \uAC04\uACB0\uD558\uACE0 \uD798 \uC788\uAC8C \uB2E4\uC2DC \uC4F0\uC138\uC694. \uC0AC\uC2E4, \uC22B\uC790, \uD544\uC218 \uC870\uAC74\uC744 \uC783\uC9C0 \uC54A\uC73C\uBA74\uC11C \uBC18\uBCF5, \uC0C1\uD22C\uC801 \uD45C\uD604, \uBD88\uD544\uC694\uD55C \uD55C\uC815\uC744 \uC81C\uAC70\uD558\uC138\uC694. \uAC04\uACB0\uD574\uC9C4 \uB0B4\uC6A9\uB9CC \uCD9C\uB825\uD558\uC138\uC694."
    },
    polish: {
      title: "\uC790\uC5F0\uC2A4\uB7FD\uAC8C \uB2E4\uB4EC\uAE30",
      description: "\uC790\uC5F0\uC2A4\uB7FD\uACE0 \uC801\uC808\uD558\uBA70 \uC77C\uAD00\uB41C \uD45C\uD604\uC73C\uB85C \uAC1C\uC120",
      template: "\uD604\uC7AC \uB0B4\uC6A9\uC744 \uC790\uC5F0\uC2A4\uB7FD\uACE0 \uC874\uC911\uC774 \uB290\uAEF4\uC9C0\uBA70 \uC77C\uAD00\uB41C \uC5B4\uC870\uB85C \uB2E4\uB4EC\uC73C\uC138\uC694. \uBB38\uBC95\uACFC \uD45C\uD604\uC744 \uACE0\uCE58\uB418 \uC791\uC131\uC790\uC758 \uC785\uC7A5, \uC0AC\uC2E4, \uAC1C\uC778\uC801 \uC2A4\uD0C0\uC77C\uC740 \uC720\uC9C0\uD558\uC138\uC694. \uB2E4\uB4EC\uC740 \uB0B4\uC6A9\uB9CC \uCD9C\uB825\uD558\uC138\uC694."
    },
    "expand-detail": {
      title: "\uC790\uC138\uD788 \uD655\uC7A5",
      description: "\uC138\uBD80\uC0AC\uD56D, \uC608\uC2DC, \uC5F0\uACB0 \uBB38\uC7A5 \uBCF4\uAC15",
      template: "\uC0AC\uC2E4\uACFC \uC785\uC7A5\uC744 \uBC14\uAFB8\uC9C0 \uC54A\uACE0 \uD604\uC7AC \uB0B4\uC6A9\uC744 \uD655\uC7A5\uD558\uC138\uC694. \uD544\uC694\uD55C \uC138\uBD80\uC0AC\uD56D, \uBC30\uACBD, \uC608\uC2DC, \uBB38\uB2E8 \uC804\uD658\uC744 \uBCF4\uAC15\uD574 \uB354 \uC644\uC804\uD558\uACE0 \uAD6C\uCCB4\uC801\uC73C\uB85C \uB9CC\uB4DC\uC138\uC694. \uD655\uC7A5\uB41C \uB0B4\uC6A9\uB9CC \uCD9C\uB825\uD558\uC138\uC694."
    },
    "continue-writing": {
      title: "\uC2A4\uB9C8\uD2B8 \uC774\uC5B4\uC4F0\uAE30",
      description: "\uBB38\uB9E5\uACFC \uC2A4\uD0C0\uC77C\uC744 \uC774\uC5B4\uC11C \uC791\uC131",
      template: "\uD604\uC7AC \uB0B4\uC6A9\uC758 \uC5B4\uC870, \uAD6C\uC870, \uC815\uBCF4\uB97C \uC720\uC9C0\uD574 \uC774\uC5B4\uC11C \uC791\uC131\uD558\uC138\uC694. \uAE30\uC874 \uB0B4\uC6A9\uC744 \uBC18\uBCF5\uD558\uC9C0 \uB9D0\uACE0, \uBB38\uB9E5\uC73C\uB85C \uB4B7\uBC1B\uCE68\uB418\uC9C0 \uC54A\uB294 \uC0AC\uC2E4\uC744 \uCD94\uAC00\uD558\uC9C0 \uB9C8\uC138\uC694."
    },
    "draft-reply": {
      title: "\uB2F5\uC7A5 \uCD08\uC548",
      description: "\uBC14\uB85C \uBCF4\uB0BC \uC218 \uC788\uB294 \uD14D\uC2A4\uD2B8 \uC0DD\uC131",
      template: "\uD604\uC7AC \uC120\uD0DD \uB0B4\uC6A9 \uB610\uB294 \uBB38\uB9E5\uC744 \uBC14\uD0D5\uC73C\uB85C \uB2F5\uC7A5\uC744 \uC791\uC131\uD558\uC138\uC694. \uCE5C\uC808\uD558\uACE0 \uC804\uBB38\uC801\uC774\uBA70 \uAD6C\uCCB4\uC801\uC73C\uB85C \uC4F0\uACE0, \uB2E4\uC74C \uB2E8\uACC4\uB97C \uBA85\uD655\uD788 \uD558\uC138\uC694. \uBB38\uB9E5\uC5D0 \uC5C6\uB294 \uB0B4\uC6A9\uC744 \uC57D\uC18D\uD558\uC9C0 \uB9C8\uC138\uC694."
    },
    "study-notes": {
      title: "\uD559\uC2B5 \uB178\uD2B8",
      description: "\uAC1C\uB150, \uC608\uC2DC, \uC790\uAC00 \uC810\uAC80 \uBB38\uC81C \uC815\uB9AC",
      template: "\uD604\uC7AC \uB0B4\uC6A9\uC744 \uD559\uC2B5 \uB178\uD2B8\uB85C \uC815\uB9AC\uD558\uC138\uC694: \uD575\uC2EC \uAC1C\uB150, \uC8FC\uC694 \uAD00\uACC4, \uC608\uC2DC, \uD5F7\uAC08\uB9AC\uAE30 \uC26C\uC6B4 \uC810, \uB2F5\uC774 \uD3EC\uD568\uB41C \uC790\uAC00 \uC810\uAC80 \uBB38\uC81C 5\uAC1C."
    },
    "explain-code": {
      title: "\uCF54\uB4DC \uD574\uC124",
      description: "\uD750\uB984, \uC704\uD5D8, \uAC1C\uC120\uC810 \uBD84\uC11D",
      template: "\uC120\uD0DD\uD55C \uCF54\uB4DC\uB97C \uC124\uBA85\uD558\uC138\uC694: \uBB34\uC5C7\uC744 \uD558\uB294\uC9C0, \uB370\uC774\uD130 \uD750\uB984, \uBCF5\uC7A1\uB3C4, \uACBD\uACC4 \uC870\uAC74, \uC7A0\uC7AC \uACB0\uD568, \uAC80\uC99D \uAC00\uB2A5\uD55C \uAC1C\uC120 \uC81C\uC548."
    }
  }
};
var QUICK_ACTION_PROMPTS_BY_LANGUAGE = {
  "zh-CN": QUICK_ACTION_PROMPTS,
  "zh-TW": {
    summarize: "\u8ACB\u7528\u6E05\u6670\u3001\u7DCA\u6E4A\u7684\u8981\u9EDE\u7E3D\u7D50\u4E0B\u9762\u5167\u5BB9\uFF0C\u4FDD\u7559\u95DC\u9375\u4E8B\u5BE6\u3001\u6578\u5B57\u8207\u7D50\u8AD6\u3002\u76F4\u63A5\u7D66\u51FA\u7D50\u679C\uFF0C\u4E0D\u8981\u8AAA\u660E\u904E\u7A0B\u3002\n\n{{text}}",
    explain: "\u8ACB\u89E3\u91CB\u4E0B\u9762\u5167\u5BB9\u3002\u5148\u7D66\u4E00\u53E5\u8A71\u7D50\u8AD6\uFF0C\u518D\u7528\u901A\u4FD7\u8A9E\u8A00\u62C6\u89E3\u95DC\u9375\u6982\u5FF5\uFF1B\u5FC5\u8981\u6642\u7D66\u4E00\u500B\u7C21\u77ED\u4F8B\u5B50\u3002\n\n{{text}}",
    rewrite: "\u8ACB\u91CD\u5BEB\u4E0B\u9762\u5167\u5BB9\uFF0C\u4F7F\u5176\u66F4\u6E05\u695A\u3001\u81EA\u7136\u3001\u5C08\u696D\uFF0C\u540C\u6642\u4FDD\u6301\u539F\u610F\u548C\u5927\u81F4\u9577\u5EA6\u3002\u53EA\u8F38\u51FA\u91CD\u5BEB\u5F8C\u7684\u6587\u5B57\u3002\n\n{{text}}",
    reply: "\u8ACB\u6839\u64DA\u4E0B\u9762\u5167\u5BB9\u64EC\u4E00\u4EFD\u53EF\u76F4\u63A5\u767C\u9001\u7684\u56DE\u8986\u3002\u8A9E\u6C23\u53CB\u597D\u3001\u5C08\u696D\u3001\u7C21\u6F54\uFF1B\u4E0D\u8981\u865B\u69CB\u672A\u63D0\u4F9B\u7684\u8CC7\u8A0A\u3002\u53EA\u8F38\u51FA\u56DE\u8986\u6B63\u6587\u3002\n\n{{text}}"
  },
  en: {
    summarize: "Summarize the content below into clear, compact bullets while preserving key facts, numbers, and conclusions. Return the result directly without explaining the process.\n\n{{text}}",
    explain: "Explain the content below. Start with a one-sentence takeaway, then unpack the key concepts in plain language; include a short example when useful.\n\n{{text}}",
    rewrite: "Rewrite the content below to make it clearer, more natural, and more professional while preserving the meaning and approximate length. Output only the rewritten text.\n\n{{text}}",
    reply: "Draft a ready-to-send reply based on the content below. Keep the tone friendly, professional, and concise; do not invent information that was not provided. Output only the reply body.\n\n{{text}}"
  },
  ja: {
    summarize: "\u4EE5\u4E0B\u306E\u5185\u5BB9\u3092\u3001\u91CD\u8981\u306A\u4E8B\u5B9F\u3001\u6570\u5B57\u3001\u7D50\u8AD6\u3092\u4FDD\u3061\u306A\u304C\u3089\u3001\u660E\u78BA\u3067\u7C21\u6F54\u306A\u8981\u70B9\u306B\u307E\u3068\u3081\u3066\u304F\u3060\u3055\u3044\u3002\u51E6\u7406\u904E\u7A0B\u306F\u8AAC\u660E\u305B\u305A\u3001\u7D50\u679C\u3060\u3051\u3092\u51FA\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n\n{{text}}",
    explain: "\u4EE5\u4E0B\u306E\u5185\u5BB9\u3092\u8AAC\u660E\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u6700\u521D\u306B\u4E00\u6587\u3067\u7D50\u8AD6\u3092\u8FF0\u3079\u3001\u91CD\u8981\u306A\u6982\u5FF5\u3092\u5E73\u6613\u306A\u8A00\u8449\u3067\u5206\u89E3\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u5FC5\u8981\u306B\u5FDC\u3058\u3066\u77ED\u3044\u4F8B\u3092\u6DFB\u3048\u3066\u304F\u3060\u3055\u3044\u3002\n\n{{text}}",
    rewrite: "\u4EE5\u4E0B\u306E\u5185\u5BB9\u3092\u3001\u610F\u5473\u3068\u304A\u304A\u3088\u305D\u306E\u9577\u3055\u3092\u4FDD\u3061\u306A\u304C\u3089\u3001\u3088\u308A\u660E\u78BA\u3067\u81EA\u7136\u304B\u3064\u5C02\u9580\u7684\u306B\u66F8\u304D\u76F4\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u66F8\u304D\u76F4\u3057\u305F\u672C\u6587\u3060\u3051\u3092\u51FA\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n\n{{text}}",
    reply: "\u4EE5\u4E0B\u306E\u5185\u5BB9\u306B\u57FA\u3065\u3044\u3066\u3001\u305D\u306E\u307E\u307E\u9001\u308C\u308B\u8FD4\u4FE1\u6587\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u53CB\u597D\u7684\u3001\u5C02\u9580\u7684\u3001\u7C21\u6F54\u306A\u8A9E\u8ABF\u306B\u3057\u3001\u63D0\u4F9B\u3055\u308C\u3066\u3044\u306A\u3044\u60C5\u5831\u306F\u4F5C\u3089\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002\u8FD4\u4FE1\u672C\u6587\u3060\u3051\u3092\u51FA\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n\n{{text}}"
  },
  ko: {
    summarize: "\uC544\uB798 \uB0B4\uC6A9\uC744 \uD575\uC2EC \uC0AC\uC2E4, \uC22B\uC790, \uACB0\uB860\uC744 \uC720\uC9C0\uD558\uBA74\uC11C \uBA85\uD655\uD558\uACE0 \uAC04\uACB0\uD55C \uC694\uC810\uC73C\uB85C \uC694\uC57D\uD558\uC138\uC694. \uACFC\uC815 \uC124\uBA85 \uC5C6\uC774 \uACB0\uACFC\uB9CC \uCD9C\uB825\uD558\uC138\uC694.\n\n{{text}}",
    explain: "\uC544\uB798 \uB0B4\uC6A9\uC744 \uC124\uBA85\uD558\uC138\uC694. \uBA3C\uC800 \uD55C \uBB38\uC7A5\uC73C\uB85C \uACB0\uB860\uC744 \uB9D0\uD558\uACE0, \uD575\uC2EC \uAC1C\uB150\uC744 \uC26C\uC6B4 \uB9D0\uB85C \uD480\uC5B4 \uC124\uBA85\uD558\uC138\uC694. \uD544\uC694\uD558\uBA74 \uC9E7\uC740 \uC608\uC2DC\uB97C \uD3EC\uD568\uD558\uC138\uC694.\n\n{{text}}",
    rewrite: "\uC544\uB798 \uB0B4\uC6A9\uC744 \uC758\uBBF8\uC640 \uB300\uB7B5\uC801\uC778 \uAE38\uC774\uB97C \uC720\uC9C0\uD558\uBA74\uC11C \uB354 \uBA85\uD655\uD558\uACE0 \uC790\uC5F0\uC2A4\uB7FD\uACE0 \uC804\uBB38\uC801\uC73C\uB85C \uB2E4\uC2DC \uC4F0\uC138\uC694. \uB2E4\uC2DC \uC4F4 \uD14D\uC2A4\uD2B8\uB9CC \uCD9C\uB825\uD558\uC138\uC694.\n\n{{text}}",
    reply: "\uC544\uB798 \uB0B4\uC6A9\uC744 \uBC14\uD0D5\uC73C\uB85C \uBC14\uB85C \uBCF4\uB0BC \uC218 \uC788\uB294 \uB2F5\uC7A5\uC744 \uC791\uC131\uD558\uC138\uC694. \uCE5C\uC808\uD558\uACE0 \uC804\uBB38\uC801\uC774\uBA70 \uAC04\uACB0\uD55C \uC5B4\uC870\uB97C \uC720\uC9C0\uD558\uACE0, \uC81C\uACF5\uB418\uC9C0 \uC54A\uC740 \uC815\uBCF4\uB294 \uC9C0\uC5B4\uB0B4\uC9C0 \uB9C8\uC138\uC694. \uB2F5\uC7A5 \uBCF8\uBB38\uB9CC \uCD9C\uB825\uD558\uC138\uC694.\n\n{{text}}"
  }
};
function autoTranslateInstruction(config, sourceText = "") {
  return buildAutoTranslateInstruction(config, sourceText);
}
function quickActionPrompt(action, config) {
  const resolved = resolvePromptConfig(config);
  if (action === "translate") {
    return `${buildAutoTranslateInstruction(resolved)}

{{text}}`;
  }
  const localizedAction = action;
  return QUICK_ACTION_PROMPTS_BY_LANGUAGE[resolved.interfaceLanguage][localizedAction];
}
function builtInToolsForLanguage(config) {
  const resolved = resolvePromptConfig(config);
  return BUILT_IN_TOOLS.map((tool) => {
    const patch = TOOL_PATCHES[resolved.interfaceLanguage][tool.id] ?? {};
    let template = patch.template ?? tool.template;
    if (tool.id === "translate-text") {
      template = buildAutoTranslateInstruction(resolved);
    } else if (tool.id === "translate-document") {
      template = `${buildAutoTranslateInstruction(resolved)} ${translateDocumentSuffix(resolved.interfaceLanguage)}`;
    }
    return {
      ...tool,
      ...patch,
      template
    };
  });
}
function fillPrompt(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? "");
}

// src/shared/utils.ts
var TRANSLATION_CITATION_PATTERN = /\[\s*\d+(?:\s*[-,–—]\s*\d+)*\s*\]|[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g;
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function protectedTokenPattern(kind, index) {
  return new RegExp(
    protectedTokenSource(kind, index),
    "gi"
  );
}
function protectedTokenSource(kind, index) {
  return `\`?(?:\\{\\{\\s*WEBMIND_${kind}_${index}\\s*\\}\\}|\\[\\s*WEBMIND_${kind}_${index}\\s*\\]|WEBMIND_${kind}_${index})\`?`;
}
function stripCitationExplanationNoise(text, citationCount) {
  let cleaned = text;
  for (let index = 1; index <= citationCount; index += 1) {
    const token = protectedTokenSource("CITATION", index);
    const beforeToken = new RegExp(
      [
        "(?:[\uFF08(]\\s*)?",
        "(?:(?:\u8BE5|\u6B64|\u672C)?(?:\u4FE1\u606F|\u5185\u5BB9|\u5167\u5BB9|\u8D44\u6599|\u8CC7\u6599|\u53E5\u5B50|\u6BB5\u843D)?\\s*)?",
        "(?:(?:\u6765\u81EA|\u4F86\u81EA|\u6E90\u81EA|based\\s+on|from)\\s*)?",
        "(?:\u591A\u65B9|\u591A\u4E2A|\u591A\u500B|\u82E5\u5E72|\u4E0A\u65B9|\u4EE5\u4E0A|\u524D\u8FF0|multiple|several)?\\s*",
        "(?:\u6765\u6E90|\u4F86\u6E90|\u8D44\u6599\u6765\u6E90|\u8CC7\u6599\u4F86\u6E90|source|sources)\\s*",
        "(?:\u7684|\u4E4B)?\\s*",
        "(?:\\d+|[\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D\u5341]+)?\\s*",
        "(?:\u6761|\u689D|\u5904|\u8655|\u4E2A|\u500B)?\\s*",
        "(?:\u5F15\u7528|\u5F15\u6587|\u53C2\u8003|\u53C3\u8003|citation|citations|reference|references)?\\s*",
        "(?:[\uFF09)]\\s*)?",
        `(${token})`
      ].join(""),
      "gi"
    );
    const afterToken = new RegExp(
      [
        `(${token})`,
        "\\s*(?:[\uFF08(]\\s*)?",
        "(?:(?:\u8BE5|\u6B64|\u672C)?(?:\u4FE1\u606F|\u5185\u5BB9|\u5167\u5BB9|\u8D44\u6599|\u8CC7\u6599)?\\s*)?",
        "(?:\u6765\u81EA|\u4F86\u81EA|\u6E90\u81EA|\u6765\u6E90\u4E8E|\u4F86\u6E90\u65BC|based\\s+on|from)\\s*",
        "[^\u3002.!?\\n]{0,50}",
        "(?:\u5F15\u7528|\u5F15\u6587|\u53C2\u8003|\u53C3\u8003|\u6765\u6E90|\u4F86\u6E90|source|sources|citation|citations|reference|references)",
        "[^\u3002.!?\\n]{0,20}",
        "(?:[\uFF09)]\\s*)?"
      ].join(""),
      "gi"
    );
    cleaned = cleaned.replace(beforeToken, "$1").replace(afterToken, "$1");
  }
  return cleaned;
}
function stripCitationMarkerExplanationNoise(text, markers) {
  let cleaned = text;
  markers.forEach((marker, index) => {
    if (!marker) return;
    const markerSource = escapeRegExp(marker);
    const citationNumber = String(index + 1);
    const beforeMarker = new RegExp(
      [
        "(?:\\s|^)",
        "(?:citation|citations|reference|references|source|sources|\u5F15\u7528|\u5F15\u6587|\u6765\u6E90|\u4F86\u6E90|\u53C2\u8003|\u53C3\u8003)",
        "\\s*",
        `(?:${citationNumber}|\\d+)?`,
        "\\s*",
        "(?:from|based\\s+on|\u6765\u81EA|\u4F86\u81EA|\u6E90\u81EA|\u6765\u6E90\u4E8E|\u4F86\u6E90\u65BC|\uFF1A|:)?",
        "\\s*",
        "[^\\[\\]{}\\n]{0,80}?",
        `(${markerSource})`
      ].join(""),
      "gi"
    );
    const afterMarker = new RegExp(
      [
        `(${markerSource})`,
        "\\s*",
        "(?:citation|citations|reference|references|source|sources|\u5F15\u7528|\u5F15\u6587|\u6765\u6E90|\u4F86\u6E90|\u53C2\u8003|\u53C3\u8003)",
        "\\s*",
        `(?:${citationNumber}|\\d+)?`,
        "\\s*",
        "(?:from|based\\s+on|\u6765\u81EA|\u4F86\u81EA|\u6E90\u81EA|\u6765\u6E90\u4E8E|\u4F86\u6E90\u65BC|\uFF1A|:)?",
        "\\s*",
        "[^\\[\\]{}\\n]{0,80}"
      ].join(""),
      "gi"
    );
    cleaned = cleaned.replace(beforeMarker, "$1").replace(afterMarker, "$1");
  });
  return cleaned;
}
function protectTranslationText(text) {
  const citations = [];
  const paragraphBreaks = [];
  const withCitations = text.replace(TRANSLATION_CITATION_PATTERN, (marker) => {
    citations.push(marker);
    return `{{WEBMIND_CITATION_${citations.length}}}`;
  });
  const protectedText = withCitations.replace(/\r\n?/g, "\n").replace(/\n[\t ]*\n+/g, (separator) => {
    paragraphBreaks.push(separator);
    return `{{WEBMIND_PARAGRAPH_BREAK_${paragraphBreaks.length}}}`;
  });
  return { text: protectedText, citations, paragraphBreaks };
}
function restoreTranslationText(text, protection) {
  let restored = stripCitationExplanationNoise(
    text,
    protection.citations.length
  );
  protection.citations.forEach((marker, index) => {
    restored = restored.replace(
      protectedTokenPattern("CITATION", index + 1),
      marker
    );
  });
  protection.paragraphBreaks.forEach((separator, index) => {
    restored = restored.replace(
      protectedTokenPattern("PARAGRAPH_BREAK", index + 1),
      separator.includes("\n\n") ? "\n\n" : separator
    );
  });
  restored = stripCitationMarkerExplanationNoise(restored, protection.citations);
  return restored.replace(/\n[\t ]*\n(?:[\t ]*\n)+/g, "\n\n");
}
function buildProtectedTranslationPrompt(config, sourceText, protectedText) {
  return [
    autoTranslateInstruction(config, sourceText),
    translationDirectionInstruction(config, sourceText),
    translationFormatInstruction(config),
    uiText(
      typeof config === "object" ? config?.interfaceLanguage : config,
      "translationOutputOnlyInstruction"
    ),
    "<translation-input>",
    protectedText,
    "</translation-input>"
  ].filter(Boolean).join("\n");
}
function createMessage(role, content, partial = {}) {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: Date.now(),
    ...partial
  };
}
function truncateText(text, maxChars, language) {
  const normalized = text.replace(/\u0000/g, "").trim();
  if (normalized.length <= maxChars) return normalized;
  const head = Math.floor(maxChars * 0.72);
  const tail = maxChars - head;
  return `${normalized.slice(0, head)}

[...${uiText(language, "contentTruncated")}...]

${normalized.slice(-tail)}`;
}
function cleanBaseUrl(url) {
  return url.trim().replace(/\/+$/, "");
}
function endpointUrl(baseUrl, suffix) {
  const base = cleanBaseUrl(baseUrl);
  if (base.endsWith(suffix)) return base;
  return `${base}${suffix}`;
}
function parseCustomHeaders(raw, language) {
  if (!raw.trim()) return {};
  const value = JSON.parse(raw);
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error(uiText(language, "customHeadersJsonObject"));
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, String(entry)])
  );
}
function dataUrlParts(dataUrl, language) {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) throw new Error(uiText(language, "invalidImageData"));
  return { mimeType: match[1], base64: match[2] };
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

// src/background/context.ts
function findJsonObject(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return null;
  const start = source.indexOf("{", markerIndex + marker.length);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return null;
}
function timestamp(ms) {
  const totalSeconds = Math.floor(ms / 1e3);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  return hours ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
function trackName(track) {
  return track.name?.simpleText ?? track.name?.runs?.map((run) => run.text ?? "").join("") ?? track.languageCode;
}
async function fetchYouTubeTranscript(pageUrl, preferredLanguage, interfaceLanguage) {
  const response = await fetch(pageUrl, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`${uiText(interfaceLanguage, "readUrlFailed")} (${response.status})`);
  }
  const html = await response.text();
  const jsonText = findJsonObject(html, "ytInitialPlayerResponse") ?? findJsonObject(html, '"playerResponse":');
  if (!jsonText) throw new Error(uiText(interfaceLanguage, "videoInfoNotFound"));
  const playerResponse = JSON.parse(jsonText);
  const tracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  if (!tracks.length) throw new Error(uiText(interfaceLanguage, "noCaptionsAvailable"));
  const preferred = preferredLanguage?.toLowerCase();
  const track = tracks.find((item) => item.languageCode.toLowerCase() === preferred) ?? tracks.find((item) => item.languageCode.toLowerCase().startsWith(preferred ?? "")) ?? tracks.find((item) => item.kind !== "asr") ?? tracks[0];
  const captionsUrl = new URL(track.baseUrl);
  captionsUrl.searchParams.set("fmt", "json3");
  const captionsResponse = await fetch(captionsUrl, { credentials: "include" });
  if (!captionsResponse.ok) {
    throw new Error(`${uiText(interfaceLanguage, "captionsReadFailed")} (${captionsResponse.status})`);
  }
  const captions = await captionsResponse.json();
  const lines = (captions.events ?? []).filter((event) => Array.isArray(event.segs)).map(
    (event) => {
      const text = event.segs.map((segment) => segment.utf8 ?? "").join("").replace(/\s+/g, " ").trim();
      return text ? `[${timestamp(event.tStartMs ?? 0)}] ${text}` : "";
    }
  ).filter(Boolean).join("\n");
  const title = playerResponse.videoDetails?.title ?? new URL(pageUrl).searchParams.get("v");
  return {
    kind: "youtube",
    title: title || uiText(interfaceLanguage, "youtubeVideoTitle"),
    url: pageUrl,
    language: track.languageCode,
    description: `${uiText(interfaceLanguage, "captionsLabel")}\uFF1A${trackName(track)}`,
    text: truncateText(lines, 12e4, interfaceLanguage)
  };
}

// src/shared/defaults.ts
var TOOL_IDS = BUILT_IN_TOOLS.map((tool) => tool.id);
var DEFAULT_SELECTION_TOOL_IDS = [
  "translate-text",
  "summary",
  "explain",
  "explain-code"
];
var DEFAULT_HOME_TOOL_IDS = [
  "translate-text",
  "summary",
  "explain",
  "extract-actions",
  "concise",
  "expand-detail",
  "polish",
  "study-notes",
  "explain-code"
];
var DEFAULT_TOOLS_TAB_IDS = TOOL_IDS.filter((id) => id !== "ask-selection");
var DEFAULT_EDGE_TOOL_IDS = ["summary"];
var PROVIDER_MODEL_SUGGESTIONS = {
  "openai-compatible": ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini", "gpt-4o"],
  grok: ["grok-4", "grok-3", "grok-3-mini", "grok-2-vision-1212"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  kimi: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
  qwen: ["qwen-plus", "qwen-turbo", "qwen-max", "qwen-vl-plus"],
  zhipu: ["glm-4.5", "glm-4-air", "glm-4-flash", "glm-4v-flash"],
  mimo: ["mimo-v2.5-pro", "mimo-v2-omni"],
  longcat: ["LongCat-2.0", "LongCat-Flash-Chat"],
  minimax: ["MiniMax-M1", "MiniMax-Text-01", "abab6.5s-chat"],
  "doubao-seed": [
    "doubao-seed-1-6-250615",
    "doubao-seed-1-6-thinking-250615",
    "doubao-1-5-pro-32k-250115"
  ],
  openrouter: [
    "openai/gpt-4.1-mini",
    "anthropic/claude-sonnet-4",
    "google/gemini-2.5-flash",
    "deepseek/deepseek-chat"
  ],
  siliconflow: [
    "Qwen/Qwen3-8B",
    "Qwen/Qwen3-32B",
    "deepseek-ai/DeepSeek-V3",
    "deepseek-ai/DeepSeek-R1"
  ],
  anthropic: [
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
    "claude-3-5-haiku-20241022"
  ],
  gemini: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
  ollama: ["qwen3:8b", "llama3.1:8b", "gemma3:4b"]
};
var DEFAULT_SETTINGS = {
  profiles: [],
  activeProfileId: null,
  defaultProfileId: null,
  translationProfileId: null,
  visionProfileId: null,
  compareProfileIds: [],
  theme: "system",
  logLevel: "info",
  autoScrollDuringStreaming: true,
  modelThinkingTimeoutSeconds: 0,
  modelThinkingTimeoutCustomized: false,
  interfaceLanguage: "auto",
  translationLanguage: "auto",
  selectionOverlayMode: "always",
  selectionOverlayMinChars: 2,
  immersiveTranslationStyle: "bilingual",
  immersiveTranslationDisplayStyle: "default",
  immersiveTranslationTextEffects: [],
  immersiveTranslationParagraphShortcut: "off",
  immersiveTranslationPageShortcut: "off",
  immersiveTranslationAutoWhitelist: [],
  immersiveReadingDifficulty: 3,
  immersiveReadingStrategy: "local-first",
  immersiveReadingMode: "original-translation",
  immersiveReadingOuterTextEffects: ["emphasis"],
  immersiveReadingInnerTextEffects: ["light"],
  immersiveReadingAutoWhitelist: [],
  hoverDefinitionMode: "off",
  hoverDefinitionShortcut: "off",
  hoverDefinitionUrlBlacklist: [],
  edgeQuickToolsEnabled: true,
  edgeQuickToolBottom: 36,
  selectionOverlayUrlBlacklist: [],
  edgeQuickToolUrlBlacklist: [],
  inputAutoReplyEnabled: true,
  inputAutoReplyDisableSingleLine: true,
  imageTextExtractionEnabled: false,
  imageTextExtractionMinSize: 160,
  enabledToolIds: {
    selection: [...DEFAULT_SELECTION_TOOL_IDS],
    home: [...DEFAULT_HOME_TOOL_IDS],
    tools: [...DEFAULT_TOOLS_TAB_IDS],
    edge: [...DEFAULT_EDGE_TOOL_IDS]
  },
  quickActionsEnabled: true,
  chromeSyncEnabled: false,
  searchAnswerEnabled: false,
  includePageByDefault: true,
  webSearchByDefault: false,
  historyLimit: 60
};

// src/shared/storage.ts
var SETTINGS_KEY = "webmind.settings";
var CUSTOM_PROMPTS_KEY = "webmind.customPrompts";
var CUSTOM_TOOLS_KEY = "webmind.customTools";
var SESSION_SECRETS_KEY = "webmind.sessionSecrets";
var PENDING_ACTION_KEY = "webmind.pendingAction";
var APP_LOG_LEVELS = /* @__PURE__ */ new Set([
  "debug",
  "info",
  "success",
  "warning",
  "error"
]);
var memoryFallback = /* @__PURE__ */ new Map();
function hasChromeStorage(area) {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.[area]);
}
async function getValue(area, key, fallback) {
  if (!hasChromeStorage(area)) {
    return memoryFallback.get(`${area}:${key}`) ?? fallback;
  }
  const result = await chrome.storage[area].get(key);
  return result[key] ?? fallback;
}
async function setValue(area, key, value) {
  if (!hasChromeStorage(area)) {
    memoryFallback.set(`${area}:${key}`, value);
    return;
  }
  await chrome.storage[area].set({ [key]: value });
}
function normalizeEnabledToolIds(stored) {
  return {
    ...DEFAULT_SETTINGS.enabledToolIds,
    ...stored ?? {}
  };
}
function normalizeSettings(stored = {}) {
  const profiles = stored.profiles ?? [];
  const storedHoverDefinitionShortcut = String(
    stored.hoverDefinitionShortcut ?? ""
  );
  const quickToolsUrlBlacklist = stored.edgeQuickToolUrlBlacklist ?? [];
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const visionProfileIds = new Set(
    profiles.filter((profile) => profile.supportsVision).map((profile) => profile.id)
  );
  const storedTimeoutSeconds = Math.max(
    0,
    Math.round(Number(stored.modelThinkingTimeoutSeconds) || 0)
  );
  const legacyTwentySecondDefault = storedTimeoutSeconds === 20 && stored.modelThinkingTimeoutCustomized !== true;
  const activeProfileId = stored.activeProfileId && profileIds.has(stored.activeProfileId) ? stored.activeProfileId : null;
  const defaultProfileId = (stored.defaultProfileId && profileIds.has(stored.defaultProfileId) ? stored.defaultProfileId : null) ?? activeProfileId;
  const translationProfileId = stored.translationProfileId && profileIds.has(stored.translationProfileId) ? stored.translationProfileId : null;
  const visionProfileId = stored.visionProfileId && visionProfileIds.has(stored.visionProfileId) ? stored.visionProfileId : null;
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    profiles,
    activeProfileId,
    defaultProfileId,
    translationProfileId,
    visionProfileId,
    compareProfileIds: stored.compareProfileIds ?? [],
    logLevel: APP_LOG_LEVELS.has(stored.logLevel) ? stored.logLevel : DEFAULT_SETTINGS.logLevel,
    autoScrollDuringStreaming: stored.autoScrollDuringStreaming ?? true,
    modelThinkingTimeoutSeconds: legacyTwentySecondDefault ? 0 : storedTimeoutSeconds,
    modelThinkingTimeoutCustomized: stored.modelThinkingTimeoutCustomized ?? false,
    selectionOverlayMode: stored.selectionOverlayMode ?? (stored.quickActionsEnabled === false ? "off" : "always"),
    selectionOverlayMinChars: Math.max(
      1,
      Math.round(Number(stored.selectionOverlayMinChars ?? 2) || 2)
    ),
    inputAutoReplyEnabled: stored.inputAutoReplyEnabled ?? true,
    inputAutoReplyDisableSingleLine: stored.inputAutoReplyDisableSingleLine ?? true,
    immersiveTranslationAutoWhitelist: stored.immersiveTranslationAutoWhitelist ?? [],
    immersiveReadingAutoWhitelist: stored.immersiveReadingAutoWhitelist ?? [],
    immersiveReadingStrategy: stored.immersiveReadingStrategy === "model-page" ? "model-page" : "local-first",
    hoverDefinitionMode: stored.hoverDefinitionMode ?? "off",
    hoverDefinitionShortcut: storedHoverDefinitionShortcut === "ctrl" || storedHoverDefinitionShortcut === "ctrl-shift" ? "ctrl" : "off",
    hoverDefinitionUrlBlacklist: stored.hoverDefinitionUrlBlacklist ?? [],
    imageTextExtractionEnabled: stored.imageTextExtractionEnabled ?? false,
    imageTextExtractionMinSize: stored.imageTextExtractionMinSize ?? 160,
    edgeQuickToolUrlBlacklist: quickToolsUrlBlacklist,
    chromeSyncEnabled: stored.chromeSyncEnabled ?? false,
    enabledToolIds: normalizeEnabledToolIds(stored.enabledToolIds)
  };
}
function normalizeCustomTool(tool) {
  return {
    ...tool,
    id: tool.id || crypto.randomUUID(),
    title: tool.title || uiText(void 0, "customToolFallback"),
    description: tool.description ?? "",
    template: tool.template ?? "",
    icon: tool.icon || "Sparkles",
    createdAt: tool.createdAt ?? Date.now()
  };
}
function normalizeCustomTools(tools = []) {
  return tools.map(normalizeCustomTool);
}
async function loadSettings() {
  const stored = await getValue(
    "local",
    SETTINGS_KEY,
    {}
  );
  return normalizeSettings(stored);
}
async function getProviderSecret(profile) {
  if (profile.secretStorage === "local") return profile.apiKey ?? "";
  const secrets = await getValue(
    "session",
    SESSION_SECRETS_KEY,
    {}
  );
  return secrets[profile.id] ?? "";
}
async function loadCustomTools() {
  const tools = await getValue("local", CUSTOM_TOOLS_KEY, []);
  if (tools.length) return normalizeCustomTools(tools);
  const legacy = await getValue("local", CUSTOM_PROMPTS_KEY, []);
  return normalizeCustomTools(legacy);
}
async function setPendingAction(action) {
  await setValue("session", PENDING_ACTION_KEY, action);
}
async function consumePendingAction() {
  const action = await getValue(
    "session",
    PENDING_ACTION_KEY,
    null
  );
  await setPendingAction(null);
  return action;
}

// src/shared/models.ts
function profileForPurpose(settings, purpose = "default", requestedProfileId) {
  const byId = (profileId) => profileId ? settings.profiles.find((profile) => profile.id === profileId) ?? null : null;
  if (purpose === "translation") {
    return byId(settings.translationProfileId) ?? byId(settings.defaultProfileId) ?? byId(settings.activeProfileId);
  }
  if (purpose === "vision") {
    return byId(settings.visionProfileId) ?? byId(settings.defaultProfileId) ?? byId(settings.activeProfileId);
  }
  return byId(requestedProfileId) ?? byId(settings.activeProfileId);
}
function modelPurposeForToolId(toolId) {
  if (toolId === "translate-text" || toolId === "translate-document") {
    return "translation";
  }
  if (toolId === "analyze-image") return "vision";
  return "default";
}

// src/background/providers.ts
var MODEL_LOG_PREVIEW_CHARS = 420;
function broadcastProviderLog(message, level = "debug") {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage || !message.trim()) {
    return;
  }
  chrome.runtime.sendMessage({
    type: "webmind.operationLog",
    payload: {
      time: Date.now(),
      level,
      message
    }
  }).catch(() => void 0);
}
function compactText(value, limit = MODEL_LOG_PREVIEW_CHARS) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}
function requestContentPreview(messages) {
  return compactText(
    messages.map((message) => {
      const attachments = message.attachments?.length ? ` attachments=${message.attachments.length}` : "";
      return `[${message.role}${attachments}] ${message.content}`;
    }).join(" ")
  );
}
function safeRequestUrl(value) {
  try {
    const url = new URL(value);
    for (const key of Array.from(url.searchParams.keys())) {
      if (/key|token|secret|password/i.test(key)) {
        url.searchParams.set(key, "***");
      }
    }
    return url.toString();
  } catch {
    return value.replace(
      /([?&][^=]*(?:key|token|secret|password)[^=]*=)[^&]+/gi,
      "$1***"
    );
  }
}
function logModelRequest(details) {
  const duration = Date.now() - details.startedAt;
  const responseText = details.error ? errorMessage(details.error) : details.responseText ?? "";
  broadcastProviderLog(
    [
      "LLM request",
      `time=${new Date(details.startedAt).toISOString()}`,
      `model=${details.call.profile.name} / ${details.call.profile.model}`,
      `url=${safeRequestUrl(details.url)}`,
      `request=${requestContentPreview(details.call.messages)}`,
      `status=${details.status ?? "-"}`,
      `response=${compactText(responseText || "-")}`,
      `duration=${duration}ms`
    ].join(" | "),
    details.error ? "error" : "debug"
  );
}
function isOpenAiCompatibleKind(kind) {
  return kind !== "anthropic" && kind !== "gemini" && kind !== "ollama";
}
function throwIfAborted(signal) {
  if (signal.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
}
function assertSecret(profile, secret, language) {
  if (profile.kind !== "ollama" && !secret) {
    throw new Error(
      uiText(language, "apiKeyMissing").replace("{name}", profile.name)
    );
  }
}
async function resolveCall(request) {
  const settings = await loadSettings();
  const profile = profileForPurpose(
    settings,
    request.purpose,
    request.profileId
  );
  if (!profile) {
    throw new Error(uiText(settings.interfaceLanguage, "modelEngineRequired"));
  }
  const secret = await getProviderSecret(profile);
  assertSecret(profile, secret, settings.interfaceLanguage);
  return {
    profile,
    secret,
    messages: request.messages,
    temperature: request.temperature ?? profile.temperature,
    maxTokens: request.maxTokens ?? profile.maxTokens,
    language: settings.interfaceLanguage
  };
}
function imageParts(message, language) {
  return (message.attachments ?? []).filter(
    (attachment) => (attachment.kind ?? "image") === "image" && attachment.dataUrl && attachment.mimeType.startsWith("image/")
  ).map((attachment) => ({
    attachment,
    ...dataUrlParts(attachment.dataUrl ?? "", language)
  }));
}
function buildOpenAiRequest(call) {
  return {
    model: call.profile.model,
    messages: call.messages.map((message) => {
      const images = imageParts(message, call.language);
      if (!images.length) {
        return { role: message.role, content: message.content };
      }
      return {
        role: message.role,
        content: [
          { type: "text", text: message.content },
          ...images.map(({ attachment }) => ({
            type: "image_url",
            image_url: { url: attachment.dataUrl }
          }))
        ]
      };
    }),
    temperature: call.temperature,
    max_tokens: call.maxTokens,
    stream: true
  };
}
function buildAnthropicRequest(call) {
  const system = call.messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n");
  return {
    model: call.profile.model,
    system: system || void 0,
    messages: call.messages.filter((message) => message.role !== "system").map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: [
        ...imageParts(message, call.language).map(({ mimeType, base64 }) => ({
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType,
            data: base64
          }
        })),
        { type: "text", text: message.content }
      ]
    })),
    temperature: call.temperature,
    max_tokens: call.maxTokens,
    stream: true
  };
}
function buildGeminiRequest(call) {
  const system = call.messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n");
  return {
    systemInstruction: system ? { parts: [{ text: system }] } : void 0,
    contents: call.messages.filter((message) => message.role !== "system").map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [
        { text: message.content },
        ...imageParts(message, call.language).map(({ mimeType, base64 }) => ({
          inlineData: { mimeType, data: base64 }
        }))
      ]
    })),
    generationConfig: {
      temperature: call.temperature,
      maxOutputTokens: call.maxTokens
    }
  };
}
function buildOllamaRequest(call) {
  return {
    model: call.profile.model,
    messages: call.messages.map((message) => ({
      role: message.role,
      content: message.content,
      images: imageParts(message, call.language).map(({ base64 }) => base64)
    })),
    options: {
      temperature: call.temperature,
      num_predict: call.maxTokens
    },
    stream: true
  };
}
async function* responseLines(response, signal, language) {
  if (!response.body) throw new Error(uiText(language, "responseStreamMissing"));
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const cancelReader = () => {
    void reader.cancel().catch(() => void 0);
  };
  signal.addEventListener("abort", cancelReader, { once: true });
  try {
    while (true) {
      throwIfAborted(signal);
      const { value, done } = await reader.read();
      throwIfAborted(signal);
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        throwIfAborted(signal);
        yield line;
      }
    }
    throwIfAborted(signal);
    buffer += decoder.decode();
    if (buffer) yield buffer;
  } finally {
    signal.removeEventListener("abort", cancelReader);
    reader.releaseLock();
  }
}
async function ensureOk(response, language) {
  if (response.ok) return;
  const body = await response.text();
  let detail = body;
  try {
    const parsed = JSON.parse(body);
    detail = parsed.error?.message ?? parsed.message ?? parsed.error ?? body;
  } catch {
  }
  throw new Error(
    uiText(language, "providerErrorStatus").replace("{status}", String(response.status)).replace("{detail}", String(detail).slice(0, 500))
  );
}
function commonHeaders(call) {
  return {
    "Content-Type": "application/json",
    ...parseCustomHeaders(call.profile.customHeaders, call.language)
  };
}
function providerHeaders(profile, secret, language) {
  return {
    "Content-Type": "application/json",
    ...parseCustomHeaders(profile.customHeaders, language),
    ...profile.kind === "anthropic" ? {
      "x-api-key": secret,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    } : profile.kind === "gemini" || profile.kind === "ollama" ? {} : { Authorization: `Bearer ${secret}` }
  };
}
function extractModelId(entry) {
  if (typeof entry === "string") return entry;
  const value = entry.id ?? entry.name ?? entry.model;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function uniqueModels(values) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
function openAiModelsEndpoint(profile) {
  if (profile.kind === "grok") {
    return endpointUrl(profile.baseUrl, "/language-models");
  }
  if (profile.kind === "longcat") {
    try {
      const url = new URL(cleanBaseUrl(profile.baseUrl));
      return `${url.origin}/v1/models`;
    } catch {
      return endpointUrl(profile.baseUrl, "/models");
    }
  }
  return endpointUrl(profile.baseUrl, "/models");
}
async function parseModelList(response) {
  const payload = await response.json();
  const entries = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : Array.isArray(payload.models) ? payload.models : [];
  return uniqueModels(entries.map(extractModelId).filter(Boolean));
}
async function listProviderModels(profile, secret, language) {
  assertSecret(profile, secret, language ?? "auto");
  const suggestions = PROVIDER_MODEL_SUGGESTIONS[profile.kind] ?? [];
  let url = "";
  if (isOpenAiCompatibleKind(profile.kind)) {
    url = openAiModelsEndpoint(profile);
  } else if (profile.kind === "anthropic") {
    url = cleanBaseUrl(profile.baseUrl).endsWith("/v1") ? endpointUrl(profile.baseUrl, "/models") : endpointUrl(profile.baseUrl, "/v1/models");
  } else if (profile.kind === "gemini") {
    const geminiUrl = new URL(endpointUrl(profile.baseUrl, "/models"));
    geminiUrl.searchParams.set("key", secret);
    url = geminiUrl.toString();
  } else {
    url = endpointUrl(profile.baseUrl, "/api/tags");
  }
  const response = await fetch(url, {
    method: "GET",
    headers: providerHeaders(profile, secret, language)
  });
  await ensureOk(response, language);
  if (profile.kind === "ollama") {
    const payload = await response.json();
    return uniqueModels([
      ...(payload.models ?? []).map((model) => extractModelId(model)).filter(Boolean),
      ...suggestions
    ]);
  }
  if (profile.kind === "gemini") {
    const models = (await parseModelList(response)).map(
      (model) => model.replace(/^models\//, "")
    );
    return uniqueModels([...models, ...suggestions]);
  }
  return uniqueModels([...await parseModelList(response), ...suggestions]);
}
async function streamOpenAi(call, onDelta, signal) {
  const url = endpointUrl(call.profile.baseUrl, "/chat/completions");
  const startedAt = Date.now();
  let status;
  let responseText = "";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...commonHeaders(call),
        Authorization: `Bearer ${call.secret}`
      },
      body: JSON.stringify(buildOpenAiRequest(call)),
      signal
    });
    status = response.status;
    throwIfAborted(signal);
    await ensureOk(response, call.language);
    for await (const line of responseLines(response, signal, call.language)) {
      throwIfAborted(signal);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      const payload = JSON.parse(data);
      const delta = payload.choices?.[0]?.delta?.content;
      if (typeof delta === "string") {
        throwIfAborted(signal);
        responseText += delta;
        onDelta(delta);
      }
    }
    logModelRequest({ call, url, startedAt, status, responseText });
  } catch (error) {
    logModelRequest({ call, url, startedAt, status, responseText, error });
    throw error;
  }
}
async function streamAnthropic(call, onDelta, signal) {
  const url = endpointUrl(call.profile.baseUrl, "/v1/messages");
  const startedAt = Date.now();
  let status;
  let responseText = "";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...commonHeaders(call),
        "x-api-key": call.secret,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify(buildAnthropicRequest(call)),
      signal
    });
    status = response.status;
    throwIfAborted(signal);
    await ensureOk(response, call.language);
    for await (const line of responseLines(response, signal, call.language)) {
      throwIfAborted(signal);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      const payload = JSON.parse(data);
      if (payload.type === "content_block_delta" && payload.delta?.type === "text_delta") {
        const delta = payload.delta.text ?? "";
        throwIfAborted(signal);
        responseText += delta;
        onDelta(delta);
      }
    }
    logModelRequest({ call, url, startedAt, status, responseText });
  } catch (error) {
    logModelRequest({ call, url, startedAt, status, responseText, error });
    throw error;
  }
}
async function streamGemini(call, onDelta, signal) {
  const base = endpointUrl(
    call.profile.baseUrl,
    `/models/${encodeURIComponent(call.profile.model)}:streamGenerateContent`
  );
  const url = new URL(base);
  url.searchParams.set("alt", "sse");
  url.searchParams.set("key", call.secret);
  const requestUrl = url.toString();
  const startedAt = Date.now();
  let status;
  let responseText = "";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: commonHeaders(call),
      body: JSON.stringify(buildGeminiRequest(call)),
      signal
    });
    status = response.status;
    throwIfAborted(signal);
    await ensureOk(response, call.language);
    for await (const line of responseLines(response, signal, call.language)) {
      throwIfAborted(signal);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      const payload = JSON.parse(data);
      const delta = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
      if (delta) {
        throwIfAborted(signal);
        responseText += delta;
        onDelta(delta);
      }
    }
    logModelRequest({ call, url: requestUrl, startedAt, status, responseText });
  } catch (error) {
    logModelRequest({
      call,
      url: requestUrl,
      startedAt,
      status,
      responseText,
      error
    });
    throw error;
  }
}
async function streamOllama(call, onDelta, signal) {
  const url = endpointUrl(call.profile.baseUrl, "/api/chat");
  const startedAt = Date.now();
  let status;
  let responseText = "";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: commonHeaders(call),
      body: JSON.stringify(buildOllamaRequest(call)),
      signal
    });
    status = response.status;
    throwIfAborted(signal);
    await ensureOk(response, call.language);
    for await (const line of responseLines(response, signal, call.language)) {
      throwIfAborted(signal);
      if (!line.trim()) continue;
      const payload = JSON.parse(line);
      const delta = payload.message?.content;
      if (typeof delta === "string") {
        throwIfAborted(signal);
        responseText += delta;
        onDelta(delta);
      }
    }
    logModelRequest({ call, url, startedAt, status, responseText });
  } catch (error) {
    logModelRequest({ call, url, startedAt, status, responseText, error });
    throw error;
  }
}
async function streamModel(request, onDelta, signal) {
  throwIfAborted(signal);
  const call = await resolveCall(request);
  throwIfAborted(signal);
  if (isOpenAiCompatibleKind(call.profile.kind)) {
    await streamOpenAi(call, onDelta, signal);
    return;
  }
  if (call.profile.kind === "anthropic") {
    await streamAnthropic(call, onDelta, signal);
    return;
  }
  if (call.profile.kind === "gemini") {
    await streamGemini(call, onDelta, signal);
    return;
  }
  await streamOllama(call, onDelta, signal);
}
async function completeModel(request, signal = new AbortController().signal) {
  let text = "";
  try {
    await streamModel(request, (delta) => {
      text += delta;
    }, signal);
    return text.trim();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      const settings = await loadSettings();
      throw new Error(uiText(settings.interfaceLanguage, "requestCancelled"));
    }
    throw new Error(errorMessage(error));
  }
}

// src/shared/browser.ts
function isExtensionRuntime() {
  return typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);
}
async function requestOriginPermission(url) {
  if (!isExtensionRuntime()) return true;
  const parsed = new URL(url);
  if (!["http:", "https:", "file:"].includes(parsed.protocol)) return false;
  const origin = parsed.protocol === "file:" ? "file:///*" : `${parsed.origin}/*`;
  const contains = await chrome.permissions.contains({ origins: [origin] });
  if (contains) return true;
  return chrome.permissions.request({ origins: [origin] });
}

// src/shared/tools.ts
function allTools(customTools = [], language) {
  const customById = new Map(
    customTools.map((tool) => [tool.id, tool])
  );
  const mergedBuiltIns = builtInToolsForLanguage(language).map((tool) => {
    const override = customById.get(tool.id);
    if (!override) return tool;
    customById.delete(tool.id);
    return {
      ...tool,
      ...override,
      id: tool.id,
      builtin: true
    };
  });
  return [...mergedBuiltIns, ...Array.from(customById.values())];
}
function findTool(toolId, customTools = [], language) {
  return allTools(customTools, language).find((tool) => tool.id === toolId) ?? null;
}
function toolInstruction(tool, settings, contextText) {
  const language = resolveLanguage(settings?.interfaceLanguage);
  const resolvedContextText = contextText ?? uiText(settings?.interfaceLanguage, "currentContext");
  return fillPrompt(tool.template, {
    text: resolvedContextText,
    context: resolvedContextText,
    targetLanguage: LANGUAGE_LABELS[language],
    interfaceLanguage: LANGUAGE_LABELS[language]
  });
}

// src/shared/webSearch.ts
var HTML_ENTITIES = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"'
};
function decodeHtml(value) {
  return value.replace(
    /&#x([0-9a-f]+);/gi,
    (_, code) => String.fromCodePoint(Number.parseInt(code, 16))
  ).replace(
    /&#(\d+);/g,
    (_, code) => String.fromCodePoint(Number.parseInt(code, 10))
  ).replace(
    /&([a-z]+);/gi,
    (_, name) => HTML_ENTITIES[name.toLowerCase()] ?? `&${name};`
  );
}
function textFromHtml(value) {
  return decodeHtml(
    value.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  );
}
function attrValue(tag, name) {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")
  );
  return decodeHtml(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}
function unwrapDuckDuckGoUrl(value) {
  try {
    const url = new URL(value, "https://duckduckgo.com");
    const target = url.searchParams.get("uddg");
    return target ? decodeURIComponent(target) : url.href;
  } catch {
    return value;
  }
}
function parseDuckDuckGoResults(html, limit = 6) {
  const resultBlocks = html.match(
    /<div[^>]+class=(?:"[^"]*\bresult\b[^"]*"|'[^']*\bresult\b[^']*')[\s\S]*?(?=<div[^>]+class=(?:"[^"]*\bresult\b[^"]*"|'[^']*\bresult\b[^']*')|<\/body>)/gi
  ) ?? [];
  const seen = /* @__PURE__ */ new Set();
  const results = [];
  for (const block of resultBlocks) {
    if (results.length >= limit) break;
    const linkMatch = block.match(
      /<a\b[^>]+class=(?:"[^"]*\bresult__a\b[^"]*"|'[^']*\bresult__a\b[^']*')[^>]*>[\s\S]*?<\/a>/i
    );
    if (!linkMatch) continue;
    const link = linkMatch[0];
    const title = textFromHtml(link);
    const url = unwrapDuckDuckGoUrl(attrValue(link, "href"));
    if (!title || !url) continue;
    const snippetMatch = block.match(
      /<([a-z0-9]+)\b[^>]+class=(?:"[^"]*\bresult__snippet\b[^"]*"|'[^']*\bresult__snippet\b[^']*')[^>]*>[\s\S]*?<\/\1>/i
    );
    const snippet = snippetMatch ? textFromHtml(snippetMatch[0]) : "";
    const key = `${title}
${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ title, url, snippet });
  }
  return results;
}
async function searchWeb(query, limit = 6, language) {
  const url = new URL("https://html.duckduckgo.com/html/");
  url.searchParams.set("q", query);
  const response = await fetch(url, {
    headers: { Accept: "text/html" }
  });
  if (!response.ok) {
    throw new Error(`${uiText(language, "webSearchFailed")} (${response.status})`);
  }
  const results = parseDuckDuckGoResults(await response.text(), limit);
  if (!results.length) throw new Error(uiText(language, "webSearchNoResults"));
  return results;
}

// src/background/index.ts
function broadcastOperationLog(message, level = "info") {
  if (!message.trim()) return;
  chrome.runtime.sendMessage({
    type: "webmind.operationLog",
    payload: {
      time: Date.now(),
      level,
      message
    }
  }).catch(() => {
  });
}
var MENU_ITEMS = [
  {
    id: "webmind-ask",
    titleKey: "contextMenuAsk",
    action: "ask",
    contexts: ["selection"]
  },
  {
    id: "webmind-summarize",
    titleKey: "contextMenuSummarize",
    action: "summarize",
    contexts: ["selection"]
  },
  {
    id: "webmind-explain",
    titleKey: "contextMenuExplain",
    action: "explain",
    contexts: ["selection"]
  },
  {
    id: "webmind-translate",
    titleKey: "contextMenuTranslate",
    action: "translate",
    contexts: ["selection"]
  },
  {
    id: "webmind-rewrite",
    titleKey: "contextMenuRewrite",
    action: "rewrite",
    contexts: ["selection", "editable"]
  },
  {
    id: "webmind-reply",
    titleKey: "contextMenuReply",
    action: "reply",
    contexts: ["selection", "editable"]
  },
  {
    id: "webmind-image",
    titleKey: "contextMenuAnalyzeImage",
    action: "ask",
    contexts: ["image"]
  }
];
var menuActions = new Map(
  MENU_ITEMS.map((item) => [item.id, item.action])
);
var activeControllers = /* @__PURE__ */ new Map();
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 32768;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}
async function fetchImageAsAttachment(rawUrl, language) {
  const url = new URL(rawUrl).toString();
  const allowed = await requestOriginPermission(url);
  if (!allowed) {
    throw new Error(uiText(language, "readImageUrlFailed"));
  }
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(
      `${uiText(language, "readImageUrlFailed")} (${response.status})`
    );
  }
  const blob = await response.blob();
  const mimeType = blob.type || response.headers.get("content-type")?.split(";")[0] || "image/png";
  if (!mimeType.startsWith("image/")) {
    throw new Error(uiText(language, "readImageUrlFailed"));
  }
  const buffer = await blob.arrayBuffer();
  const name = decodeURIComponent(
    new URL(url).pathname.split("/").pop() || "image"
  );
  return {
    id: crypto.randomUUID(),
    kind: "image",
    name,
    mimeType,
    dataUrl: `data:${mimeType};base64,${arrayBufferToBase64(buffer)}`
  };
}
async function setupExtension() {
  const settings = await loadSettings();
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  await chrome.contextMenus.removeAll();
  for (const item of MENU_ITEMS) {
    chrome.contextMenus.create({
      id: item.id,
      title: uiText(settings.interfaceLanguage, item.titleKey),
      contexts: item.contexts
    });
  }
}
chrome.runtime.onInstalled.addListener(() => {
  void setupExtension();
});
chrome.runtime.onStartup.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes["webmind.settings"]) {
    void setupExtension();
  }
});
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "open-side-panel") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) await chrome.sidePanel.open({ tabId: tab.id });
});
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const action = menuActions.get(String(info.menuItemId));
  if (!action || !tab?.id) return;
  const pending = {
    id: crypto.randomUUID(),
    action,
    createdAt: Date.now(),
    text: info.selectionText,
    imageUrl: info.srcUrl,
    pageTitle: tab.title,
    pageUrl: info.pageUrl ?? tab.url
  };
  const pendingWrite = setPendingAction(pending);
  const panelOpen = chrome.sidePanel.open({ tabId: tab.id });
  await panelOpen;
  await pendingWrite;
});
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "webmind-stream") return;
  const requests = /* @__PURE__ */ new Set();
  let disconnected = false;
  const postToPort = (message) => {
    if (disconnected) return false;
    try {
      port.postMessage(message);
      return true;
    } catch {
      disconnected = true;
      for (const requestId of requests) {
        activeControllers.get(requestId)?.abort();
        activeControllers.delete(requestId);
      }
      return false;
    }
  };
  port.onMessage.addListener((message) => {
    if (message.type === "chat.cancel" && message.requestId) {
      activeControllers.get(message.requestId)?.abort();
      return;
    }
    if (message.type !== "chat.start" || !message.payload) return;
    const request = message.payload;
    const controller = new AbortController();
    activeControllers.set(request.requestId, controller);
    requests.add(request.requestId);
    void streamModel(
      {
        profileId: request.profileId,
        purpose: request.purpose,
        messages: request.messages,
        temperature: request.temperature,
        maxTokens: request.maxTokens
      },
      (delta) => {
        postToPort({
          type: "chat.delta",
          requestId: request.requestId,
          delta
        });
      },
      controller.signal
    ).then(() => {
      if (controller.signal.aborted) return;
      postToPort({
        type: "chat.done",
        requestId: request.requestId
      });
    }).catch((error) => {
      if (controller.signal.aborted) {
        postToPort({
          type: "chat.cancelled",
          requestId: request.requestId
        });
        return;
      }
      postToPort({
        type: "chat.error",
        requestId: request.requestId,
        error: errorMessage(error)
      });
    }).finally(() => {
      activeControllers.delete(request.requestId);
      requests.delete(request.requestId);
    });
  });
  port.onDisconnect.addListener(() => {
    void chrome.runtime.lastError;
    disconnected = true;
    for (const requestId of requests) {
      activeControllers.get(requestId)?.abort();
      activeControllers.delete(requestId);
    }
  });
});
chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    const run = async () => {
      if (message.type === "operation.log") {
        const payload = message.payload ?? {};
        broadcastOperationLog(
          String(payload.message ?? ""),
          payload.level ?? "info"
        );
        return { ok: true };
      }
      if (message.type && message.type !== "webmind.operationLog") {
        void loadSettings().then((settings) => {
          broadcastOperationLog(
            `${uiText(settings.interfaceLanguage, "logRuntimeRequest")}: ${message.type}`,
            "debug"
          );
        }).catch(() => void 0);
      }
      if (message.type === "pending.consume") {
        return consumePendingAction();
      }
      if (message.type === "panel.open") {
        const payload = message.payload ?? {};
        const settings = await loadSettings();
        if (!sender.tab?.id) {
          throw new Error(uiText(settings.interfaceLanguage, "cannotDetermineTab"));
        }
        const pendingWrite = payload.action ? setPendingAction(payload.action) : Promise.resolve();
        const panelOpen = chrome.sidePanel.open({ tabId: sender.tab.id });
        await panelOpen;
        await pendingWrite;
        return { ok: true };
      }
      if (message.type === "context.youtube") {
        const settings = await loadSettings();
        const pageUrl = String(message.payload?.pageUrl ?? "");
        const language = String(message.payload?.language ?? "");
        return fetchYouTubeTranscript(
          pageUrl,
          language,
          settings.interfaceLanguage
        );
      }
      if (message.type === "search.web") {
        const settings = await loadSettings();
        const query = String(message.payload?.query ?? "").trim();
        const limit = Number(message.payload?.limit ?? 6);
        if (!query) throw new Error(uiText(settings.interfaceLanguage, "provideSearchQuery"));
        return {
          results: await searchWeb(query, limit, settings.interfaceLanguage)
        };
      }
      if (message.type === "model.complete") {
        return {
          text: await completeModel(
            message.payload
          )
        };
      }
      if (message.type === "provider.test") {
        const profileId = String(message.payload?.profileId ?? "");
        const text = await completeModel({
          profileId,
          maxTokens: 16,
          temperature: 0,
          messages: [
            createMessage(
              "user",
              "Reply with exactly: OK"
            )
          ]
        });
        return { ok: /^ok[.!]?$/i.test(text.trim()), text };
      }
      if (message.type === "provider.models") {
        const settings = await loadSettings();
        const profile = message.payload?.profile;
        const secret = String(message.payload?.secret ?? "");
        if (!profile?.kind || !profile.baseUrl) {
          throw new Error(uiText(settings.interfaceLanguage, "providerBaseUrlRequired"));
        }
        return {
          models: await listProviderModels(
            profile,
            secret,
            settings.interfaceLanguage
          )
        };
      }
      if (message.type === "model.quickAction") {
        const action = String(message.payload?.action ?? "");
        const text = String(message.payload?.text ?? "");
        const settings = await loadSettings();
        if (action === "ask") {
          return { text: "" };
        }
        const template = quickActionPrompt(action, settings);
        if (!template) {
          throw new Error(
            uiText(settings.interfaceLanguage, "unsupportedQuickAction")
          );
        }
        const isTranslationAction = action === "translate";
        const protectedText = isTranslationAction ? protectTranslationText(text) : null;
        const prompt = protectedText ? buildProtectedTranslationPrompt(settings, text, protectedText.text) : fillPrompt(template, { text });
        const result = await completeModel({
          purpose: isTranslationAction ? "translation" : "default",
          temperature: isTranslationAction ? 0 : void 0,
          messages: [
            createMessage(
              "system",
              uiText(settings.interfaceLanguage, "browserAssistantSystem")
            ),
            createMessage("user", prompt)
          ]
        });
        return {
          text: protectedText ? restoreTranslationText(result, protectedText) : result
        };
      }
      if (message.type === "model.tool") {
        const toolId = String(message.payload?.toolId ?? "");
        const customTools = await loadCustomTools();
        const settings = await loadSettings();
        const tool = findTool(toolId, customTools, settings);
        if (!tool) throw new Error(uiText(settings.interfaceLanguage, "toolNotFound"));
        if (tool.id === "ask-selection") {
          return { text: "" };
        }
        const contextText = String(message.payload?.text ?? "");
        const isTranslationTool = tool.id === "translate-text" || tool.id === "translate-document";
        const protectedText = isTranslationTool ? protectTranslationText(contextText) : null;
        const instruction = toolInstruction(tool, settings, contextText);
        const userPrompt = isTranslationTool ? buildProtectedTranslationPrompt(
          settings,
          contextText,
          protectedText?.text ?? contextText
        ) : `${instruction}

${uiText(settings.interfaceLanguage, "currentContext")}\uFF1A
${contextText}`;
        const result = await completeModel({
          profileId: String(message.payload?.profileId ?? "") || void 0,
          purpose: modelPurposeForToolId(tool.id),
          temperature: isTranslationTool ? 0 : void 0,
          messages: [
            createMessage(
              "system",
              uiText(settings.interfaceLanguage, "modelToolSystem")
            ),
            createMessage(
              "user",
              userPrompt
            )
          ]
        });
        return {
          text: protectedText ? restoreTranslationText(result, protectedText) : result
        };
      }
      if (message.type === "image.fetchDataUrl") {
        const settings = await loadSettings();
        const rawUrl = String(message.payload?.url ?? "").trim();
        if (!rawUrl) {
          throw new Error(uiText(settings.interfaceLanguage, "readImageUrlFailed"));
        }
        return fetchImageAsAttachment(rawUrl, settings.interfaceLanguage);
      }
      if (message.type === "image.captureVisible") {
        const settings = await loadSettings();
        if (!sender.tab?.active || sender.tab.windowId === void 0) {
          throw new Error(uiText(settings.interfaceLanguage, "readImageUrlFailed"));
        }
        return {
          dataUrl: await chrome.tabs.captureVisibleTab(sender.tab.windowId, {
            format: "png"
          })
        };
      }
      return void 0;
    };
    void run().then((result) => sendResponse({ ok: true, result })).catch(
      (error) => sendResponse({ ok: false, error: errorMessage(error) })
    );
    return true;
  }
);
//# sourceMappingURL=background.js.map
