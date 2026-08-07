import {
  PROVIDER_MODEL_SUGGESTIONS
} from "../shared/defaults";
import { getProviderSecret, loadSettings } from "../shared/storage";
import { uiText } from "../shared/i18n";
import { profileForPurpose } from "../shared/models";
import type {
  AppLanguage,
  AppLogLevel,
  ChatMessage,
  ModelCompleteRequest,
  ProviderKind,
  ProviderProfile
} from "../shared/types";
import {
  cleanBaseUrl,
  dataUrlParts,
  endpointUrl,
  errorMessage,
  parseCustomHeaders
} from "../shared/utils";

interface ProviderCall {
  profile: ProviderProfile;
  secret: string;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  language?: AppLanguage;
}

interface ProviderModelEntry {
  id?: unknown;
  name?: unknown;
  model?: unknown;
}

const MODEL_LOG_PREVIEW_CHARS = 420;

function broadcastProviderLog(
  message: string,
  level: AppLogLevel = "debug"
): void {
  if (
    typeof chrome === "undefined" ||
    !chrome.runtime?.sendMessage ||
    !message.trim()
  ) {
    return;
  }
  chrome.runtime
    .sendMessage({
      type: "webmind.operationLog",
      payload: {
        time: Date.now(),
        level,
        message
      }
    })
    .catch(() => undefined);
}

function compactText(value: string, limit = MODEL_LOG_PREVIEW_CHARS): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function requestContentPreview(messages: ChatMessage[]): string {
  return compactText(
    messages
      .map((message) => {
        const attachments = message.attachments?.length
          ? ` attachments=${message.attachments.length}`
          : "";
        return `[${message.role}${attachments}] ${message.content}`;
      })
      .join(" ")
  );
}

function safeRequestUrl(value: string): string {
  try {
    const url = new URL(value);
    for (const key of Array.from(url.searchParams.keys())) {
      if (/key|token|secret|password/i.test(key)) {
        url.searchParams.set(key, "***");
      }
    }
    return url.toString();
  } catch {
    return value.replace(
      /([?&][^=]*(?:key|token|secret|password)[^=]*=)[^&]+/gi,
      "$1***"
    );
  }
}

function logModelRequest(details: {
  call: ProviderCall;
  url: string;
  startedAt: number;
  status?: number;
  responseText?: string;
  error?: unknown;
}): void {
  const duration = Date.now() - details.startedAt;
  const responseText = details.error
    ? errorMessage(details.error)
    : details.responseText ?? "";
  broadcastProviderLog(
    [
      "LLM request",
      `time=${new Date(details.startedAt).toISOString()}`,
      `model=${details.call.profile.name} / ${details.call.profile.model}`,
      `url=${safeRequestUrl(details.url)}`,
      `request=${requestContentPreview(details.call.messages)}`,
      `status=${details.status ?? "-"}`,
      `response=${compactText(responseText || "-")}`,
      `duration=${duration}ms`
    ].join(" | "),
    details.error ? "error" : "debug"
  );
}

function isOpenAiCompatibleKind(kind: ProviderKind): boolean {
  return kind !== "anthropic" && kind !== "gemini" && kind !== "ollama";
}

export interface StreamEvent {
  delta?: string;
  done?: boolean;
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
}

function assertSecret(
  profile: ProviderProfile,
  secret: string,
  language: AppLanguage
): void {
  if (profile.kind !== "ollama" && !secret) {
    throw new Error(
      uiText(language, "apiKeyMissing").replace("{name}", profile.name)
    );
  }
}

async function resolveCall(
  request: ModelCompleteRequest
): Promise<ProviderCall> {
  const settings = await loadSettings();
  const profile = profileForPurpose(
    settings,
    request.purpose,
    request.profileId
  );
  if (!profile) {
    throw new Error(uiText(settings.interfaceLanguage, "modelEngineRequired"));
  }
  const secret = await getProviderSecret(profile);
  assertSecret(profile, secret, settings.interfaceLanguage);
  return {
    profile,
    secret,
    messages: request.messages,
    temperature: request.temperature ?? profile.temperature,
    maxTokens: request.maxTokens ?? profile.maxTokens,
    language: settings.interfaceLanguage
  };
}

