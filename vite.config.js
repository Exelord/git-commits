import path from "path";
import { defineConfig } from "vite";

module.exports = defineConfig({
  ssr: {
    noExternal: ["date-fns"],
  },
  build: {
    minify: true,
    ssr: true,
    target: "esnext",
    outDir: "out",
    lib: {
      entry: path.resolve(__dirname, "src/extension.ts"),
      formats: ["cjs"],
      name: "git-commits",
      fileName: "main.js",
    },
    rollupOptions: {
      input: path.resolve(__dirname, "src/extension.ts"),
      external: ["vscode"],
    },
  },
});
