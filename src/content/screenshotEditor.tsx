import { createRoot } from "react-dom/client";
import { ScreenshotEditor, type ScreenshotEditorPlacement } from "../sidepanel/ScreenshotEditor";
import type { AppLanguage, ImageAttachment } from "../shared/types";
import { SHADOW_STYLES } from "./styles";

let cancelActiveEditor: (() => void) | null = null;

function validAttachment(attachment: ImageAttachment): boolean {
  return Boolean(
    attachment &&
      attachment.kind === "image" &&
      typeof attachment.dataUrl === "string" &&
      attachment.dataUrl.startsWith("data:image/")
  );
}

export function editScreenshotInPage(
  attachment: ImageAttachment,
  placement: ScreenshotEditorPlacement,
  language?: AppLanguage,
  sourceDataUrl?: string
): Promise<ImageAttachment | null> {
  if (!validAttachment(attachment)) {
    return Promise.reject(new Error("Invalid screenshot attachment"));
  }
  cancelActiveEditor?.();
  return new Promise((resolve) => {
    const host = document.createElement("div");
    host.id = "webmind-screenshot-editor";
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = SHADOW_STYLES;
    const mount = document.createElement("div");
    shadow.append(style, mount);
    document.documentElement.append(host);

    let settled = false;
    let root: ReturnType<typeof createRoot> | null = null;
    const finish = (result: ImageAttachment | null) => {
      if (settled) return;
      settled = true;
      cancelActiveEditor = null;
      root?.unmount();
      host.remove();
      resolve(result);
    };
    const cancel = () => finish(null);
    cancelActiveEditor = cancel;
    root = createRoot(mount);
    root.render(
      <ScreenshotEditor
        attachment={attachment}
        language={language}
        placement={placement}
        sourceDataUrl={sourceDataUrl}
        onCancel={cancel}
        onConfirm={finish}
      />
    );
  });
}
