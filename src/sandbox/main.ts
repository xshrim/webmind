// Chrome only permits dynamically generated player transforms in a sandboxed
// extension page. The offscreen page cannot evaluate arbitrary code itself.
window.addEventListener("message", async (event) => {
  const message = event.data as { op?: string; id?: number; code?: string } | undefined;
  if (message?.op !== "eval" || typeof message.id !== "number" || typeof message.code !== "string") return;
  try {
    const result = await new Function(message.code)();
    event.source?.postMessage({ op: "result", id: message.id, result }, { targetOrigin: "*" });
  } catch (error) {
    event.source?.postMessage({
      op: "result",
      id: message.id,
      error: error instanceof Error ? error.message : String(error)
    }, { targetOrigin: "*" });
  }
});

window.parent.postMessage({ op: "ready" }, { targetOrigin: "*" });
