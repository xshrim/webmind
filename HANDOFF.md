# WebMind 交接文档

这个文件用于在异地拉取仓库后，帮助 Codex 或其他代码助手快速接上当前开发上下文。

## 项目快照

- 产品名称：WebMind。
- 项目类型：Manifest V3 Chrome 扩展。
- 最终制品：未打包扩展目录 `dist/`，不要打包成 `.crx`。
- 核心目标：实现一个浏览器 AI 助手，功能工作流参考 MaxAI 一类产品的公开能力，但不包含登录、订阅、购买方案；用户自行添加模型引擎和凭证。
- 本交接文档日期：2026-08-10。

## 如何继续开发

1. 拉取远程仓库。
2. 如未安装依赖，执行 `npm install`。
3. 先阅读本文件，再快速阅读 `README.md`。
4. 开发或验证前执行 `npm run check`。
5. 在 Chrome 中通过 `chrome://extensions` -> 开发者模式 -> 加载已解压的扩展程序，选择 `dist/`。

如果要让新的 Codex 会话继续之前的工作，可以这样说：

```text
请先阅读 HANDOFF.md、README.md 和当前代码，然后继续开发 WebMind。
```

## 常用命令

```bash
npm run dev
npm run typecheck
npm run test
npm run build
npm run check
```

- `npm run build` 会生成最终未打包扩展目录 `dist/`。
- `npm run check` 会依次执行类型检查、测试和构建。
- 真实扩展行为、content script、侧边栏 API、Chrome 权限等，需要加载 `dist/` 到 Chrome 后验证。

## 关键文件

- `src/shared/defaults.ts`：产品名称、模型引擎默认值、默认设置、各位置默认启用工具。
- `src/shared/prompts.ts`：内置工具定义和核心提示词构造，包括自动翻译和沉浸阅读。
- `src/shared/utils.ts`：共享工具函数、正文 citation 说明清洗、翻译占位符保护与还原、消息辅助函数。
- `src/shared/i18n.ts`：简体中文、繁體中文、英语、日语、韩语的界面文案。
- `src/shared/storage.ts`：设置、工具、历史、本地存储和 Chrome 同步存储。
- `src/shared/models.ts`：默认、翻译、视觉三类模型用途的路由逻辑。
- `src/background/index.ts`：扩展消息路由、工具执行、快捷动作、搜索、图片获取/截图、打开侧边栏。
- `src/background/providers.ts`：各模型接口的流式请求和兼容处理。
- `src/content/index.tsx`：网页注入能力，包括划词浮层、快捷工具、沉浸翻译、沉浸阅读、悬停释义、自动回复、图文提取、搜索页回答窗口。
- `src/content/pageContext.ts`：当前页面/当前正文提取、正文识别规则、质量评分、手动框选、逐段删除、智能剔除、预览定位。
- `src/content/translationPreparation.ts`：页面/当前正文/选区翻译和沉浸阅读的 block 收集；当前正文 scope 优先使用侧边栏传入的 `articlePreview` block。
- `src/sidepanel/App.tsx`：侧边栏聊天、工具、历史、日志、上下文处理、工具调用气泡、模型流式回答。
- `src/sidepanel/toolIcons.tsx`：侧边栏内置工具和自定义工具图标渲染；新版 lucide 动态图标通过 `lucide-react/dynamic` 懒加载。
- `src/sidepanel/customIcons.tsx`：沉浸翻译、沉浸阅读等非 lucide 内联图标。
- `src/options/SettingsApp.tsx`：设置页面。
- `vite.config.ts`：生产构建入口和手动 chunk 拆分；lucide 动态图标按首字母拆成 `lucide-icons-*` chunk。
- `scripts/build-extension.mjs`：将构建产物整理到最终扩展目录 `dist/`。

## 当前产品能力

