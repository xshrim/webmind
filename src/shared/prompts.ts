import {
  LANGUAGE_LABELS,
  resolveLanguage,
  type ResolvedLanguage
} from "./i18n";
import type {
  AppLanguage,
  AppSettings,
  QuickActionId,
  ToolDefinition
} from "./types";

export type PromptConfigSource =
  | AppLanguage
  | Pick<AppSettings, "interfaceLanguage" | "translationLanguage">
  | undefined;

function resolvePromptConfig(source?: PromptConfigSource): {
  interfaceLanguage: ResolvedLanguage;
  translationLanguage: AppLanguage;
} {
  if (typeof source === "string" || source === undefined) {
    return {
      interfaceLanguage: resolveLanguage(source),
      translationLanguage: "auto"
    };
  }
  return {
    interfaceLanguage: resolveLanguage(source.interfaceLanguage),
    translationLanguage: source.translationLanguage ?? "auto"
  };
}

type TranslationLanguageFamily = "zh" | "en" | "ja" | "ko";

const TRANSLATION_FAMILY_LABELS: Record<TranslationLanguageFamily, string> = {
  zh: "Chinese",
  en: "English",
  ja: "Japanese",
  ko: "Korean"
};

function detectTranslationLanguage(text: string): TranslationLanguageFamily | null {
  const source = text.replace(/<[^>]*>/g, " ");
  const latinCount = source.match(/[A-Za-z]/g)?.length ?? 0;
  const chineseCount = source.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g)?.length ?? 0;
  const japaneseKanaCount = source.match(/[\u3040-\u30ff\u31f0-\u31ff]/g)?.length ?? 0;
  const koreanCount = source.match(/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/g)?.length ?? 0;
  if (koreanCount) return "ko";
  if (japaneseKanaCount) return "ja";
  if (chineseCount && chineseCount >= latinCount && chineseCount >= koreanCount) {
    return "zh";
  }
  if (latinCount >= 2) return "en";
  return null;
}

function translationLanguageMatchesInterface(
  sourceLanguage: TranslationLanguageFamily,
  interfaceLanguage: ResolvedLanguage
): boolean {
  if (sourceLanguage === "zh") {
    return interfaceLanguage === "zh-CN" || interfaceLanguage === "zh-TW";
  }
  return sourceLanguage === interfaceLanguage;
}

export function translationDirectionInstruction(
  config: PromptConfigSource | undefined,
  sourceText: string
): string {
  const { interfaceLanguage, translationLanguage } = resolvePromptConfig(config);
  const sourceLanguage = detectTranslationLanguage(sourceText);
  if (!sourceLanguage) return "";
  const targetLanguage =
    translationLanguage === "auto"
      ? translationLanguageMatchesInterface(sourceLanguage, interfaceLanguage)
        ? "en"
        : interfaceLanguage
      : resolveLanguage(translationLanguage);
  const targetLabel = LANGUAGE_LABELS[targetLanguage];
  const sourceLabel = TRANSLATION_FAMILY_LABELS[sourceLanguage];
  switch (interfaceLanguage) {
    case "zh-TW":
      return `只根據 <translation-input> 中實際原文的文字特徵處理。本地預判原文主要語言為 ${sourceLabel}，本次目標語言已固定為${targetLabel}。這是一個強制翻譯任務，不是語言檢測任務。如果原文不是${targetLabel}，最終輸出必須是${targetLabel}，不得複製原文或用原文語言回答。即使原文只有一個單字、短語或一兩句話，只要存在可翻譯內容也必須翻譯，不要因為內容簡短而原樣返回。`;
    case "en":
      return `Use only the actual source text inside <translation-input> for this decision. Local pre-detection says the source is mainly ${sourceLabel}; the target language for this request is fixed as ${targetLabel}. This is a forced translation task, not a language-detection task. If the source is not already ${targetLabel}, the final output must be in ${targetLabel}; do not copy the source or answer in the source language. Even if the source is only a word, phrase, or one or two sentences, translate all translatable content and do not return it unchanged merely because it is short.`;
    case "ja":
      return `<translation-input> 内の実際の原文だけを使用してください。ローカル事前判定では原文の主言語は ${sourceLabel}、今回の目標言語は${targetLabel}に固定されています。これは強制翻訳タスクであり、言語判定タスクではありません。原文がまだ${targetLabel}でない場合、最終出力は必ず${targetLabel}にし、原文をコピーしたり原文の言語で答えたりしないでください。原文が単語、短いフレーズ、一文または二文だけでも、翻訳できる内容は必ず翻訳し、短いことを理由にそのまま返さないでください。`;
    case "ko":
      return `<translation-input> 안의 실제 원문만으로 판단하세요. 로컬 사전 판단상 원문의 주 언어는 ${sourceLabel}이고 이번 요청의 목표 언어는 ${targetLabel}(으)로 고정되어 있습니다. 이것은 강제 번역 작업이며 언어 감지 작업이 아닙니다. 원문이 아직 ${targetLabel}이 아니면 최종 출력은 반드시 ${targetLabel}(으)로 작성하고 원문을 복사하거나 원문 언어로 답하지 마세요. 원문이 단어, 짧은 구, 한두 문장뿐이어도 번역 가능한 내용은 반드시 번역하고 짧다는 이유로 그대로 반환하지 마세요.`;
    case "zh-CN":
    default:
      return `只根据 <translation-input> 中实际原文的文字特征处理。本地预判原文主要语言为 ${sourceLabel}，本次目标语言已固定为${targetLabel}。这是强制翻译任务，不是语言检测任务。如果原文不是${targetLabel}，最终输出必须是${targetLabel}，不得复制原文或用原文语言回答。即使原文只有一个单词、短语或一两句话，只要存在可翻译内容也必须翻译，不要因为内容简短而原样返回。`;
  }
}

