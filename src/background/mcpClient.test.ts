import { describe, expect, it } from "vitest";
import { formatMcpToolResult, timeoutSignal } from "./mcpClient";

describe("MCP tool result formatting", () => {
  it("combines text and structured content", () => {
    expect(
      formatMcpToolResult({
        content: [{ type: "text", text: "plain" }],
        structuredContent: { answer: 42 }
      })
    ).toBe('plain\n\n{"answer":42}');
  });

  it("marks errors and non-text media without embedding payloads", () => {
    expect(
      formatMcpToolResult({
        isError: true,
        content: [{ type: "image", mimeType: "image/png", data: "secret" }]
      })
    ).toBe("MCP tool error:\n[image: image/png]");
  });

  it("limits the complete result passed back to the model", () => {
    expect(
      formatMcpToolResult({
        isError: true,
        content: [{ type: "text", text: "x".repeat(70_000) }]
      }).length
    ).toBe(60_000);
  });
});

describe("MCP timeout signal", () => {
  it("inherits a parent that was already aborted", () => {
    const parent = new AbortController();
    parent.abort(new Error("cancelled"));
    const child = timeoutSignal(parent.signal, 1_000);

    expect(child.signal.aborted).toBe(true);
    expect(child.signal.reason).toBe(parent.signal.reason);
    child.dispose();
  });
});
