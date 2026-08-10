export const SHADOW_STYLES = `
  :host {
    all: initial;
    color-scheme: light dark;
    --md-bg: #ffffff;
    --md-surface: #f4f6f5;
    --md-border: #d8ddda;
    --md-text: #17201e;
    --md-muted: #62706c;
    --md-accent: #e8533f;
    --md-teal: #178f7c;
    --md-shadow: 0 14px 38px rgba(15, 26, 23, .18);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 14px;
    letter-spacing: 0;
  }
  * { box-sizing: border-box; letter-spacing: 0; }
  button { font: inherit; }
  .md-toolbar {
    position: fixed;
    z-index: 2147483646;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px;
    width: max-content;
    max-width: min(430px, calc(100vw - 20px));
    min-height: 40px;
    padding: 4px;
    border: 1px solid var(--md-border);
    border-radius: 7px;
    background: var(--md-bg);
    box-shadow: var(--md-shadow);
  }
  .md-hover-dot {
    position: fixed;
    z-index: 2147483646;
    width: 9px;
    height: 9px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--md-accent);
    box-shadow: 0 1px 5px rgba(15, 26, 23, .22);
    cursor: pointer;
  }
  .md-hover-dot:hover {
    background: var(--md-teal);
  }
  .md-definition-tooltip {
    position: fixed;
    z-index: 2147483647;
    max-width: min(360px, calc(100vw - 20px));
    overflow: hidden;
    padding: 5px 9px;
    border: 1px solid var(--md-border);
    border-radius: 5px;
    color: var(--md-text);
    background: var(--md-bg);
    box-shadow: 0 7px 20px rgba(15, 26, 23, .18);
    font-size: 12px;
    line-height: 1.35;
    white-space: nowrap;
    text-overflow: ellipsis;
    transform: translateX(-50%);
    pointer-events: none;
  }
  .md-icon-button {
    display: grid;
    width: 31px;
    height: 31px;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 5px;
    color: var(--md-text);
    background: transparent;
    cursor: pointer;
  }
  .md-toolbar .md-icon-button { color: var(--md-teal); }
  .md-icon-button:hover { color: var(--md-accent); background: var(--md-surface); }
  .md-icon-button:disabled { cursor: wait; opacity: .45; }
  .md-icon-button svg { width: 17px; height: 17px; stroke-width: 1.9; }
  .md-divider { width: 1px; height: 20px; background: var(--md-border); margin: 0 2px; }
  .md-result {
    position: fixed;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    width: min(420px, calc(100vw - 20px));
    max-height: min(460px, calc(100vh - 20px));
    overflow: visible;
    overscroll-behavior: contain;
    border: 1px solid var(--md-border);
    border-radius: 7px;
    color: var(--md-text);
    background: var(--md-bg);
    box-shadow: var(--md-shadow);
  }
  .md-result-head {
    display: flex;
    min-height: 42px;
    align-items: center;
    gap: 8px;
    padding: 7px 8px 7px 12px;
    border-bottom: 1px solid var(--md-border);
  }
  .md-result-title { flex: 1; min-width: 0; font-size: 13px; font-weight: 700; }
  .md-result-head > svg {
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
    color: var(--md-accent);
  }
  .md-result-body {
    flex: 1 1 auto;
    min-height: 86px;
    max-height: clamp(86px, calc(100vh - 180px), 280px);
    overflow: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
    padding: 13px 14px;
    font-size: 14px;
    line-height: 1.65;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .md-result-error { color: #b33427; }
  .md-result-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding: 8px;
    border-top: 1px solid var(--md-border);
    background: var(--md-surface);
  }
  .md-result-head.md-draggable-head {
    cursor: move;
    touch-action: none;
    user-select: none;
  }
  .md-result-head.md-draggable-head:active { cursor: grabbing; }
  .md-result-tools {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .md-tool-menu {
    position: relative;
    display: inline-flex;
    min-width: 0;
    flex: 0 0 auto;
  }
  .md-tool-select {
    display: inline-flex;
    min-width: 120px;
    max-width: 170px;
    height: 31px;
    align-items: center;
    gap: 6px;
    padding: 0 8px;
    border: 1px solid var(--md-border);
    border-radius: 5px;
    color: var(--md-text);
    background: var(--md-bg);
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 650;
  }
  .md-tool-select svg {
    width: 14px;
    height: 14px;
    flex: 0 0 auto;
    color: var(--md-accent);
  }
  .md-tool-select .md-menu-chevron {
    width: 12px;
    height: 12px;
    margin-left: auto;
    color: currentColor;
    opacity: .68;
  }
  .md-tool-select span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .md-tool-menu-list {
    position: absolute;
    z-index: 4;
    left: 0;
    bottom: calc(100% + 6px);
    display: grid;
    width: 190px;
    max-height: 220px;
    overflow: auto;
    overscroll-behavior: contain;
    gap: 3px;
    padding: 5px;
    border: 1px solid var(--md-border);
    border-radius: 7px;
    background: var(--md-bg);
    box-shadow: var(--md-shadow);
  }
  .md-tool-menu-list button {
    display: flex;
    width: 100%;
    min-height: 30px;
    align-items: center;
    gap: 8px;
    padding: 0 8px;
    border: 0;
    border-radius: 5px;
    color: var(--md-text);
    background: transparent;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 650;
    text-align: left;
  }
  .md-tool-menu-list button:hover,
  .md-tool-menu-list button.active {
    color: var(--md-teal);
    background: color-mix(in srgb, var(--md-teal) 9%, var(--md-bg));
  }
  .md-tool-menu-list svg {
    width: 15px;
    height: 15px;
    flex: 0 0 auto;
    color: var(--md-accent);
  }
  .md-tool-menu-list span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .md-text-button {
    display: inline-flex;
    min-height: 31px;
    align-items: center;
    gap: 6px;
    padding: 0 10px;
    border: 1px solid var(--md-border);
    border-radius: 5px;
    color: var(--md-text);
    background: var(--md-bg);
    cursor: pointer;
    font-size: 12px;
    font-weight: 650;
  }
  .md-text-button:hover { border-color: var(--md-teal); color: var(--md-teal); }
  .md-text-button:disabled {
    cursor: not-allowed;
    opacity: .48;
  }
  .md-text-button svg { width: 14px; height: 14px; }
  .md-followup {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: stretch;
    gap: 7px;
    padding: 8px;
    border-top: 1px solid var(--md-border);
    background: var(--md-bg);
  }
  .md-followup textarea {
    width: 100%;
    height: 34px;
    min-width: 0;
    resize: none;
    padding: 7px 9px;
    border: 1px solid var(--md-border);
    border-radius: 5px;
    color: var(--md-text);
    background: var(--md-bg);
    font: inherit;
    font-size: 13px;
    line-height: 1.45;
  }
  .md-followup textarea::placeholder { color: var(--md-muted); }
  .md-followup button {
    display: grid;
    width: 34px;
    height: 34px;
    place-items: center;
    padding: 0;
    border: 1px solid var(--md-accent);
    border-radius: 5px;
    color: #fff;
    background: var(--md-accent);
    cursor: pointer;
  }
  .md-followup button:disabled {
    cursor: not-allowed;
    opacity: .48;
  }
  .md-followup button svg { width: 15px; height: 15px; }
  .md-spinner {
    width: 17px;
    height: 17px;
    margin: 28px auto;
    border: 2px solid var(--md-border);
    border-top-color: var(--md-accent);
    border-radius: 50%;
    animation: md-spin .8s linear infinite;
  }
  .md-mini-spinner {
    width: 13px;
    height: 13px;
    border: 2px solid color-mix(in srgb, var(--md-accent) 25%, transparent);
    border-top-color: var(--md-accent);
    border-radius: 50%;
    animation: md-spin .8s linear infinite;
  }
  .md-auto-reply-button {
    position: fixed;
    z-index: 2147483645;
    display: grid;
    width: 16px;
    height: 16px;
    place-items: center;
    padding: 0;
    border: 1px solid color-mix(in srgb, var(--md-accent) 42%, var(--md-border));
    border-radius: 50%;
    color: var(--md-accent);
    background: color-mix(in srgb, var(--md-bg) 88%, var(--md-accent));
    box-shadow: 0 2px 6px rgba(15, 26, 23, .14);
    cursor: pointer;
  }
  .md-auto-reply-button:hover {
    border-color: var(--md-teal);
    color: var(--md-teal);
    background: color-mix(in srgb, var(--md-bg) 84%, var(--md-teal));
  }
  .md-auto-reply-button:disabled {
    cursor: wait;
    opacity: .86;
  }
  .md-auto-reply-button.error {
    border-color: #b33427;
    color: #b33427;
  }
  .md-auto-reply-button svg {
    width: 10px;
    height: 10px;
    stroke-width: 2.4;
  }
  .md-auto-reply-button .webmind-logo-icon {
    display: block;
    width: 10px;
    height: 10px;
    object-fit: contain;
  }
  .md-auto-reply-button .md-mini-spinner {
    width: 10px;
    height: 10px;
    border-width: 1px;
  }
  .md-search-button {
    position: fixed;
    z-index: 2147483645;
    right: 18px;
    top: 124px;
    display: flex;
    width: 42px;
    height: 42px;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid var(--md-border);
    border-radius: 7px;
    color: #fff;
    background: #18211f;
    box-shadow: 0 8px 24px rgba(15, 26, 23, .2);
    cursor: pointer;
  }
  .md-search-button:hover { background: var(--md-teal); }
  .md-search-button svg { width: 19px; height: 19px; }
  .md-search-answer {
    position: fixed;
    z-index: 2147483643;
    top: 84px;
    right: 18px;
    display: flex;
    width: min(360px, calc(100vw - 36px));
    max-height: min(620px, calc(100vh - 116px));
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--md-border);
    border-radius: 7px;
    color: var(--md-text);
    background: var(--md-bg);
    box-shadow: var(--md-shadow);
  }
  .md-search-answer-head {
    display: flex;
    min-height: 40px;
    align-items: center;
    gap: 8px;
    padding: 6px 7px 6px 12px;
    border-bottom: 1px solid var(--md-border);
    background: var(--md-bg);
    cursor: grab;
    touch-action: none;
    user-select: none;
  }
  .md-search-answer-head:active {
    cursor: grabbing;
  }
  .md-search-answer-head > svg {
    width: 16px;
    height: 16px;
    color: var(--md-accent);
  }
  .md-search-answer-head strong {
    flex: 1;
    min-width: 0;
    font-size: 13px;
  }
  .md-search-answer-body {
    min-height: 96px;
    overflow: auto;
    padding: 13px 14px;
    font-size: 13px;
    line-height: 1.62;
    overflow-wrap: anywhere;
  }
  .md-search-answer-body.error { color: #b33427; }
  .md-search-answer-markdown {
    overflow-wrap: anywhere;
  }
  .md-search-answer-markdown .markdown {
    color: var(--md-text);
    font-size: 13px;
    line-height: 1.62;
  }
  .md-search-answer-markdown .markdown > :first-child {
    margin-top: 0;
  }
  .md-search-answer-markdown .markdown > :last-child {
    margin-bottom: 0;
  }
  .md-search-answer-markdown .markdown p,
  .md-search-answer-markdown .markdown ul,
  .md-search-answer-markdown .markdown ol,
  .md-search-answer-markdown .markdown blockquote,
  .md-search-answer-markdown .markdown pre {
    margin: 0 0 6px;
  }
  .md-search-answer-markdown .markdown ul,
  .md-search-answer-markdown .markdown ol {
    padding-left: 18px;
  }
  .md-search-answer-markdown .markdown h1,
  .md-search-answer-markdown .markdown h2,
  .md-search-answer-markdown .markdown h3 {
    margin: 8px 0 5px;
    font-size: 13px;
    line-height: 1.4;
  }
  .md-search-answer-markdown .markdown a {
    color: var(--md-teal);
  }
  .md-search-answer-markdown .markdown a[href^="http"] {
    display: inline-flex;
    align-items: center;
    min-height: 18px;
    padding: 0 5px;
    border: 1px solid var(--md-border);
    border-radius: 999px;
    color: var(--md-teal);
    background: color-mix(in srgb, var(--md-teal) 7%, var(--md-bg));
    text-decoration: none;
    font-size: 10.5px;
    font-weight: 750;
    line-height: 1.4;
  }
  .md-search-answer-markdown .markdown a[href^="http"]:hover {
    border-color: var(--md-teal);
    color: var(--md-accent);
  }
  .md-search-answer-markdown .markdown code {
    padding: 1px 4px;
    border-radius: 4px;
    background: var(--md-surface);
    font-family: "SFMono-Regular", Consolas, monospace;
    font-size: .92em;
  }
  .md-search-answer-markdown .markdown pre {
    overflow: auto;
    padding: 8px;
    border: 1px solid var(--md-border);
    border-radius: 5px;
    background: var(--md-surface);
  }
  .md-search-answer-markdown .markdown pre code {
    padding: 0;
    background: transparent;
  }
  .md-search-answer-markdown .markdown blockquote {
    padding-left: 9px;
    border-left: 3px solid var(--md-border);
    color: var(--md-muted);
  }
  .md-search-answer-actions {
    display: flex;
    gap: 7px;
    padding: 8px;
    border-top: 1px solid var(--md-border);
    background: var(--md-surface);
  }
  .md-edge-tools {
    position: fixed;
    z-index: 2147483644;
    right: -23px;
    bottom: var(--md-edge-bottom, 36px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    transition: right .16s ease;
  }
  .md-edge-tools:hover,
  .md-edge-tools:focus-within {
    right: 10px;
  }
  .md-edge-trigger {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    padding: 0;
    border: 1px solid var(--md-border);
    border-radius: 50%;
    color: var(--md-accent);
    background: var(--md-bg);
    box-shadow: var(--md-shadow);
    cursor: pointer;
    touch-action: none;
    cursor: grab;
  }
  .md-edge-trigger:active {
    cursor: grabbing;
  }
  .md-edge-trigger svg {
    width: 18px;
    height: 18px;
    stroke-width: 2.2;
  }
  .md-edge-menu {
    display: flex;
    flex-direction: column;
    gap: 5px;
    opacity: 0;
    pointer-events: none;
    transform: translateX(9px);
    transition: opacity .14s ease, transform .14s ease;
  }
  .md-edge-close {
    display: grid;
    width: 20px;
    height: 20px;
    place-items: center;
    padding: 0;
    border: 1px solid var(--md-border);
    border-radius: 50%;
    color: var(--md-muted);
    background: var(--md-bg);
    box-shadow: 0 6px 14px rgba(15, 26, 23, .14);
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transform: translateX(9px);
    transition: opacity .14s ease, transform .14s ease, color .14s ease;
  }
  .md-edge-close:hover {
    color: var(--md-accent);
  }
  .md-edge-tools:hover .md-edge-menu,
  .md-edge-tools:focus-within .md-edge-menu,
  .md-edge-tools:hover .md-edge-close,
  .md-edge-tools:focus-within .md-edge-close {
    opacity: 1;
    pointer-events: auto;
    transform: translateX(0);
  }
  .md-edge-menu button {
    display: grid;
    width: 34px;
    height: 34px;
    place-items: center;
    padding: 0;
    border: 1px solid var(--md-border);
    border-radius: 50%;
    color: var(--md-text);
    background: var(--md-bg);
    box-shadow: 0 8px 22px rgba(15, 26, 23, .16);
    cursor: pointer;
  }
  .md-edge-menu button:hover {
    border-color: var(--md-teal);
    color: var(--md-teal);
  }
  .md-edge-menu button:disabled {
    cursor: wait;
    opacity: .5;
  }
  .md-edge-menu svg {
    width: 15px;
    height: 15px;
  }
  .md-edge-close svg {
    width: 12px;
    height: 12px;
  }
  .md-edge-result {
    position: fixed;
    z-index: 2147483645;
    right: 16px;
    bottom: 154px;
    display: flex;
    width: min(360px, calc(100vw - 32px));
    max-height: min(360px, calc(100vh - 190px));
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--md-border);
    border-radius: 7px;
    color: var(--md-text);
    background: var(--md-bg);
    box-shadow: var(--md-shadow);
  }
  .md-edge-result-head {
    display: flex;
    min-height: 38px;
    align-items: center;
    gap: 8px;
    padding: 6px 7px 6px 11px;
    border-bottom: 1px solid var(--md-border);
  }
  .md-edge-result-head > svg {
    width: 15px;
    height: 15px;
    color: var(--md-accent);
  }
  .md-edge-result-head strong {
    flex: 1;
    min-width: 0;
    font-size: 12px;
  }
  .md-edge-result-body {
    overflow: auto;
    padding: 12px;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .md-edge-result-body.error { color: #b33427; }
  .md-progress-orb {
    position: fixed;
    z-index: 2147483646;
    right: 16px;
    bottom: 90px;
    display: grid;
    width: 54px;
    height: 54px;
    place-items: center;
    overflow: hidden;
    border: 1px solid var(--md-border);
    border-radius: 50%;
    color: var(--md-text);
    background: var(--md-bg);
    box-shadow: var(--md-shadow);
  }
  .md-progress-orb.error {
    color: #b33427;
  }
  .md-progress-fill {
    position: absolute;
    inset: auto -10% 0;
    height: var(--md-progress);
    min-height: 8%;
    background: color-mix(in srgb, var(--md-teal) 72%, #ffffff);
    opacity: .82;
    transition: height .24s ease;
  }
  .md-progress-fill::before,
  .md-progress-fill::after {
    content: "";
    position: absolute;
    left: 50%;
    bottom: calc(100% - 5px);
    width: 78px;
    height: 78px;
    border-radius: 43%;
    background: var(--md-bg);
    transform: translateX(-50%);
    animation: md-wave 5s linear infinite;
  }
  .md-progress-fill::after {
    border-radius: 47%;
    opacity: .72;
    animation-duration: 6.8s;
    animation-direction: reverse;
  }
  .md-progress-orb.error .md-progress-fill {
    background: color-mix(in srgb, #b33427 68%, #ffffff);
  }
  .md-progress-content {
    position: relative;
    z-index: 1;
    display: flex;
    width: 44px;
    min-width: 0;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    text-align: center;
  }
  .md-progress-content strong {
    font-size: 13px;
    line-height: 1;
  }
  .md-progress-content span {
    display: block;
    overflow: hidden;
    color: var(--md-muted);
    font-size: 7.5px;
    font-weight: 650;
    line-height: 1.12;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  @keyframes md-spin { to { transform: rotate(360deg); } }
  @keyframes md-wave {
    to { transform: translateX(-50%) rotate(360deg); }
  }
  @media (prefers-color-scheme: dark) {
    :host {
      --md-bg: #1c2422;
      --md-surface: #252f2c;
      --md-border: #3a4743;
      --md-text: #f2f5f4;
      --md-muted: #a7b1ae;
      --md-shadow: 0 16px 42px rgba(0, 0, 0, .42);
    }
  }
`;

