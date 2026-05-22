import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/label/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3081,
    proxy: {
      '/label/templates': 'http://localhost:3080',
      '/label/template': 'http://localhost:3080',
    },
    watch: {
      usePolling: true,
      interval: 1000
    }
  }
})