- 侧边栏聊天支持当前页面、选中内容、无上下文、附件、URL/文档附件、网页搜索、Markdown 流式回答、停止生成、历史和日志。
- 上下文下拉框只有：无上下文、当前页面、当前正文、当前选中；默认上下文来自 `defaultContextScope`，当前真实默认值是当前正文。
- 用户自行配置模型引擎；没有账号、登录、购买或订阅代码。
- 模型预设包括 OpenAI 兼容、Grok、DeepSeek、Kimi、Qwen、智谱 GLM、MiMo、LongCat、MiniMax、Doubao Seed、OpenRouter、硅基流动、Anthropic、Gemini、Ollama。
- 单个模型可以被标记为默认、翻译、视觉；但所有模型中每种角色最多只能有一个。没有翻译或视觉模型时，回退到默认/当前模型。
- 划词浮层包含固定按钮：在侧边栏提问、复制所选文本；其他工具按钮可配置。
- 快捷工具包含打开侧边栏、沉浸翻译、沉浸阅读、总结摘要、还原页面等。
- 搜索结果页回答窗口支持主流搜索引擎，并使用 DuckDuckGo 搜索结果作为参考上下文。
- 自动回复会在网页文本输入框中显示小图标，并避开搜索引擎输入框。
- 图文提取会在符合条件的图片上显示小图标，并复用浮层结果窗口。
- 悬停释义使用内置离线词典，提供中英文简明释义。
- 沉浸翻译支持页面/选区/段落翻译、显示模式、文字效果、快捷键、自动白名单。
- 沉浸阅读支持本地优先和模型优先两种策略、难度、替换模式、文字效果、自动白名单。
- 当前正文识别会先尝试 `articleExtractionRules`：每条规则由适配页面地址和 CSS selector 组成，URL 规则复用黑白名单式匹配；命中后直接用该 selector 对应 DOM 作为正文根。未命中时再走 JSON-LD、Readability、DOM 候选评分等自动识别。
- 当前正文识别会先确定一个连续的父容器；确定后默认处理该父容器内的全部可见内容，标题也属于正文。规则只用于选择父容器，不应在父容器确定后再次隐式筛选。
- 侧边栏当前正文窗口支持质量评分、selector、DOM/来源、段落高亮定位、手动框选正文、复制正文、逐段删除、智能剔除和还原正文。删除或智能剔除属于当前正文编辑状态，会同步影响自动翻译、沉浸翻译和沉浸阅读；还原正文会清除编辑状态，但不会改变窗口展开/折叠状态。
- 当前正文 selector 标签可点击打开规则编辑弹窗，默认填入当前页面地址和 selector；保存后写入 `settings.articleExtractionRules` 并刷新当前正文。
- 内置工具包括图片分析、自动翻译、翻译 PDF/字幕、总结摘要、通俗解释、事项提取、精简提炼、扩写细化、自然润色、智能续写、起草回复、学习笔记、代码解释。
- 内置工具和自定义工具都支持编辑；但某些固定功能按钮不是隐藏工具，不应出现在工具列表里。

## 当前真实默认设置

以下值来自 `src/shared/defaults.ts` 的 `DEFAULT_SETTINGS`，是代码真实默认值，不代表用户存储中已经存在的个人配置：

- `interfaceLanguage`：`auto`
- `translationLanguage`：`auto`
- `theme`：`system`
- `defaultContextScope`：`article`，即当前正文；侧边栏打开时按这个设置选择当前上下文
- `selectionOverlayMode`：`off`
- `selectionOverlayShortcut`：`off`
- `selectionOverlayMinChars`：`2`
- `edgeQuickToolsEnabled`：`false`
- `inputAutoReplyEnabled`：`false`
- `inputAutoReplyDisableSingleLine`：`true`
- `hoverDefinitionMode`：`off`
- `hoverDefinitionShortcut`：`off`
- `imageTextExtractionEnabled`：`false`
- `imageTextExtractionMinSize`：`160`
- `articleExtractionRules`：空数组；每条规则为 `{ id, urlPattern, selector }`
- `immersiveTranslationStyle`：`bilingual`
- `immersiveTranslationDisplayStyle`：`default`
- `immersiveTranslationTextEffects`：`["light"]`，即弱化
- `immersiveTranslationParagraphShortcut`：`off`
- `immersiveTranslationPageShortcut`：`off`
- `immersiveTranslationModeToggleShortcut`：`off`
- `immersiveTranslationAutoWhitelist`：空数组
- `immersiveReadingDifficulty`：`3`
- `immersiveReadingStrategy`：`local-first`
- `immersiveReadingMode`：`original-translation`
- `immersiveReadingBackgroundStyle`：`none`
- `immersiveReadingParagraphShortcut`：`off`
- `immersiveReadingContextShortcut`：`off`
- `immersiveReadingOuterTextEffects`：空数组
- `immersiveReadingInnerTextEffects`：`["light"]`，即弱化
- `immersiveReadingAutoWhitelist`：空数组
- `searchAnswerEnabled`：`false`
- `includePageByDefault`：`true`
- `webSearchByDefault`：`false`
- `chromeSyncEnabled`：`false`
- `autoScrollDuringStreaming`：`true`
- `modelThinkingTimeoutSeconds`：`0`，表示不限制
- `historyLimit`：`60`