export function translationFormatInstruction(
  config?: PromptConfigSource
): string {
  const { interfaceLanguage } = resolvePromptConfig(config);
  switch (interfaceLanguage) {
    case "zh-TW":
      return "嚴格保持原文的段落、換行、標題和清單結構，每個原文段落對應一個譯文段落，不要合併段落。{{WEBMIND_PARAGRAPH_BREAK_N}} 是不可翻譯的段落分隔預留位置，{{WEBMIND_CITATION_N}} 是不可翻譯的引用下標預留位置；兩者都必須逐字保留在原位置，不要展開、解釋、改寫或刪除，不要輸出『該資訊來自……引用』之類的說明。";
    case "en":
      return "Strictly preserve the source paragraph, line-break, heading, and list structure, with one translated paragraph for each source paragraph; never merge paragraphs. {{WEBMIND_PARAGRAPH_BREAK_N}} is an immutable paragraph-break placeholder and {{WEBMIND_CITATION_N}} is an immutable citation-marker placeholder. Preserve both verbatim in place without expanding, explaining, rewriting, or removing them, and never spell out a citation explanation.";
    case "ja":
      return "原文の段落、改行、見出し、リスト構造を厳密に保持し、各原文段落を対応する一つの翻訳段落にしてください。段落を結合しないでください。{{WEBMIND_PARAGRAPH_BREAK_N}} は翻訳不可の段落区切りプレースホルダー、{{WEBMIND_CITATION_N}} は翻訳不可の引用番号プレースホルダーです。どちらも元の位置にそのまま残し、展開、説明、書き換え、削除をしないでください。";
    case "ko":
      return "원문의 문단, 줄바꿈, 제목 및 목록 구조를 엄격히 유지하고 각 원문 문단을 하나의 번역 문단에 대응시키며 문단을 합치지 마세요. {{WEBMIND_PARAGRAPH_BREAK_N}}은 번역하면 안 되는 문단 구분 자리표시자이고 {{WEBMIND_CITATION_N}}은 번역하면 안 되는 인용 번호 자리표시자입니다. 둘 다 원래 위치에 그대로 유지하고 확장, 설명, 수정 또는 삭제하지 마세요.";
    case "zh-CN":
    default:
      return "严格保持原文的段落、换行、标题和列表结构，每个原文段落对应一个译文段落，不要合并段落。{{WEBMIND_PARAGRAPH_BREAK_N}} 是不可翻译的段落分隔占位符，{{WEBMIND_CITATION_N}} 是不可翻译的引用下标占位符；两者都必须逐字保留在原位置，不要展开、解释、改写或删除，不要输出‘该信息来自……引用’之类的说明。";
  }
}

