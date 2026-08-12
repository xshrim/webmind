import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { McpServerConfig, McpToolInfo } from "../shared/types";
import { parseCustomHeaders } from "../shared/utils";

const MCP_CONNECT_TIMEOUT_MS = 15_000;
const MCP_CALL_TIMEOUT_MS = 60_000;
const MCP_MAX_TOOLS = 80;
const MCP_MAX_RESULT_CHARS = 60_000;

export interface McpToolCallResult {
  content: string;
  isError: boolean;
}

export function describeMcpConnectionError(
  error: unknown,
  server: Pick<McpServerConfig, "url" | "transport">
): Error {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  const endpoint = `${server.transport} endpoint ${server.url}`;
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return new Error(
      `MCP connection timed out after 15 seconds for ${endpoint}. Check the URL, server availability, and selected transport.`
    );
  }
  if (
    normalized.includes("unauthorized") ||
    normalized.includes("forbidden") ||
    /\b(401|403)\b/u.test(message)
  ) {
    return new Error(
      `MCP server rejected authentication for ${endpoint}. Check the custom headers and credentials. ${message}`
    );
  }
  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("cors")
  ) {
    return new Error(
      `Unable to reach ${endpoint}. Check that the server is online and accepts Chrome extension requests; a server-side origin policy cannot be bypassed by the extension. ${message}`
    );
  }
  return new Error(`MCP connection failed for ${endpoint}. ${message}`.trim());
}

export function timeoutSignal(parent: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new DOMException("MCP request timed out", "TimeoutError")),
    timeoutMs
  );
  const abort = () => controller.abort(parent?.reason);
  if (parent?.aborted) abort();
  else parent?.addEventListener("abort", abort, { once: true });
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timeout);
      parent?.removeEventListener("abort", abort);
    }
  };
}

function transportForServer(server: McpServerConfig): Transport {
  const headers = parseCustomHeaders(server.customHeaders);
  const requestInit: RequestInit = { headers };
  if (server.transport === "sse") {
    return new SSEClientTransport(new URL(server.url), {
      requestInit,
      eventSourceInit: {
        fetch: (url, init) =>
          fetch(url, {
            ...init,
            headers: { ...Object.fromEntries(new Headers(init.headers)), ...headers }
          })
      }
    });
  }
  return new StreamableHTTPClientTransport(new URL(server.url), {
    requestInit
  });
}

async function withClient<T>(
  server: McpServerConfig,
  signal: AbortSignal | undefined,
  timeoutMs: number,
  task: (client: Client, signal: AbortSignal) => Promise<T>
): Promise<T> {
  const timeout = timeoutSignal(signal, timeoutMs);
  const client = new Client({ name: "WebMind", version: "0.1.0" });
  try {
    await client.connect(transportForServer(server), { signal: timeout.signal });
    return await task(client, timeout.signal);
  } catch (error) {
    throw describeMcpConnectionError(error, server);
  } finally {
    timeout.dispose();
    await client.close().catch(() => undefined);
  }
}

export async function listMcpTools(
  server: McpServerConfig,
  signal?: AbortSignal
): Promise<McpToolInfo[]> {
  return withClient(server, signal, MCP_CONNECT_TIMEOUT_MS, async (client, requestSignal) => {
    const tools: McpToolInfo[] = [];
    let cursor: string | undefined;
    do {
      const result = await client.listTools(
        cursor ? { cursor } : undefined,
        { signal: requestSignal }
      );
      for (const tool of result.tools) {
        tools.push({
          name: tool.name,
          description: tool.description ?? "",
          inputSchema: tool.inputSchema as Record<string, unknown>,
          readOnly: tool.annotations?.readOnlyHint,
          destructive: tool.annotations?.destructiveHint
        });
        if (tools.length >= MCP_MAX_TOOLS) return tools;
      }
      cursor = result.nextCursor;
    } while (cursor);
    return tools;
  });
}

export function formatMcpToolResult(value: unknown): string {
  if (!value || typeof value !== "object") return String(value ?? "");
  const result = value as {
    content?: Array<Record<string, unknown>>;
    structuredContent?: unknown;
    isError?: boolean;
  };
  const parts = (result.content ?? []).map((item) => {
    if (item.type === "text") return String(item.text ?? "");
    if (item.type === "image") return `[image: ${String(item.mimeType ?? "unknown")}]`;
    if (item.type === "audio") return `[audio: ${String(item.mimeType ?? "unknown")}]`;
    if (item.type === "resource" || item.type === "resource_link") {
      return `[resource: ${String(item.uri ?? item.name ?? "unknown")}]`;
    }
    return JSON.stringify(item);
  });
  if (result.structuredContent !== undefined) {
    parts.push(JSON.stringify(result.structuredContent));
  }
  const text = parts.filter(Boolean).join("\n\n");
  return `${result.isError ? "MCP tool error:\n" : ""}${text || "(empty result)"}`.slice(
    0,
    MCP_MAX_RESULT_CHARS
  );
}

export async function callMcpTool(
  server: McpServerConfig,
  name: string,
  args: Record<string, unknown>,
  signal?: AbortSignal
): Promise<McpToolCallResult> {
  return withClient(server, signal, MCP_CALL_TIMEOUT_MS, async (client, requestSignal) => {
    const result = await client.callTool(
      { name, arguments: args },
      undefined,
      { signal: requestSignal }
    );
    return {
      content: formatMcpToolResult(result),
      isError:
        typeof result === "object" &&
        result !== null &&
        "isError" in result &&
        result.isError === true
    };
  });
}
