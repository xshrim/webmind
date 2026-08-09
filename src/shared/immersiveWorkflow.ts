import type { PageTextBlock, PageTranslation } from "./types";
import { chunkItems, mapWithConcurrency } from "./utils";
import {
  dedupeImmersiveReadingTranslations,
  type ReadingFallbackTerm,
  type ReadingFallbackTranslation,
  type ReadingLocalPlan
} from "./immersiveReading";

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
  signal?: AbortSignal;
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
  summary: ImmersiveWorkflowSummary;
}

export interface ImmersiveWorkflowSummary {
  totalBlocks: number;
  requestedBlocks: number;
  translatedBlocks: number;
  appliedBlocks: number;
  skippedBlocks: number;
}

export type ImmersiveWorkflowErrorCode =
  | "missing-profile"
  | "empty-context"
  | "model-response-invalid"
  | "apply-failed"
  | "runtime-failed"
  | "unknown";

export interface ImmersiveWorkflowErrorLabels {
  missingProfile?: string;
  emptyContext?: string;
  modelResponseInvalid?: string;
  applyFailed?: string;
}

export interface ImmersiveWorkflowErrorInfo {
  code: ImmersiveWorkflowErrorCode;
  message: string;
}

export function createImmersiveWorkflowSummary({
  totalBlocks,
  requestedBlocks,
  translatedBlocks,
  appliedBlocks
}: Omit<ImmersiveWorkflowSummary, "skippedBlocks">): ImmersiveWorkflowSummary {
  return {
    totalBlocks,
    requestedBlocks,
    translatedBlocks,
    appliedBlocks,
    skippedBlocks: Math.max(0, totalBlocks - appliedBlocks)
  };
}

export function classifyImmersiveWorkflowError(
  message: string,
  labels: ImmersiveWorkflowErrorLabels = {}
): ImmersiveWorkflowErrorInfo {
  if (labels.missingProfile && message === labels.missingProfile) {
    return { code: "missing-profile", message };
  }
  if (labels.emptyContext && message === labels.emptyContext) {
    return { code: "empty-context", message };
  }
  if (labels.modelResponseInvalid && message === labels.modelResponseInvalid) {
    return { code: "model-response-invalid", message };
  }
  if (labels.applyFailed && message === labels.applyFailed) {
    return { code: "apply-failed", message };
  }
  return {
    code: message ? "runtime-failed" : "unknown",
    message
  };
}

export class ImmersiveWorkflowCancelledError extends Error {
  constructor(message = "Immersive workflow cancelled") {
    super(message);
    this.name = "ImmersiveWorkflowCancelledError";
  }
}

export function assertImmersiveWorkflowNotCancelled(
  signal?: AbortSignal
): void {
  if (signal?.aborted) {
    throw new ImmersiveWorkflowCancelledError();
  }
}

export function isImmersiveWorkflowCancelledError(error: unknown): boolean {
  return error instanceof ImmersiveWorkflowCancelledError;
}

export interface ImmersiveWorkflowProgressUpdate {
  percent: number;
  label: string;
  active: boolean;
  error: boolean;
}

export type ImmersiveWorkflowKind = "translation" | "reading";
export type ImmersiveWorkflowScope =
  | "page"
  | "article"
  | "selection"
  | "paragraph";
export type ImmersiveWorkflowPhase =
  | "idle"
  | "collecting"
  | "requesting"
  | "applying"
  | "completed"
  | "failed"
  | "restoring"
  | "restored";

export interface ImmersiveRunState {
  kind: ImmersiveWorkflowKind;
  scope: ImmersiveWorkflowScope;
  phase: ImmersiveWorkflowPhase;
  totalBlocks?: number;
  appliedBlocks?: number;
  message?: string;
  error?: string;
}

export type ImmersiveWorkflowLogEvent =
  | "start"
  | "collect_blocks"
  | "blocks_collected"
  | "strategy_selected"
  | "model_page_request"
  | "model_page_aligned"
  | "local_first_plan_start"
  | "local_first_plan_ready"
  | "local_first_fallback_request"
  | "local_first_fallback_complete"
  | "local_first_fallback_failed"
  | "local_first_fallback_skipped"
  | "local_first_finalize"
  | "local_first_finalized"
  | "applied"
  | "complete"
  | "error"
  | "cancelled"
  | "restore"
  | "restored"
  | "restore_error";

export interface ImmersiveWorkflowLogDetails {
  scope?: ImmersiveWorkflowScope | string;
  blocks?: number;
  translations?: number;
  fallbackTerms?: number;
  strategy?: string;
  difficulty?: number;
  model?: string;
  applied?: number;
  total?: number;
  code?: string;
  error?: string;
}