export function immersiveReadingInstruction(
  config?: PromptConfigSource
): string {
  const { interfaceLanguage, translationLanguage } =
    resolvePromptConfig(config);
  const interfaceLabel = LANGUAGE_LABELS[interfaceLanguage];
  const translationSetting =
    translationLanguage === "auto"
      ? "auto"
      : LANGUAGE_LABELS[resolveLanguage(translationLanguage)];
  const difficulty =
    typeof config === "object" && config
      ? Math.max(
          1,
          Math.min(5, Math.round(Number((config as AppSettings).immersiveReadingDifficulty) || 3))
        )
      : 3;
  const autoTargetRule = {
    "zh-CN": `如果页面主体语言与${interfaceLabel}一致，学习语言使用英文；否则使用${interfaceLabel}。`,
    "zh-TW": `如果頁面主體語言與${interfaceLabel}一致，學習語言使用英文；否則使用${interfaceLabel}。`,
    en: `If the page's main language matches ${interfaceLabel}, use English as the learning language; otherwise use ${interfaceLabel}.`,
    ja: `ページの主言語が${interfaceLabel}と一致する場合は英語を学習言語にし、一致しない場合は${interfaceLabel}を使用してください。`,
    ko: `페이지의 주 언어가 ${interfaceLabel}와 같으면 영어를 학습 언어로 사용하고, 다르면 ${interfaceLabel}를 사용하세요.`
  }[interfaceLanguage];
  const fixedTargetRule = {
    "zh-CN": `学习语言固定为${translationSetting}。`,
    "zh-TW": `學習語言固定為${translationSetting}。`,
    en: `Always use ${translationSetting} as the learning language.`,
    ja: `学習言語は常に${translationSetting}に固定してください。`,
    ko: `학습 언어는 항상 ${translationSetting}(으)로 고정하세요.`
  }[interfaceLanguage];
  const targetRule =
    translationLanguage === "auto" ? autoTargetRule : fixedTargetRule;
  const difficultyGuidance = {
    "zh-CN": [
      `当前难度为 ${difficulty}/5。`,
      "难度 1：替换 A1-A2 / 初学者常见词，目标密度约每 80-120 个字替换 2-4 个词语。",
      "难度 2：替换 A2-B1 / 常见但有学习价值的词，目标密度约每 100-140 个字替换 2-3 个词语。",
      "难度 3：替换 B1-B2 / 中等难度词语，目标密度约每 120-180 个字替换 1-3 个词语。",
      "难度 4：替换 B2-C1 / 较高阶词语、固定搭配或术语，目标密度约每 160-240 个字替换 1-2 个词语。",
      "难度 5：只替换 C1+ / 专业、低频或抽象词语，目标密度约每 240-360 个字替换 1 个词语。",
      "不要只在整页替换一两个普通词；有足够文本时，每个主要段落都应有适量替换。不要替换数字、网址、代码、品牌名、人名、地名或已经是学习语言的词。",
      "译文应是基于当前句子或段落上下文的合理简短翻译，通常 1-4 个词；可以消歧和保留必要搭配，但不要加入当前上下文无法支撑的过度限定。"
    ].join("\n"),
    "zh-TW": [
      `目前難度為 ${difficulty}/5。`,
      "難度 1：替換 A1-A2 / 初學者常見詞，目標密度約每 80-120 個字替換 2-4 個詞語。",
      "難度 2：替換 A2-B1 / 常見但有學習價值的詞，目標密度約每 100-140 個字替換 2-3 個詞語。",
      "難度 3：替換 B1-B2 / 中等難度詞語，目標密度約每 120-180 個字替換 1-3 個詞語。",
      "難度 4：替換 B2-C1 / 較高階詞語、固定搭配或術語，目標密度約每 160-240 個字替換 1-2 個詞語。",
      "難度 5：只替換 C1+ / 專業、低頻或抽象詞語，目標密度約每 240-360 個字替換 1 個詞語。",
      "不要只在整頁替換一兩個普通詞；有足夠文本時，每個主要段落都應有適量替換。不要替換數字、網址、程式碼、品牌名、人名、地名或已經是學習語言的詞。",
      "譯文應是基於目前句子或段落上下文的合理簡短翻譯，通常 1-4 個詞；可以消歧並保留必要搭配，但不要加入目前上下文無法支撐的過度限定。"
    ].join("\n"),
    en: [
      `Current difficulty is ${difficulty}/5.`,
      "Level 1: replace A1-A2 / beginner-friendly common words, around 2-4 replacements per 80-120 source characters.",
      "Level 2: replace A2-B1 / common but useful learning words, around 2-3 replacements per 100-140 source characters.",
      "Level 3: replace B1-B2 / medium-difficulty words, around 1-3 replacements per 120-180 source characters.",
      "Level 4: replace B2-C1 / advanced words, collocations, or terms, around 1-2 replacements per 160-240 source characters.",
      "Level 5: replace only C1+ / specialized, low-frequency, or abstract words, around 1 replacement per 240-360 source characters.",
      "Do not replace only one or two ordinary words across the whole page. When there is enough text, each main paragraph should receive a reasonable number of replacements. Do not replace numbers, URLs, code, brands, people, places, or words already in the learning language.",
      "Translations should be reasonable short context-aware glosses, usually 1-4 words. You may disambiguate and keep necessary collocations, but do not add over-specific qualifiers that the current sentence or paragraph does not support."
    ].join("\n"),
    ja: [
      `現在の難易度は ${difficulty}/5 です。`,
      "レベル 1：A1-A2 / 初学者向けの一般語を置換し、80-120 文字あたり 2-4 語程度を目安にします。",
      "レベル 2：A2-B1 / 一般的だが学習価値のある語を置換し、100-140 文字あたり 2-3 語程度を目安にします。",
      "レベル 3：B1-B2 / 中程度の語句を置換し、120-180 文字あたり 1-3 語程度を目安にします。",
      "レベル 4：B2-C1 / 高度な語、コロケーション、専門用語を置換し、160-240 文字あたり 1-2 語程度を目安にします。",
      "レベル 5：C1+ / 専門的、低頻度、抽象的な語だけを置換し、240-360 文字あたり 1 語程度を目安にします。",
      "ページ全体で普通の語を 1、2 個だけ置換しないでください。十分な本文がある場合、主要段落ごとに適量を置換してください。数字、URL、コード、ブランド名、人名、地名、すでに学習言語の語は置換しないでください。",
      "翻訳は現在の文または段落の文脈に基づく自然で短い語義にし、通常 1-4 語にしてください。曖昧さの解消や必要な連語は許可しますが、文脈で支えられない過度に具体的な限定は加えないでください。"
    ].join("\n"),
    ko: [
      `현재 난이도는 ${difficulty}/5입니다.`,
      "1단계: A1-A2 / 초급자용 일반 단어를 바꾸며, 원문 80-120자당 2-4개 정도를 목표로 합니다.",
      "2단계: A2-B1 / 흔하지만 학습 가치가 있는 단어를 바꾸며, 원문 100-140자당 2-3개 정도를 목표로 합니다.",
      "3단계: B1-B2 / 중간 난이도 단어를 바꾸며, 원문 120-180자당 1-3개 정도를 목표로 합니다.",
      "4단계: B2-C1 / 고급 단어, 연어, 용어를 바꾸며, 원문 160-240자당 1-2개 정도를 목표로 합니다.",
      "5단계: C1+ / 전문적, 저빈도, 추상 단어만 바꾸며, 원문 240-360자당 1개 정도를 목표로 합니다.",
      "전체 페이지에서 평범한 단어 한두 개만 바꾸지 마세요. 충분한 본문이 있으면 주요 문단마다 적절히 바꾸세요. 숫자, URL, 코드, 브랜드명, 인명, 지명, 이미 학습 언어인 단어는 바꾸지 마세요.",
      "번역은 현재 문장이나 문단의 문맥에 맞는 자연스럽고 짧은 뜻풀이여야 하며 보통 1-4단어로 작성하세요. 의미 구분과 필요한 연어는 허용하지만 현재 문맥으로 뒷받침되지 않는 과도하게 구체적인 한정은 추가하지 마세요."
    ].join("\n")
  }[interfaceLanguage];
  switch (interfaceLanguage) {
    case "zh-TW":
      return [
        "你是 WebMind 沉浸閱讀處理器。請在保持原文自然可讀的前提下，用少量學習語言詞語形成母語與非母語混合閱讀。",
        `目前介面語言是${interfaceLabel}，譯文語言設定是${translationSetting}。`,
        "只根據 <page-language-sample> 判斷整個頁面的主體語言。",
        targetRule,
        difficultyGuidance,
        "完整保留句子、標點、段落、數字、專有名詞和引用位置，不要改寫、總結或翻譯整句。",
        "把每個選中的詞語或短語嚴格標記為 [[WEBMIND_READING|原文|譯文]]。未選中的文字保持原樣，不要巢狀標記，兩個值中不要使用 |。",
        "形如 {{WEBMIND_CITATION_1}} 的引用預留位置必須逐字保留。",
        '只返回 JSON 陣列，每一項格式為 {"id":"原 id","text":"包含標記的完整原文"}。'
      ].join("\n");
    case "en":
      return [
        "You are the WebMind immersive-reading processor. Create natural mixed-language reading by replacing a limited number of suitable words.",
        `The interface language is ${interfaceLabel}; the translation-language setting is ${translationSetting}.`,
        "Determine the page's main language only from <page-language-sample>.",
        targetRule,
        difficultyGuidance,
        "Preserve every sentence, punctuation mark, paragraph, number, proper noun, and citation position. Do not rewrite, summarize, or translate whole sentences.",
        "Mark each selected word or short phrase exactly as [[WEBMIND_READING|original|translation]]. Leave all unselected text unchanged, never nest markers, and never use | inside either value.",
        "Preserve citation placeholders such as {{WEBMIND_CITATION_1}} verbatim.",
        'Return only a JSON array. Each item must be {"id":"original id","text":"complete original text with markers"}.'
      ].join("\n");
    case "ja":
      return [
        "あなたは WebMind のイマーシブリーディング処理担当です。読みやすさを保ちながら、一部の適切な語句だけを学習言語へ置き換えてください。",
        `インターフェース言語は${interfaceLabel}、翻訳言語設定は${translationSetting}です。`,
        "ページ全体の主言語は <page-language-sample> のみから判定してください。",
        targetRule,
        difficultyGuidance,
        "文、句読点、段落、数字、固有名詞、引用位置を完全に保持し、全文の書き換え、要約、一文全体の翻訳をしないでください。",
        "選んだ語句を [[WEBMIND_READING|原文|翻訳]] の形式で厳密にマークしてください。選ばない文字はそのまま残し、入れ子や値内の | は使わないでください。",
        "{{WEBMIND_CITATION_1}} のような引用プレースホルダーはそのまま保持してください。",
        'JSON 配列だけを返し、各項目を {"id":"元の id","text":"マーカーを含む完全な原文"} にしてください。'
      ].join("\n");
    case "ko":
      return [
        "당신은 WebMind 몰입 읽기 처리기입니다. 읽기 흐름을 유지하면서 일부 적절한 단어만 학습 언어로 바꾸세요.",
        `인터페이스 언어는 ${interfaceLabel}, 번역 언어 설정은 ${translationSetting}입니다.`,
        "페이지 전체의 주 언어는 <page-language-sample>만 보고 판단하세요.",
        targetRule,
        difficultyGuidance,
        "문장, 문장부호, 문단, 숫자, 고유명사와 인용 위치를 그대로 유지하고 전체 문장을 다시 쓰거나 요약하거나 번역하지 마세요.",
        "선택한 단어나 짧은 구를 [[WEBMIND_READING|원문|번역문]] 형식으로 정확히 표시하세요. 선택하지 않은 텍스트는 그대로 두고 중첩하거나 값 안에 |를 넣지 마세요.",
        "{{WEBMIND_CITATION_1}} 같은 인용 자리표시자는 그대로 유지하세요.",
        'JSON 배열만 반환하고 각 항목은 {"id":"원래 id","text":"표시가 포함된 전체 원문"} 형식이어야 합니다.'
      ].join("\n");
    case "zh-CN":
    default:
      return [
        "你是 WebMind 沉浸阅读处理器。请在保持原文自然可读的前提下，用少量学习语言词语形成母语与非母语混合阅读。",
        `当前界面语言是${interfaceLabel}，译文语言设置是${translationSetting}。`,
        "只根据 <page-language-sample> 判断整个页面的主体语言。",
        targetRule,
        difficultyGuidance,
        "完整保留句子、标点、段落、数字、专有名词和引用位置，不要改写、总结或翻译整句话。",
        "将每个选中的词语或短语严格标记为 [[WEBMIND_READING|原文|译文]]。未选中的文字保持原样，不要嵌套标记，两个值中不要使用 |。",
        "形如 {{WEBMIND_CITATION_1}} 的引用占位符必须逐字保留。",
        '只返回 JSON 数组，每一项格式为 {"id":"原 id","text":"包含标记的完整原文"}。'
      ].join("\n");
  }
}

