import { defineConfig } from "vite";

export default defineConfig({
  ssr: {
    noExternal: "*",
    external: ["vscode"]
  },
  esbuild: {
    legalComments: "none",
  },
  build: {
    minify: true,
    ssr: true,
    target: "esnext",
    outDir: "out",
    lib: {
      entry: "./src/extension.ts",
      formats: ["cjs"],
    },
    rollupOptions: {
      external: ["vscode"],
    },
  },
});
