# WebMind 交接文档

这个文件用于在异地拉取仓库后，帮助 Codex 或其他代码助手快速接上当前开发上下文。

## 项目快照

- 产品名称：WebMind。
- 项目类型：Manifest V3 Chrome 扩展。
- 最终制品：未打包扩展目录 `dist/`，不要打包成 `.crx`。
- 核心目标：实现一个浏览器 AI 助手，功能工作流参考 MaxAI 一类产品的公开能力，但不包含登录、订阅、购买方案；用户自行添加模型引擎和凭证。
- 本交接文档日期：2026-08-13。

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

- `npm run build` 会生成最终未打包扩展目录 `dist/`。用户通过“加载已解压的扩展程序”直接使用该目录；每次源码修改后必须重新构建并保留最新 `dist/` 产物，不能手工恢复或清理其中的 hash 资源。
- `npm run check` 会依次执行类型检查、测试和构建。
- 真实扩展行为、content script、侧边栏 API、Chrome 权限等，需要加载 `dist/` 到 Chrome 后验证。

## 关键文件

- `src/shared/defaults.ts`：产品名称、模型引擎默认值、默认设置、各位置默认启用工具。
- `src/shared/prompts.ts`：内置工具定义和核心提示词构造，包括自动翻译和沉浸阅读。
- `src/shared/tools.ts`：内置/自定义工具合并、模板填充、上下文注入，以及仅对工具生效的回答语言约束。
- `src/shared/utils.ts`：共享工具函数、正文 citation 说明清洗、翻译占位符保护与还原、消息辅助函数。
- `src/shared/i18n.ts`：语言候选、浏览器语言解析、Prompt 指令语言解析和九种语言的类型完整性组装；`src/shared/locales/{es,fr,de,it}.ts` 分别维护西班牙语、法语、德语、意大利语的完整静态界面词条。
- `src/shared/storage.ts`：设置、工具、历史、本地存储和 Chrome 同步存储；负责将缺失或非法的 `mcpToolApprovalMode` 归一化为 `ask`，并使同文高亮和链接选择在缺失配置时分别回退到 `off` 与 `false`。
- `src/shared/models.ts`：默认、翻译、视觉三类模型用途的路由逻辑。
- `src/background/index.ts`：扩展消息路由、工具执行、快捷动作、搜索、图片获取/截图、打开侧边栏；维护 MCP 审批 Promise、30 秒超时和 `mcp.tool.status` Port 事件。
- `src/background/providers.ts`：各模型接口的流式请求和兼容处理。
- `src/background/mcpClient.ts`：基于官方 MCP SDK 的 SSE/Streamable HTTP 连接、工具发现和调用结果格式化。
- `src/background/mcpAgent.ts`：普通对话的原生模型 tool-calling 循环、工具选择校验、逐次审批和步数/数量限制；每次调用前强制执行全局 MCP 授权模式，并回传结构化工具状态。
- `src/content/index.tsx`：网页注入能力，包括划词浮层、快捷工具、沉浸翻译、沉浸阅读、悬停释义、自动回复、图文提取、搜索页回答窗口；初始化时按设置启动链接文字选择和同文高亮。
- `src/content/linkTextSelection.ts`：链接内文字的横向拖动选择、纵向拖动保持原行为，以及选择后阻止误导航；不再兼容 Google News 一类空链接覆盖层。
- `src/content/selectionHighlighter.ts`：同文高亮的 CSS Highlight API 匹配与右侧滚动条定位短标记；不包裹或修改网页原始文本节点。
- `src/shared/cookiePreview.ts`：当前页面 Cookie 的 JSON、Netscape、HTTP、cURL 预览格式化。
- `src/content/pageContext.ts`：当前页面/当前正文提取、正文识别规则、父容器选择、block 划分、手动框选、逐段删除、智能剔除、预览定位。
- `src/content/translationPreparation.ts`：页面/当前正文/选区翻译和沉浸阅读的 block 收集；当前正文 scope 使用侧边栏传入的 `articlePreview` block 作为 canonical 处理对象。
- `src/sidepanel/App.tsx`：侧边栏聊天、工具、历史、日志、上下文处理、工具调用气泡、模型流式回答；将 `mcp.tool.status` 挂到对应助手消息，在模型正文前渲染默认折叠的 MCP 结果色带，并记录 MCP 授权、调用状态和 Server 生命周期日志。
- `src/sidepanel/toolIcons.tsx`：侧边栏内置工具和自定义工具图标渲染；新版 lucide 动态图标通过 `lucide-react/dynamic` 懒加载。
- `src/sidepanel/customIcons.tsx`：沉浸翻译、沉浸阅读等非 lucide 内联图标。
- `src/options/SettingsApp.tsx`：设置页面，包括主题下方的 MCP 工具执行授权模式、划词浮层内的同文高亮，以及快捷工具配置块中的链接选择。
- `vite.config.ts`：生产构建入口和手动 chunk 拆分；lucide 动态图标按首字母拆成 `lucide-icons-*` chunk。
- `scripts/build-extension.mjs`：将构建产物整理到最终扩展目录 `dist/`。

## 当前产品能力