function translateDocumentSuffix(language: ResolvedLanguage): string {
  switch (language) {
    case "zh-TW":
      return "保留 PDF 頁碼或字幕時間戳結構。";
    case "en":
      return "Preserve PDF page numbers or subtitle timestamp structure.";
    case "ja":
      return "PDF のページ番号または字幕のタイムスタンプ構造を保持してください。";
    case "ko":
      return "PDF 페이지 번호 또는 자막 타임스탬프 구조를 유지하세요.";
    case "zh-CN":
    default:
      return "保留 PDF 页码或字幕时间戳结构。";
  }
}

function buildAutoTranslateInstruction(
  config?: PromptConfigSource,
  sourceText = ""
): string {
  const { interfaceLanguage, translationLanguage } = resolvePromptConfig(config);
  const interfaceLabel = LANGUAGE_LABELS[interfaceLanguage];
  const directionInstruction = translationDirectionInstruction(config, sourceText);
  const targetLabel =
    translationLanguage === "auto"
      ? ""
      : LANGUAGE_LABELS[resolveLanguage(translationLanguage)];

  switch (interfaceLanguage) {
    case "zh-TW":
      return [
        "這是一個翻譯任務。無論輸入長短，都必須輸出譯文。",
        `先判斷輸入內容的主要語言是否與目前介面語言一致（${interfaceLabel}）。`,
        translationLanguage === "auto"
          ? `如果一致，請翻譯成自然英文；如果不一致，請翻譯成目前介面語言（${interfaceLabel}）。`
          : `請始終翻譯成${targetLabel}。`,
        "保持原意、格式、數字、專有名詞和語氣，只輸出譯文，不要解釋語言判斷過程。",
        "語言判斷和翻譯只針對後面 <translation-input> 標籤中的原文；忽略本指令的語言、標籤、JSON 欄位名稱、id 和其他中繼資料，不要把它們算入原文。",
        translationFormatInstruction(config),
        ...(directionInstruction ? [directionInstruction] : [])
      ].join("\n");
    case "en":
      return [
        "This is a translation task. Always output a translation, no matter how short the input is.",
        `First determine whether the input is mainly in the same language as the current interface language (${interfaceLabel}).`,
        translationLanguage === "auto"
          ? `If it is, translate it into natural English; otherwise translate it into the current interface language (${interfaceLabel}).`
          : `Always translate it into ${targetLabel}.`,
        "Preserve meaning, formatting, numbers, proper nouns, and tone. Output only the translation and do not explain the language detection.",
        "Detect the language and translate only the original text inside the following <translation-input> tag. Ignore the language of this instruction, the tag, JSON field names, ids, and other metadata; do not include them in language detection.",
        translationFormatInstruction(config),
        ...(directionInstruction ? [directionInstruction] : [])
      ].join("\n");
    case "ja":
      return [
        "これは翻訳タスクです。入力が短くても必ず翻訳文を出力してください。",
        `まず入力内容の主な言語が現在のインターフェース言語（${interfaceLabel}）と同じか判定してください。`,
        translationLanguage === "auto"
          ? "同じなら自然な英語に翻訳し、違うなら現在のインターフェース言語に翻訳してください。"
          : `常に${targetLabel}に翻訳してください。`,
        "意味、書式、数字、固有名詞、語調を保ち、翻訳文だけを出力し、言語判定の過程は説明しないでください。",
        "言語判定と翻訳は、後続の <translation-input> タグ内の原文だけを対象にしてください。この指示文の言語、タグ、JSON のフィールド名、id、その他のメタデータは判定に含めないでください。",
        translationFormatInstruction(config),
        ...(directionInstruction ? [directionInstruction] : [])
      ].join("\n");
    case "ko":
      return [
        "이것은 번역 작업입니다. 입력이 짧아도 항상 번역문을 출력하세요.",
        `먼저 입력 내용의 주된 언어가 현재 인터페이스 언어(${interfaceLabel})와 같은지 판단하세요.`,
        translationLanguage === "auto"
          ? "같다면 자연스러운 영어로 번역하고, 다르다면 현재 인터페이스 언어로 번역하세요."
          : `항상 ${targetLabel}로 번역하세요.`,
        "의미, 형식, 숫자, 고유명사, 어조를 유지하고 번역문만 출력하며 언어 판단 과정을 설명하지 마세요.",
        "언어 판단과 번역은 뒤에 있는 <translation-input> 태그 안의 원문만 대상으로 하세요. 이 지시문의 언어, 태그, JSON 필드명, id 및 기타 메타데이터는 판단에 포함하지 마세요.",
        translationFormatInstruction(config),
        ...(directionInstruction ? [directionInstruction] : [])
      ].join("\n");
    case "zh-CN":
    default:
      return [
        "这是一个翻译任务。无论输入长短，都必须输出译文。",
        `先判断输入内容的主要语言是否与当前界面语言一致（${interfaceLabel}）。`,
        translationLanguage === "auto"
          ? `如果一致，请翻译成自然英文；如果不一致，请翻译成当前界面语言（${interfaceLabel}）。`
          : `请始终翻译成${targetLabel}。`,
        "保持原意、格式、数字、专有名词和语气，只输出译文，不要解释语言判断过程。",
        "语言检测和翻译只针对后面 <translation-input> 标签中的原文；忽略本指令的语言、标签、JSON 字段名、id 和其他元数据，不要把它们算入原文。",
        translationFormatInstruction(config),
        ...(directionInstruction ? [directionInstruction] : [])
      ].join("\n");
  }
}

