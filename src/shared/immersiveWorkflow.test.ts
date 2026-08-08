import { describe, expect, it } from "vitest";
import type { PageTextBlock, PageTranslation } from "./types";
import {
  orderTranslationsByBlocks,
  runImmersiveReadingModelPageWorkflow,
  runImmersiveTranslationWorkflow
} from "./immersiveWorkflow";

const blocks: PageTextBlock[] = [
  { id: "a", text: "Alpha" },
  { id: "b", text: "Beta" },
  { id: "c", text: "Gamma" }
];

describe("immersive workflow", () => {
  it("orders translations by the collected block plan", () => {
    expect(
      orderTranslationsByBlocks(
        [
          { id: "c", text: "三" },
          { id: "a", text: "一" }
        ],
        blocks
      )
    ).toEqual([
      { id: "a", text: "一" },
      { id: "c", text: "三" }
    ]);
  });

  it("retries missing translation blocks before applying a batch", async () => {
    const calls: string[][] = [];
    const appliedBatches: PageTranslation[][] = [];

    const result = await runImmersiveTranslationWorkflow({
      blocks,
      batchSize: 2,
      concurrency: 1,
      requestTranslations: async (requestBlocks) => {
        calls.push(requestBlocks.map((block) => block.id));
        if (requestBlocks.map((block) => block.id).join(",") === "a,b") {
          return [{ id: "b", text: "二" }];
        }
        return requestBlocks.map((block) => ({
          id: block.id,
          text: `译文 ${block.id}`
        }));
      },
      applyTranslations: (translations) => {
        appliedBatches.push(translations);
        return translations.length;
      },
      invalidTranslationsError: () => new Error("invalid"),
      applyCountMismatchError: () => new Error("apply failed")
    });

    expect(result.completed).toBe(3);
    expect(calls).toEqual([["a", "b"], ["a"], ["c"]]);
    expect(appliedBatches).toEqual([
      [
        { id: "a", text: "译文 a" },
        { id: "b", text: "二" }
      ],
      [{ id: "c", text: "译文 c" }]
    ]);
  });

  it("dedupes immersive reading markers across model-page batches", async () => {
    const appliedTexts: string[] = [];
    const result = await runImmersiveReadingModelPageWorkflow({
      blocks: [
        { id: "a", text: "motive" },
        { id: "b", text: "motive again" }
      ],
      batchSize: 1,
      concurrency: 1,
      requestTranslations: async (requestBlocks) =>
        requestBlocks.map((block) => ({
          id: block.id,
          text: `read [[WEBMIND_READING|motive|动机|3]]`
        })),
      applyTranslations: (translations) => {
        appliedTexts.push(...translations.map((translation) => translation.text));
        return translations.length;
      }
    });

    expect(result.appliedCount).toBe(2);
    expect(result.translations.map((translation) => translation.text)).toEqual([
      "read [[WEBMIND_READING|motive|动机|3]]",
      "read motive"
    ]);
    expect(appliedTexts).toEqual([
      "read [[WEBMIND_READING|motive|动机|3]]",
      "read motive"
    ]);
  });
});
