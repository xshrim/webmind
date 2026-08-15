import { githubSshCloneUrl, isGithubRepositoryPath } from "./githubSshCloneUrl";

const CLONE_VALUE_ATTRIBUTES = [
  "value",
  "data-clipboard-text",
  "data-copy-text",
  "data-copy-value"
] as const;
const CLONE_VALUE_SELECTOR = [
  "input",
  "textarea",
  "clipboard-copy",
  "[data-copy-feedback]",
  ...CLONE_VALUE_ATTRIBUTES.map((attribute) => `[${attribute}]`)
].join(", ");
const CLONE_TEXT_SELECTOR = "code, span, div, p, pre";
const CLONE_UI_SELECTOR = [
  "details[id*='clone']",
  "[role='dialog']",
  "[role='menu']",
  "[role='tabpanel']",
  "[data-portal-root]",
  "[data-overlay-root]",
  "#__primerPortalRoot__",
  "[data-component*='Overlay']",
  "[popover]",
  "[data-target*='get-repo']",
  "[data-target*='clone']",
  "[data-testid*='clone']",
  "[aria-label*='Clone this repository']",
  "[aria-label*='clone this repository']"
].join(", ");
const PAGE_BRIDGE_ENABLED_ATTRIBUTE = "data-webmind-github-ssh-clone-rewrite";

interface RewrittenElement {
  attributes?: Map<string, string | null>;
  propertyValueCaptured?: boolean;
  propertyValue?: string;
  textContentCaptured?: boolean;
  textContent?: string | null;
}

export interface GithubCloneUrlRewriter {
  dispose(): void;
  refresh(): void;
}

export function setGithubCloneUrlRewriteBridgeEnabled(enabled: boolean): void {
  document.documentElement.toggleAttribute(PAGE_BRIDGE_ENABLED_ATTRIBUTE, enabled);
}

function stringValue(element: Element): string | undefined {
  const candidate = element as Element & { value?: unknown };
  return typeof candidate.value === "string" ? candidate.value : undefined;
}

function setStringValue(element: Element, value: string): void {
  (element as Element & { value: string }).value = value;
}

function recordElement(
  rewritten: Map<Element, RewrittenElement>,
  element: Element
): RewrittenElement {
  const existing = rewritten.get(element);
  if (existing) return existing;
  const record: RewrittenElement = {};
  rewritten.set(element, record);
  return record;
}

function recordAttribute(
  record: RewrittenElement,
  attribute: string,
  value: string | null
): void {
  const attributes = record.attributes ?? new Map<string, string | null>();
  record.attributes = attributes;
  if (!attributes.has(attribute)) attributes.set(attribute, value);
}

function cloneContainers(root: ParentNode): Element[] {
  const containers = Array.from(root.querySelectorAll(CLONE_UI_SELECTOR));
  if (root instanceof Element && root.matches(CLONE_UI_SELECTOR)) {
    containers.unshift(root);
  }
  return [...new Set(containers)];
}

function elementsMatching(container: Element, selector: string): Element[] {
  const elements = Array.from(container.querySelectorAll(selector));
  if (container.matches(selector)) elements.unshift(container);
  return elements;
}

function rewriteValueElement(
  element: Element,
  rewritten: Map<Element, RewrittenElement>
): boolean {
  let changed = false;
  for (const attribute of CLONE_VALUE_ATTRIBUTES) {
    const attributeValue = element.getAttribute(attribute);
    const nextValue = attributeValue ? githubSshCloneUrl(attributeValue) : null;
    if (!nextValue) continue;
    const record = recordElement(rewritten, element);
    recordAttribute(record, attribute, attributeValue);
    element.setAttribute(attribute, nextValue);
    changed = true;
  }

  const propertyValue = stringValue(element);
  const rewrittenPropertyValue = propertyValue
    ? githubSshCloneUrl(propertyValue)
    : null;
  if (rewrittenPropertyValue) {
    const record = recordElement(rewritten, element);
    if (!record.propertyValueCaptured) {
      record.propertyValue = propertyValue;
      record.propertyValueCaptured = true;
    }
    setStringValue(element, rewrittenPropertyValue);
    changed = true;
  }

  return changed;
}

function rewriteTextElement(
  element: Element,
  rewritten: Map<Element, RewrittenElement>
): boolean {
  if (element.childElementCount > 0) return false;
  const textContent = element.textContent;
  const rewrittenText = textContent ? githubSshCloneUrl(textContent) : null;
  if (!rewrittenText) return false;
  const record = recordElement(rewritten, element);
  if (!record.textContentCaptured) {
    record.textContent = textContent;
    record.textContentCaptured = true;
  }
  element.textContent = rewrittenText;
  return true;
}

export function rewriteGithubCloneUrlElements(
  root: ParentNode = document,
  rewritten = new Map<Element, RewrittenElement>()
): number {
  let count = 0;
  const processed = new Set<Element>();
  for (const container of cloneContainers(root)) {
    for (const element of elementsMatching(container, CLONE_VALUE_SELECTOR)) {
      if (!processed.has(element) && rewriteValueElement(element, rewritten)) {
        count += 1;
      }
      processed.add(element);
    }
    for (const element of elementsMatching(container, CLONE_TEXT_SELECTOR)) {
      if (!processed.has(element) && rewriteTextElement(element, rewritten)) {
        count += 1;
      }
      processed.add(element);
    }
  }
  return count;
}

function restoreGithubCloneUrlElements(
  rewritten: ReadonlyMap<Element, RewrittenElement>
): void {
  for (const [element, record] of rewritten) {
    for (const [attribute, value] of record.attributes ?? []) {
      if (value === null) {
        element.removeAttribute(attribute);
      } else {
        element.setAttribute(attribute, value);
      }
    }
    if (record.propertyValueCaptured && record.propertyValue !== undefined) {
      setStringValue(element, record.propertyValue);
    }
    if (record.textContentCaptured) {
      element.textContent = record.textContent ?? null;
    }
  }
}

export function startGithubCloneUrlRewrite(): GithubCloneUrlRewriter | null {
  if (!isGithubRepositoryPath(location.hostname, location.pathname)) return null;

  const rewritten = new Map<Element, RewrittenElement>();
  let frameId: number | null = null;
  const refresh = () => {
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }
    rewriteGithubCloneUrlElements(document, rewritten);
  };
  const scheduleRefresh = () => {
    if (frameId !== null) return;
    frameId = window.requestAnimationFrame(() => {
      frameId = null;
      refresh();
    });
  };
  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [...CLONE_VALUE_ATTRIBUTES],
    characterData: true,
    childList: true,
    subtree: true
  });
  scheduleRefresh();

  return {
    refresh,
    dispose() {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      observer.disconnect();
      restoreGithubCloneUrlElements(rewritten);
      rewritten.clear();
    }
  };
}