- 侧边栏聊天支持当前页面、选中内容、无上下文、附件、URL/文档附件、网页搜索、Markdown 流式回答、停止生成、历史和日志。
- MCP 选项卡支持本地添加 SSE/Streamable HTTP Server、刷新 Tools、编辑/删除 Server；Server -> Tool 均为默认折叠的层级展示。聊天输入区的 MCP 选择框同样默认折叠 Server，名称/箭头展开工具，复选框可全选 Server 或选取单个工具，且选择框紧邻网络图标正上方居中显示。固定翻译/视觉/内部工作流不会携带 MCP。
- MCP 全局授权模式为 `deny | ask | allow`，默认 `ask`。`deny` 禁止每一次调用，`allow` 跳过交互审批，二者都只能作用于用户当前显式启用且后台再次校验通过的工具；`ask` 保留本次、本轮、会话三种授权范围。
- MCP 执行记录不依赖模型自然语言：作为同一助手消息、模型正文前的默认折叠色带显示成功调用、全局拒绝、用户拒绝、审批超时或调用失败，以及对应 Server / Tool。展开后才显示返回详情；阻止与失败结果仍会传回模型，模型应继续完成回答。
- MCP 操作日志记录授权范围、调用成功/失败/未执行、Server 保存/刷新/删除；仅记录 Server/工具名称、状态和数量，不得记录工具参数、返回正文、Cookie、请求头、模型上下文或附件内容。
- Cookie 查看器位于侧边栏右上角设置图标左侧；后台 `cookies.current` 用 Chrome `cookies` API 获取当前标签 URL 对应 Cookie，格式化与复制均在侧边栏完成。
- 链接选择默认关闭（`linkTextSelectionEnabled: false`），位于“快捷工具 -> 链接选择”，并复用快捷工具 URL 黑名单。横向拖动链接文字走选择并防止松开后的导航；普通点击和纵向拖动保持页面原行为。
- 同文高亮默认关闭（`selectionMatchHighlightMode: "off"`），位于“划词浮层”，与划词浮层共用最少触发字符数和 URL 黑名单。匹配项用 Logo 珊瑚红 `#e8533f`，右侧定位标记用青绿色 `#178f7c`；为性能和原生选区兼容性，不要求当前浏览器选区与其他匹配项样式一致。
- 上下文下拉框只有：无上下文、当前页面、当前正文、当前选中；默认上下文来自 `defaultContextScope`，当前真实默认值是当前正文。
- 用户自行配置模型引擎；没有账号、登录、购买或订阅代码。
- 模型预设包括 OpenAI 兼容、Grok、DeepSeek、Kimi、Qwen、智谱 GLM、MiMo、LongCat、MiniMax、Doubao Seed、OpenRouter、硅基流动、Anthropic、Gemini、Ollama。
- 单个模型可以被标记为默认、翻译、视觉；但所有模型中每种角色最多只能有一个。没有翻译或视觉模型时，回退到默认/当前模型。
- 划词浮层包含固定按钮：在侧边栏提问、复制所选文本；其他工具按钮可配置。
- 快捷工具包含打开侧边栏、沉浸翻译、沉浸阅读、总结摘要、还原页面等。
- 搜索结果页回答窗口支持主流搜索引擎，并使用 DuckDuckGo 搜索结果作为参考上下文。
- 自动回复会在网页文本输入框中显示小图标，并避开搜索引擎输入框。
- 图文提取会在符合条件的图片上显示小图标，并复用浮层结果窗口。
- 悬停释义使用内置离线词典，提供中英文简明释义；`hoverDefinitionStyle` 可选 `none`、`highlight`、`underline`，默认 `none`。命中样式通过 CSS Highlight API 绘制，不修改网页原始文本节点；`highlight` 的背景固定使用产品蓝绿色主题色 `rgba(19, 139, 120, .42)` 并继承网页文字颜色，`underline` 保持独立样式。
- 沉浸翻译支持页面/选区/段落翻译、显示模式、文字效果、快捷键、自动白名单。
- 沉浸阅读支持本地优先和模型优先两种策略、难度、替换模式、文字效果、自动白名单。
- 当前正文识别会先尝试 `articleExtractionRules`：每条规则由适配页面地址和 CSS selector 组成，URL 规则复用黑白名单式匹配；命中后直接用该 selector 对应 DOM 作为正文根。未命中时再用通用 DOM 候选选择正文父容器，不再使用结构化数据或第三方正文解析来合成正文结果。
- 当前正文识别会先确定一个连续的父容器；确定后默认处理该父容器内的全部可见内容，标题也属于正文。规则只用于选择父容器，不应在父容器确定后再次隐式筛选。
- 自动正文候选评分只用于父容器选择和上下文预览面板的当前正文状态。当前指标为长度、结构、标题、语义容器、文本密度、链接纯度、聚焦度和干净度；候选排序不会再因单纯字数或段数更多而持续加分。父容器确定后，评分不得参与 block 筛选。
- 侧边栏“上下文预览”面板稳定显示，图标、上下文名称和内容随无上下文、当前页面、当前正文、当前选中切换。当前正文状态支持 selector、来源、段数、字数、段落高亮定位、手动框选正文、复制正文、逐段删除、智能剔除和还原正文；页面、选中和无上下文状态显示各自对应的预览。
- 当前正文和当前页面预览、助手回答及普通用户消息中的代码 block 支持语法高亮。提取层保留通用代码语言标记，侧边栏按可见性懒加载本地 `highlight.js`；未知语言自动识别，超过高亮长度上限的代码仍完整显示但不执行高亮。该功能只改变展示，不改变 canonical block 内容、复制结果或翻译写回对象。
- 删除、自动剔除和大模型智能剔除属于当前正文编辑状态，会同步影响自动翻译、沉浸翻译和沉浸阅读；还原正文会清除编辑状态，但不会改变上下文预览面板的展开/折叠状态。当前正文 selector 标签可点击打开规则编辑弹窗，默认填入当前页面地址和 selector；保存后写入 `settings.articleExtractionRules` 并刷新当前正文。
- 内置工具包括图片分析、自动翻译、翻译 PDF/字幕、总结摘要、通俗解释、事项提取、精简提炼、扩写细化、自然润色、智能续写、起草回复、学习笔记、代码解释。
- 内置工具和自定义工具都支持编辑；但某些固定功能按钮不是隐藏工具，不应出现在工具列表里。
- 通用配置 `toolResponseUseContextLanguage` 的界面名称为“工具使用提问上下文原始语言进行回答”，只控制工具回答语言：开启时先根据上下文语言标记和实际文本确定具体原始语言，并将其明确写入最终 prompt；关闭时使用当前界面语言。普通侧边栏输入框对话不应用该配置；自动翻译、PDF/字幕翻译和代码解释排除在外。工具模板采用哪种书写语言不算语言指定，只有模板明确要求使用某种语言回答时才拥有更高优先级。
- 当前 `ToolDefinition` 是提示词型工具抽象，核心是名称、图标、模板、模型用途和展示入口；自定义工具也是这一层。它不等同于包含脚本、资源、权限、状态和多步骤协议的完整 Skill。沉浸翻译、沉浸阅读、正文识别属于固定原生能力或 workflow，不要为了统一命名把它们硬塞进普通工具列表；未来引入 Skill 时应把 prompt tool、workflow tool 和 native capability 分层。