export interface BuiltInPrompt {
  id: string;
  title: string;
  description: string;
  template: string;
  icon: string;
}

export const QUICK_ACTION_PROMPTS: Record<
  Exclude<QuickActionId, "ask" | "translate">,
  string
> = {
  summarize:
    "请用清晰、紧凑的要点总结下面内容，保留关键事实、数字与结论。直接给出结果，不要说明过程。\n\n{{text}}",
  explain:
    "请解释下面内容。先给一句话结论，再用通俗语言拆解关键概念；必要时给一个简短例子。\n\n{{text}}",
  rewrite:
    "请重写下面内容，使其更清楚、自然、专业，同时保持原意和大致长度。只输出重写后的文本。\n\n{{text}}",
  reply:
    "请根据下面内容拟一份可直接发送的回复。语气友好、专业、简洁；不要虚构未提供的信息。只输出回复正文。\n\n{{text}}"
};

export const BUILT_IN_TOOLS: ToolDefinition[] = [
  {
    id: "analyze-image",
    title: "图片分析",
    description: "理解截图、照片和图表",
    icon: "ImagePlus",
    builtin: true,
    template:
      "分析当前图片。如果图片中存在可识别文字，回答必须先以“提取文字”部分完整输出文字内容，尽量保留原有换行、段落、列表、表格和阅读顺序；随后再以“图片分析”部分概括图片内容，并说明重要细节、数据关系和不确定之处。如果没有可识别文字，直接进行图片分析。不要虚构看不清的信息。"
  },
  {
    id: "translate-text",
    title: "自动翻译",
    description: "中英双向自动翻译",
    icon: "Languages",
    builtin: true,
    template: ""
  },
  {
    id: "translate-document",
    title: "翻译 PDF / 字幕",
    description: "翻译文档或视频字幕内容",
    icon: "Presentation",
    builtin: true,
    template: ""
  },
  {
    id: "ask-selection",
    title: "在侧边栏提问",
    description: "把当前内容交给侧边栏继续提问",
    icon: "PanelRightOpen",
    builtin: true,
    template: ""
  },
  {
    id: "summary",
    title: "总结摘要",
    description: "提炼结论、证据和行动项",
    icon: "FileText",
    builtin: true,
    template:
      "总结当前内容。按“核心结论 / 关键证据 / 行动项 / 仍待确认”组织；引用页面时标注章节、页码或时间戳。"
  },
  {
    id: "explain",
    title: "通俗解释",
    description: "把复杂内容讲明白",
    icon: "Lightbulb",
    builtin: true,
    template:
      "用通俗但不失真的方式解释当前内容。先给一句话结论，再分步骤解释，并给一个贴近现实的例子。"
  },
  {
    id: "extract-actions",
    title: "事项提取",
    description: "找出负责人、时间与依赖",
    icon: "ListChecks",
    builtin: true,
    template:
      "从当前内容中提取所有行动项，整理为表格：事项、负责人、截止时间、依赖、状态。没有明确内容时写“未说明”。"
  },
  {
    id: "concise",
    title: "精简提炼",
    description: "删掉重复和空话",
    icon: "Minimize2",
    builtin: true,
    template:
      "把当前内容改写得更简洁有力。删除重复、套话和无关限定，但不要丢失事实、数字或必要条件。只输出精简后的内容。"
  },
  {
    id: "expand-detail",
    title: "扩写细化",
    description: "补足细节、例子和过渡",
    icon: "Maximize2",
    builtin: true,
    template:
      "在不改变事实和立场的前提下扩写当前内容。补足必要细节、背景、例子和段落过渡，让表达更完整具体。只输出扩写后的内容。"
  },
  {
    id: "polish",
    title: "自然润色",
    description: "让表达更自然、得体和一致",
    icon: "MessageSquareText",
    builtin: true,
    template:
      "润色当前内容，使语气自然、尊重且一致。修正语法和表达，但保留作者立场、事实和个人风格。只输出润色后的内容。"
  },
  {
    id: "continue-writing",
    title: "智能续写",
    description: "沿用上下文继续写下去",
    icon: "PenLine",
    builtin: true,
    template:
      "沿用当前内容的语气、结构和信息，进行智能续写。不要重复已有内容，不要引入未经上下文支持的事实。"
  },
  {
    id: "draft-reply",
    title: "起草回复",
    description: "生成可直接发送的文本",
    icon: "Reply",
    builtin: true,
    template:
      "根据当前选择或上下文起草回复。保持友好、专业、具体；明确下一步，不承诺上下文中没有的信息。"
  },
  {
    id: "study-notes",
    title: "学习笔记",
    description: "整理概念、例子与自测题",
    icon: "BookOpen",
    builtin: true,
    template:
      "把当前内容整理成学习笔记：核心概念、关键关系、示例、易错点，并附 5 道带答案的自测题。"
  },
  {
    id: "explain-code",
    title: "代码解释",
    description: "分析流程、风险和改进点",
    icon: "Code2",
    builtin: true,
    template:
      "解释选中的代码：它做什么、数据如何流动、复杂度、边界条件、潜在缺陷与可验证的改进建议。"
  }
];

export const BUILT_IN_PROMPTS = BUILT_IN_TOOLS;

type ToolPatch = Partial<
  Pick<ToolDefinition, "title" | "description" | "template">
>;

