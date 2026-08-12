import { describe, expect, it } from "vitest";
import type { McpServerConfig } from "../shared/types";
import { resolveEnabledMcpTools } from "./mcpAgent";

function server(id: string, names: string[]): McpServerConfig {
  return {
    id,
    name: `Server ${id}`,
    url: `https://example.com/${id}`,
    transport: "streamable-http",
    customHeaders: "",
    tools: names.map((name) => ({
      name,
      description: `Description for ${name}`,
      inputSchema: { type: "object" }
    }))
  };
}

describe("MCP enabled tool resolution", () => {
  it("only trusts stored servers and discovered tool names", () => {
    const result = resolveEnabledMcpTools(
      [server("known", ["read", "write"])],
      [
        { serverId: "unknown", toolNames: ["injected"] },
        { serverId: "known", toolNames: ["read", "missing"] }
      ]
    );

    expect(result.map((tool) => [tool.server.id, tool.name])).toEqual([
      ["known", "read"]
    ]);
  });

  it("assigns distinct model aliases to same-named tools on different servers", () => {
    const result = resolveEnabledMcpTools(
      [server("one", ["search"]), server("two", ["search"])],
      [
        { serverId: "one", toolNames: ["search"] },
        { serverId: "two", toolNames: ["search"] }
      ]
    );

    expect(new Set(result.map((tool) => tool.alias)).size).toBe(2);
    expect(result.map((tool) => tool.name)).toEqual(["search", "search"]);
  });

  it("caps the model-visible tool list", () => {
    const names = Array.from({ length: 40 }, (_, index) => `tool-${index}`);
    const result = resolveEnabledMcpTools(
      [server("many", names)],
      [{ serverId: "many", toolNames: names }]
    );

    expect(result).toHaveLength(32);
    expect(result.at(-1)?.name).toBe("tool-31");
  });
});
