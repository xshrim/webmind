import { describe, expect, it } from "vitest";
import type { PageTextBlock, PageTranslation } from "./types";
import {
  classifyImmersiveWorkflowError,
  createImmersiveRunState,
  createImmersiveWorkflowSummary,
  formatImmersiveWorkflowLog,
  immersiveReadingModelBatchAppliedProgress,
  immersiveTranslationBatchAppliedProgress,
  immersiveTranslationBatchStartProgress,
  immersiveWorkflowCollectingProgress,
  immersiveWorkflowCompleteProgress,
  immersiveWorkflowErrorProgress,
  immersiveWorkflowReadyProgress,
  immersiveWorkflowRunningProgress,
  isImmersiveWorkflowCancelledError,
  orderTranslationsByBlocks,
  runImmersiveReadingFinalApplyWorkflow,
  runImmersiveReadingLocalFirstWorkflow,
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
    expect(result.summary).toEqual({
      totalBlocks: 3,
      requestedBlocks: 4,
      translatedBlocks: 3,
      appliedBlocks: 3,
      skippedBlocks: 0
    });
    expect(calls).toEqual([["a", "b"], ["a"], ["c"]]);
    expect(appliedBatches).toEqual([
      [
        { id: "a", text: "译文 a" },
        { id: "b", text: "二" }
      ],
      [{ id: "c", text: "译文 c" }]
    ]);
  });

  it("applies the first translation batch before starting concurrent remainder", async () => {
    const appliedOrder: string[] = [];
    const result = await runImmersiveTranslationWorkflow({
      blocks,
      batchSize: 1,
      concurrency: 3,
      requestTranslations: async (requestBlocks) => {
        if (requestBlocks[0]?.id === "a") {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        return requestBlocks.map((block) => ({
          id: block.id,
          text: `译文 ${block.id}`
        }));
      },
      applyTranslations: (translations) => {
        appliedOrder.push(...translations.map((translation) => translation.id));
        return translations.length;
      },
      invalidTranslationsError: () => new Error("invalid"),
      applyCountMismatchError: () => new Error("apply failed")
    });

    expect(result.completed).toBe(3);
    expect(appliedOrder[0]).toBe("a");
    expect(appliedOrder).toEqual(["a", "b", "c"]);
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
    expect(result.summary).toEqual({
      totalBlocks: 2,
      requestedBlocks: 2,
      translatedBlocks: 2,
      appliedBlocks: 2,
      skippedBlocks: 0
    });
    expect(result.translations.map((translation) => translation.text)).toEqual([
      "read [[WEBMIND_READING|motive|动机|3]]",
      "read motive"
    ]);
    expect(appliedTexts).toEqual([
      "read [[WEBMIND_READING|motive|动机|3]]",
      "read motive"
    ]);
  });

  it("runs local-first immersive reading planning with best-effort fallback", async () => {
    const events: string[] = [];
    const result = await runImmersiveReadingLocalFirstWorkflow({
      blocks,
      buildPlan: async (requestBlocks) => {
        events.push(`plan:${requestBlocks.length}`);
        return {
          blocks: requestBlocks.map((block) => ({
            id: block.id,
            text: block.text,
            family: "en",
            targetFamily: "zh",
            spans: []
          })),
          fallbackTerms: [
            {
              key: "alpha",
              source: "Alpha",
              context: "Alpha",
              family: "en",
              targetFamily: "zh"
            }
          ]
        };
      },
      requestFallbackTranslations: async (terms) => {
        events.push(`fallback:${terms.length}`);
        return [{ key: terms[0]?.key, translation: "阿尔法" }];
      },
      finalizePlan: async (planBlocks, fallbackTranslations) => {
        events.push(`finalize:${fallbackTranslations.length}`);
        return planBlocks.map((block) => ({
          id: block.id,
          text: `${block.text}:${fallbackTranslations.length}`
        }));
      }
    });

    expect(events).toEqual(["plan:3", "fallback:1", "finalize:1"]);
    expect(result.fallbackTranslations).toEqual([
      { key: "alpha", translation: "阿尔法" }
    ]);
    expect(result.translations).toHaveLength(3);
    expect(result.summary).toEqual({
      totalBlocks: 3,
      requestedBlocks: 3,
      translatedBlocks: 3,
      appliedBlocks: 0,
      skippedBlocks: 3
    });
  });

  it("orders and summarizes final immersive reading application", async () => {
    const applied: PageTranslation[][] = [];
    const result = await runImmersiveReadingFinalApplyWorkflow({
      blocks,
      translations: [
        { id: "c", text: "三" },
        { id: "a", text: "一" }
      ],
      summary: createImmersiveWorkflowSummary({
        totalBlocks: 3,
        requestedBlocks: 3,
        translatedBlocks: 2,
        appliedBlocks: 0
      }),
      applyTranslations: (orderedTranslations) => {
        applied.push(orderedTranslations);
        return orderedTranslations.length;
      }
    });

    expect(result.translations).toEqual([
      { id: "a", text: "一" },
      { id: "c", text: "三" }
    ]);
    expect(applied).toEqual([result.translations]);
    expect(result.appliedCount).toBe(2);
    expect(result.summary).toEqual({
      totalBlocks: 3,
      requestedBlocks: 3,
      translatedBlocks: 2,
      appliedBlocks: 2,
      skippedBlocks: 1
    });
  });

  it("stops before applying when a workflow is cancelled", async () => {
    const controller = new AbortController();
    try {
      await runImmersiveReadingFinalApplyWorkflow({
        blocks,
        translations: [{ id: "a", text: "一" }],
        summary: createImmersiveWorkflowSummary({
          totalBlocks: 3,
          requestedBlocks: 3,
          translatedBlocks: 1,
          appliedBlocks: 0
        }),
        signal: controller.signal,
        onApplyStart: () => controller.abort(),
        applyTranslations: () => {
          throw new Error("should not apply");
        }
      });
      throw new Error("expected cancellation");
    } catch (error) {
      expect(isImmersiveWorkflowCancelledError(error)).toBe(true);
    }
  });

  it("builds consistent workflow progress updates", () => {
    expect(immersiveWorkflowCollectingProgress("collect")).toEqual({
      percent: 3,
      label: "collect",
      active: true,
      error: false
    });
    expect(immersiveWorkflowReadyProgress(3, "reading")).toEqual({
      percent: 8,
      label: "reading 3/3",
      active: true,
      error: false
    });
    expect(immersiveWorkflowRunningProgress(18.4, "fallback 4")).toEqual({
      percent: 18,
      label: "fallback 4",
      active: true,
      error: false
    });
    expect(
      immersiveTranslationBatchStartProgress(
        { batch: blocks.slice(1), processedBefore: 1 },
        3,
        "translating"
      )
    ).toEqual({
      percent: 36,
      label: "translating 3/3",
      active: true,
      error: false
    });
    expect(immersiveTranslationBatchAppliedProgress(2, 3, "applied")).toEqual({
      percent: 66,
      label: "applied 2",
      active: true,
      error: false
    });
    expect(
      immersiveReadingModelBatchAppliedProgress(
        { batch: blocks.slice(1), processedBefore: 1, appliedCount: 2 },
        3,
        "reading applied"
      )
    ).toEqual({
      percent: 97,
      label: "reading applied 2",
      active: true,
      error: false
    });
    expect(immersiveWorkflowCompleteProgress("done")).toEqual({
      percent: 100,
      label: "done",
      active: false,
      error: false
    });
    expect(immersiveWorkflowErrorProgress("failed")).toEqual({
      percent: 100,
      label: "failed",
      active: false,
      error: true
    });
  });

  it("builds shared run states and workflow log lines", () => {
    expect(
      createImmersiveWorkflowSummary({
        totalBlocks: 5,
        requestedBlocks: 7,
        translatedBlocks: 4,
        appliedBlocks: 3
      })
    ).toEqual({
      totalBlocks: 5,
      requestedBlocks: 7,
      translatedBlocks: 4,
      appliedBlocks: 3,
      skippedBlocks: 2
    });
    expect(
      createImmersiveRunState("reading", "article", "applying", {
        totalBlocks: 8,
        appliedBlocks: 5
      })
    ).toEqual({
      kind: "reading",
      scope: "article",
      phase: "applying",
      totalBlocks: 8,
      appliedBlocks: 5
    });
    expect(
      formatImmersiveWorkflowLog(
        "immersive reading",
        "blocks_collected",
        { scope: "article", blocks: 8 },
        { surface: "edge" }
      )
    ).toBe("[workflow] immersive reading edge blocks-collected scope=article blocks=8");
  });

  it("classifies workflow errors without changing their messages", () => {
    expect(
      classifyImmersiveWorkflowError("No model", {
        missingProfile: "No model"
      })
    ).toEqual({ code: "missing-profile", message: "No model" });
    expect(
      classifyImmersiveWorkflowError("No blocks", {
        emptyContext: "No blocks"
      })
    ).toEqual({ code: "empty-context", message: "No blocks" });
    expect(
      classifyImmersiveWorkflowError("Invalid JSON", {
        modelResponseInvalid: "Invalid JSON"
      })
    ).toEqual({
      code: "model-response-invalid",
      message: "Invalid JSON"
    });
    expect(
      classifyImmersiveWorkflowError("Write failed", {
        applyFailed: "Write failed"
      })
    ).toEqual({ code: "apply-failed", message: "Write failed" });
    expect(classifyImmersiveWorkflowError("Network failed")).toEqual({
      code: "runtime-failed",
      message: "Network failed"
    });
  });
});