## 当前真实默认设置

以下值来自 `src/shared/defaults.ts` 的 `DEFAULT_SETTINGS`，是代码真实默认值，不代表用户存储中已经存在的个人配置：

- `interfaceLanguage`：`auto`
- `translationLanguage`：`auto`
- `theme`：`system`
- `defaultContextScope`：`article`，即当前正文；侧边栏打开时按这个设置选择当前上下文
- `selectionOverlayMode`：`off`
- `selectionOverlayShortcut`：`off`
- `selectionOverlayMinChars`：`2`
- `selectionMatchHighlightMode`：`off`
- `linkTextSelectionEnabled`：`false`
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
- `toolResponseUseContextLanguage`：`false`，工具默认使用当前界面语言回答
- `chromeSyncEnabled`：`false`
- `autoScrollDuringStreaming`：`true`
- `modelThinkingTimeoutSeconds`：`0`，表示不限制
- `mcpToolApprovalMode`：`ask`，即始终询问
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
- 工具输出语言约束统一由 `src/shared/tools.ts` 的 `toolPromptWithContext` 追加，只接入工具调用路径，不要放入普通对话的 system message。开启配置时，`originalLanguageLabel` 结合实际上下文文本和 `PageContext.language`/页面语言提示生成具体语言名，并将规则放在最终 prompt 末尾；模板的书写语言不算显式要求，只有明确要求“使用某语言回答”时才覆盖。自动翻译、PDF/字幕翻译和代码解释继续使用各自专用提示词。
- 侧边栏普通对话和非翻译工具把页面/正文/选区当作参考上下文，走 `resolveRichContext`、`buildSystemMessage` 或 `toolPromptWithContext`；自动翻译/文档翻译把当前上下文当作待处理原文，必须走翻译保护和专用 prompt，不要为了“统一路径”把翻译工具模板、标题、URL 或 system 上下文混进译文输入。
- 发送模型请求前必须以 Chrome 真实当前活动标签页为准校验上下文；`pageContext`、`currentArticleContext`、`selectionContext` 和工具传入的 `contextOverride` 只有在 `tab.id` 与 URL 都匹配时才能复用。不要用旧 `pageContext.url` 作为“当前页”兜底，否则切换标签页后会把上一页上下文带进普通对话或工具。
- 翻译任务使用翻译角色模型；视觉任务使用视觉角色模型；没有对应角色时回退到默认/当前模型。
- UI 文案应通过 `uiText` 获取。九种语言都必须拥有与简体中文基准完全相同的 key 集合；西班牙语、法语、德语、意大利语不得再回退或别名到英文对象。新增/删除 key 时必须同步所有资源，并由 TypeScript 与测试共同校验。
- 日志需要定义级别；大模型请求详情适合作为 debug 日志。
- 设置页面配置块当前期望顺序为：通用配置、快捷工具、悬停释义、划词浮层、沉浸翻译、沉浸阅读、工具启用、正文识别、数据同步。
- “正文识别”配置块应像“工具启用”一样占据整行；内部子标题为“识别规则”，右侧有“添加”按钮；规则行使用 placeholder 说明页面地址和 CSS selector，不保留单独列标题或底部添加按钮。
- 上下文预览面板的交互约定：标题显示“上下文预览”，图标、副标题和内容随当前上下文变化；当前正文状态下还原正文、框选正文、复制正文、自动剔除和大模型智能剔除使用纯图标按钮，复制 tooltip 为“复制正文”，两个剔除按钮分别通过 tooltip 标注；正文 meta 第一行顺序为“自动剔除、大模型智能剔除、selector、规则/DOM/手动/已编辑来源、段数、字数”，selector 必须截断避免撑宽。
- 当前正文段落不再在鼠标悬停时跟踪页面正文，只有点击段落或键盘确认时才跳转/高亮。
- 手动框选正文时 selector 应是可定位的 CSS selector，不应退化成 `manual` 或单个标签名；tooltip 两行显示“元素位置/selector”和操作提示；`Esc` 或切换 Chrome 标签页会取消框选，不弹出取消提示菜单。
- 侧边栏统一 tooltip 会接管侧栏控件原有的 `title` 文案，避免浏览器原生 tooltip 与项目样式不一致；工具调用气泡继续使用其专用 tooltip 样式。
- MCP 授权必须在后台 `runMcpAgent()` 的每次工具调用前读取 `loadSettings()` 后执行，不能只依赖侧边栏状态。`allow` 只绕过审批，不得绕过 `mcpTools` 的已启用/已发现校验。
- Port 协议中 `mcp.approval.required` 请求用户决定；`mcp.tool.status` 回传 `McpToolEvent`。事件状态为 `called`、`blocked`、`failed`；阻止原因只能是 `global-deny`、`user-deny` 或 `approval-timeout`。事件必须以 `requestId` 绑定助手消息，审批关联使用 `approvalId`。
- 审批超时为 `30_000ms`。`pendingMcpApprovals` 删除条目后才解析为 `deny-timeout`，因此超时与用户迟到点击按先到者生效；超时不得中止整轮聊天。取消或 Port 断开仍通过 `AbortController` 拒绝等待中的审批。

