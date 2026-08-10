import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TOOLTIP_ATTRIBUTE = "data-webmind-tooltip";
const TOOLTIP_ID = "webmind-app-tooltip";

interface TooltipState {
  target: Element;
  text: string;
}

interface TooltipPosition {
  left: number;
  top: number;
}

function tooltipTarget(node: EventTarget | null): Element | null {
  return node instanceof Element
    ? node.closest(`[${TOOLTIP_ATTRIBUTE}]`)
    : null;
}

function migrateNativeTitle(element: Element): void {
  const title = element.getAttribute("title")?.trim();
  if (!title) return;
  element.setAttribute(TOOLTIP_ATTRIBUTE, title);
  element.removeAttribute("title");
}

function migrateTitles(root: ParentNode): void {
  if (root instanceof Element && root.hasAttribute("title")) {
    migrateNativeTitle(root);
  }
  root.querySelectorAll?.("[title]").forEach(migrateNativeTitle);
}

export function TooltipLayer() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const tooltipElementRef = useRef<HTMLDivElement | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const hoverTargetRef = useRef<Element | null>(null);
  const describedTargetRef = useRef<{
    element: Element;
    previous: string | null;
  } | null>(null);

  const clearShowTimer = () => {
    if (showTimerRef.current === null) return;
    window.clearTimeout(showTimerRef.current);
    showTimerRef.current = null;
  };

  const clearDescription = () => {
    const described = describedTargetRef.current;
    if (!described) return;
    if (described.previous === null) {
      described.element.removeAttribute("aria-describedby");
    } else {
      described.element.setAttribute("aria-describedby", described.previous);
    }
    describedTargetRef.current = null;
  };

  const hideTooltip = () => {
    clearShowTimer();
    hoverTargetRef.current = null;
    clearDescription();
    setTooltip(null);
    setPosition(null);
  };

  const showTooltip = (target: Element, immediate: boolean) => {
    const text = target.getAttribute(TOOLTIP_ATTRIBUTE)?.trim();
    if (!text) return;
    clearShowTimer();
    const show = () => {
      if (!target.isConnected) return;
      clearDescription();
      const previous = target.getAttribute("aria-describedby");
      target.setAttribute(
        "aria-describedby",
        [previous, TOOLTIP_ID].filter(Boolean).join(" ")
      );
      describedTargetRef.current = { element: target, previous };
      setPosition(null);
      setTooltip({ target, text });
    };
    if (immediate) {
      show();
    } else {
      showTimerRef.current = window.setTimeout(show, 320);
    }
  };

  useLayoutEffect(() => {
    migrateTitles(document);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          migrateNativeTitle(mutation.target);
          return;
        }
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) migrateTitles(node);
        });
      });
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["title"]
    });

    const onMouseOver = (event: MouseEvent) => {
      const target = tooltipTarget(event.target);
      if (!target || target === hoverTargetRef.current) return;
      hoverTargetRef.current = target;
      showTooltip(target, false);
    };
    const onMouseOut = (event: MouseEvent) => {
      const target = tooltipTarget(event.target);
      if (!target) return;
      const related = event.relatedTarget;
      if (related instanceof Node && target.contains(related)) return;
      hideTooltip();
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = tooltipTarget(event.target);
      if (target) showTooltip(target, true);
    };
    const onFocusOut = (event: FocusEvent) => {
      const target = tooltipTarget(event.target);
      if (target) hideTooltip();
    };
    const onViewportChange = () => hideTooltip();

    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
      clearShowTimer();
      clearDescription();
      document.querySelectorAll(`[${TOOLTIP_ATTRIBUTE}]`).forEach((element) => {
        const text = element.getAttribute(TOOLTIP_ATTRIBUTE);
        if (text && !element.hasAttribute("title")) {
          element.setAttribute("title", text);
        }
        element.removeAttribute(TOOLTIP_ATTRIBUTE);
      });
    };
  }, []);

  useLayoutEffect(() => {
    const element = tooltipElementRef.current;
    if (!tooltip || !element || !tooltip.target.isConnected) return;
    const targetRect = tooltip.target.getBoundingClientRect();
    const tooltipRect = element.getBoundingClientRect();
    const margin = 8;
    const gap = 6;
    const left = Math.min(
      window.innerWidth - tooltipRect.width - margin,
      Math.max(margin, targetRect.left + targetRect.width / 2 - tooltipRect.width / 2)
    );
    const below = targetRect.bottom + gap;
    const top =
      below + tooltipRect.height <= window.innerHeight - margin
        ? below
        : Math.max(margin, targetRect.top - tooltipRect.height - gap);
    setPosition({ left, top });
  }, [tooltip]);

  if (!tooltip) return null;
  return createPortal(
    <div
      ref={tooltipElementRef}
      id={TOOLTIP_ID}
      className="app-tooltip"
      role="tooltip"
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        visibility: position ? "visible" : "hidden"
      }}
    >
      {tooltip.text}
    </div>,
    document.body
  );
}
