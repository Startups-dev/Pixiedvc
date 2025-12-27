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
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: false,
  },
});
