import { fileURLToPath } from 'node:url';
import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
      '@pixiedvc/design-system': path.resolve(rootDir, 'packages/design-system/src'),
      '@pixiedvc/data': path.resolve(rootDir, 'packages/data/src'),
      '@pixiedvc/booking-form': path.resolve(rootDir, 'packages/booking-form/src'),
    },
  },
  test: {
    // Match Next's React server condition for its server-only import marker.
    alias: { 'server-only': path.resolve(rootDir, 'node_modules/next/dist/compiled/server-only/empty.js') },
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: false,
  },
});
