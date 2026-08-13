import { describe, expect, it } from "vitest";
import { createProviderProfile } from "../shared/defaults";
import { createMessage } from "../shared/utils";
import {
  buildAnthropicRequest,
  buildAnthropicToolRequest,
  buildGeminiRequest,
  buildGeminiToolRequest,
  buildOllamaRequest,
  buildOllamaToolRequest,
  buildOpenAiRequest,
  buildOpenAiToolRequest
} from "./providers";

const image = {
  id: "image-1",
  name: "chart.png",
  mimeType: "image/png",
  dataUrl: "data:image/png;base64,ZmFrZQ=="
};

function call(kind: "openai-compatible" | "anthropic" | "gemini" | "ollama") {
  const profile = createProviderProfile(kind, {
    id: "profile-1",
    model: "test-model"
  });
  return {
    profile,
    secret: "test-secret",
    temperature: 0.2,
    maxTokens: 512,
    reasoningEnabled: false,
    messages: [
      createMessage("system", "Be precise."),
      createMessage("user", "What is in this image?", { attachments: [image] })
    ]
  };
}

describe("provider request adapters", () => {
  it("builds OpenAI-compatible multimodal chat messages", () => {
    const request = buildOpenAiRequest(call("openai-compatible"));
    expect(request.model).toBe("test-model");
    expect(request.stream).toBe(true);
    expect(request.messages[1].content).toEqual([
      { type: "text", text: "What is in this image?" },
      {
        type: "image_url",
        image_url: { url: image.dataUrl }
      }
    ]);
  });

  it("separates the Anthropic system prompt and image source", () => {
    const request = buildAnthropicRequest(call("anthropic"));
    expect(request.system).toBe("Be precise.");
    expect(request.messages[0].content[0]).toEqual({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: "ZmFrZQ=="
      }
    });
  });

  it("maps Gemini assistant messages to model turns", () => {
    const request = buildGeminiRequest({
      ...call("gemini"),
      messages: [
        createMessage("user", "Hello"),
        createMessage("assistant", "Hi")
      ]
    });
    expect(request.contents.map((item) => item.role)).toEqual(["user", "model"]);
    expect(request.generationConfig.maxOutputTokens).toBe(512);
  });

  it("uses Ollama's base64 image field", () => {
    const request = buildOllamaRequest(call("ollama"));
    expect(request.messages[1].images).toEqual(["ZmFrZQ=="]);
    expect(request.options.num_predict).toBe(512);
  });

  it("adds each configured reasoning protocol only when enabled", () => {
    const openAiProfile = createProviderProfile("openai-compatible", {
      reasoningStrategy: "openai-chat"
    });
    expect(
      buildOpenAiRequest({
        ...call("openai-compatible"),
        profile: openAiProfile,
        reasoningEnabled: true
      }).reasoning_effort
    ).toBe("medium");
    expect(
      buildAnthropicRequest({ ...call("anthropic"), reasoningEnabled: true })
        .thinking
    ).toEqual({ type: "enabled", budget_tokens: 1024 });
    expect(
      buildGeminiRequest({ ...call("gemini"), reasoningEnabled: true })
        .generationConfig.thinkingConfig
    ).toEqual({ thinkingBudget: 1024 });
    expect(
      buildOllamaRequest({ ...call("ollama"), reasoningEnabled: true }).think
    ).toBe(true);
  });
});

function toolCall(kind: "openai-compatible" | "anthropic" | "gemini" | "ollama") {
  const base = call(kind);
  return {
    ...base,
    messages: [
      { role: "user" as const, content: "Find the weather" },
      {
        role: "assistant" as const,
        content: "",
        toolCalls: [
          { id: "call-1", name: "weather", arguments: { city: "Shanghai" } }
        ]
      },
      {
        role: "tool" as const,
        content: "Sunny",
        toolCallId: "call-1",
        toolName: "weather"
      }
    ],
    tools: [
      {
        name: "weather",
        description: "Get weather",
        inputSchema: {
          type: "object",
          properties: { city: { type: "string" } },
          required: ["city"]
        }
      }
    ]
  };
}

function parallelToolCall(kind: "anthropic" | "gemini") {
  const value = toolCall(kind);
  return {
    ...value,
    messages: [
      value.messages[0],
      {
        ...value.messages[1],
        toolCalls: [
          ...(value.messages[1].toolCalls ?? []),
          { id: "call-2", name: "weather", arguments: { city: "Beijing" } }
        ]
      },
      value.messages[2],
      {
        role: "tool" as const,
        content: "Cloudy",
        toolCallId: "call-2",
        toolName: "weather"
      }
    ]
  };
}

describe("provider tool calling adapters", () => {
  it("maps OpenAI function calls and tool results", () => {
    const request = buildOpenAiToolRequest(toolCall("openai-compatible"));
    expect(request.stream).toBe(false);
    expect(request.tools[0].function.name).toBe("weather");
    expect(request.messages[1]).toMatchObject({ role: "assistant" });
    expect(request.messages[2]).toMatchObject({
      role: "tool",
      tool_call_id: "call-1"
    });
  });

  it("maps Anthropic tool use and result blocks", () => {
    const request = buildAnthropicToolRequest(toolCall("anthropic"));
    expect(request.tools[0].input_schema.required).toEqual(["city"]);
    expect(request.messages[1].content[0]).toMatchObject({ type: "tool_use" });
    expect(request.messages[2].content[0]).toMatchObject({
      type: "tool_result",
      tool_use_id: "call-1"
    });
  });

  it("maps Gemini function calls and responses", () => {
    const request = buildGeminiToolRequest(toolCall("gemini"));
    expect(request.tools[0].functionDeclarations[0].name).toBe("weather");
    expect(request.contents[1].parts[0]).toHaveProperty("functionCall");
    expect(request.contents[2].parts[0]).toHaveProperty("functionResponse");
  });

  it("maps Ollama tools and result messages", () => {
    const request = buildOllamaToolRequest(toolCall("ollama"));
    expect(request.stream).toBe(false);
    expect(request.tools[0].function.name).toBe("weather");
    expect(request.messages[2]).toMatchObject({
      role: "tool",
      tool_name: "weather"
    });
  });

  it("uses the configured reasoning protocol for MCP tool decisions", () => {
    const request = buildGeminiToolRequest({
      ...toolCall("gemini"),
      reasoningEnabled: true
    });
    expect(request.generationConfig.thinkingConfig).toEqual({
      thinkingBudget: 1024
    });
  });

  it("groups parallel Anthropic tool results in one user turn", () => {
    const request = buildAnthropicToolRequest(parallelToolCall("anthropic"));
    expect(request.messages[2].content).toHaveLength(2);
  });

  it("groups parallel Gemini function responses in one user turn", () => {
    const request = buildGeminiToolRequest(parallelToolCall("gemini"));
    expect(request.contents[2].parts).toHaveLength(2);
  });
});
