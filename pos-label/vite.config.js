import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 7000,
    proxy: {
      '/label': {
        target: 'http://54.90.180.79',
        changeOrigin: true,
        headers: {
          'Origin': 'http://54.90.180.79'
        }
      }
    }
  }
})
