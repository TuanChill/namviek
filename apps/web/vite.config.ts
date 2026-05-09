import path from "path"
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@local/api-client': path.resolve(__dirname, '../../packages/api-client/src/index.ts'),
      },
    },
    server: {
      port: Number(env.PORT) || 2001,
      proxy: {
        '/api': {
          target: 'http://localhost:4001',
          changeOrigin: true,
          headers: {
            'x-api-key': env.MCP_API_KEY || 'namviek-mcp-dev-key',
          },
        },
      },
    },
  }
})
