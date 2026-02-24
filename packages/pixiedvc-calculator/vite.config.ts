import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  root: mode === "test" ? "." : "./demo",
  publicDir: false,
  build: {
    outDir: "../demo-dist",
  },
  test: {
    include: ["test/**/*.{test,spec}.ts?(x)"],
  },
}));
