import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    // The AI Assistant preview bundles the website source from ../frontend
    // (src/preview/localSources.js).
    fs: { allow: ['.', '../frontend'] },
  },
})
