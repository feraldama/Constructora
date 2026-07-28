import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // El backend usa module resolution Node16: los imports llevan extensión
    // `.js` aunque el archivo sea `.ts`. Esto los resuelve para Vite.
    alias: [{ find: /^(\.{1,2}\/.*)\.js$/, replacement: "$1" }],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