const WORKFLOW_COLLECT_PERCENT = 3;
const WORKFLOW_READY_PERCENT = 8;
const WORKFLOW_PROGRESS_RANGE = 92;
const WORKFLOW_PROGRESS_OFFSET = 5;

function clampPercent(percent: number): number {
  return Math.max(0, Math.min(100, Math.round(percent)));
}

function runningProgress(
  percent: number,
  label: string
): ImmersiveWorkflowProgressUpdate {
  return {
    percent: clampPercent(percent),
    label,
    active: true,
    error: false
  };
}

export function createImmersiveRunState(
  kind: ImmersiveWorkflowKind,
  scope: ImmersiveWorkflowScope,
  phase: ImmersiveWorkflowPhase,
  details: Omit<ImmersiveRunState, "kind" | "scope" | "phase"> = {}
): ImmersiveRunState {
  return {
    kind,
    scope,
    phase,
    ...details
  };
}

function workflowLogDetailText(details: ImmersiveWorkflowLogDetails): string {
  return Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
}

export function formatImmersiveWorkflowLog(
  workflowLabel: string,
  event: ImmersiveWorkflowLogEvent,
  details: ImmersiveWorkflowLogDetails = {},
  options: { surface?: string } = {}
): string {
  const subject = [workflowLabel, options.surface].filter(Boolean).join(" ");
  const eventText = event.replaceAll("_", "-");
  const detailText = workflowLogDetailText(details);
  return `[workflow] ${subject} ${eventText}${
    detailText ? ` ${detailText}` : ""
  }`;
}

export function immersiveWorkflowRunningProgress(
  percent: number,
  label: string
): ImmersiveWorkflowProgressUpdate {
  return runningProgress(percent, label);
}

export function immersiveWorkflowCollectingProgress(
  label: string
): ImmersiveWorkflowProgressUpdate {
  return runningProgress(WORKFLOW_COLLECT_PERCENT, label);
}

export function immersiveWorkflowReadyProgress(
  total: number,
  label: string
): ImmersiveWorkflowProgressUpdate {
  return runningProgress(WORKFLOW_READY_PERCENT, `${label} ${total}/${total}`);
}

export function immersiveTranslationBatchStartProgress(
  progress: Pick<
    ImmersiveTranslationBatchProgress,
    "batch" | "processedBefore"
  >,
  total: number,
  label: string
): ImmersiveWorkflowProgressUpdate {
  const current = Math.min(
    progress.processedBefore + progress.batch.length,
    total
  );
  return runningProgress(
    (progress.processedBefore / total) * WORKFLOW_PROGRESS_RANGE +
      WORKFLOW_PROGRESS_OFFSET,
    `${label} ${current}/${total}`
  );
}

export function immersiveTranslationBatchAppliedProgress(
  completed: number,
  total: number,
  label: string
): ImmersiveWorkflowProgressUpdate {
  return runningProgress(
    (Math.min(completed, total) / total) * WORKFLOW_PROGRESS_RANGE +
      WORKFLOW_PROGRESS_OFFSET,
    `${label} ${completed}`
  );
}

export function immersiveReadingModelBatchAppliedProgress(
  progress: Pick<
    ImmersiveReadingModelPageBatchResult,
    "batch" | "processedBefore" | "appliedCount"
  >,
  total: number,
  label: string
): ImmersiveWorkflowProgressUpdate {
  const current = Math.min(
    progress.processedBefore + progress.batch.length,
    total
  );
  return runningProgress(
    (current / total) * WORKFLOW_PROGRESS_RANGE + WORKFLOW_PROGRESS_OFFSET,
    `${label} ${progress.appliedCount}`
  );
}

export function immersiveWorkflowCompleteProgress(
  label: string
): ImmersiveWorkflowProgressUpdate {
  return {
    percent: 100,
    label,
    active: false,
    error: false
  };
}

export function immersiveWorkflowErrorProgress(
  label: string
): ImmersiveWorkflowProgressUpdate {
  return {
    percent: 100,
    label,
    active: false,
    error: true
  };
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

interface CompleteBatchRequestResult {
  translations: PageTranslation[];
  requestedBlocks: number;
}

async function requestCompleteBatch(
  batch: PageTextBlock[],
  requestTranslations: (
    requestBlocks: PageTextBlock[]
  ) => Promise<PageTranslation[]>,
  invalidTranslationsError: () => Error
): Promise<CompleteBatchRequestResult> {
  let translations: PageTranslation[] = [];
  let requestedBlocks = batch.length;
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
    requestedBlocks += missingBlocks.length;
    const retry = await requestTranslations(missingBlocks);
    for (const translation of retry) {
      translations.push(translation);
      translatedIds.add(translation.id);
    }
  }
  if (translations.length !== batch.length) {
    throw invalidTranslationsError();
  }
  return {
    translations: orderTranslationsByBlocks(translations, batch),
    requestedBlocks
  };
}