function imageParts(message: ChatMessage, language?: AppLanguage) {
  return (message.attachments ?? [])
    .filter(
      (attachment) =>
        (attachment.kind ?? "image") === "image" &&
        attachment.dataUrl &&
        attachment.mimeType.startsWith("image/")
    )
    .map((attachment) => ({
      attachment,
      ...dataUrlParts(attachment.dataUrl ?? "", language)
    }));
}

export function buildOpenAiRequest(call: ProviderCall) {
  return {
    model: call.profile.model,
    messages: call.messages.map((message) => {
      const images = imageParts(message, call.language);
      if (!images.length) {
        return { role: message.role, content: message.content };
      }
      return {
        role: message.role,
        content: [
          { type: "text", text: message.content },
          ...images.map(({ attachment }) => ({
            type: "image_url",
            image_url: { url: attachment.dataUrl }
          }))
        ]
      };
    }),
    temperature: call.temperature,
    max_tokens: call.maxTokens,
    stream: true
  };
}

export function buildAnthropicRequest(call: ProviderCall) {
  const system = call.messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  return {
    model: call.profile.model,
    system: system || undefined,
    messages: call.messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: [
          ...imageParts(message, call.language).map(({ mimeType, base64 }) => ({
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType,
              data: base64
            }
          })),
          { type: "text", text: message.content }
        ]
      })),
    temperature: call.temperature,
    max_tokens: call.maxTokens,
    stream: true
  };
}

export function buildGeminiRequest(call: ProviderCall) {
  const system = call.messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  return {
    systemInstruction: system
      ? { parts: [{ text: system }] }
      : undefined,
    contents: call.messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [
          { text: message.content },
          ...imageParts(message, call.language).map(({ mimeType, base64 }) => ({
            inlineData: { mimeType, data: base64 }
          }))
        ]
      })),
    generationConfig: {
      temperature: call.temperature,
      maxOutputTokens: call.maxTokens
    }
  };
}

export function buildOllamaRequest(call: ProviderCall) {
  return {
    model: call.profile.model,
    messages: call.messages.map((message) => ({
      role: message.role,
      content: message.content,
      images: imageParts(message, call.language).map(({ base64 }) => base64)
    })),
    options: {
      temperature: call.temperature,
      num_predict: call.maxTokens
    },
    stream: true
  };
}

async function* responseLines(
  response: Response,
  signal: AbortSignal,
  language?: AppLanguage
): AsyncGenerator<string> {
  if (!response.body) throw new Error(uiText(language, "responseStreamMissing"));
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const cancelReader = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", cancelReader, { once: true });
  try {
    while (true) {
      throwIfAborted(signal);
      const { value, done } = await reader.read();
      throwIfAborted(signal);
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        throwIfAborted(signal);
        yield line;
      }
    }
    throwIfAborted(signal);
    buffer += decoder.decode();
    if (buffer) yield buffer;
  } finally {
    signal.removeEventListener("abort", cancelReader);
    reader.releaseLock();
  }
}

async function ensureOk(response: Response, language?: AppLanguage): Promise<void> {
  if (response.ok) return;
  const body = await response.text();
  let detail = body;
  try {
    const parsed = JSON.parse(body);
    detail =
      parsed.error?.message ??
      parsed.message ??
      parsed.error ??
      body;
  } catch {
    // Keep the raw body when the provider does not return JSON.
  }
  throw new Error(
    uiText(language, "providerErrorStatus")
      .replace("{status}", String(response.status))
      .replace("{detail}", String(detail).slice(0, 500))
  );
}

function commonHeaders(call: ProviderCall): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...parseCustomHeaders(call.profile.customHeaders, call.language)
  };
}

function providerHeaders(
  profile: ProviderProfile,
  secret: string,
  language?: AppLanguage
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...parseCustomHeaders(profile.customHeaders, language),
    ...(profile.kind === "anthropic"
      ? {
          "x-api-key": secret,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        }
      : profile.kind === "gemini" || profile.kind === "ollama"
        ? {}
        : { Authorization: `Bearer ${secret}` })
  };
}

