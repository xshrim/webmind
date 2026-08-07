import { describe, expect, it } from "vitest";
import { createProviderProfile } from "../shared/defaults";
import { createMessage } from "../shared/utils";
import {
  buildAnthropicRequest,
  buildGeminiRequest,
  buildOllamaRequest,
  buildOpenAiRequest
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
});