export async function runImmersiveTranslationWorkflow({
  blocks,
  batchSize,
  concurrency,
  signal,
  requestTranslations,
  applyTranslations,
  invalidTranslationsError,
  applyCountMismatchError,
  onBatchStart,
  onBatchApplied
}: ImmersiveTranslationWorkflowOptions): Promise<ImmersiveTranslationWorkflowResult> {
  let completed = 0;
  let requestedBlocks = 0;
  let translatedBlocks = 0;
  const batches = chunkItems(blocks, batchSize);
  const processBatch = async (batch: PageTextBlock[], batchIndex: number) => {
    assertImmersiveWorkflowNotCancelled(signal);
    const processedBefore = batchIndex * batchSize;
    await onBatchStart?.({
      batch,
      batchIndex,
      processedBefore,
      completed
    });
    const result = await requestCompleteBatch(
      batch,
      requestTranslations,
      invalidTranslationsError
    );
    assertImmersiveWorkflowNotCancelled(signal);
    requestedBlocks += result.requestedBlocks;
    const translations = result.translations;
    translatedBlocks += translations.length;
    assertImmersiveWorkflowNotCancelled(signal);
    const applied = await applyTranslations(translations);
    assertImmersiveWorkflowNotCancelled(signal);
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
  };
  if (batches[0]) {
    await processBatch(batches[0], 0);
  }
  await mapWithConcurrency(
    batches.slice(1),
    concurrency,
    async (batch, batchIndex) => {
      await processBatch(batch, batchIndex + 1);
    }
  );
  return {
    completed,
    summary: createImmersiveWorkflowSummary({
      totalBlocks: blocks.length,
      requestedBlocks,
      translatedBlocks,
      appliedBlocks: completed
    })
  };
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
  signal?: AbortSignal;
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
  summary: ImmersiveWorkflowSummary;
}

export interface ImmersiveReadingLocalFirstWorkflowOptions {
  blocks: PageTextBlock[];
  signal?: AbortSignal;
  buildPlan: (blocks: PageTextBlock[]) => Promise<ReadingLocalPlan>;
  requestFallbackTranslations?: (
    terms: ReadingFallbackTerm[]
  ) => Promise<ReadingFallbackTranslation[]>;
  finalizePlan: (
    blocks: ReadingLocalPlan["blocks"],
    fallbackTranslations: ReadingFallbackTranslation[]
  ) => Promise<PageTranslation[]> | PageTranslation[];
  onPlanStart?: () => Promise<void> | void;
  onPlanReady?: (plan: ReadingLocalPlan) => Promise<void> | void;
  onFallbackRequest?: (
    terms: ReadingFallbackTerm[]
  ) => Promise<void> | void;
  onFallbackComplete?: (
    translations: ReadingFallbackTranslation[]
  ) => Promise<void> | void;
  onFallbackFailed?: (error: unknown) => Promise<void> | void;
  onFallbackSkipped?: (
    terms: ReadingFallbackTerm[]
  ) => Promise<void> | void;
  onFinalize?: (
    plan: ReadingLocalPlan,
    fallbackTranslations: ReadingFallbackTranslation[]
  ) => Promise<void> | void;
  onFinalized?: (translations: PageTranslation[]) => Promise<void> | void;
}

export interface ImmersiveReadingLocalFirstWorkflowResult {
  plan: ReadingLocalPlan;
  fallbackTranslations: ReadingFallbackTranslation[];
  translations: PageTranslation[];
  summary: ImmersiveWorkflowSummary;
}

export interface ImmersiveReadingFinalApplyWorkflowOptions {
  blocks: PageTextBlock[];
  translations: PageTranslation[];
  summary: ImmersiveWorkflowSummary;
  signal?: AbortSignal;
  applyTranslations: (translations: PageTranslation[]) => Promise<number> | number;
  onApplyStart?: (translations: PageTranslation[]) => Promise<void> | void;
  onApplied?: (appliedCount: number) => Promise<void> | void;
}

export interface ImmersiveReadingFinalApplyWorkflowResult {
  translations: PageTranslation[];
  appliedCount: number;
  summary: ImmersiveWorkflowSummary;
}