function extractModelId(entry: ProviderModelEntry | string): string | null {
  if (typeof entry === "string") return entry;
  const value = entry.id ?? entry.name ?? entry.model;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function uniqueModels(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function openAiModelsEndpoint(profile: ProviderProfile): string {
  if (profile.kind === "grok") {
    return endpointUrl(profile.baseUrl, "/language-models");
  }
  if (profile.kind === "longcat") {
    try {
      const url = new URL(cleanBaseUrl(profile.baseUrl));
      return `${url.origin}/v1/models`;
    } catch {
      return endpointUrl(profile.baseUrl, "/models");
    }
  }
  return endpointUrl(profile.baseUrl, "/models");
}

async function parseModelList(response: Response): Promise<string[]> {
  const payload = (await response.json()) as {
    data?: ProviderModelEntry[];
    models?: ProviderModelEntry[];
  } | ProviderModelEntry[];
  const entries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.models)
        ? payload.models
        : [];
  return uniqueModels(entries.map(extractModelId).filter(Boolean) as string[]);
}

export async function listProviderModels(
  profile: ProviderProfile,
  secret: string,
  language?: AppLanguage
): Promise<string[]> {
  assertSecret(profile, secret, language ?? "auto");
  const suggestions = PROVIDER_MODEL_SUGGESTIONS[profile.kind] ?? [];
  let url = "";
  if (isOpenAiCompatibleKind(profile.kind)) {
    url = openAiModelsEndpoint(profile);
  } else if (profile.kind === "anthropic") {
    url = cleanBaseUrl(profile.baseUrl).endsWith("/v1")
      ? endpointUrl(profile.baseUrl, "/models")
      : endpointUrl(profile.baseUrl, "/v1/models");
  } else if (profile.kind === "gemini") {
    const geminiUrl = new URL(endpointUrl(profile.baseUrl, "/models"));
    geminiUrl.searchParams.set("key", secret);
    url = geminiUrl.toString();
  } else {
    url = endpointUrl(profile.baseUrl, "/api/tags");
  }
  const response = await fetch(url, {
    method: "GET",
    headers: providerHeaders(profile, secret, language)
  });
  await ensureOk(response, language);
  if (profile.kind === "ollama") {
    const payload = (await response.json()) as { models?: ProviderModelEntry[] };
    return uniqueModels([
      ...(payload.models ?? [])
        .map((model) => extractModelId(model))
        .filter(Boolean) as string[],
      ...suggestions
    ]);
  }
  if (profile.kind === "gemini") {
    const models = (await parseModelList(response)).map((model) =>
      model.replace(/^models\//, "")
    );
    return uniqueModels([...models, ...suggestions]);
  }
  return uniqueModels([...(await parseModelList(response)), ...suggestions]);
}

async function streamOpenAi(
  call: ProviderCall,
  onDelta: (delta: string) => void,
  signal: AbortSignal
): Promise<void> {
  const url = endpointUrl(call.profile.baseUrl, "/chat/completions");
  const startedAt = Date.now();
  let status: number | undefined;
  let responseText = "";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...commonHeaders(call),
        Authorization: `Bearer ${call.secret}`
      },
      body: JSON.stringify(buildOpenAiRequest(call)),
      signal
    });
    status = response.status;
    throwIfAborted(signal);
    await ensureOk(response, call.language);
    for await (const line of responseLines(response, signal, call.language)) {
      throwIfAborted(signal);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      const payload = JSON.parse(data);
      const delta = payload.choices?.[0]?.delta?.content;
      if (typeof delta === "string") {
        throwIfAborted(signal);
        responseText += delta;
        onDelta(delta);
      }
    }
    logModelRequest({ call, url, startedAt, status, responseText });
  } catch (error) {
    logModelRequest({ call, url, startedAt, status, responseText, error });
    throw error;
  }
}

