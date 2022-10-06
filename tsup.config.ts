import { defineConfig } from 'tsup'

export default defineConfig((options) => {
  return {
    target: "esnext",
    entry: ['./src/extension.ts'],
    clean: true,
    minify: !options.watch,
    sourcemap: Boolean(options.watch),
    external: ["vscode"],
  }
})