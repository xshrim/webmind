import { Readability } from "@mozilla/readability";
import { uiText } from "../shared/i18n";
import { requestOriginPermission } from "../shared/browser";
import type { AppLanguage, ImageAttachment } from "../shared/types";
import { truncateText } from "../shared/utils";
import { extractPdfDataContext } from "./pdf";
import { screenshotCrop, type ScreenshotSelection } from "./screenshotCrop";

const TEXT_DOCUMENT_TYPES = new Set([
  "application/json",
  "application/javascript",
  "application/xml",
  "text/css",
  "text/csv",
  "text/html",
  "text/javascript",
  "text/markdown",
  "text/plain",
  "text/xml"
]);

function isTextDocument(file: File): boolean {
  if (file.type.startsWith("text/") || TEXT_DOCUMENT_TYPES.has(file.type)) {
    return true;
  }
  return /\.(csv|css|html?|js|json|jsx|log|md|py|ts|tsx|txt|xml|yaml|yml)$/i.test(
    file.name
  );
}

function readFileAsDataUrl(file: File, language?: AppLanguage): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(uiText(language, "readFileFailed")));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File, language?: AppLanguage): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(uiText(language, "readDocumentFailed")));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(file);
  });
}

export async function screenshotToAttachment(
  captureDataUrl: string,
  selection: ScreenshotSelection
): Promise<ImageAttachment> {
  const image = new Image();
  image.src = captureDataUrl;
  await image.decode();
  const crop = screenshotCrop(image.naturalWidth, image.naturalHeight, selection);
  const canvas = document.createElement("canvas");
  canvas.width = crop.outputWidth;
  canvas.height = crop.outputHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create screenshot canvas");
  context.drawImage(
    image,
    crop.sourceX,
    crop.sourceY,
    crop.sourceWidth,
    crop.sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return {
    id: crypto.randomUUID(),
    kind: "image",
    name: "screenshot.png",
    mimeType: "image/png",
    dataUrl: canvas.toDataURL("image/png")
  };
}

export async function fileToAttachment(
  file: File,
  language?: AppLanguage
): Promise<ImageAttachment> {
  if (file.type.startsWith("image/")) {
    return {
      id: crypto.randomUUID(),
      kind: "image",
      name: file.name,
      mimeType: file.type || "image/png",
      dataUrl: await readFileAsDataUrl(file, language)
    };
  }
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    const context = await extractPdfDataContext(
      new Uint8Array(await file.arrayBuffer()),
      file.name,
      "",
      60000,
      undefined,
      language
    );
    return {
      id: crypto.randomUUID(),
      kind: "document",
      name: file.name,
      mimeType: file.type || "application/pdf",
      text: context.text
    };
  }
  if (isTextDocument(file)) {
    return {
      id: crypto.randomUUID(),
      kind: "document",
      name: file.name,
      mimeType: file.type || "text/plain",
      text: truncateText(await readFileAsText(file, language), 60000, language)
    };
  }
  return {
    id: crypto.randomUUID(),
    kind: "document",
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    text: [
      `${uiText(language, "documentName")}：${file.name}`,
      `${uiText(language, "typeLabel")}：${file.type || uiText(language, "unknownFileType")}`,
      `${uiText(language, "sizeLabel")}：${file.size} ${uiText(language, "bytes")}`,
      "",
      uiText(language, "unsupportedDocumentText")
    ].join("\n")
  };
}

export async function urlToAttachment(
  url: string,
  language?: AppLanguage
): Promise<ImageAttachment> {
  await requestOriginPermission(url);
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`${uiText(language, "readImageUrlFailed")} (${response.status})`);
  }
  const blob = await response.blob();
  const file = new File(
    [blob],
    decodeURIComponent(new URL(url).pathname.split("/").pop() || "image"),
    { type: blob.type || "image/png" }
  );
  return fileToAttachment(file, language);
}

export async function urlToTextAttachment(
  rawUrl: string,
  language?: AppLanguage
): Promise<ImageAttachment> {
  const url = new URL(rawUrl).toString();
  await requestOriginPermission(url);
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`${uiText(language, "readUrlFailed")} (${response.status})`);
  }
  const mimeType = response.headers.get("content-type")?.split(";")[0] || "text/plain";
  if (mimeType.startsWith("image/")) {
    const blob = await response.blob();
    return fileToAttachment(
      new File([blob], decodeURIComponent(new URL(url).pathname.split("/").pop() || "image"), {
        type: mimeType
      }),
      language
    );
  }
  if (mimeType === "application/pdf" || new URL(url).pathname.endsWith(".pdf")) {
    const context = await extractPdfDataContext(
      new Uint8Array(await response.arrayBuffer()),
      decodeURIComponent(new URL(url).pathname.split("/").pop() || uiText(language, "pdfDocument")),
      url,
      60000,
      undefined,
      language
    );
    return {
      id: crypto.randomUUID(),
      kind: "url",
      name: context.title,
      mimeType,
      url,
      text: context.text
    };
  }
  const rawText = await response.text();
  let text = rawText;
  if (mimeType === "text/html" || /<\/?[a-z][\s\S]*>/i.test(rawText)) {
    const document = new DOMParser().parseFromString(rawText, "text/html");
    document
      .querySelectorAll("script, style, noscript, svg, canvas")
      .forEach((node) => node.remove());
    const article = new Readability(document, { charThreshold: 80 }).parse();
    text =
      article?.textContent?.replace(/\s+/g, " ").trim() ||
      document.body?.textContent?.replace(/\s+/g, " ").trim() ||
      rawText;
  }
  text = truncateText(text, 60000, language);
  return {
    id: crypto.randomUUID(),
    kind: "url",
    name: new URL(url).hostname,
    mimeType,
    url,
    text
  };
}
