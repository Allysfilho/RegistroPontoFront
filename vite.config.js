import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: true,
      port: Number(env.VITE_DEV_PORT || 5173),
      // Em `npm run dev` o SPA roda fora do Docker: o proxy evita CORS
      // mandando /api para o backend do compose (ou do Laragon).
      proxy: {
        '/api': {
          target: env.VITE_DEV_API_PROXY || 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  }
})
