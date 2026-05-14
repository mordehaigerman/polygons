import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // `/health` lives outside the `/api` prefix on the backend (the Docker
      // healthcheck targets it directly); we proxy it through so the in-page
      // server-health poll uses the same origin as the rest of the app.
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    css: false,
    clearMocks: true,
    restoreMocks: true,
  },
});