## 最近完成的功能与修复

- 2026-08-13：MCP 选择器新增 Server 折叠层级、加大复选框和可点击区域；已选时网络图标 tooltip 显示 Server 与工具总数。MCP 授权弹窗改为拒绝按钮与三种允许范围的分组布局，并增加销毁性工具风险提示。
- 2026-08-13：MCP 返回结果由单独状态展示改为嵌入同一助手消息的结果色带，成功、失败、拒绝和超时均携带详情，默认折叠；协议 `isError` 也归类为失败。日志补齐授权决定、调用状态与 Server 生命周期事件，且不记录敏感内容。
- 2026-08-13：添加 Cookie 查看器；添加链接文字横向拖动选择；添加同文高亮与右侧定位标记。链接选择和同文高亮默认均不启用。
- `bd092f3 feat: add MCP authorization modes and tool status`：新增 `mcpToolApprovalMode` 设置及多语言文案；后台在每次调用前强制执行全局授权；审批 30 秒超时后继续让模型回答；通过 `mcp.tool.status` 将调用、拒绝、超时和失败状态绑定并渲染到助手回答。测试补充了授权模式归一化。
- 已完成核心模块的第一轮拆分，正文识别、翻译 DOM、选择处理、快捷键、附件和侧边栏展示等能力已移出部分核心文件；当前仍需继续拆分大文件。
- 新增 `src/shared/immersiveWorkflow.ts`，内容脚本和侧边栏的沉浸翻译/沉浸阅读模型流程共用分批、重试、校验、顺序化应用和进度协议。
- 当前正文已重构为“一个父容器 + 一组预览 block”的单一路径：规则、手动框选和自动 DOM 识别都只负责确定父容器；自动识别会把正文标题纳入正文，并允许 GitHub README、项目主页、长博客等长正文容器胜出，但会限制向外提升范围并惩罚评论、回复、推荐、导航等混入噪声；父容器下的段落、列表、表格、代码块等紧凑整体会生成可定位、可删除、可翻译写回的 block。
- 当前正文候选评分已接入 `ArticleSummary.score` 和 `ArticleSummary.scoreMetrics`。评分用于自动候选排序和窗口展示，不得用于选定父容器后的隐式内容过滤；删除、自动剔除或大模型智能剔除后，展示评分基于当前仍保留的 `articlePreview` block 重新计算。
- 侧边栏“上下文预览”面板稳定存在并随上下文切换图标和内容；当前正文状态支持 selector、来源、段数、字数和待处理 block，正文不再截断显示，不再插入“内容已截断”。
- 当前正文、当前页面、当前选中预览和对话消息已支持代码语法高亮。DOM 转 Markdown 不得只识别 `<pre>`：`isBlockCodeElement` 还识别块级 `<code>`、语言属性，以及带通用 `code`、`source`、`highlight`、`syntax`、`prettyprint` 元数据且不含普通正文子结构的块级容器；同一代码容器内的局部选区由 `selectionMarkdownWithLayout` 直接生成 fenced code。通用 `language-*`、`lang-*`、`highlight-source-*` class 和 `data-language`/`data-lang` 属性可提供语言；当前页面预览使用 Markdown lexer 保持顶层代码、列表和表格整体。`SyntaxHighlightedMarkdown` 在上下文预览展开时通过 `eager` 直接加载共享高亮器，不能依赖折叠 `<details>` 内滚动容器的 `IntersectionObserver`；对话消息继续按可见性懒加载。组件通过 `renderMarkdownHtml` 的 code renderer 声明式生成最终高亮 HTML，不对 React 管理的 DOM 做渲染后修改，因此流式结束及父组件重渲染不会清除高亮；高亮库不进入 content script。对话气泡 Markdown 作用域必须覆盖根节点的 `font-synthesis: none`，为 `<strong>`/`<b>` 启用 `font-synthesis: weight` 并使用标准 `700` 字重，否则缺少对应实体字重的 CJK/系统回退字体会解析出 `<strong>` 但视觉不加粗。
- 当前正文预览的自动剔除按钮仅显示 `Eraser` 图标；相邻的大模型智能剔除按钮仅显示 `Wand` 图标。自动剔除使用本地 DOM 特征，大模型流程把全部可见 `articlePreview` block 发送给模型，只接受经过 ID 校验的 `keep/remove` 决策，并禁止全部删除。
- 切换 Chrome 标签页时，上下文下拉框保持当前页面、当前正文或无上下文的选择，并刷新到新标签对应内容；如果当前模式是当前选中，则读取新标签的选区，新标签有选区时继续保持当前选中，没有选区时才切换为设置中的默认上下文。相同标签的更新和窗口焦点变化不会强制重置下拉框。
- 已新增正文识别规则：设置页可管理全部规则；上下文预览面板的当前正文状态可通过 selector 标签弹窗快速新增当前页面规则。
- 支持通过 HTML 层级感知选择器手动框选正文；框选结果属于“当前正文”，不是新的上下文类型；支持还原为自动识别正文；`Esc`、标签页切换和侧边栏切换会取消框选状态。
- 沉浸翻译、沉浸阅读和自动翻译的当前正文处理应严格使用上下文预览面板当前正文状态同源的完整 `articlePreview` 可见 block。这里的“预览”指 `PageContext.articlePreview` 数据，不是 UI 是否展开；当前正文字段不截断，预览数组不限制 block 数量，也不要因为用户没展开详情就重新走另一套正文提取。
- 沉浸翻译会按视口优先级排序 block，先翻译并写回首批可视区域内容，再并发处理剩余 block；模型漏回条目时会递归拆小批次重试，避免前部或大段正文因一次批量响应不完整而永久缺失。
- 当前选中的文本和可用 Range 会保存在 content script 内；沉浸翻译和沉浸阅读共用的选区准备逻辑在包装选中文字后会重新选择包装内容并更新 retained Range，不再主动清空 Selection。两项功能都必须从当前标签的 selection context 读取文本。侧边栏获得焦点后 Chrome 仍可能改变选区的视觉绘制，但当前选中上下文和处理范围必须保持；切换标签时不得把旧标签选区带到新标签。
- 选中内容从划词浮层打开侧边栏时，会临时覆盖为“当前选中”；选区真正消失后自动恢复进入选中前的上下文。用户在选中期间手动切换上下文会取消这次自动恢复。
- 侧边栏临时提示和上下文错误提示会在 5 秒后自动关闭。
- 自动翻译/沉浸翻译已持续修复富文本、链接、引用、上标、下标的保护和还原行为。自动翻译会保护每一个单换行和段落换行；fenced code block 会作为完整的不可翻译对象保护并在回答中原样恢复语言标记和多行代码，即使模型漏回占位符也会按原始结构位置补回，模型附加的单/双/三反引号包装会被移除，避免代码块退化为内联代码。翻译提示词和共享恢复层共同禁止普通段落新增编号、项目符号、标题或其他前缀；恢复层仅清理原文没有列表标记却被模型连续列表化的行，并保留真实有序/无序列表。超出模型上下文限制的截断输入会同步裁剪对应的代码和引用保护元数据，避免把未发送内容补回结果。
- 原始语言检测必须使用去除代码后的可见自然语言样本：`src/shared/prompts.ts` 的 `detectTranslationLanguage` 会先移除 fenced code、HTML `pre/code` 和 Markdown 行内代码，再统计各文字脚本比例。混合文本只有在非代码拉丁字母占可判定文字至少 80%、且至少有两个自然语言单词时，才允许覆盖中文/日文/韩文判定为拉丁语言；代码块的大小不能增加英文证据。纯代码输入没有可判定的原始语言，应返回空结果而不是英文。
- 正文提取会清理原文中的英文 citation 说明标签：`**4 citations from multiple sources**[1-4]` -> `[1-4]`，`**Citation 5 from source**[5]` -> `[5]`，但保留普通正文中的引用标记。
- 翻译结果还原会清理重复的“这是一个翻译任务...”前言、损坏的 `WEBMIND_*` 片段和 citation 说明噪音。`chat.delta` 使用流式恢复模式：原始响应继续完整累计，但可见文本会隐藏末尾尚未闭合的占位符 token；缺失 citation 的末尾补齐仅允许在 `chat.done` 的最终恢复中执行，禁止在每个 delta 后反复显示引用尾巴。
- 沉浸阅读已接入英文词频表，并对中英文页面做运行级别去重。
- 悬停释义的 caret 命中逻辑支持元素边界回退、中文多长度候选、英文词形还原和词典加载失败重试；caret 返回值只用于定位候选文本节点，最终候选 `Range` 必须包含鼠标坐标，禁止将行首、行尾或行间空白回退到最近文字。命中词样式通过 CSS Highlight API 在 `none`、`highlight`、`underline` 之间切换。
- 设置页界面语言和译文语言使用一行内并排的两个原生下拉框，候选包含自动、简体中文、繁體中文、English、日本語、한국어、Español、Français、Deutsch、Italiano，默认值仍为自动。所有真实语言选项固定使用该语言的自称，只有“自动”跟随当前界面语言。西、法、德、意已接入完整静态 UI、工具标题与说明、词典字段、浏览器语言解析、存储归一化、工具回答目标、自动翻译方向、拉丁语言检测和沉浸阅读 fallback。
- Prompt 架构将界面本地化与内部指令语言分开：`resolvePromptLanguage` 让西、法、德、意复用英文核心 Prompt，避免复制翻译保护、格式和正文规则；模型可见的词典字段由 `DICTIONARY_PROMPT_LABELS` 注入，普通快捷操作追加明确的最终输出语言，工具模板继续由统一回答语言约束兜底。不要为四种语言复制整套核心 Prompt。
- 自动翻译的提示词污染已移除。翻译工具发给模型时，应只发送受保护的翻译 prompt，不要再把工具模板和上下文重复拼进去。
- 侧边栏直接对话使用 `buildSystemMessage` 把当前上下文作为参考材料发送；非翻译工具在上下文异步补全后重新构造模型输入：内置工具显式附加当前上下文，自定义工具的 `{{text}}` / `{{context}}` 会注入实际上下文，不再注入“当前上下文”占位文案；划词浮层工具也通过同一规则传递选区 Markdown。发送前必须重新校验真实当前活动标签页，缓存上下文和 `contextOverride` 只有在 `tab.id` 与 URL 都匹配时才能复用。
- 自动翻译当前正文时必须由 `PageContext.articlePreview` 中仍可见的 block 按顺序重建 Markdown，每个 block 之间使用双换行，不能改用可能滞后的 `PageContext.markdown` 或 `text`；当前页面和其他上下文优先使用 `PageContext.markdown`，没有 Markdown 时回退到 `text`。翻译工具把上下文当作待翻译原文，不是参考材料，发给模型时应只发送受保护的翻译输入和专用规则。
- DOM 转 Markdown 时，链接标签内部的块级换行会压成普通空格，方括号会转义，避免生成 `[多行文字](url)` 后被 Markdown 解析器拆断；链接目标地址仍独立编码。
- 自动翻译的词典式回答已收窄：`isDictionaryTranslationInput` 只让真正像单词、术语或固定短语的输入进入查词式 prompt；包含“可以/应该/需要”等语气结构，或以“获取/打开/点击”等动作动词开头的短中文句子，会回到普通翻译。
- 词典式 prompt 强制每个粗体字段使用独立 Markdown 段落。`normalizeDictionaryTranslationMarkdown` 仅在 `isDictionaryTranslationInput` 已确认词典模式时执行，可识别中、英、西、法、德、意的本地化词典字段并将模型偶发挤在同一行的字段切回双换行分段；普通翻译、文档翻译和其他工具结果不得经过该归一化。划词结果窗口的 `.md-result-body .markdown` 有独立的段落、列表、粗体、链接、代码和表格样式，外层 `pre-wrap` 只用于错误纯文本，不能继续影响 Markdown 内部排版。
- 词典式回答首行的五星只表示模型根据原词在源语言现代通用语境中的使用频率所作的五档估计：五星极常见，一星罕见。CET-6、GRE、IELTS 及其他考试、等级或词表标签已从所有本地化词典 prompt 中删除；模型必须保留词频星级，但不得解释评级过程。
- 单字或极短中文现在也会被本地语言检测识别为 Chinese；当界面语言和译文语言都为 `auto` 且界面解析为中文时，目标会锁定为 English，词典式 prompt 也会要求核心译义必须使用目标语言，避免原样返回。
- `buildProtectedTranslationPrompt` 当前包含：
  - 自动翻译规则；
  - 明确的翻译方向规则；
  - 单换行、段落、完整 fenced code block 和引用占位符保护规则；
  - 只输出结果的规则；
  - `<translation-input>...</translation-input>`。
