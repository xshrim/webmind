import { build } from "esbuild";

const shared = {
  bundle: true,
  sourcemap: true,
  target: "chrome114",
  legalComments: "none",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production")
  }
};

await Promise.all([
  build({
    ...shared,
    entryPoints: ["src/background/index.ts"],
    outfile: "dist/background.js",
    format: "esm"
  }),
  build({
    ...shared,
    entryPoints: ["src/content/index.tsx"],
    outfile: "dist/content.js",
    format: "iife"
  }),
  build({
    ...shared,
    entryPoints: ["src/content/githubCloneBridge.ts"],
    outfile: "dist/githubCloneBridge.js",
    format: "iife"
  })
]);
