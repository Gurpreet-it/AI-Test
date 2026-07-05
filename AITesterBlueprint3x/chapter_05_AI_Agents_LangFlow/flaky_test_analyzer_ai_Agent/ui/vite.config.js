import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// LangFlow's file-upload endpoint does NOT answer the browser's CORS preflight
// (OPTIONS -> 422), so calling it cross-origin from the browser fails with
// "Failed to fetch". We sidestep CORS entirely by proxying same-origin /api
// requests through Vite to the LangFlow server. Override the target with
// LANGFLOW_URL if LangFlow runs elsewhere.
const LANGFLOW_URL = process.env.LANGFLOW_URL || 'http://localhost:7861'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    open: false,
    proxy: {
      '/api': {
        target: LANGFLOW_URL,
        changeOrigin: true,
      },
    },
  },
})