export async function runImmersiveReadingModelPageWorkflow({
  blocks,
  batchSize,
  concurrency,
  signal,
  requestTranslations,
  applyTranslations,
  onBatchApplied
}: ImmersiveReadingModelPageWorkflowOptions): Promise<ImmersiveReadingModelPageWorkflowResult> {
  let appliedCount = 0;
  let requestedBlocks = 0;
  const translations: PageTranslation[] = [];
  const seenSourceKeys = new Set<string>();
  const batches = chunkItems(blocks, batchSize);
  const processBatch = async (batch: PageTextBlock[], batchIndex: number) => {
    assertImmersiveWorkflowNotCancelled(signal);
    requestedBlocks += batch.length;
    const batchTranslations = await requestTranslations(batch);
    assertImmersiveWorkflowNotCancelled(signal);
    const orderedTranslations = dedupeImmersiveReadingTranslations(
      orderTranslationsByBlocks(batchTranslations, batch),
      batch,
      seenSourceKeys
    );
    translations.push(...orderedTranslations);
    assertImmersiveWorkflowNotCancelled(signal);
    const applied = await applyTranslations(orderedTranslations);
    assertImmersiveWorkflowNotCancelled(signal);
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
  };
  if (batches[0]) {
    await processBatch(batches[0], 0);
  }
  await mapWithConcurrency(
    batches.slice(1),
    concurrency,
    async (batch, batchIndex) => {
      await processBatch(batch, batchIndex + 1);
    }
  );
  return {
    translations,
    appliedCount,
    summary: createImmersiveWorkflowSummary({
      totalBlocks: blocks.length,
      requestedBlocks,
      translatedBlocks: translations.length,
      appliedBlocks: appliedCount
    })
  };
}

export async function runImmersiveReadingLocalFirstWorkflow({
  blocks,
  signal,
  buildPlan,
  requestFallbackTranslations,
  finalizePlan,
  onPlanStart,
  onPlanReady,
  onFallbackRequest,
  onFallbackComplete,
  onFallbackFailed,
  onFallbackSkipped,
  onFinalize,
  onFinalized
}: ImmersiveReadingLocalFirstWorkflowOptions): Promise<ImmersiveReadingLocalFirstWorkflowResult> {
  assertImmersiveWorkflowNotCancelled(signal);
  await onPlanStart?.();
  const plan = await buildPlan(blocks);
  assertImmersiveWorkflowNotCancelled(signal);
  await onPlanReady?.(plan);
  let fallbackTranslations: ReadingFallbackTranslation[] = [];
  if (plan.fallbackTerms.length && requestFallbackTranslations) {
    try {
      await onFallbackRequest?.(plan.fallbackTerms);
      fallbackTranslations = await requestFallbackTranslations(plan.fallbackTerms);
      assertImmersiveWorkflowNotCancelled(signal);
      await onFallbackComplete?.(fallbackTranslations);
    } catch (error) {
      fallbackTranslations = [];
      await onFallbackFailed?.(error);
    }
  } else {
    await onFallbackSkipped?.(plan.fallbackTerms);
  }
  await onFinalize?.(plan, fallbackTranslations);
  const translations = await finalizePlan(plan.blocks, fallbackTranslations);
  assertImmersiveWorkflowNotCancelled(signal);
  await onFinalized?.(translations);
  return {
    plan,
    fallbackTranslations,
    translations,
    summary: createImmersiveWorkflowSummary({
      totalBlocks: blocks.length,
      requestedBlocks: blocks.length,
      translatedBlocks: translations.length,
      appliedBlocks: 0
    })
  };
}

export async function runImmersiveReadingFinalApplyWorkflow({
  blocks,
  translations,
  summary,
  signal,
  applyTranslations,
  onApplyStart,
  onApplied
}: ImmersiveReadingFinalApplyWorkflowOptions): Promise<ImmersiveReadingFinalApplyWorkflowResult> {
  assertImmersiveWorkflowNotCancelled(signal);
  const orderedTranslations = orderTranslationsByBlocks(translations, blocks);
  await onApplyStart?.(orderedTranslations);
  assertImmersiveWorkflowNotCancelled(signal);
  const appliedCount = await applyTranslations(orderedTranslations);
  assertImmersiveWorkflowNotCancelled(signal);
  await onApplied?.(appliedCount);
  return {
    translations: orderedTranslations,
    appliedCount,
    summary: createImmersiveWorkflowSummary({
      totalBlocks: summary.totalBlocks,
      requestedBlocks: summary.requestedBlocks,
      translatedBlocks: summary.translatedBlocks,
      appliedBlocks: appliedCount
    })
  };
}
