import type { PageTextBlock, PageTranslation } from "./types";
import { chunkItems, mapWithConcurrency } from "./utils";
import { dedupeImmersiveReadingTranslations } from "./immersiveReading";

export interface ImmersiveTranslationBatchProgress {
  batch: PageTextBlock[];
  batchIndex: number;
  processedBefore: number;
  completed: number;
}

export interface ImmersiveTranslationBatchResult
  extends ImmersiveTranslationBatchProgress {
  translations: PageTranslation[];
  applied: number;
}

export interface ImmersiveTranslationWorkflowOptions {
  blocks: PageTextBlock[];
  batchSize: number;
  concurrency: number;
  requestTranslations: (
    requestBlocks: PageTextBlock[]
  ) => Promise<PageTranslation[]>;
  applyTranslations: (translations: PageTranslation[]) => Promise<number> | number;
  invalidTranslationsError: () => Error;
  applyCountMismatchError: () => Error;
  onBatchStart?: (
    progress: ImmersiveTranslationBatchProgress
  ) => Promise<void> | void;
  onBatchApplied?: (
    result: ImmersiveTranslationBatchResult
  ) => Promise<void> | void;
}

export interface ImmersiveTranslationWorkflowResult {
  completed: number;
}

export function orderTranslationsByBlocks(
  translations: PageTranslation[],
  blocks: PageTextBlock[]
): PageTranslation[] {
  const translationById = new Map(
    translations.map((translation) => [translation.id, translation])
  );
  return blocks.flatMap((block) => {
    const translation = translationById.get(block.id);
    return translation ? [translation] : [];
  });
}

async function requestCompleteBatch(
  batch: PageTextBlock[],
  requestTranslations: (
    requestBlocks: PageTextBlock[]
  ) => Promise<PageTranslation[]>,
  invalidTranslationsError: () => Error
): Promise<PageTranslation[]> {
  let translations: PageTranslation[] = [];
  try {
    translations = await requestTranslations(batch);
  } catch (requestError) {
    if (batch.length === 1) throw requestError;
  }
  const translatedIds = new Set(
    translations.map((translation) => translation.id)
  );
  const missingBlocks = batch.filter((block) => !translatedIds.has(block.id));
  if (missingBlocks.length) {
    const retry = await requestTranslations(missingBlocks);
    for (const translation of retry) {
      translations.push(translation);
      translatedIds.add(translation.id);
    }
  }
  if (translations.length !== batch.length) {
    throw invalidTranslationsError();
  }
  return orderTranslationsByBlocks(translations, batch);
}

export async function runImmersiveTranslationWorkflow({
  blocks,
  batchSize,
  concurrency,
  requestTranslations,
  applyTranslations,
  invalidTranslationsError,
  applyCountMismatchError,
  onBatchStart,
  onBatchApplied
}: ImmersiveTranslationWorkflowOptions): Promise<ImmersiveTranslationWorkflowResult> {
  let completed = 0;
  const batches = chunkItems(blocks, batchSize);
  await mapWithConcurrency(batches, concurrency, async (batch, batchIndex) => {
    const processedBefore = batchIndex * batchSize;
    await onBatchStart?.({
      batch,
      batchIndex,
      processedBefore,
      completed
    });
    const translations = await requestCompleteBatch(
      batch,
      requestTranslations,
      invalidTranslationsError
    );
    const applied = await applyTranslations(translations);
    if (applied !== translations.length) {
      throw applyCountMismatchError();
    }
    completed += applied;
    await onBatchApplied?.({
      batch,
      batchIndex,
      processedBefore,
      completed,
      translations,
      applied
    });
  });
  return { completed };
}

export interface ImmersiveReadingModelPageBatchResult {
  batch: PageTextBlock[];
  batchIndex: number;
  processedBefore: number;
  orderedTranslations: PageTranslation[];
  applied: number;
  appliedCount: number;
}

export interface ImmersiveReadingModelPageWorkflowOptions {
  blocks: PageTextBlock[];
  batchSize: number;
  concurrency: number;
  requestTranslations: (
    requestBlocks: PageTextBlock[]
  ) => Promise<PageTranslation[]>;
  applyTranslations: (translations: PageTranslation[]) => Promise<number> | number;
  onBatchApplied?: (
    result: ImmersiveReadingModelPageBatchResult
  ) => Promise<void> | void;
}

export interface ImmersiveReadingModelPageWorkflowResult {
  translations: PageTranslation[];
  appliedCount: number;
}

export async function runImmersiveReadingModelPageWorkflow({
  blocks,
  batchSize,
  concurrency,
  requestTranslations,
  applyTranslations,
  onBatchApplied
}: ImmersiveReadingModelPageWorkflowOptions): Promise<ImmersiveReadingModelPageWorkflowResult> {
  let appliedCount = 0;
  const translations: PageTranslation[] = [];
  const seenSourceKeys = new Set<string>();
  const batches = chunkItems(blocks, batchSize);
  await mapWithConcurrency(batches, concurrency, async (batch, batchIndex) => {
    const batchTranslations = await requestTranslations(batch);
    const orderedTranslations = dedupeImmersiveReadingTranslations(
      orderTranslationsByBlocks(batchTranslations, batch),
      batch,
      seenSourceKeys
    );
    translations.push(...orderedTranslations);
    const applied = await applyTranslations(orderedTranslations);
    appliedCount += applied;
    const processedBefore = batchIndex * batchSize;
    await onBatchApplied?.({
      batch,
      batchIndex,
      processedBefore,
      orderedTranslations,
      applied,
      appliedCount
    });
  });
  return { translations, appliedCount };
}