上下文下拉框只有四项：无上下文、当前页面、当前正文、当前选中。“框选正文”不是上下文类型，而是自定义当前正文的操作；手动框选后可使用“还原正文”恢复自动识别结果。

默认工具位置：

- 划词浮层：`translate-text`、`summary`、`explain`、`explain-code`
- 侧边栏位：`translate-text`、`summary`、`explain`、`extract-actions`、`concise`、`expand-detail`、`polish`、`study-notes`、`explain-code`
- 工具页：除 `ask-selection` 以外的所有内置工具
- 快捷工具：默认选择 `summary`；沉浸翻译、沉浸阅读、还原页面、打开侧边栏是固定快捷动作，不是普通隐藏工具

## 重要约定

- 除非用户明确要求，不需要兼容旧的导入/导出格式。
- 不要再增加“隐藏工具”设定；还原页面、沉浸翻译、沉浸阅读等固定按钮应直接调用对应功能。
- 不要重新引入 `ModelDock` 或旧的 storage key、port name 等命名；产品名和内部命名应统一为 WebMind。
- `dist/` 是最终给 Chrome 加载的目录，但代码源头是 `src/`。
- 翻译相关逻辑应尽量复用共享提示词和翻译保护工具，不要在 content、sidepanel、background 中重复拼接不同版本。
- 翻译任务使用翻译角色模型；视觉任务使用视觉角色模型；没有对应角色时回退到默认/当前模型。
- UI 文案应通过 `uiText` 获取，并适配五种界面语言。
- 日志需要定义级别；大模型请求详情适合作为 debug 日志。
- 设置页面配置块当前期望顺序为：通用配置、快捷工具、悬停释义、划词浮层、沉浸翻译、沉浸阅读、工具启用、正文识别、数据同步。
- “正文识别”配置块应像“工具启用”一样占据整行；内部子标题为“识别规则”，右侧有“添加”按钮；规则行使用 placeholder 说明页面地址和 CSS selector，不保留单独列标题或底部添加按钮。
- 当前正文窗口的交互约定：标题显示“当前正文”；还原正文、框选正文、复制正文使用纯图标按钮，复制 tooltip 为“复制正文”；质量评分在这三个图标之后；正文 meta 第一行顺序为“智能剔除、selector、DOM/来源、段数、字数”，selector 必须截断避免撑宽。
- 当前正文段落不再在鼠标悬停时跟踪页面正文，只有点击段落或键盘确认时才跳转/高亮。
- 手动框选正文时 selector 应是可定位的 CSS selector，不应退化成 `manual` 或单个标签名；tooltip 两行显示“元素位置/selector”和操作提示；`Esc` 或切换 Chrome 标签页会取消框选，不弹出取消提示菜单。

## 最近完成的功能与修复

- 已完成核心模块的第一轮拆分，正文识别、翻译 DOM、选择处理、快捷键、附件和侧边栏展示等能力已移出部分核心文件；当前仍需继续拆分大文件。
- 新增 `src/shared/immersiveWorkflow.ts`，内容脚本和侧边栏的沉浸翻译/沉浸阅读模型流程共用分批、重试、校验、顺序化应用和进度协议。
- 正文识别增加质量评分：文本密度、链接比例、可见面积、标题/段落连续性、广告/导航/评论等杂讯惩罚、语言一致性。
- 侧边栏“当前正文”支持质量分、selector、来源、段数、字数、指标、警告和待处理段落；正文不再截断显示，不再插入“内容已截断”。
- 已新增正文识别规则：设置页可管理全部规则；当前正文窗口可通过 selector 标签弹窗快速新增当前页面规则。
- 支持通过 HTML 层级感知选择器手动框选正文；框选结果属于“当前正文”，不是新的上下文类型；支持还原为自动识别正文；`Esc`、标签页切换和侧边栏切换会取消框选状态。
- 沉浸翻译、沉浸阅读和自动翻译的当前正文处理应严格使用当前正文窗口同源的 `articlePreview` 可见 block。这里的“预览”指 `PageContext.articlePreview` 数据，不是 UI 是否展开；不要因为用户没展开详情就重新走另一套正文提取。
- 选中内容从划词浮层打开侧边栏时，会先切换为“当前选中”；选区真正消失后自动恢复“当前正文”。
- 侧边栏临时提示和上下文错误提示会在 5 秒后自动关闭。
- 自动翻译/沉浸翻译已持续修复富文本、链接、引用、上标、下标的保护和还原行为。
- 正文提取会清理原文中的英文 citation 说明标签：`**4 citations from multiple sources**[1-4]` -> `[1-4]`，`**Citation 5 from source**[5]` -> `[5]`，但保留普通正文中的引用标记。
- 翻译结果还原会清理重复的“这是一个翻译任务...”前言、损坏的 `WEBMIND_*` 片段和 citation 说明噪音。
- 沉浸阅读已接入英文词频表，并对中英文页面做运行级别去重。
- 自动翻译的提示词污染已移除。翻译工具发给模型时，应只发送受保护的翻译 prompt，不要再把工具模板和上下文重复拼进去。
- `buildProtectedTranslationPrompt` 当前包含：
  - 自动翻译规则；
  - 明确的翻译方向规则；
  - 段落和引用占位符保护规则；
  - 只输出结果的规则；
  - `<translation-input>...</translation-input>`。