- 自动翻译方向会在 `src/shared/prompts.ts` 中先做本地预判。例如：界面语言为简体中文、译文语言为自动时，英文原文应翻译为简体中文，中文原文应翻译为英文。
- 翻译 prompt 会明确写入“本地预判源语言”和“固定目标语言”，用于避免短英文短语、中文短词被模型原样返回。
- 引用小标、每个换行和完整 fenced code block 会在 `src/shared/utils.ts` 中被占位符保护，并在模型返回后还原；代码块内容不进入翻译，恢复后仍是可由 Markdown 和语法高亮组件识别的多行 fenced code。
- 已有标签页如果没有 content script，`src/shared/browser.ts` 的 `sendToTab` 会在首次连接失败时使用 `chrome.scripting.executeScript` 注入 `content.js` 并重试一次；`public/manifest.json` 已声明 `scripting` 权限。用户不需要为了侧边栏连接而刷新普通网页。
- `page.context` 当前通过 `extractPageContextAsync` 执行协作式正文识别；可见文本遍历、候选收集、评分和最终 block 收集按约 `6ms` 时间片调用 `scheduler.yield()` 或 `setTimeout(0)` 主动让出页面主线程。识别期间有可见性/文本缓存，不修改原始网页 DOM，预览定位只记录正文 block 对应元素。
- 自动触发的异步正文刷新通过 `src/content/articleExtractionRunner.ts` 串行执行；标签切换、页面更新和窗口聚焦产生的新刷新会取消旧的可替换刷新，取消检查复用现有 checkpoint。用户主动正文读取和编辑不可被自动刷新取消。候选评分使用 `includeMarkdown: false` 的相同 block 划分路径，只跳过未选中候选的 Markdown 构造；最终选中父容器仍生成完整 Markdown。单次扫描还按含噪/去噪规则分别缓存紧凑后代判断，避免跨规则错误复用。content script 的 debug 日志会输出各阶段耗时和候选/block/字符计数。
- 第二阶段正文优化在 `src/content/articleRootCache.ts` 中缓存自动选择的根元素、当前 URL 和正文规则签名；命中时只跳过全页面候选收集/评分，最终 block、Markdown、文本、预览和八项评分仍完整重建。缓存根节点断开、URL/规则变化、还原自动识别或真实页面 DOM 变化时失效；一次失效后 `MutationObserver` 立即断开。包含同源 iframe 或开放 Shadow DOM 时旁路缓存并继续完整识别，手动/编辑正文优先级不变。debug 日志增加 `rootCache=hit|miss|bypass`。
- 侧边栏日志图标使用 `notepad-text`，沉浸翻译使用内联 `translate-ai` 风格图标，沉浸阅读使用内联 `book-ai-line` 风格图标，学习笔记工具使用 `book-open`，当前正文使用 `text-align-start`。
- Vite 已通过 `manualChunks` 拆分 lucide 动态图标，构建输出会出现多个 `lucide-icons-*` chunk；这是预期状态，用于避免单个 `vendor-icons` chunk 过大。

