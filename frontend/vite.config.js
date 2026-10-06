import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Django target for the dev proxy. Set VITE_BACKEND_URL to point elsewhere.
  const backendTarget = env.VITE_BACKEND_URL || env.VITE_API_BASE?.replace(/\/api\/?$/, '') || 'http://127.0.0.1:8000'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': { target: backendTarget, changeOrigin: true, secure: false },
        '/media': { target: backendTarget, changeOrigin: true, secure: false },
      },
    },
  }
})