- 自动翻译方向会在 `src/shared/prompts.ts` 中先做本地预判。例如：界面语言为简体中文、译文语言为自动时，英文原文应翻译为简体中文，中文原文应翻译为英文。
- 翻译 prompt 会明确写入“本地预判源语言”和“固定目标语言”，用于避免短英文短语被模型原样返回。
- 引用小标和段落分隔会在 `src/shared/utils.ts` 中被占位符保护，并在模型返回后还原。
- 已有标签页如果没有 content script，`src/shared/browser.ts` 的 `sendToTab` 会在首次连接失败时使用 `chrome.scripting.executeScript` 注入 `content.js` 并重试一次；`public/manifest.json` 已声明 `scripting` 权限。用户不需要为了侧边栏连接而刷新普通网页。
- `page.context` 当前通过 `extractPageContextAsync` 先让出页面执行权，在浏览器空闲时再识别正文；识别期间有可见性/文本缓存，候选评分阶段不生成完整预览，预览定位只扫描正文块元素。
- 侧边栏日志图标使用 `notepad-text`，沉浸翻译使用内联 `translate-ai` 风格图标，沉浸阅读使用内联 `book-ai-line` 风格图标，学习笔记工具使用 `book-open`，当前正文使用 `text-align-start`。
- Vite 已通过 `manualChunks` 拆分 lucide 动态图标，构建输出会出现多个 `lucide-icons-*` chunk；这是预期状态，用于避免单个 `vendor-icons` chunk 过大。

## 已知限制

- 如果 `interfaceLanguage` 是 `auto`，实际界面语言会跟随浏览器语言。如果浏览器语言解析为英文，那么英文输入加译文语言 `auto` 时，目标语言可能仍是英文，这是当前规则的设计结果。若要稳定英文转中文，应将界面语言或译文语言明确设为简体中文。
- Chrome 侧边栏获得焦点后，网页原生选区可能消失；扩展会保存浮层传来的选中文本，但不能保证浏览器继续绘制原生蓝色选区。
- 禁止复制、禁止右键和拦截 `copy`/`contextmenu` 通常不会限制 DOM 上下文工具、自动翻译、沉浸翻译或沉浸阅读；`user-select: none` 等样式可能限制“当前选中”功能。
- 部分 Chrome API 要求用户手势。图片获取/截图、侧边栏打开、手动正文框选和部分 content script 交互需要在真实扩展中测试，不能只依赖 Vite 预览。
- 侧边栏流式回答使用 runtime port。虽然已有断连处理，但改动流式、停止生成、取消请求时要在 Chrome 中实测。
- 正文质量评分仍是启发式规则，不是模型级语义判断；新闻推荐/评论混排、代码块/表格/公式混排仍可能需要手动框选。
- 正文识别规则只保存 URL 匹配和 CSS selector；selector 仍必须能在当前可访问 DOM、开放 Shadow DOM 或同源 iframe 中找到，不能绕过跨域或浏览器受限页面限制。
- 正文识别入口已异步低优先级调度并限制扫描范围，但实际 DOM 读取仍发生在网页主线程；超大 DOM、复杂 Shadow DOM 或大量动态节点页面仍需真实 Chrome 性能回归。
- 虚拟滚动和无限滚动目前只处理已经存在于 DOM 的内容，不会主动滚动页面加载更多内容。
- Canvas、图片、视频画面和伪元素绘制的文字不属于普通 DOM 文本，当前正文识别无法直接提取。
- 跨域 iframe 无法读取；开放 Shadow DOM 和同源 iframe 只提供尽力处理，真实页面结构仍需验证。
- 手动框选依赖可访问的 DOM 和可见元素；浏览器内部页面、扩展商店页面等受限页面不能注入 content script。
- 沉浸翻译和沉浸阅读仍需要避开脚本、隐藏内容、导航、页脚、侧栏和已有 WebMind 注入元素。
- PDF worker chunk 较大。当前 Vite 构建能通过并输出较大的 `vendor-pdf`/worker chunk，这是预期现象，除非后续重新设计 PDF 处理方式。