## 已知限制

- 如果 `interfaceLanguage` 是 `auto`，实际界面语言会跟随浏览器语言。如果浏览器语言解析为英文，那么英文输入加译文语言 `auto` 时，目标语言可能仍是英文，这是当前规则的设计结果。若要稳定英文转中文，应将界面语言或译文语言明确设为简体中文。
- Chrome 侧边栏获得焦点后，网页文档不再拥有键盘焦点；扩展会保存并重新选择当前 Range，且不再主动清空 Selection，但不能保证浏览器在失焦页面继续绘制原生蓝色选区。
- 禁止复制、禁止右键和拦截 `copy`/`contextmenu` 通常不会限制 DOM 上下文工具、自动翻译、沉浸翻译或沉浸阅读；`user-select: none` 等样式可能限制“当前选中”功能。
- 部分 Chrome API 要求用户手势。图片获取/截图、侧边栏打开、手动正文框选和部分 content script 交互需要在真实扩展中测试，不能只依赖 Vite 预览。
- 侧边栏流式回答使用 runtime port。虽然已有断连处理，但改动流式、停止生成、取消请求时要在 Chrome 中实测。
- 自动正文识别只做通用 DOM 父容器选择；新闻推荐/评论混排、代码块/表格/公式混排仍可能需要手动框选或逐段剔除。评分是启发式指标，不能替代真实页面回归。
- 正文识别规则只保存 URL 匹配和 CSS selector；selector 仍必须能在当前可访问 DOM、开放 Shadow DOM 或同源 iframe 中找到，不能绕过跨域或浏览器受限页面限制。
- 正文识别入口已异步低优先级调度并限制扫描范围，但实际 DOM 读取仍发生在网页主线程；超大 DOM、复杂 Shadow DOM 或大量动态节点页面仍需真实 Chrome 性能回归。
- 虚拟滚动和无限滚动目前只处理已经存在于 DOM 的内容，不会主动滚动页面加载更多内容。
- Canvas、图片、视频画面和伪元素绘制的文字不属于普通 DOM 文本，当前正文识别无法直接提取。
- 跨域 iframe 无法读取；开放 Shadow DOM 和同源 iframe 只提供尽力处理，真实页面结构仍需验证。
- 手动框选依赖可访问的 DOM 和可见元素；浏览器内部页面、扩展商店页面等受限页面不能注入 content script。
- 沉浸翻译和沉浸阅读仍需要避开脚本、隐藏内容、导航、页脚、侧栏和已有 WebMind 注入元素；当前正文 scope 则以选定父容器的可见 block 为准。
- PDF worker chunk 较大。当前 Vite 构建能通过并输出较大的 `vendor-pdf`/worker chunk，这是预期现象，除非后续重新设计 PDF 处理方式。
- MCP 当前只覆盖 Tools，不支持 Resources、Prompts、Sampling、Roots 或 Elicitation；图片/音频/资源结果以文本标记传回模型。MCP Server 配置和自定义请求头只保存在 local storage，不参与 Chrome Sync；每次操作会重新建立连接，并受 15 秒发现、60 秒调用和 60000 字符结果上限约束。
- MCP 工具调用依赖实际模型的原生 tool-calling 能力。未启用工具时继续使用原有流式路径；启用后模型决策轮次是非流式的，可能增加请求次数和延迟。全局模式默认询问，也可直接拒绝或直接允许；始终允许会跳过审批，Server 本身仍可能访问本机或内网资源，使用者应只添加可信 Server。
- 同文高亮不匹配当前原生 Selection 的浏览器绘制样式；当前选区仍由浏览器控制。此处已放弃通过 `::selection` 强行统一样式，以避免性能和兼容性问题。

