import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: Vite serves the React app on 5173 and proxies /api to the Express proxy on 8787.
// Prod: `npm run build` emits dist/, which server.js serves directly.
export default defineConfig({
  root: '.',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  build: {
    outDir: 'dist',
  },
});