## 未完成问题

- 尚未为正文质量评分、正文识别规则、手动 DOM 框选、选区消失后的上下文切换补充完整的 Chrome 自动化测试。
- 尚未为自动补注入、受限页面失败提示、当前正文段落删除、复制正文和智能剔除补充完整的 Chrome 自动化测试。
- 低优先级正文识别目前仍是“空闲调度 + 优化后的同步计算”，尚未实现真正的分片 DOM 扫描或 Worker 化。
- 虚拟滚动/无限滚动页面尚未实现无副作用的增量正文采集。
- 跨域 iframe 尚未实现正文代理或权限协作。
- `src/content/index.tsx` 和 `src/sidepanel/App.tsx` 仍然较大，当前只有第一轮功能模块拆分。
- 正文评分权重还需要在更多新闻页、社区页、代码文档页和混排页面上校准。

## 下一步优先级

1. 在真实 Chrome 中回归当前正文、正文识别规则、selector 弹窗保存、评分 tag、手动框选/逐段删除/智能剔除/复制/还原、划词浮层打开侧边栏和选区消失后的上下文切换。
2. 建立正文识别和手动编辑的浏览器测试页面，覆盖大 DOM、新闻推荐/评论、长段落、GitHub README、表格、公式、代码、动态渲染和 Shadow DOM。
3. 继续拆分 `src/content/index.tsx` 与 `src/sidepanel/App.tsx`，但保持共享 workflow 协议不分叉。
4. 设计虚拟滚动/无限滚动的可见内容增量采集，并限制滚动副作用。
5. 继续优化正文评分、异步分片扫描和跨 iframe 的可行处理边界。

## 最后一次验证结果

2026-08-10，以下命令均通过：

```bash
npm run typecheck
npm run test
npm run build
git diff --check
```

测试结果：`10` 个测试文件、`86` 个测试通过；构建成功生成未打包扩展目录 `dist/`。以上是代码级验证，尚未替代真实 Chrome 手工验证。

## 最近手工验证重点

- 在 Chrome 中加载 `dist/`，测试自动翻译：
  - 界面语言设为 `zh-CN`；
  - 译文语言设为 `auto`；
  - 选择英文短语；
  - 选择英文句子；
  - 选择中文文本。
- 检查自动翻译是否保持段落结构和引用小标。
- 检查侧边栏停止生成是否能真正取消当前模型请求。
- 当 `selectionOverlayMinChars` 设为 `1` 时，检查单字符划词是否能触发浮层。
- 在真实网页中检查沉浸翻译快捷键，因为它依赖 content script 的键盘事件。
- 在 Google、Bing、DuckDuckGo、百度等搜索引擎结果页检查搜索页模型回答窗口。
- 检查侧边栏打开时默认上下文是否与设置中的 `defaultContextScope` 一致。
- 检查当前正文窗口的质量指标、selector、框选正文、复制正文、还原正文和折叠图标。
- 检查当前正文窗口中“智能剔除、selector、DOM、段数、字数”的顺序，selector 是否截断且可点击新增规则，逐段删除图标是否为 `X`，以及编辑后评分和质量 tag 是否刷新。
- 检查未展开当前正文窗口时，自动翻译、沉浸翻译和沉浸阅读仍使用 `PageContext.articlePreview` 的完整可见正文，而不是另走自动识别或抓到不可见 HTML。
- 检查正文原文中 `**4 citations from multiple sources**[1-4]`、`**Citation N from source**[N]` 只保留引用标记；检查翻译结果不会出现“这是一个翻译任务...”和损坏的 `WEBMIND_*` 占位符。
- 在扩展重载后保留一个不刷新的普通网页标签页，直接打开侧边栏并使用当前正文工具，验证自动补注入不会再出现“不能建立连接”。
- 在禁止复制/右键的网站上分别测试当前页面、当前正文、自动翻译、沉浸翻译和沉浸阅读；另测 `user-select: none` 页面上的当前选中功能。