const TOOL_PATCHES: Record<ResolvedLanguage, Record<string, ToolPatch>> = {
  "zh-CN": {},
  "zh-TW": {
    "ask-selection": {
      title: "在側邊欄提問",
      description: "把目前內容交給側邊欄繼續提問"
    },
    summary: {
      title: "總結摘要",
      description: "提煉結論、證據和行動項",
      template:
        "總結目前內容。按「核心結論 / 關鍵證據 / 行動項 / 仍待確認」組織；引用頁面時標註章節、頁碼或時間戳。"
    },
    explain: {
      title: "通俗解釋",
      description: "把複雜內容講明白",
      template:
        "用通俗但不失真的方式解釋目前內容。先給一句話結論，再分步驟解釋，並給一個貼近現實的例子。"
    },
    "translate-text": {
      title: "自動翻譯",
      description: "依內容語言自動翻譯"
    },
    "translate-document": {
      title: "翻譯 PDF / 字幕",
      description: "翻譯文件或影片字幕內容"
    },
    "analyze-image": {
      title: "圖片分析",
      description: "理解截圖、照片和圖表",
      template:
        "分析目前圖片。如果圖片中存在可識別文字，回答必須先以「提取文字」部分完整輸出文字內容，盡量保留原有換行、段落、清單、表格和閱讀順序；隨後再以「圖片分析」部分概括圖片內容，並說明重要細節、資料關係和不確定之處。如果沒有可識別文字，直接進行圖片分析。不要虛構看不清的資訊。"
    },
    "extract-actions": {
      title: "事項提取",
      description: "找出負責人、時間與依賴",
      template:
        "從目前內容中提取所有行動項，整理為表格：事項、負責人、截止時間、依賴、狀態。沒有明確內容時寫「未說明」。"
    },
    concise: {
      title: "精簡提煉",
      description: "刪掉重複和空話",
      template:
        "把目前內容改寫得更簡潔有力。刪除重複、套話和無關限定，但不要丟失事實、數字或必要條件。只輸出精簡後的內容。"
    },
    polish: {
      title: "自然潤色",
      description: "讓表達更自然、得體和一致",
      template:
        "潤色目前內容，使語氣自然、尊重且一致。修正語法和表達，但保留作者立場、事實和個人風格。只輸出潤色後的內容。"
    },
    "expand-detail": {
      title: "擴寫細化",
      description: "補足細節、例子和過渡",
      template:
        "在不改變事實和立場的前提下擴寫目前內容。補足必要細節、背景、例子和段落過渡，讓表達更完整具體。只輸出擴寫後的內容。"
    },
    "continue-writing": {
      title: "智慧續寫",
      description: "沿用上下文繼續寫下去",
      template:
        "沿用目前內容的語氣、結構和資訊，進行智慧續寫。不要重複已有內容，不要引入未經上下文支持的事實。"
    },
    "draft-reply": {
      title: "起草回覆",
      description: "生成可直接發送的文字",
      template:
        "根據目前選擇或上下文起草回覆。保持友好、專業、具體；明確下一步，不承諾上下文中沒有的資訊。"
    },
    "study-notes": {
      title: "學習筆記",
      description: "整理概念、例子與自測題",
      template:
        "把目前內容整理成學習筆記：核心概念、關鍵關係、示例、易錯點，並附 5 道帶答案的自測題。"
    },
    "explain-code": {
      title: "程式碼解釋",
      description: "分析流程、風險和改進點",
      template:
        "解釋選中的程式碼：它做什麼、資料如何流動、複雜度、邊界條件、潛在缺陷與可驗證的改進建議。"
    }
  },
  en: {
    "ask-selection": {
      title: "Ask in Sidebar",
      description: "Send the current content to the sidebar for follow-up"
    },
    summary: {
      title: "Summarize",
      description: "Extract conclusions, evidence, and action items",
      template:
        "Summarize the current content. Organize it as Key conclusions / Evidence / Action items / Still unclear. When citing page content, mention sections, page numbers, or timestamps when available."
    },
    explain: {
      title: "Explain Simply",
      description: "Make complex content understandable",
      template:
        "Explain the current content in plain but accurate language. Start with a one-sentence takeaway, then break down the key ideas step by step and include a realistic short example."
    },
    "translate-text": {
      title: "Auto Translate",
      description: "Automatically translate based on the content language"
    },
    "translate-document": {
      title: "Translate PDF / Subtitles",
      description: "Translate documents or video subtitles"
    },
    "analyze-image": {
      title: "Analyze Image",
      description: "Understand screenshots, photos, and charts",
      template:
        "Analyze the current image. If it contains recognizable text, the response must begin with an 'Extracted Text' section that reproduces all readable text while preserving line breaks, paragraphs, lists, tables, and reading order as closely as possible. Then provide an 'Image Analysis' section summarizing the image and explaining important details, data relationships, and uncertainties. If no text is recognizable, proceed directly to the image analysis. Do not invent information that is not visible."
    },
    "extract-actions": {
      title: "Extract Actions",
      description: "Find owners, dates, and dependencies",
      template:
        "Extract all action items from the current content and organize them as a table: item, owner, due date, dependency, status. Write 'not specified' when details are not explicit."
    },
    concise: {
      title: "Make Concise",
      description: "Remove repetition and filler",
      template:
        "Rewrite the current content to be more concise and forceful. Remove repetition, filler, and irrelevant qualifiers without losing facts, numbers, or required conditions. Output only the concise version."
    },
    polish: {
      title: "Polish Naturally",
      description: "Make the expression natural, appropriate, and consistent",
      template:
        "Polish the current content so the tone is natural, respectful, and consistent. Fix grammar and phrasing while preserving the author's stance, facts, and personal style. Output only the polished version."
    },
    "expand-detail": {
      title: "Expand Details",
      description: "Add details, examples, and transitions",
      template:
        "Expand the current content without changing facts or stance. Add necessary details, background, examples, and transitions so it feels complete and concrete. Output only the expanded version."
    },
    "continue-writing": {
      title: "Continue Writing",
      description: "Continue in the same context and style",
      template:
        "Continue writing in the tone, structure, and information of the current content. Do not repeat what is already there, and do not introduce facts unsupported by the context."
    },
    "draft-reply": {
      title: "Draft Reply",
      description: "Generate text ready to send",
      template:
        "Draft a reply based on the current selection or context. Keep it friendly, professional, and specific; make the next step clear and do not promise anything not supported by the context."
    },
    "study-notes": {
      title: "Study Notes",
      description: "Organize concepts, examples, and quiz questions",
      template:
        "Turn the current content into study notes: core concepts, key relationships, examples, common pitfalls, and 5 self-test questions with answers."
    },
    "explain-code": {
      title: "Code Explanation",
      description: "Analyze flow, risks, and improvements",
      template:
        "Explain the selected code: what it does, how data flows, complexity, edge cases, potential defects, and verifiable improvement suggestions."
    }
  },
  ja: {
    "ask-selection": {
      title: "サイドバーで質問",
      description: "現在の内容をサイドバーに渡して続けて質問します"
    },
    summary: {
      title: "要約",
      description: "結論、根拠、アクション項目を抽出",
      template:
        "現在の内容を要約してください。「主要な結論 / 根拠 / アクション項目 / まだ確認が必要な点」で整理し、ページを引用する場合は章、ページ番号、タイムスタンプを示してください。"
    },
    explain: {
      title: "わかりやすく説明",
      description: "複雑な内容を理解しやすくします",
      template:
        "現在の内容を、平易だが正確な言葉で説明してください。最初に一文で結論を述べ、重要な概念を段階的に分解し、現実に近い短い例を添えてください。"
    },
    "translate-text": {
      title: "自動翻訳",
      description: "内容の言語に応じて自動翻訳"
    },
    "translate-document": {
      title: "PDF / 字幕を翻訳",
      description: "文書または動画字幕を翻訳"
    },
    "analyze-image": {
      title: "画像分析",
      description: "スクリーンショット、写真、図表を理解",
      template:
        "現在の画像を分析してください。認識できる文字がある場合、回答の最初に「抽出テキスト」セクションを設け、改行、段落、箇条書き、表、読み順をできるだけ保ちながら、読める文字をすべて出力してください。その後に「画像分析」セクションを設け、画像の概要、重要な詳細、データ関係、不確かな点を説明してください。認識できる文字がない場合は、画像分析から始めてください。見えない情報を捏造しないでください。"
    },
    "extract-actions": {
      title: "タスク抽出",
      description: "担当者、期限、依存関係を抽出",
      template:
        "現在の内容からすべてのアクション項目を抽出し、表に整理してください：項目、担当者、期限、依存関係、状態。明記されていない場合は「未記載」と書いてください。"
    },
    concise: {
      title: "簡潔化",
      description: "重複や不要な表現を削除",
      template:
        "現在の内容をより簡潔で力強く書き直してください。事実、数字、必要条件を失わず、重複、定型句、不要な限定を削除してください。簡潔化した本文だけを出力してください。"
    },
    polish: {
      title: "自然に推敲",
      description: "自然で適切、一貫した表現にします",
      template:
        "現在の内容を自然で丁寧かつ一貫した語調に推敲してください。文法と表現を修正しつつ、筆者の立場、事実、個性を保ってください。推敲後の本文だけを出力してください。"
    },
    "expand-detail": {
      title: "詳しく展開",
      description: "詳細、例、つなぎを補足",
      template:
        "事実と立場を変えずに現在の内容を詳しく展開してください。必要な詳細、背景、例、段落間のつながりを補い、より完全で具体的にしてください。展開後の本文だけを出力してください。"
    },
    "continue-writing": {
      title: "スマート続き書き",
      description: "文脈と文体を保って続きを書く",
      template:
        "現在の内容の語調、構成、情報を保って続きを書いてください。既存内容を繰り返さず、文脈に支えられていない事実を追加しないでください。"
    },
    "draft-reply": {
      title: "返信を下書き",
      description: "そのまま送れる文章を作成",
      template:
        "現在の選択内容または文脈に基づいて返信を下書きしてください。友好的、専門的、具体的にし、次の一手を明確にしてください。文脈にないことを約束しないでください。"
    },
    "study-notes": {
      title: "学習ノート",
      description: "概念、例、自習問題を整理",
      template:
        "現在の内容を学習ノートに整理してください：主要概念、重要な関係、例、間違えやすい点、答え付きの自習問題 5 問。"
    },
    "explain-code": {
      title: "コード解説",
      description: "流れ、リスク、改善点を分析",
      template:
        "選択されたコードを説明してください：何をするか、データの流れ、計算量、境界条件、潜在的な欠陥、検証可能な改善案。"
    }
  },
  ko: {
    "ask-selection": {
      title: "사이드바에서 질문",
      description: "현재 내용을 사이드바로 보내 이어서 질문합니다"
    },
    summary: {
      title: "요약",
      description: "결론, 근거, 실행 항목을 추출",
      template:
        "현재 내용을 요약하세요. '핵심 결론 / 주요 근거 / 실행 항목 / 추가 확인 필요' 형식으로 정리하고, 페이지를 인용할 때는 섹션, 페이지 번호 또는 타임스탬프를 표시하세요."
    },
    explain: {
      title: "쉽게 설명",
      description: "복잡한 내용을 이해하기 쉽게 설명",
      template:
        "현재 내용을 쉽지만 정확하게 설명하세요. 먼저 한 문장으로 결론을 제시하고, 핵심 개념을 단계별로 풀어 설명하며 현실적인 짧은 예를 포함하세요."
    },
    "translate-text": {
      title: "자동 번역",
      description: "내용 언어에 따라 자동 번역"
    },
    "translate-document": {
      title: "PDF / 자막 번역",
      description: "문서 또는 영상 자막 번역"
    },
    "analyze-image": {
      title: "이미지 분석",
      description: "스크린샷, 사진, 차트 이해",
      template:
        "현재 이미지를 분석하세요. 인식 가능한 텍스트가 있다면 답변 맨 앞에 '추출된 텍스트' 섹션을 두고 줄바꿈, 문단, 목록, 표, 읽기 순서를 최대한 유지해 읽을 수 있는 모든 텍스트를 출력하세요. 그런 다음 '이미지 분석' 섹션에서 이미지 개요, 중요한 세부사항, 데이터 관계, 불확실한 점을 설명하세요. 인식 가능한 텍스트가 없다면 바로 이미지 분석을 진행하세요. 보이지 않는 정보를 지어내지 마세요."
    },
    "extract-actions": {
      title: "할 일 추출",
      description: "담당자, 시간, 의존관계 찾기",
      template:
        "현재 내용에서 모든 실행 항목을 추출해 표로 정리하세요: 항목, 담당자, 마감일, 의존관계, 상태. 명확하지 않은 내용은 '명시되지 않음'이라고 쓰세요."
    },
    concise: {
      title: "간결하게 정리",
      description: "반복과 군더더기 제거",
      template:
        "현재 내용을 더 간결하고 힘 있게 다시 쓰세요. 사실, 숫자, 필수 조건을 잃지 않으면서 반복, 상투적 표현, 불필요한 한정을 제거하세요. 간결해진 내용만 출력하세요."
    },
    polish: {
      title: "자연스럽게 다듬기",
      description: "자연스럽고 적절하며 일관된 표현으로 개선",
      template:
        "현재 내용을 자연스럽고 존중이 느껴지며 일관된 어조로 다듬으세요. 문법과 표현을 고치되 작성자의 입장, 사실, 개인적 스타일은 유지하세요. 다듬은 내용만 출력하세요."
    },
    "expand-detail": {
      title: "자세히 확장",
      description: "세부사항, 예시, 연결 문장 보강",
      template:
        "사실과 입장을 바꾸지 않고 현재 내용을 확장하세요. 필요한 세부사항, 배경, 예시, 문단 전환을 보강해 더 완전하고 구체적으로 만드세요. 확장된 내용만 출력하세요."
    },
    "continue-writing": {
      title: "스마트 이어쓰기",
      description: "문맥과 스타일을 이어서 작성",
      template:
        "현재 내용의 어조, 구조, 정보를 유지해 이어서 작성하세요. 기존 내용을 반복하지 말고, 문맥으로 뒷받침되지 않는 사실을 추가하지 마세요."
    },
    "draft-reply": {
      title: "답장 초안",
      description: "바로 보낼 수 있는 텍스트 생성",
      template:
        "현재 선택 내용 또는 문맥을 바탕으로 답장을 작성하세요. 친절하고 전문적이며 구체적으로 쓰고, 다음 단계를 명확히 하세요. 문맥에 없는 내용을 약속하지 마세요."
    },
    "study-notes": {
      title: "학습 노트",
      description: "개념, 예시, 자가 점검 문제 정리",
      template:
        "현재 내용을 학습 노트로 정리하세요: 핵심 개념, 주요 관계, 예시, 헷갈리기 쉬운 점, 답이 포함된 자가 점검 문제 5개."
    },
    "explain-code": {
      title: "코드 해설",
      description: "흐름, 위험, 개선점 분석",
      template:
        "선택한 코드를 설명하세요: 무엇을 하는지, 데이터 흐름, 복잡도, 경계 조건, 잠재 결함, 검증 가능한 개선 제안."
    }
  }
};

