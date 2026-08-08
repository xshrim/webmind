import { runtimeRequest } from "../shared/browser";
import type { ImageAttachment } from "../shared/types";

export function imageDataUrlToAttachment(
  dataUrl: string,
  fallbackName: string
): ImageAttachment | null {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/i);
  if (!match) return null;
  return {
    id: crypto.randomUUID(),
    kind: "image",
    name: fallbackName,
    mimeType: match[1],
    dataUrl
  };
}

export async function imageElementToDataUrl(
  image: HTMLImageElement
): Promise<string | null> {
  try {
    if (!image.complete || !image.naturalWidth || !image.naturalHeight) {
      return null;
    }
    const canvas = document.createElement("canvas");
    const scale = Math.min(
      1,
      2048 / Math.max(image.naturalWidth || 1, image.naturalHeight || 1)
    );
    canvas.width = Math.max(
      1,
      Math.round((image.naturalWidth || image.width) * scale)
    );
    canvas.height = Math.max(
      1,
      Math.round((image.naturalHeight || image.height) * scale)
    );
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export async function cropImageFromVisibleCapture(
  image: HTMLImageElement,
  captureDataUrl: string
): Promise<ImageAttachment | null> {
  const screenshot = new Image();
  screenshot.src = captureDataUrl;
  try {
    await screenshot.decode();
  } catch {
    return null;
  }
  const rect = image.getBoundingClientRect();
  const left = Math.max(0, Math.min(window.innerWidth, rect.left));
  const top = Math.max(0, Math.min(window.innerHeight, rect.top));
  const right = Math.max(0, Math.min(window.innerWidth, rect.right));
  const bottom = Math.max(0, Math.min(window.innerHeight, rect.bottom));
  if (right - left < 2 || bottom - top < 2) return null;
  const scaleX = screenshot.naturalWidth / Math.max(1, window.innerWidth);
  const scaleY = screenshot.naturalHeight / Math.max(1, window.innerHeight);
  const sourceX = Math.max(0, Math.round(left * scaleX));
  const sourceY = Math.max(0, Math.round(top * scaleY));
  const sourceWidth = Math.min(
    screenshot.naturalWidth - sourceX,
    Math.max(1, Math.round((right - left) * scaleX))
  );
  const sourceHeight = Math.min(
    screenshot.naturalHeight - sourceY,
    Math.max(1, Math.round((bottom - top) * scaleY))
  );
  if (sourceWidth < 2 || sourceHeight < 2) return null;
  const maxSide = 2048;
  const outputScale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * outputScale));
  canvas.height = Math.max(1, Math.round(sourceHeight * outputScale));
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(
    screenshot,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );
  const dataUrl = canvas.toDataURL("image/png");
  return imageDataUrlToAttachment(dataUrl, imageTextName(image));
}

export function imageHoverRect(image: HTMLImageElement) {
  const rect = image.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height
  };
}

export function imageTextName(image: HTMLImageElement): string {
  const explicit = image.alt.trim() || image.title.trim();
  if (explicit) return explicit;
  try {
    return decodeURIComponent(
      new URL(image.currentSrc || image.src, location.href).pathname.split("/").pop() ||
        "image"
    );
  } catch {
    return "image";
  }
}

export async function imageElementToAttachment(
  image: HTMLImageElement,
  capturePromise?: Promise<{ dataUrl: string } | null>,
  readImageUrlFailedMessage = "Image URL read failed"
): Promise<ImageAttachment> {
  const dataUrl = await imageElementToDataUrl(image);
  if (dataUrl) {
    const attachment = imageDataUrlToAttachment(dataUrl, imageTextName(image));
    if (attachment) return attachment;
  }
  const src = image.currentSrc || image.src;
  let fetchError: unknown = new Error(readImageUrlFailedMessage);
  if (src) {
    try {
      return await runtimeRequest<ImageAttachment>("image.fetchDataUrl", {
        url: src
      });
    } catch (requestError) {
      fetchError = requestError;
    }
  }
  const capture = await capturePromise?.catch(() => null);
  if (capture?.dataUrl) {
    const attachment = await cropImageFromVisibleCapture(image, capture.dataUrl);
    if (attachment) return attachment;
  }
  throw fetchError;
}