## 未完成问题

- 尚未为正文识别规则、block 划分、手动 DOM 框选、选区消失后的上下文切换补充完整的 Chrome 自动化测试。
- 尚未为自动补注入、受限页面失败提示、当前正文段落删除、复制正文和智能剔除补充完整的 Chrome 自动化测试。
- 正文识别已实现协作式分片和主动让出主线程，但 DOM 查询本身仍只能在网页主线程执行，超大或高频动态 DOM 仍需真实 Chrome 性能回归，不能简单迁移到 Worker。
- 虚拟滚动/无限滚动页面尚未实现无副作用的增量正文采集。
- 跨域 iframe 尚未实现正文代理或权限协作。
- `src/content/index.tsx` 和 `src/sidepanel/App.tsx` 仍然较大，当前只有第一轮功能模块拆分。

## 下一步优先级

1. 在真实 Chrome 中回归当前正文、正文识别规则、selector 弹窗保存、手动框选/逐段删除/智能剔除/复制/还原、划词浮层打开侧边栏、选区消失后的上下文切换，以及点击沉浸翻译/阅读后的选区保持。
2. 建立正文识别和手动编辑的浏览器测试页面，覆盖大 DOM、新闻推荐/评论、长段落、GitHub README、表格、公式、代码、动态渲染和 Shadow DOM。
3. 继续拆分 `src/content/index.tsx` 与 `src/sidepanel/App.tsx`，但保持共享 workflow 协议不分叉。
4. 设计虚拟滚动/无限滚动的可见内容增量采集，并限制滚动副作用。
5. 继续优化正文父容器选择、block 划分、异步分片扫描和跨 iframe 的可行处理边界。

## 最后一次验证结果

2026-08-13，以下命令均通过：

```bash
npm run typecheck
npm run test
npm run build
git diff --check
```

测试结果：`24` 个测试文件、`194` 个测试通过；TypeScript 类型检查和构建均成功，已生成未打包扩展目录 `dist/`。以上是代码级验证，尚未替代真实 Chrome 手工验证。

## 最近手工验证重点

- 在 Chrome 中加载 `dist/`，测试自动翻译：
  - 界面语言设为 `zh-CN`；
  - 译文语言设为 `auto`；
  - 选择英文短语；
  - 选择英文句子；
  - 选择中文文本。
