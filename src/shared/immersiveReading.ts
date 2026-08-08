import { englishLemmaCandidates } from "./englishInflections";
import { resolveLanguage } from "./i18n";
import type { AppSettings, PageTextBlock, PageTranslation } from "./types";

export type EnglishWordFrequencyIndex = Map<string, number>;
export type ReadingFamily = "zh" | "en";

export interface HoverDefinitionDictionary {
  source: string;
  version: number;
  zh: Record<string, string>;
  en: Record<string, string>;
}

interface ReadingSpan {
  start: number;
  end: number;
  source: string;
  translation?: string;
  score: number;
  level: number;
}

export interface ReadingPlanBlock {
  id: string;
  text: string;
  family: ReadingFamily;
  targetFamily: ReadingFamily;
  spans: ReadingSpan[];
}

export interface ReadingFallbackTerm {
  key: string;
  source: string;
  context: string;
  family: ReadingFamily;
  targetFamily: ReadingFamily;
}

export interface ReadingLocalPlan {
  blocks: ReadingPlanBlock[];
  fallbackTerms: ReadingFallbackTerm[];
}

export interface ReadingFallbackTranslation {
  key?: string;
  source?: string;
  translation?: string;
}

const ENGLISH_BASIC_WORDS = new Set([
  "a",
  "about",
  "after",
  "all",
  "also",
  "am",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "done",
  "each",
  "for",
  "from",
  "get",
  "go",
  "had",
  "has",
  "have",
  "he",
  "her",
  "here",
  "him",
  "his",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "just",
  "me",
  "more",
  "most",
  "my",
  "no",
  "not",
  "of",
  "on",
  "one",
  "or",
  "our",
  "out",
  "over",
  "she",
  "so",
  "some",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "to",
  "too",
  "up",
  "us",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "will",
  "with",
  "would",
  "you",
  "your"
]);

const CHINESE_BASIC_WORDS = new Set([
  "的",
  "了",
  "和",
  "是",
  "在",
  "有",
  "不",
  "就",
  "人",
  "都",
  "一",
  "也",
  "很",
  "與",
  "与",
  "及",
  "我",
  "你",
  "他",
  "她",
  "它",
  "我们",
  "你们",
  "他们",
  "她们",
  "這",
  "这",
  "那",
  "哪",
  "为",
  "為",
  "對",
  "对"
]);

const ENGLISH_READING_LEVEL_THRESHOLDS = [1.5, 1.8, 2.1, 2.6, 3.1];

const IMMERSIVE_READING_TOKEN_PATTERN =
  /\[\[WEBMIND_READING\|([^|\]\n]{1,160})\|([^|\]\n]{1,160})(?:\|([1-5]))?\]\]/g;

export function clampReadingLevel(level: unknown): 1 | 2 | 3 | 4 | 5 {
  const normalized = Math.max(1, Math.min(5, Math.round(Number(level) || 3)));
  return normalized as 1 | 2 | 3 | 4 | 5;
}

function readingDifficultyLevel(score: number): 1 | 2 | 3 | 4 | 5 {
  for (let index = ENGLISH_READING_LEVEL_THRESHOLDS.length - 1; index >= 0; index -= 1) {
    if (score >= ENGLISH_READING_LEVEL_THRESHOLDS[index]) {
      return clampReadingLevel(index + 1);
    }
  }
  return 1;
}

export function detectReadingFamily(text: string): ReadingFamily | null {
  const source = text.replace(/<[^>]*>/g, " ");
  const latinCount = source.match(/[A-Za-z]/g)?.length ?? 0;
  const hanCount = source.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g)?.length ?? 0;
  if (hanCount >= 2 && hanCount >= latinCount) return "zh";
  if (latinCount >= 2) return "en";
  return null;
}

function settingReadingFamily(
  language:
    | AppSettings["interfaceLanguage"]
    | AppSettings["translationLanguage"]
    | string
    | undefined,
  fallback = false
): ReadingFamily | null {
  if (!language) return null;
  const resolved =
    language === "auto" ? (fallback ? resolveLanguage("auto") : null) : language;
  if (resolved === "zh-CN" || resolved === "zh-TW") return "zh";
  if (resolved === "en") return "en";
  return null;
}