async function streamAnthropic(
  call: ProviderCall,
  onDelta: (delta: string) => void,
  signal: AbortSignal
): Promise<void> {
  const url = endpointUrl(call.profile.baseUrl, "/v1/messages");
  const startedAt = Date.now();
  let status: number | undefined;
  let responseText = "";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...commonHeaders(call),
        "x-api-key": call.secret,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify(buildAnthropicRequest(call)),
      signal
    });
    status = response.status;
    throwIfAborted(signal);
    await ensureOk(response, call.language);
    for await (const line of responseLines(response, signal, call.language)) {
      throwIfAborted(signal);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      const payload = JSON.parse(data);
      if (
        payload.type === "content_block_delta" &&
        payload.delta?.type === "text_delta"
      ) {
        const delta = payload.delta.text ?? "";
        throwIfAborted(signal);
        responseText += delta;
        onDelta(delta);
      }
    }
    logModelRequest({ call, url, startedAt, status, responseText });
  } catch (error) {
    logModelRequest({ call, url, startedAt, status, responseText, error });
    throw error;
  }
}

async function streamGemini(
  call: ProviderCall,
  onDelta: (delta: string) => void,
  signal: AbortSignal
): Promise<void> {
  const base = endpointUrl(
    call.profile.baseUrl,
    `/models/${encodeURIComponent(call.profile.model)}:streamGenerateContent`
  );
  const url = new URL(base);
  url.searchParams.set("alt", "sse");
  url.searchParams.set("key", call.secret);
  const requestUrl = url.toString();
  const startedAt = Date.now();
  let status: number | undefined;
  let responseText = "";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: commonHeaders(call),
      body: JSON.stringify(buildGeminiRequest(call)),
      signal
    });
    status = response.status;
    throwIfAborted(signal);
    await ensureOk(response, call.language);
    for await (const line of responseLines(response, signal, call.language)) {
      throwIfAborted(signal);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      const payload = JSON.parse(data);
      const delta = payload.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? "")
        .join("");
      if (delta) {
        throwIfAborted(signal);
        responseText += delta;
        onDelta(delta);
      }
    }
    logModelRequest({ call, url: requestUrl, startedAt, status, responseText });
  } catch (error) {
    logModelRequest({
      call,
      url: requestUrl,
      startedAt,
      status,
      responseText,
      error
    });
    throw error;
  }
}

async function streamOllama(
  call: ProviderCall,
  onDelta: (delta: string) => void,
  signal: AbortSignal
): Promise<void> {
  const url = endpointUrl(call.profile.baseUrl, "/api/chat");
  const startedAt = Date.now();
  let status: number | undefined;
  let responseText = "";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: commonHeaders(call),
      body: JSON.stringify(buildOllamaRequest(call)),
      signal
    });
    status = response.status;
    throwIfAborted(signal);
    await ensureOk(response, call.language);
    for await (const line of responseLines(response, signal, call.language)) {
      throwIfAborted(signal);
      if (!line.trim()) continue;
      const payload = JSON.parse(line);
      const delta = payload.message?.content;
      if (typeof delta === "string") {
        throwIfAborted(signal);
        responseText += delta;
        onDelta(delta);
      }
    }
    logModelRequest({ call, url, startedAt, status, responseText });
  } catch (error) {
    logModelRequest({ call, url, startedAt, status, responseText, error });
    throw error;
  }
}

export async function streamModel(
  request: ModelCompleteRequest,
  onDelta: (delta: string) => void,
  signal: AbortSignal
): Promise<void> {
  throwIfAborted(signal);
  const call = await resolveCall(request);
  throwIfAborted(signal);
  if (isOpenAiCompatibleKind(call.profile.kind)) {
    await streamOpenAi(call, onDelta, signal);
    return;
  }
  if (call.profile.kind === "anthropic") {
    await streamAnthropic(call, onDelta, signal);
    return;
  }
  if (call.profile.kind === "gemini") {
    await streamGemini(call, onDelta, signal);
    return;
  }
  await streamOllama(call, onDelta, signal);
}

export async function completeModel(
  request: ModelCompleteRequest,
  signal = new AbortController().signal
): Promise<string> {
  let text = "";
  try {
    await streamModel(request, (delta) => {
      text += delta;
    }, signal);
    return text.trim();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      const settings = await loadSettings();
      throw new Error(uiText(settings.interfaceLanguage, "requestCancelled"));
    }
    throw new Error(errorMessage(error));
  }
}
