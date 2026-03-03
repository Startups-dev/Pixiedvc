import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: {
    entry: "src/index.ts",
  },
  entry: ["src/index.ts"],
  external: ["react"],
  format: ["esm"],
  sourcemap: true,
  target: "es2022",
});
