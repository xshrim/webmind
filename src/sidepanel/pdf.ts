import {
  GlobalWorkerOptions,
  getDocument
} from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { uiText } from "../shared/i18n";
import type { AppLanguage, PageContext } from "../shared/types";
import { truncateText } from "../shared/utils";

GlobalWorkerOptions.workerSrc = workerUrl;

export async function extractPdfContext(
  url: string,
  maxChars = 120000,
  onProgress?: (page: number, total: number) => void,
  language?: AppLanguage
): Promise<PageContext> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`${uiText(language, "readDocumentFailed")} (${response.status})`);
  }
  const data = new Uint8Array(await response.arrayBuffer());
  return extractPdfDataContext(
    data,
    decodeURIComponent(url.split("/").pop() ?? uiText(language, "pdfDocument")),
    url,
    maxChars,
    onProgress,
    language
  );
}

export async function extractPdfDataContext(
  data: Uint8Array,
  fallbackTitle = "PDF",
  url = "",
  maxChars = 120000,
  onProgress?: (page: number, total: number) => void,
  language?: AppLanguage
): Promise<PageContext> {
  const document = await getDocument({ data }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) pages.push(`[PDF page ${pageNumber}]\n${text}`);
    onProgress?.(pageNumber, document.numPages);
    if (pages.join("\n\n").length >= maxChars * 1.15) break;
  }
  const title =
    document.getMetadata()
      .then((metadata) => {
        const info = metadata.info as { Title?: string };
        return info.Title;
      })
      .catch(() => undefined);
  return {
    kind: "pdf",
    title: (await title) || fallbackTitle,
    url,
    text: truncateText(pages.join("\n\n"), maxChars, language),
    description: `${document.numPages} PDF pages`
  };
}