function targetReadingFamily(
  settings: AppSettings,
  sourceFamily: ReadingFamily
): ReadingFamily | null {
  const interfaceFamily = settingReadingFamily(
    settings.interfaceLanguage === "auto"
      ? resolveLanguage("auto")
      : settings.interfaceLanguage
  );
  const manualTarget =
    settings.translationLanguage === "auto"
      ? null
      : settingReadingFamily(settings.translationLanguage);
  if (manualTarget) return manualTarget !== sourceFamily ? manualTarget : null;
  if (!interfaceFamily) return null;
  return sourceFamily === interfaceFamily ? "en" : interfaceFamily;
}

function simplifyGloss(value: string): string {
  return value
    .replace(/\([^)]*\)/g, " ")
    .replace(/（[^）]*）/g, " ")
    .replace(/[\[\]{}]/g, " ")
    .split(/[;/，,、|]/)[0]
    .replace(/\s+/g, " ")
    .trim();
}

function readingLevelScore(level: number): number {
  return [1.55, 1.9, 2.25, 2.75, 3.35][clampReadingLevel(level) - 1];
}

function heuristicEnglishReadingLevel(word: string): 1 | 2 | 3 | 4 | 5 {
  const lower = word.toLowerCase();
  let score = 1;
  if (word.length >= 13) score += 2;
  else if (word.length >= 10) score += 1;
  if (word.length >= 7) score += 1;
  if (/(tion|sion|ment|ness|ity|ive|ous|al|ary|ship|hood|ence|ance|ism|logy|graphy|ize|ise|ate|ify|phobia|synthesis)$/i.test(lower)) {
    score += 1;
  }
  if (/[A-Z]/.test(word.slice(1))) score += 1;
  return clampReadingLevel(score);
}

function englishWordFrequencyLevel(rank: number | undefined): 1 | 2 | 3 | 4 | 5 | null {
  if (typeof rank !== "number" || !Number.isFinite(rank)) return null;
  if (rank <= 1200) return 1;
  if (rank <= 3000) return 2;
  if (rank <= 8000) return 3;
  if (rank <= 16000) return 4;
  return 5;
}

function englishReadingLevel(
  word: string,
  frequencies: EnglishWordFrequencyIndex
): 1 | 2 | 3 | 4 | 5 {
  const lower = word.toLowerCase().replace(/[’]/g, "'");
  const frequencyCandidate = englishLemmaCandidates(lower).find((candidate) =>
    frequencies.has(candidate)
  );
  const frequencyLevel = englishWordFrequencyLevel(
    frequencyCandidate ? frequencies.get(frequencyCandidate) : undefined
  );
  return frequencyLevel ?? heuristicEnglishReadingLevel(word);
}

function englishReadingScore(
  word: string,
  frequencies: EnglishWordFrequencyIndex
): number {
  if (word.length < 4) return 0;
  const lower = word.toLowerCase();
  if (ENGLISH_BASIC_WORDS.has(lower)) return 0;
  return readingLevelScore(englishReadingLevel(word, frequencies));
}