const QUICK_ACTION_PROMPTS_BY_LANGUAGE: Record<
  ResolvedLanguage,
  Record<Exclude<QuickActionId, "ask" | "translate">, string>
> = {
  "zh-CN": QUICK_ACTION_PROMPTS,
  "zh-TW": {
    summarize:
      "請用清晰、緊湊的要點總結下面內容，保留關鍵事實、數字與結論。直接給出結果，不要說明過程。\n\n{{text}}",
    explain:
      "請解釋下面內容。先給一句話結論，再用通俗語言拆解關鍵概念；必要時給一個簡短例子。\n\n{{text}}",
    rewrite:
      "請重寫下面內容，使其更清楚、自然、專業，同時保持原意和大致長度。只輸出重寫後的文字。\n\n{{text}}",
    reply:
      "請根據下面內容擬一份可直接發送的回覆。語氣友好、專業、簡潔；不要虛構未提供的資訊。只輸出回覆正文。\n\n{{text}}"
  },
  en: {
    summarize:
      "Summarize the content below into clear, compact bullets while preserving key facts, numbers, and conclusions. Return the result directly without explaining the process.\n\n{{text}}",
    explain:
      "Explain the content below. Start with a one-sentence takeaway, then unpack the key concepts in plain language; include a short example when useful.\n\n{{text}}",
    rewrite:
      "Rewrite the content below to make it clearer, more natural, and more professional while preserving the meaning and approximate length. Output only the rewritten text.\n\n{{text}}",
    reply:
      "Draft a ready-to-send reply based on the content below. Keep the tone friendly, professional, and concise; do not invent information that was not provided. Output only the reply body.\n\n{{text}}"
  },
  ja: {
    summarize:
      "以下の内容を、重要な事実、数字、結論を保ちながら、明確で簡潔な要点にまとめてください。処理過程は説明せず、結果だけを出力してください。\n\n{{text}}",
    explain:
      "以下の内容を説明してください。最初に一文で結論を述べ、重要な概念を平易な言葉で分解してください。必要に応じて短い例を添えてください。\n\n{{text}}",
    rewrite:
      "以下の内容を、意味とおおよその長さを保ちながら、より明確で自然かつ専門的に書き直してください。書き直した本文だけを出力してください。\n\n{{text}}",
    reply:
      "以下の内容に基づいて、そのまま送れる返信文を作成してください。友好的、専門的、簡潔な語調にし、提供されていない情報は作らないでください。返信本文だけを出力してください。\n\n{{text}}"
  },
  ko: {
    summarize:
      "아래 내용을 핵심 사실, 숫자, 결론을 유지하면서 명확하고 간결한 요점으로 요약하세요. 과정 설명 없이 결과만 출력하세요.\n\n{{text}}",
    explain:
      "아래 내용을 설명하세요. 먼저 한 문장으로 결론을 말하고, 핵심 개념을 쉬운 말로 풀어 설명하세요. 필요하면 짧은 예시를 포함하세요.\n\n{{text}}",
    rewrite:
      "아래 내용을 의미와 대략적인 길이를 유지하면서 더 명확하고 자연스럽고 전문적으로 다시 쓰세요. 다시 쓴 텍스트만 출력하세요.\n\n{{text}}",
    reply:
      "아래 내용을 바탕으로 바로 보낼 수 있는 답장을 작성하세요. 친절하고 전문적이며 간결한 어조를 유지하고, 제공되지 않은 정보는 지어내지 마세요. 답장 본문만 출력하세요.\n\n{{text}}"
  }
};

