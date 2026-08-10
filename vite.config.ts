import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: "sidepanel.html",
        options: "options.html"
      },
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("lucide-react/dist/esm/icons/")) {
            const fileName = id.split("/").pop() ?? "";
            const firstChar = fileName.charAt(0).toLowerCase();
            const group = /[a-z0-9]/.test(firstChar) ? firstChar : "misc";
            return `lucide-icons-${group}`;
          }
          if (id.includes("lucide-react") || id.includes("lucide")) {
            return "vendor-icons";
          }
          if (id.includes("react") || id.includes("scheduler")) {
            return "vendor-react";
          }
          if (id.includes("pdfjs-dist")) {
            return "vendor-pdf";
          }
          if (
            id.includes("@mozilla/readability") ||
            id.includes("dompurify") ||
            id.includes("marked")
          ) {
            return "vendor-parsing";
          }
          return "vendor";
        }
      }
    }
  },
  server: {
    port: 4173
  }
});
