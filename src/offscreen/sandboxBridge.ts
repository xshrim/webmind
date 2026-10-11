type SandboxMessage = {
  op?: string;
  id?: number;
  result?: unknown;
  error?: string;
};

const frame = typeof document === "undefined"
  ? undefined
  : document.querySelector<HTMLIFrameElement>("#sandbox");
let nextId = 0;
const calls = new Map<number, { resolve: (value: unknown) => void; reject: (reason: Error) => void }>();
let markReady: () => void = () => {};
const ready = new Promise<void>((resolve) => { markReady = resolve; });

if (typeof window !== "undefined") {
  window.addEventListener("message", (event) => {
    if (!frame?.contentWindow || event.source !== frame.contentWindow) return;
    const message = event.data as SandboxMessage | undefined;
    if (message?.op === "ready") {
      markReady();
      return;
    }
    if (message?.op !== "result" || typeof message.id !== "number") return;
    const call = calls.get(message.id);
    calls.delete(message.id);
    if (!call) return;
    if (message.error) call.reject(new Error(message.error));
    else call.resolve(message.result);
  });
}

export async function evaluateYouTubePlayer(code: string): Promise<unknown> {
  await ready;
  if (!frame?.contentWindow) throw new Error("YouTube player sandbox is unavailable");
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    calls.set(id, { resolve, reject });
    frame.contentWindow!.postMessage({ op: "eval", id, code }, { targetOrigin: "*" });
  });
}