- 检查“获取可以模型”这类短中文句子走普通翻译，而“获取”“模型”这类短中文词走查词式翻译且给出英文核心译义，不原样输出。
- 分别在当前页面和当前正文上下文执行自动翻译，检查单换行、block 间段落结构和引用小标；正文必须与预览中仍可见的 block 一一对应。输入包含带语言标记的多行 fenced code 时，译文应原样保留代码并正常显示为高亮代码块，不得出现单/双反引号包裹的内联代码。流式输出末尾不得闪现 `{`、`WEBMIND_*`、反引号或尚未到达语义位置的引用标记。
- 分别用当前页面、当前正文和当前选中测试“少量中文说明 + 大型英文代码块”“中文正文 + 少量英文技术术语”“极高比例英文自然语言”三类输入：代码和行内代码不得参与原始语言判断，前两类应判为中文，只有非代码拉丁文字达到高占比时才判为拉丁语言；纯代码输入不得默认判为英文。
- 检查侧边栏停止生成是否能真正取消当前模型请求。
- 当 `selectionOverlayMinChars` 设为 `1` 时，检查单字符划词是否能触发浮层。
- 在真实网页中检查沉浸翻译快捷键，因为它依赖 content script 的键盘事件。
- 在设置页检查悬停释义命中词样式的 `无`、`高亮`、`下划线` 三种状态；检查切换时旧的 CSS Highlight 会被清除。
- 在设置页检查界面语言和译文语言下拉框是否始终同一行并排，是否包含西班牙语、法语、德语和意大利语；分别保存后重开设置页，并验证工具回答、自动翻译及沉浸阅读使用所选目标语言。
- 在多行中英文正文的文字内部、行首空白、行尾空白和行间空白分别移动鼠标；只有文字 `Range` 内允许触发悬停释义，空白区域不得命中该行最近的首尾词。
- 在 Google、Bing、DuckDuckGo、百度等搜索引擎结果页检查搜索页模型回答窗口。
- 检查侧边栏打开时默认上下文是否与设置中的 `defaultContextScope` 一致。
- 检查上下文预览面板在无上下文、当前页面、当前正文、当前选中之间切换时始终存在，图标、副标题和内容同步变化。
- 检查划词进入“当前选中”后，选区消失会分别恢复此前的无上下文、当前页面或当前正文；选中期间手动切换上下文后不得恢复过期状态。
- 在当前选中模式分别点击沉浸翻译和沉浸阅读，确认网页 Selection 范围、retained Range 和侧边栏当前选中上下文都不被扩展主动清空；Chrome 是否继续显示蓝色高亮需单独记录。
- 检查上下文预览面板当前正文状态的 selector、来源、段数、字数、框选正文、复制正文、还原正文和折叠图标。
- 检查当前正文评分数字位于复制按钮右侧；悬停或键盘聚焦时 tooltip 显示总分及八项指标，评分变化使用颜色表达，不显示箭头。
- 检查当前正文、当前页面预览和对话消息中的 JavaScript、TypeScript、Python、Shell、JSON、HTML/CSS 等常见代码段是否按语言高亮；当前页面代码内部空行不得导致拆块，流式代码回答应稳定更新；无语言标记时应自动识别，超长代码应完整显示且滚动顺畅。
- 在用户与助手对话气泡中分别检查 `**中文加粗**`、`**English bold**` 和混合语言粗体，确认 Markdown 语法不显示为原始星号且视觉字重明显高于相邻正文。
- 检查上下文预览面板当前正文状态中“智能剔除、selector、DOM、段数、字数”的顺序，selector 是否截断且可点击新增规则，逐段删除图标是否为 `X`，以及编辑后来源、段数和字数是否刷新。
- 检查未展开上下文预览面板时，自动翻译、沉浸翻译和沉浸阅读仍使用 `PageContext.articlePreview` 的完整可见正文，而不是另走自动识别或抓到不可见 HTML。
- 逐个检查侧边栏工具、回答下方工具、用户直接提问和自定义工具：切换无上下文、当前页面、当前正文、当前选中后，模型收到的上下文应与上下文预览一致；切到新 Chrome 标签页后立即提问或运行工具时，不得携带上一标签页上下文；自定义模板的 `{{text}}` / `{{context}}` 应是实际内容而不是“当前上下文”。
- 开启“工具使用提问上下文原始语言进行回答”，用中文界面分别对英文、中文和带 `lang=fr` 的法文上下文执行总结/解释/自定义工具，确认回答使用识别出的上下文语言；再确认普通输入框对话不受影响，模板仅以中文书写时不会覆盖英文上下文语言。
- 检查正文原文中 `**4 citations from multiple sources**[1-4]`、`**Citation N from source**[N]` 只保留引用标记；检查翻译结果不会出现“这是一个翻译任务...”和损坏的 `WEBMIND_*` 占位符。
- 在扩展重载后保留一个不刷新的普通网页标签页，直接打开侧边栏并使用当前正文工具，验证自动补注入不会再出现“不能建立连接”。
- 在禁止复制/右键的网站上分别测试当前页面、当前正文、自动翻译、沉浸翻译和沉浸阅读；另测 `user-select: none` 页面上的当前选中功能。
- MCP 回归：检查 MCP 页签及输入框选择器的 Server 默认折叠、名称/箭头展开、全选与单选复选框，以及已选工具时网络图标 tooltip 的 Server/工具总数。
- MCP 回归：分别将“通用配置 -> MCP 工具执行授权模式”设置为始终拒绝、始终询问、始终允许；确认始终拒绝不执行工具且同一助手消息的折叠色带说明原因，始终允许只执行当前勾选工具且不弹窗。
- MCP 回归：在始终询问模式分别选择本次、本轮、会话允许和拒绝；确认授权范围正确。对审批弹窗等待超过 30 秒，确认弹窗关闭、工具不执行、折叠色带显示“等待授权超时”，模型仍会继续给出回答；超时后点击旧弹窗不得影响后续调用。
- MCP 回归：制造 Server 调用错误及协议 `isError`，确认同一助手消息中的默认折叠色带显示失败；成功时展开后确认真实返回内容。检查日志分别包含授权决定、成功、失败、拒绝/超时以及 Server 保存/刷新/删除，且不含参数或返回正文。
- 页面增强回归：确认 Cookie 查看器只读取当前 URL Cookie，四种格式可复制；确认链接选择默认关闭，启用后横向拖动可选择文字而普通点击/纵向拖动不变；确认同文高亮默认关闭，启用后分别验证大小写敏感/忽略大小写、珊瑚红匹配项和青绿色定位标记。
