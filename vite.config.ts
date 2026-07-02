import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the bundle works from file:// inside Capacitor WebViews.
  base: './',
  build: {
    target: 'es2018',
    chunkSizeWarningLimit: 1600
  },
  server: {
    host: true,
    port: 5173
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
});
