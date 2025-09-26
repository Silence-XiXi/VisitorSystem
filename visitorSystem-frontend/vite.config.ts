import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    open: true,
    host: '0.0.0.0' // 允许外部网络访问
  },
  build: {
    outDir: 'dist'
  }
})
