"use strict";
(() => {
  // src/content/githubCloneBridge.ts
  (() => {
    const ENABLED_ATTRIBUTE = "data-webmind-github-ssh-clone-rewrite";
    const INSTALLED_KEY = "__webmindGithubSshCloneBridgeInstalled__";
    const GITHUB_SSH_CLONE_URL_PATTERN = /^git@github\.com:([^/\s]+)\/([^/\s]+)\.git$/;
    const pageWindow = window;
    if (pageWindow[INSTALLED_KEY]) return;
    pageWindow[INSTALLED_KEY] = true;
    const rewrite = (value) => {
      if (!document.documentElement.hasAttribute(ENABLED_ATTRIBUTE)) return value;
      const match = value.trim().match(GITHUB_SSH_CLONE_URL_PATTERN);
      return match ? `ssh://git@ssh.github.com:443/${match[1]}/${match[2]}.git` : value;
    };
    document.addEventListener(
      "copy",
      (event) => {
        const text = document.getSelection()?.toString() ?? "";
        const rewritten = rewrite(text);
        if (rewritten === text) return;
        if (!event.clipboardData) return;
        event.clipboardData.setData("text/plain", rewritten);
        event.preventDefault();
      },
      true
    );
    try {
      const clipboard = navigator.clipboard;
      const prototype = clipboard ? Object.getPrototypeOf(clipboard) : void 0;
      const originalWriteText = prototype?.writeText;
      if (!originalWriteText || !prototype) return;
      Object.defineProperty(prototype, "writeText", {
        configurable: true,
        value(value) {
          return originalWriteText.call(this, rewrite(String(value)));
        },
        writable: true
      });
    } catch {
    }
  })();
})();
//# sourceMappingURL=githubCloneBridge.js.map