export function autoTranslateInstruction(
  config?: PromptConfigSource,
  sourceText = ""
): string {
  return buildAutoTranslateInstruction(config, sourceText);
}

export function quickActionPrompt(
  action: Exclude<QuickActionId, "ask">,
  config?: PromptConfigSource
): string {
  const resolved = resolvePromptConfig(config);
  if (action === "translate") {
    return `${buildAutoTranslateInstruction(resolved)}\n\n{{text}}`;
  }
  const localizedAction = action as Exclude<QuickActionId, "ask" | "translate">;
  return QUICK_ACTION_PROMPTS_BY_LANGUAGE[resolved.interfaceLanguage][localizedAction];
}

export function builtInToolsForLanguage(
  config?: PromptConfigSource
): ToolDefinition[] {
  const resolved = resolvePromptConfig(config);
  return BUILT_IN_TOOLS.map((tool) => {
    const patch = TOOL_PATCHES[resolved.interfaceLanguage][tool.id] ?? {};
    let template = patch.template ?? tool.template;
    if (tool.id === "translate-text") {
      template = buildAutoTranslateInstruction(resolved);
    } else if (tool.id === "translate-document") {
      template = `${buildAutoTranslateInstruction(resolved)} ${translateDocumentSuffix(resolved.interfaceLanguage)}`;
    }
    return {
      ...tool,
      ...patch,
      template
    };
  });
}

export function fillPrompt(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "");
}