export const PAGE_STYLES = `
  ::highlight(webmind-hover-definition) {
    background-color: rgba(143, 185, 215, .32);
    color: inherit;
  }
  ::highlight(webmind-hover-definition-underline) {
    text-decoration: underline;
    text-decoration-color: rgba(54, 116, 152, .9);
    text-decoration-thickness: 1.5px;
    text-underline-offset: 2px;
  }
  .webmind-page-tooltip {
    position: fixed !important;
    z-index: 2147483647 !important;
    max-width: min(320px, calc(100vw - 16px)) !important;
    padding: 8px 10px !important;
    border: 1px solid rgba(179, 52, 39, .45) !important;
    border-radius: 5px !important;
    color: #fff !important;
    background: rgba(126, 37, 29, .96) !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, .24) !important;
    font: 600 12px/1.45 system-ui, sans-serif !important;
    letter-spacing: 0 !important;
    pointer-events: none !important;
  }
  .webmind-translation {
    display: block !important;
    margin: .35em 0 .7em !important;
    color: inherit !important;
    font: inherit !important;
    line-height: 1.55 !important;
  }
  .webmind-translation-text {
    color: inherit !important;
  }
  .webmind-translation-text a,
  .webmind-translation-link {
    color: inherit !important;
    text-decoration: underline !important;
  }
  .webmind-translation-citation {
    display: inline !important;
    margin: 0 .08em !important;
    padding: 0 !important;
    font-size: .72em !important;
    line-height: 1 !important;
    vertical-align: super !important;
    white-space: nowrap !important;
  }
  .webmind-translation-citation a {
    color: inherit !important;
    text-decoration: none !important;
    cursor: pointer !important;
  }
  .webmind-translation-citation a:hover {
    text-decoration: underline !important;
  }
  .webmind-translation-default {
    opacity: .94 !important;
  }
  .webmind-translation-highlight {
    padding: .18em .42em !important;
    border-radius: .35em !important;
    background: rgba(255, 212, 102, .24) !important;
  }
  .webmind-translation-divider {
    padding-top: .45em !important;
    border-top: 1px dashed rgba(23, 143, 124, .55) !important;
  }
  .webmind-translation-quote {
    padding-left: .75em !important;
    border-left: 3px solid #178f7c !important;
    opacity: .94 !important;
  }
  .webmind-translation-blur {
    filter: blur(2.4px) !important;
    opacity: .82 !important;
    transition: filter .16s ease, opacity .16s ease !important;
  }
  .webmind-translation-blur:hover {
    filter: blur(0) !important;
    opacity: .96 !important;
  }
  .webmind-translation-transparent {
    opacity: .54 !important;
  }
  .webmind-translation-effect-underline {
    text-decoration: underline !important;
    text-decoration-thickness: .08em !important;
    text-underline-offset: .18em !important;
  }
  .webmind-translation-effect-bold {
    font-weight: 700 !important;
  }
  .webmind-translation-effect-italic {
    font-style: italic !important;
  }
  .webmind-translation-effect-light {
    color: rgba(88, 101, 96, .78) !important;
  }
  .webmind-translation-effect-emphasis {
    color: #3a7283 !important;
  }
  .webmind-translation-effect-large {
    font-size: 1.1em !important;
    line-height: 1.45 !important;
  }
  .webmind-translation-effect-dashed-underline {
    text-decoration-line: underline !important;
    text-decoration-style: dashed !important;
    text-decoration-thickness: .08em !important;
    text-underline-offset: .18em !important;
  }
  .webmind-translation-effect-small {
    font-size: .9em !important;
    line-height: 1.45 !important;
  }
  @media (prefers-color-scheme: dark) {
    .webmind-translation-effect-emphasis {
      color: #7cb9c7 !important;
    }
  }
  .webmind-translated-only {
    outline: 1px dashed rgba(23, 143, 124, .28) !important;
    outline-offset: 2px !important;
  }
  .webmind-immersive-reading-token {
    display: inline !important;
    white-space: normal !important;
  }
  .webmind-immersive-reading-highlight-uniform,
  .webmind-immersive-reading-highlight-leveled {
    border-radius: .28em !important;
    box-decoration-break: clone !important;
    -webkit-box-decoration-break: clone !important;
    padding: .05em .16em !important;
  }
  .webmind-immersive-reading-highlight-uniform {
    background: rgba(82, 177, 151, .18) !important;
  }
  .webmind-immersive-reading-level-1 {
    background: rgba(128, 203, 169, .18) !important;
  }
  .webmind-immersive-reading-level-2 {
    background: rgba(119, 184, 213, .18) !important;
  }
  .webmind-immersive-reading-level-3 {
    background: rgba(222, 190, 94, .2) !important;
  }
  .webmind-immersive-reading-level-4 {
    background: rgba(226, 150, 87, .2) !important;
  }
  .webmind-immersive-reading-level-5 {
    background: rgba(214, 116, 135, .2) !important;
  }
  .webmind-immersive-reading-outer,
  .webmind-immersive-reading-inner {
    display: inline !important;
    color: inherit;
  }
  .webmind-immersive-reading-inner {
    margin-left: .08em !important;
  }
  @media (prefers-color-scheme: dark) {
    .webmind-immersive-reading-highlight-uniform {
      background: rgba(111, 219, 187, .22) !important;
    }
    .webmind-immersive-reading-level-1 {
      background: rgba(128, 224, 176, .2) !important;
    }
    .webmind-immersive-reading-level-2 {
      background: rgba(119, 203, 232, .2) !important;
    }
    .webmind-immersive-reading-level-3 {
      background: rgba(238, 205, 104, .22) !important;
    }
    .webmind-immersive-reading-level-4 {
      background: rgba(239, 161, 92, .22) !important;
    }
    .webmind-immersive-reading-level-5 {
      background: rgba(229, 124, 148, .22) !important;
    }
  }
	`;