function englishGlossReadingLevel(
  gloss: string,
  frequencies: EnglishWordFrequencyIndex
): 1 | 2 | 3 | 4 | 5 | null {
  const words =
    gloss
      .replace(/['’]s\b/gi, "")
      .match(/[A-Za-z][A-Za-z'’\-]*/g)
      ?.map((word) => word.toLowerCase())
      .filter(
        (word) =>
          word.length >= 4 &&
          !ENGLISH_BASIC_WORDS.has(word) &&
          !/^(?:abbr|adj|adv|coll|fig|idiom|lit|noun|prep|pron|sb|sth|variant|verb)$/i.test(word)
      ) ?? [];
  if (!words.length) return null;
  return words.reduce<1 | 2 | 3 | 4 | 5>((level, word) => {
    const next = englishReadingLevel(word, frequencies);
    return next > level ? next : level;
  }, 1);
}

function chineseReadingScore(
  word: string,
  translation: string,
  frequencies: EnglishWordFrequencyIndex
): number {
  if (word.length < 2) return 0;
  if (CHINESE_BASIC_WORDS.has(word)) return 0;
  const glossLevel = translation
    ? englishGlossReadingLevel(translation, frequencies)
    : null;
  if (glossLevel) {
    return readingLevelScore(glossLevel) + Math.min(0.2, Math.max(0, word.length - 2) * 0.05);
  }
  let score = 1 + Math.min(1.5, (word.length - 1) * 0.5);
  if (word.length >= 4) score += 0.75;
  return score;
}

function readingTargetCount(
  text: string,
  candidateCount: number,
  difficulty: number,
  family: ReadingFamily
): number {
  const units =
    family === "en"
      ? text.match(/[A-Za-z][A-Za-z'’\-]*/g)?.length ?? 0
      : text.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g)?.length ?? 0;
  const divisor = [7, 9, 12, 17, 24][Math.max(1, Math.min(5, difficulty)) - 1];
  const maxPerBlock = family === "en" ? 22 : 20;
  return Math.max(1, Math.min(candidateCount, maxPerBlock, Math.ceil(units / divisor)));
}

function readingCandidateThresholdIndex(difficulty: number): number {
  return Math.max(1, Math.min(5, Math.round(difficulty) - 1)) - 1;
}

function readingSourceKey(source: string, family: ReadingFamily): string {
  return family === "en"
    ? source.toLowerCase().replace(/[’']/g, "'")
    : source;
}

function readingGlobalSourceKey(source: string, family: ReadingFamily): string {
  return `${family}:${readingSourceKey(source, family)}`;
}

function readingSpanKey(span: ReadingSpan, family: ReadingFamily): string {
  return readingSourceKey(span.source, family);
}

export function containsWebMindPlaceholder(value: string): boolean {
  return /WEBMIND_[A-Z_]+(?:_\d+)?/i.test(value);
}

export function sanitizeReadingMarkerValue(value: string): string {
  return value
    .replace(/`?\{\{\s*WEBMIND_[A-Z_]+(?:_\d+)?\s*\}\}`?/gi, " ")
    .replace(/\[\s*WEBMIND_[A-Z_]+(?:_\d+)?\s*\]/gi, " ")
    .replace(/WEBMIND_[A-Z_]+(?:_\d+)?/gi, " ")
    .replace(/\[\[|\]\]|\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isReadingTranslationLanguageValid(
  translation: string,
  targetFamily: ReadingFamily
): boolean {
  if (targetFamily === "en") return /[A-Za-z]/.test(translation);
  return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(translation);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function cleanReadingTranslation(original: string, translation: string): string {
  const source = original.trim();
  const fallback = translation.trim();
  if (!source || !fallback) return fallback;
  const sourcePattern = escapeRegExp(source);
  let value = fallback;
  const originalWrappedTranslation = value.match(
    new RegExp(`^${sourcePattern}\\s*[（(]\\s*(.+?)\\s*[)）]$`, "i")
  );
  if (originalWrappedTranslation?.[1]) {
    value = originalWrappedTranslation[1].trim();
  }
  value = value
    .replace(new RegExp(`\\s*[（(]\\s*${sourcePattern}\\s*[)）]\\s*`, "gi"), " ")
    .replace(new RegExp(`^${sourcePattern}\\s+`, "i"), "")
    .replace(new RegExp(`\\s+${sourcePattern}$`, "i"), "")
    .replace(/\s+/g, " ")
    .trim();
  return value || fallback;
}

function selectEnglishReadingSpans(
  text: string,
  dictionary: HoverDefinitionDictionary,
  difficulty: number,
  frequencies: EnglishWordFrequencyIndex
): ReadingSpan[] {
  const spans: ReadingSpan[] = [];
  const matches = Array.from(text.matchAll(/[A-Za-z][A-Za-z'’\-]*/g));
  for (const match of matches) {
    const original = match[0];
    const candidates = englishLemmaCandidates(original);
    const lemma = candidates.find((candidate) => Boolean(dictionary.en[candidate.toLowerCase()]));
    const score = englishReadingScore(original, frequencies);
    if (score < ENGLISH_READING_LEVEL_THRESHOLDS[readingCandidateThresholdIndex(difficulty)]) {
      continue;
    }
    const translation = lemma
      ? simplifyGloss(dictionary.en[lemma.toLowerCase()])
      : "";
    spans.push({
      start: match.index ?? 0,
      end: (match.index ?? 0) + original.length,
      source: original,
      translation: translation
        ? cleanReadingTranslation(original, translation)
        : undefined,
      score,
      level: readingDifficultyLevel(score)
    });
  }
  return spans;
}

function selectChineseReadingSpans(
  text: string,
  dictionary: HoverDefinitionDictionary,
  difficulty: number,
  frequencies: EnglishWordFrequencyIndex
): ReadingSpan[] {
  const spans: ReadingSpan[] = [];
  const maxLength = [2, 2, 3, 4, 5][Math.max(1, Math.min(5, difficulty)) - 1];
  const threshold = ENGLISH_READING_LEVEL_THRESHOLDS[readingCandidateThresholdIndex(difficulty)];
  const regex = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+/g;
  let match = regex.exec(text);
  while (match) {
    const run = match[0];
    let index = 0;
    while (index < run.length) {
      let fallback: ReadingSpan | null = null;
      const max = Math.min(maxLength, run.length - index);
      for (let length = max; length >= 2; length -= 1) {
        const source = run.slice(index, index + length);
        if (containsWebMindPlaceholder(source)) continue;
        const meaning = dictionary.zh[source];
        const translation = meaning
          ? cleanReadingTranslation(source, simplifyGloss(meaning))
          : "";
        const score = chineseReadingScore(source, translation, frequencies);
        if (score < threshold) continue;
        const span: ReadingSpan = {
          start: (match.index ?? 0) + index,
          end: (match.index ?? 0) + index + length,
          source,
          translation: translation || undefined,
          score,
          level: readingDifficultyLevel(score)
        };
        if (translation) {
          fallback = span;
          break;
        }
        fallback = fallback ?? span;
      }
      const best = fallback;
      if (best) {
        spans.push(best);
        index = best.end - (match.index ?? 0);
      } else {
        index += 1;
      }
    }
    match = regex.exec(text);
  }
  return spans;
}

function selectReadingSpans(
  text: string,
  spans: ReadingSpan[],
  difficulty: number,
  family: ReadingFamily,
  blockedSourceKeys: Set<string> = new Set()
): ReadingSpan[] {
  const targetCount = readingTargetCount(text, spans.length, difficulty, family);
  const seenSources = new Set<string>();
  return spans
    .sort((left, right) => left.start - right.start || left.end - right.end)
    .filter((span) => {
      const key = readingSpanKey(span, family);
      if (blockedSourceKeys.has(readingGlobalSourceKey(span.source, family))) {
        return false;
      }
      if (seenSources.has(key)) return false;
      seenSources.add(key);
      return true;
    })
    .sort((left, right) =>
      Number(Boolean(right.translation)) - Number(Boolean(left.translation)) ||
      right.score - left.score ||
      left.start - right.start ||
      left.end - right.end
    )
    .slice(0, targetCount)
    .sort((left, right) => left.start - right.start || left.end - right.end);
}

function buildReadingTextFromSelected(
  text: string,
  selected: ReadingSpan[],
  family: ReadingFamily,
  targetFamily?: ReadingFamily,
  fallbackTranslations = new Map<string, string>()
): string | null {
  if (!selected.length) return null;
  const result: string[] = [];
  let cursor = 0;
  for (const span of selected) {
    if (span.start < cursor) continue;
    const key = readingSpanKey(span, family);
    const source = sanitizeReadingMarkerValue(span.source);
    if (!source || containsWebMindPlaceholder(source)) continue;
    const translation = sanitizeReadingMarkerValue(
      span.translation ?? fallbackTranslations.get(key) ?? ""
    );
    const cleanedTranslation = translation
      ? cleanReadingTranslation(span.source, translation)
      : "";
    if (!cleanedTranslation) continue;
    if (
      targetFamily &&
      !isReadingTranslationLanguageValid(cleanedTranslation, targetFamily)
    ) {
      continue;
    }
    result.push(text.slice(cursor, span.start));
    result.push(
      `[[WEBMIND_READING|${source}|${cleanedTranslation}|${clampReadingLevel(span.level)}]]`
    );
    cursor = span.end;
  }
  result.push(text.slice(cursor));
  const next = result.join("");
  return next === text ? null : next;
}

export function dedupeImmersiveReadingTranslations(
  translations: PageTranslation[],
  blocks: PageTextBlock[],
  seenSourceKeys: Set<string> = new Set()
): PageTranslation[] {
  const blockById = new Map(blocks.map((block) => [block.id, block]));
  return translations.map((translation) => {
    const blockFamily = detectReadingFamily(blockById.get(translation.id)?.text ?? "");
    IMMERSIVE_READING_TOKEN_PATTERN.lastIndex = 0;
    return {
      ...translation,
      text: translation.text.replace(
        IMMERSIVE_READING_TOKEN_PATTERN,
        (match, original: string) => {
          const source = sanitizeReadingMarkerValue(original);
          const family = detectReadingFamily(source) ?? blockFamily;
          if (!source || !family) return source || "";
          const key = readingGlobalSourceKey(source, family);
          if (seenSourceKeys.has(key)) return source;
          seenSourceKeys.add(key);
          return match;
        }
      )
    };
  });
}

export function buildLocalReadingPlan(
  blocks: PageTextBlock[],
  currentSettings: AppSettings,
  dictionary: HoverDefinitionDictionary,
  frequencies: EnglishWordFrequencyIndex
): ReadingLocalPlan {
  const difficulty = Math.max(
    1,
    Math.min(5, Math.round(currentSettings.immersiveReadingDifficulty || 3))
  );
  const planBlocks: ReadingPlanBlock[] = [];
  const fallbackTerms = new Map<string, ReadingFallbackTerm>();
  const selectedSourceKeys = new Set<string>();
  for (const block of blocks) {
    const family = detectReadingFamily(block.text);
    const targetFamily = family ? targetReadingFamily(currentSettings, family) : null;
    if (!family || !targetFamily || targetFamily === family) continue;
    const spans =
      family === "en"
        ? selectEnglishReadingSpans(block.text, dictionary, difficulty, frequencies)
        : selectChineseReadingSpans(block.text, dictionary, difficulty, frequencies);
    const selected = selectReadingSpans(
      block.text,
      spans,
      difficulty,
      family,
      selectedSourceKeys
    );
    if (!selected.length) continue;
    for (const span of selected) {
      selectedSourceKeys.add(readingGlobalSourceKey(span.source, family));
    }
    planBlocks.push({
      id: block.id,
      text: block.text,
      family,
      targetFamily,
      spans: selected
    });
    for (const span of selected) {
      if (span.translation) continue;
      const key = readingSpanKey(span, family);
      if (fallbackTerms.has(key)) continue;
      fallbackTerms.set(key, {
        key,
        source: span.source,
        context: block.text.slice(
          Math.max(0, span.start - 80),
          Math.min(block.text.length, span.end + 80)
        ),
        family,
        targetFamily
      });
    }
  }
  return {
    blocks: planBlocks,
    fallbackTerms: Array.from(fallbackTerms.values())
  };
}

export function finalizeLocalReadingPlan(
  blocks: ReadingPlanBlock[],
  fallbackTranslations: ReadingFallbackTranslation[]
): PageTranslation[] {
  const fallbackMap = new Map<string, string>();
  for (const item of fallbackTranslations) {
    const key = String(item.key ?? item.source ?? "").trim();
    const translation = String(item.translation ?? "").trim();
    if (key && translation) fallbackMap.set(key, translation);
  }
  return blocks.flatMap((block) => {
    const text = buildReadingTextFromSelected(
      block.text,
      block.spans,
      block.family,
      block.targetFamily,
      fallbackMap
    );
    return text ? [{ id: block.id, text }] : [];
  });
}

function extractJsonArrayText(value: string): string {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced?.[1] ?? value;
  const start = source.indexOf("[");
  const end = source.lastIndexOf("]");
  return start >= 0 && end > start ? source.slice(start, end + 1) : source;
}

export function parseReadingFallbackTranslations(
  value: string
): ReadingFallbackTranslation[] {
  const parsed = JSON.parse(extractJsonArrayText(value)) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const key = String(record.key ?? record.source ?? "").trim();
    const translation = sanitizeReadingMarkerValue(
      String(record.translation ?? record.text ?? "")
    );
    return key && translation ? [{ key, translation }] : [];
  });
}

export function buildReadingFallbackPrompt(terms: ReadingFallbackTerm[]): string {
  return [
    "Translate only the listed immersive-reading terms. Do not choose new terms and do not rewrite the context.",
    "targetFamily=en means translate the source term into concise natural English. targetFamily=zh means translate it into concise natural Chinese.",
    "Never translate, modify, copy, or output WEBMIND_* placeholders. If a placeholder appears in context, ignore it.",
    "For targetFamily=en, every translation must contain English letters. For targetFamily=zh, every translation must contain Chinese characters.",
    "Use the context only to disambiguate. Return only a JSON array, no code fence, in this format: [{\"key\":\"same key\",\"translation\":\"short translation\"}].",
    "<terms>",
    JSON.stringify(
      terms.map((term) => ({
        key: term.key,
        source: term.source,
        sourceFamily: term.family,
        targetFamily: term.targetFamily,
        context: sanitizeReadingMarkerValue(term.context)
      }))
    ),
    "</terms>"
  ].join("\n");
}
