"use strict";
(() => {
  // src/sandbox/main.ts
  window.addEventListener("message", async (event) => {
    const message = event.data;
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
})();
//# sourceMappingURL=sandbox.js.map
