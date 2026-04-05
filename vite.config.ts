import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.BETTER_AUTH_URL || 'http://127.0.0.1:3010'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': backendTarget,
      },
    },
  }
})
