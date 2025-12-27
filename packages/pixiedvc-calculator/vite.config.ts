import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "./demo",
  publicDir: false,
  build: {
    outDir: "../demo-dist",
  },
});
