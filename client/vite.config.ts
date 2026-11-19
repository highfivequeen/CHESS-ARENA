import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    // Port du frontend en développement. Doit rester aligné avec CLIENT_ORIGINS
    // côté serveur (http://localhost:5173 par défaut). L'API (port 3000) est
    // appelée directement via VITE_API_URL / VITE_SOCKET_URL, sans proxy Vite.
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
})
